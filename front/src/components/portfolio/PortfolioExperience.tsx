"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioHeader } from "@/components/layout/PortfolioHeader";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import type { PortfolioSectionId } from "@/components/layout/navigation";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { PortfolioSections } from "@/components/portfolio/PortfolioSections";
import type { PortfolioContentViewModel } from "@/lib/content/types";

interface PortfolioExperienceProps {
  readonly content: PortfolioContentViewModel;
  readonly editor?: PortfolioEditorBridge;
  readonly showSkipLink?: boolean;
}

type PortfolioThemeStyle = CSSProperties & {
  readonly "--film": string;
  readonly "--muted": string;
  readonly "--paper": string;
  readonly "--portfolio-card-radius": string;
  readonly "--signal": string;
  readonly "--signal-soft": string;
};

type RichTextFormat = "bold" | "highlight" | "italic" | "underline";

interface RichTextToolbarState {
  readonly active: Readonly<Record<RichTextFormat, boolean>>;
  readonly left: number;
  readonly top: number;
}

const RICH_TEXT_FORMATS: readonly {
  readonly format: RichTextFormat;
  readonly label: string;
  readonly mark: string;
}[] = [
  { format: "bold", label: "굵게", mark: "B" },
  { format: "italic", label: "기울임", mark: "I" },
  { format: "underline", label: "밑줄", mark: "U" },
  { format: "highlight", label: "하이라이트", mark: "H" },
];

const RICH_TEXT_TAGS: Readonly<Record<RichTextFormat, readonly string[]>> = {
  bold: ["STRONG", "B"],
  highlight: ["MARK"],
  italic: ["EM", "I"],
  underline: ["U"],
};

const RICH_TEXT_ELEMENT_NAMES: Readonly<Record<RichTextFormat, string>> = {
  bold: "strong",
  highlight: "mark",
  italic: "em",
  underline: "u",
};

function createThemeStyle(content: PortfolioContentViewModel): PortfolioThemeStyle {
  const { visuals } = content;

  return {
    "--film": visuals.pageBackgroundColor,
    "--muted": visuals.mutedTextColor,
    "--paper": visuals.textColor,
    "--portfolio-card-radius": `${visuals.cardRadius}px`,
    "--signal": visuals.accentColor,
    "--signal-soft": visuals.accentColor,
  };
}

function asHTMLElement(node: Node): HTMLElement | null {
  return node instanceof HTMLElement ? node : node.parentElement;
}

function findFormatAncestor(
  node: Node,
  format: RichTextFormat,
  root: HTMLElement,
): HTMLElement | null {
  let current = asHTMLElement(node);

  while (current && current !== root) {
    if (RICH_TEXT_TAGS[format].includes(current.tagName)) return current;
    current = current.parentElement;
  }

  return null;
}

function unwrapElement(element: HTMLElement): ChildNode[] {
  const parent = element.parentNode;
  const children = [...element.childNodes];

  if (!parent) return [];

  for (const child of children) parent.insertBefore(child, element);
  element.remove();
  return children;
}

function removeNestedFormat(
  fragment: DocumentFragment,
  format: RichTextFormat,
): void {
  const selector = RICH_TEXT_TAGS[format]
    .map((tagName) => tagName.toLowerCase())
    .join(",");
  const nestedElements = [
    ...fragment.querySelectorAll<HTMLElement>(selector),
  ].reverse();

  for (const element of nestedElements) unwrapElement(element);
}

function createToolbarState(
  range: Range,
  root: HTMLElement,
): RichTextToolbarState {
  const rect = range.getBoundingClientRect();
  const active = Object.fromEntries(
    RICH_TEXT_FORMATS.map(({ format }) => {
      const startAncestor = findFormatAncestor(
        range.startContainer,
        format,
        root,
      );
      const endAncestor = findFormatAncestor(range.endContainer, format, root);
      return [format, Boolean(startAncestor && startAncestor === endAncestor)];
    }),
  ) as Record<RichTextFormat, boolean>;

  return {
    active,
    left: rect.left + rect.width / 2,
    top: Math.max(52, rect.top - 10),
  };
}

function serializeFormattedNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const content = [...node.childNodes].map(serializeFormattedNode).join("");

  if (node.tagName === "STRONG" || node.tagName === "B") {
    return `[b]${content}[/b]`;
  }

  if (node.tagName === "EM" || node.tagName === "I") {
    return `[i]${content}[/i]`;
  }

  if (node.tagName === "U") return `[u]${content}[/u]`;
  if (node.tagName === "MARK") return `[mark]${content}[/mark]`;
  if (node.tagName === "BR") return " ";

  return content;
}

function serializeCareerAction(element: HTMLElement): string {
  const items = [
    ...element.querySelectorAll<HTMLElement>(":scope > li"),
  ];

  if (items.length === 0) {
    return (element.innerText ?? element.textContent ?? "").trim();
  }

  return items
    .map((item) =>
      [...item.childNodes].map(serializeFormattedNode).join("").trim(),
    )
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function PortfolioExperience({
  content,
  editor,
  showSkipLink = true,
}: PortfolioExperienceProps) {
  const [richTextToolbar, setRichTextToolbar] =
    useState<RichTextToolbarState | null>(null);
  const richTextRangeRef = useRef<Range | null>(null);
  const richTextRootRef = useRef<HTMLElement | null>(null);
  const editorEnabled = editor !== undefined;

  useEffect(() => {
    if (!editorEnabled) return;

    function updateRichTextSelection(): void {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        richTextRangeRef.current = null;
        richTextRootRef.current = null;
        setRichTextToolbar(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const startElement = asHTMLElement(range.startContainer);
      const endElement = asHTMLElement(range.endContainer);
      const root = startElement?.closest<HTMLElement>(
        '[data-editor-rich-text="career-action"]',
      );
      const startItem = startElement?.closest("li");
      const endItem = endElement?.closest("li");

      if (
        !root ||
        !endElement ||
        !root.contains(endElement) ||
        !startItem ||
        startItem !== endItem
      ) {
        richTextRangeRef.current = null;
        richTextRootRef.current = null;
        setRichTextToolbar(null);
        return;
      }

      const storedRange = range.cloneRange();
      richTextRangeRef.current = storedRange;
      richTextRootRef.current = root;
      setRichTextToolbar(createToolbarState(storedRange, root));
    }

    document.addEventListener("selectionchange", updateRichTextSelection);
    window.addEventListener("resize", updateRichTextSelection);
    document.addEventListener("scroll", updateRichTextSelection, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("selectionchange", updateRichTextSelection);
      window.removeEventListener("resize", updateRichTextSelection);
      document.removeEventListener("scroll", updateRichTextSelection, true);
    };
  }, [editorEnabled]);

  function toggleRichTextFormat(format: RichTextFormat): void {
    const sourceRange = richTextRangeRef.current;
    const root = richTextRootRef.current;
    const selection = window.getSelection();

    if (!sourceRange || !root || !selection) return;

    const range = sourceRange.cloneRange();
    const startAncestor = findFormatAncestor(
      range.startContainer,
      format,
      root,
    );
    const endAncestor = findFormatAncestor(range.endContainer, format, root);
    const nextRange = document.createRange();

    if (startAncestor && startAncestor === endAncestor) {
      const unwrappedNodes = unwrapElement(startAncestor);
      const firstNode = unwrappedNodes[0];
      const lastNode = unwrappedNodes.at(-1);

      if (!firstNode || !lastNode) return;
      nextRange.setStartBefore(firstNode);
      nextRange.setEndAfter(lastNode);
    } else {
      const fragment = range.extractContents();
      removeNestedFormat(fragment, format);
      const wrapper = document.createElement(RICH_TEXT_ELEMENT_NAMES[format]);
      wrapper.append(fragment);
      range.insertNode(wrapper);
      nextRange.selectNodeContents(wrapper);
    }

    selection.removeAllRanges();
    selection.addRange(nextRange);
    richTextRangeRef.current = nextRange.cloneRange();
    setRichTextToolbar(createToolbarState(nextRange, root));
  }

  function handleTextCommit(event: FocusEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const field = target.dataset.editorField;

    if (!field) return;

    const value =
      target.dataset.editorRichText === "career-action"
        ? serializeCareerAction(target)
        : (target.innerText ?? target.textContent ?? "").trim();

    editor.onTextCommit(field, value);
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const card = target.closest<HTMLElement>("[data-carousel-card]");
    const navigationLink = target.closest<HTMLElement>("[data-nav]");
    const introductionTextBlock = target.closest<HTMLElement>(
      "[data-editor-block]",
    );
    const sectionId = (card?.dataset.section ??
      navigationLink?.dataset.nav) as PortfolioSectionId | undefined;

    if (sectionId && !introductionTextBlock) {
      editor.onSelectSection(sectionId);
    }

    const link = target.closest<HTMLAnchorElement>("a[href]");

    if (link && !link.hash) {
      event.preventDefault();
    }
  }

  return (
    <div
      className="portfolio-experience"
      data-editor-preview={editor ? "true" : undefined}
      onBlurCapture={editor ? handleTextCommit : undefined}
      onClickCapture={editor ? handleEditorClick : undefined}
      style={createThemeStyle(content)}
    >
      {showSkipLink ? (
        <a className="skip" href="#introduce">
          본문으로 이동
        </a>
      ) : null}

      <PortfolioHeader />

      <div className="mobile-toc shell">
        <PortfolioNavigation
          ariaLabel="모바일 페이지 목차"
          metaLabel="페이지 목차"
        />
      </div>

      <div className="shell layout">
        <div className="stage">
          <main
            className="portfolio-carousel"
            data-carousel
            aria-label="포트폴리오 섹션 캐러셀"
          >
            <PortfolioSections content={content} editor={editor} />
          </main>

          <div className="desktop-toc">
            <PortfolioNavigation ariaLabel="페이지 목차" className="nav" />
          </div>
        </div>
      </div>

      <NavigationTracker />

      {editor && richTextToolbar
        ? createPortal(
            <div
              aria-label="선택한 Action 텍스트 서식"
              className="preview-rich-text-toolbar"
              onMouseDown={(event) => event.preventDefault()}
              role="toolbar"
              style={{
                left: richTextToolbar.left,
                top: richTextToolbar.top,
              }}
            >
              {RICH_TEXT_FORMATS.map(({ format, label, mark }) => (
                <button
                  aria-label={`${label} 토글`}
                  aria-pressed={richTextToolbar.active[format]}
                  className="preview-rich-text-button"
                  data-format={format}
                  key={format}
                  onClick={() => toggleRichTextFormat(format)}
                  title={label}
                  type="button"
                >
                  {mark}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
