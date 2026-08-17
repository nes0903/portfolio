"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioHeader } from "@/components/layout/PortfolioHeader";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import type { PortfolioSectionId } from "@/components/layout/navigation";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { PortfolioSections } from "@/components/portfolio/PortfolioSections";
import { SideContactRail } from "@/components/portfolio/SideContactRail";
import { StarfieldBackground } from "@/components/portfolio/StarfieldBackground";
import { normalizeInlineTextColor } from "@/components/portfolio/FormattedText";
import {
  createThemeTextColors,
  DEFAULT_TEXT_COLOR_PRESETS,
  rememberRecentTextColor,
} from "@/components/portfolio/text-color-palette";
import type { PortfolioContentViewModel } from "@/lib/content/types";

interface PortfolioExperienceProps {
  readonly content: PortfolioContentViewModel;
  readonly editor?: PortfolioEditorBridge;
  readonly scrollMode?: "container" | "window";
  readonly showSkipLink?: boolean;
}

type PortfolioThemeStyle = CSSProperties & {
  readonly "--muted": string;
  readonly "--paper": string;
  readonly "--signal": string;
  readonly "--signal-soft": string;
};

type TextColorSwatchStyle = CSSProperties & {
  readonly "--swatch-color": string;
};

type RichTextFormat = "bold" | "highlight" | "italic" | "underline";

interface RichTextToolbarState {
  readonly active: Readonly<Record<RichTextFormat, boolean>>;
  readonly color: string | null;
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

interface TextColorSwatchesProps {
  readonly colors: readonly string[];
  readonly label: string;
  readonly onSelect: (color: string) => void;
  readonly selectedColor: string;
}

function TextColorSwatches({
  colors,
  label,
  onSelect,
  selectedColor,
}: TextColorSwatchesProps) {
  return (
    <div aria-label={label} className="preview-text-color-swatches" role="group">
      {colors.map((color) => (
        <button
          aria-label={`${color} 색상 선택`}
          aria-pressed={selectedColor === color}
          className="preview-text-color-swatch"
          key={color}
          onClick={() => onSelect(color)}
          style={{ "--swatch-color": color } as TextColorSwatchStyle}
          title={color}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function createThemeStyle(content: PortfolioContentViewModel): PortfolioThemeStyle {
  const { visuals } = content;

  return {
    "--muted": visuals.mutedTextColor,
    "--paper": visuals.textColor,
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

function findTextColorAncestor(
  node: Node,
  root: HTMLElement,
): HTMLElement | null {
  let current = asHTMLElement(node);

  while (current && current !== root) {
    if (
      current.tagName === "SPAN" &&
      normalizeInlineTextColor(current.dataset.textColor ?? "")
    ) {
      return current;
    }

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

function removeNestedTextColors(fragment: DocumentFragment): void {
  const nestedElements = [
    ...fragment.querySelectorAll<HTMLElement>("span[data-text-color]"),
  ].reverse();

  for (const element of nestedElements) unwrapElement(element);
}

function rangeSelectsElementContents(
  range: Range,
  element: HTMLElement,
): boolean {
  const elementRange = document.createRange();
  elementRange.selectNodeContents(element);

  return (
    range.compareBoundaryPoints(Range.START_TO_START, elementRange) === 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, elementRange) === 0
  );
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
  const startColorAncestor = findTextColorAncestor(
    range.startContainer,
    root,
  );
  const endColorAncestor = findTextColorAncestor(range.endContainer, root);
  const color =
    startColorAncestor && startColorAncestor === endColorAncestor
      ? normalizeInlineTextColor(
          startColorAncestor.dataset.textColor ?? "",
        )
      : null;

  return {
    active,
    color,
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

  if (node.tagName === "SPAN") {
    const color = normalizeInlineTextColor(node.dataset.textColor ?? "");
    if (color) return `[color=${color}]${content}[/color]`;
  }

  if (node.tagName === "BR") return "\n";
  if (node.tagName === "DIV" || node.tagName === "P") {
    return `\n${content}`;
  }

  return content;
}

function serializeNotionList(element: HTMLElement): string {
  const items = [
    ...element.querySelectorAll<HTMLElement>(":scope > li"),
  ];

  if (items.length === 0) {
    return (element.innerText ?? element.textContent ?? "").trim();
  }

  return items
    .map((item) => {
      const content = [...item.childNodes]
        .map(serializeFormattedNode)
        .join("")
        .trim();
      const typedBullet = /^[-•]\s+/.test(content);
      const text = typedBullet ? content.replace(/^[-•]\s+/, "") : content;

      return {
        isBullet: item.dataset.bullet === "true" || typedBullet,
        text,
      };
    })
    .filter((item) => item.text.length > 0)
    .map((item) => (item.isBullet ? `- ${item.text}` : item.text))
    .join("\n");
}

interface NotionListContext {
  readonly item: HTMLLIElement;
  readonly range: Range;
  readonly root: HTMLElement;
}

function getNotionListContext(
  eventTarget: EventTarget | null,
): NotionListContext | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const startElement = asHTMLElement(range.startContainer);
  const endElement = asHTMLElement(range.endContainer);
  const item = startElement?.closest<HTMLLIElement>("li");
  const root = item?.parentElement;
  const targetElement =
    eventTarget instanceof HTMLElement
      ? eventTarget
      : eventTarget instanceof Node
        ? eventTarget.parentElement
        : null;

  if (
    !item ||
    !root ||
    root.dataset.editorRichText !== "notion-list" ||
    !endElement ||
    !item.contains(endElement) ||
    !targetElement ||
    (targetElement !== root && !root.contains(targetElement))
  ) {
    return null;
  }

  return { item, range, root };
}

function getCaretTextOffset(item: HTMLLIElement, range: Range): number | null {
  if (!range.collapsed || !item.contains(range.startContainer)) return null;

  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(item);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  return prefixRange.toString().length;
}

function placeCaretAtStart(item: HTMLLIElement): void {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(item);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function removeLeadingText(item: HTMLLIElement, length: number): void {
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  let remaining = length;
  let node = walker.nextNode();

  while (node && remaining > 0) {
    const textNode = node as Text;
    const removeLength = Math.min(textNode.data.length, remaining);
    textNode.deleteData(0, removeLength);
    remaining -= removeLength;
    node = walker.nextNode();
  }
}

function ensureEditableListItemContent(item: HTMLLIElement): void {
  if (item.childNodes.length === 0) item.append(document.createElement("br"));
}

function splitNotionListItem(
  item: HTMLLIElement,
  range: Range,
  inheritBullet: boolean,
): void {
  range.deleteContents();

  const tailRange = document.createRange();
  tailRange.setStart(range.startContainer, range.startOffset);
  tailRange.setEnd(item, item.childNodes.length);
  const trailingContent = tailRange.extractContents();
  const nextItem = document.createElement("li");

  if (inheritBullet) nextItem.dataset.bullet = "true";
  nextItem.append(trailingContent);
  ensureEditableListItemContent(item);
  ensureEditableListItemContent(nextItem);
  item.after(nextItem);
  placeCaretAtStart(nextItem);
}

function serializeInlineText(element: HTMLElement): string {
  return [...element.childNodes]
    .map(serializeFormattedNode)
    .join("")
    .trim();
}

export function PortfolioExperience({
  content,
  editor,
  scrollMode,
  showSkipLink = true,
}: PortfolioExperienceProps) {
  const defaultTextColor =
    normalizeInlineTextColor(content.visuals.accentColor) ?? "#F28C28";
  const [richTextToolbar, setRichTextToolbar] =
    useState<RichTextToolbarState | null>(null);
  const [isTextColorPaletteOpen, setTextColorPaletteOpen] = useState(false);
  const [pendingTextColor, setPendingTextColor] = useState(defaultTextColor);
  const [recentTextColors, setRecentTextColors] = useState<readonly string[]>(
    () => [...content.visuals.recentTextColors],
  );
  const experienceRef = useRef<HTMLDivElement | null>(null);
  const recentTextColorsRef = useRef<readonly string[]>(recentTextColors);
  const recentTextColorsDirtyRef = useRef(false);
  const richTextRangeRef = useRef<Range | null>(null);
  const richTextRootRef = useRef<HTMLElement | null>(null);
  const editorEnabled = editor !== undefined;
  const themeTextColors = useMemo(
    () => createThemeTextColors(content.visuals),
    [content.visuals],
  );
  const useContainerScroll =
    scrollMode === undefined ? editorEnabled : scrollMode === "container";

  useEffect(() => {
    if (!isTextColorPaletteOpen) return;

    function closePaletteOnOutsidePointer(event: PointerEvent): void {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(
          "[data-text-color-palette], [data-text-color-trigger]",
        )
      ) {
        return;
      }

      setTextColorPaletteOpen(false);
    }

    function closePaletteOnEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      setTextColorPaletteOpen(false);
    }

    document.addEventListener("pointerdown", closePaletteOnOutsidePointer, true);
    document.addEventListener("keydown", closePaletteOnEscape, true);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closePaletteOnOutsidePointer,
        true,
      );
      document.removeEventListener("keydown", closePaletteOnEscape, true);
    };
  }, [isTextColorPaletteOpen]);

  useEffect(() => {
    if (!editorEnabled) return;

    function updateRichTextSelection(): void {
      const selection = window.getSelection();

      if (
        document.activeElement?.closest(".preview-rich-text-toolbar")
      ) {
        return;
      }

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        richTextRangeRef.current = null;
        richTextRootRef.current = null;
        setRichTextToolbar(null);
        setTextColorPaletteOpen(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const startElement = asHTMLElement(range.startContainer);
      const endElement = asHTMLElement(range.endContainer);
      const root = startElement?.closest<HTMLElement>(
        "[data-editor-rich-text]",
      );
      const startItem = startElement?.closest("li");
      const endItem = endElement?.closest("li");
      const requiresSameListItem =
        root?.dataset.editorRichText === "notion-list";

      if (
        !root ||
        !endElement ||
        !root.contains(endElement) ||
        (requiresSameListItem && (!startItem || startItem !== endItem))
      ) {
        richTextRangeRef.current = null;
        richTextRootRef.current = null;
        setRichTextToolbar(null);
        setTextColorPaletteOpen(false);
        return;
      }

      const storedRange = range.cloneRange();
      richTextRangeRef.current = storedRange;
      richTextRootRef.current = root;
      const nextToolbar = createToolbarState(storedRange, root);
      setRichTextToolbar(nextToolbar);
      setPendingTextColor(nextToolbar.color ?? defaultTextColor);
      setTextColorPaletteOpen(false);
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
  }, [defaultTextColor, editorEnabled]);

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

  function applyRichTextColor(untrustedColor: string): boolean {
    const color = normalizeInlineTextColor(untrustedColor);
    const sourceRange = richTextRangeRef.current;
    const root = richTextRootRef.current;
    const selection = window.getSelection();

    if (!color || !sourceRange || !root || !selection) return false;

    const range = sourceRange.cloneRange();
    const startColorAncestor = findTextColorAncestor(
      range.startContainer,
      root,
    );
    const endColorAncestor = findTextColorAncestor(range.endContainer, root);

    if (startColorAncestor && startColorAncestor === endColorAncestor) {
      const currentColor = normalizeInlineTextColor(
        startColorAncestor.dataset.textColor ?? "",
      );

      if (currentColor === color) {
        setRichTextToolbar(createToolbarState(range, root));
        return true;
      }

      if (rangeSelectsElementContents(range, startColorAncestor)) {
        startColorAncestor.dataset.textColor = color;
        startColorAncestor.style.color = color;

        const nextRange = document.createRange();
        nextRange.selectNodeContents(startColorAncestor);
        root.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(nextRange);
        richTextRangeRef.current = nextRange.cloneRange();
        setRichTextToolbar(createToolbarState(nextRange, root));
        return true;
      }
    }

    const fragment = range.extractContents();
    removeNestedTextColors(fragment);

    const wrapper = document.createElement("span");
    wrapper.dataset.textColor = color;
    wrapper.style.color = color;
    wrapper.append(fragment);
    range.insertNode(wrapper);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    root.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(nextRange);
    richTextRangeRef.current = nextRange.cloneRange();
    setRichTextToolbar(createToolbarState(nextRange, root));
    return true;
  }

  function confirmPendingTextColor(): void {
    const color = normalizeInlineTextColor(pendingTextColor);

    if (!color || !applyRichTextColor(color)) return;

    const nextRecentColors = rememberRecentTextColor(
      recentTextColorsRef.current,
      color,
    );
    recentTextColorsRef.current = nextRecentColors;
    recentTextColorsDirtyRef.current = true;
    setRecentTextColors(nextRecentColors);
    setTextColorPaletteOpen(false);
  }

  function toggleTextColorPalette(): void {
    if (!isTextColorPaletteOpen) {
      setPendingTextColor(richTextToolbar?.color ?? defaultTextColor);
    }

    setTextColorPaletteOpen(!isTextColorPaletteOpen);
  }

  function handleTextCommit(event: FocusEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Element &&
      nextTarget.closest(".preview-rich-text-toolbar")
    ) {
      return;
    }

    const field = target.dataset.editorField;

    if (!field) return;

    const serializedValue =
      target.dataset.editorRichText === "notion-list"
        ? serializeNotionList(target)
        : target.dataset.editorRichText === "inline"
          ? serializeInlineText(target)
          : (target.innerText ?? target.textContent ?? "").trim();
    const value =
      target.dataset.bullet === "true" &&
      target.dataset.editorRichText === "inline"
        ? `- ${serializedValue.replace(/^[-•]\s+/, "")}`
        : serializedValue;

    editor.onTextCommit(field, value);

    if (recentTextColorsDirtyRef.current) {
      editor.onChangeRecentTextColors(recentTextColorsRef.current);
      recentTextColorsDirtyRef.current = false;
    }
  }

  function handleNotionListInput(event: FormEvent<HTMLDivElement>): void {
    if (!editor || (event.nativeEvent as InputEvent).isComposing) return;

    const context = getNotionListContext(event.target);

    if (!context || context.item.dataset.bullet === "true") return;

    const caretOffset = getCaretTextOffset(context.item, context.range);
    const text = context.item.textContent ?? "";

    if (!text.startsWith("- ") || caretOffset === null || caretOffset < 2) {
      return;
    }

    removeLeadingText(context.item, 2);
    context.item.dataset.bullet = "true";
    placeCaretAtStart(context.item);
  }

  function handleNotionListKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ): void {
    if (
      !editor ||
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    const context = getNotionListContext(event.target);

    if (!context) return;

    const caretOffset = getCaretTextOffset(context.item, context.range);

    if (
      event.key === "Backspace" &&
      context.item.dataset.bullet === "true" &&
      caretOffset === 0
    ) {
      event.preventDefault();
      delete context.item.dataset.bullet;
      placeCaretAtStart(context.item);
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();

    if (
      context.item.dataset.bullet === "true" &&
      (context.item.textContent ?? "").trim().length === 0
    ) {
      delete context.item.dataset.bullet;
      ensureEditableListItemContent(context.item);
      placeCaretAtStart(context.item);
      return;
    }

    splitNotionListItem(
      context.item,
      context.range,
      context.item.dataset.bullet === "true",
    );
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const section = target.closest<HTMLElement>("[data-section]");
    const navigationLink = target.closest<HTMLElement>("[data-nav]");
    const introductionTextBlock = target.closest<HTMLElement>(
      "[data-editor-block]",
    );
    const sectionId = (section?.dataset.section ??
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
      ref={experienceRef}
      className="portfolio-experience"
      data-editor-preview={editor ? "true" : undefined}
      onBlurCapture={editor ? handleTextCommit : undefined}
      onClickCapture={editor ? handleEditorClick : undefined}
      onInputCapture={editor ? handleNotionListInput : undefined}
      onKeyDownCapture={editor ? handleNotionListKeyDown : undefined}
      style={createThemeStyle(content)}
    >
      <StarfieldBackground />

      {showSkipLink ? (
        <a className="skip" href="#introduce">
          본문으로 이동
        </a>
      ) : null}

      <PortfolioHeader />

      <a className="side-brand" href="#introduce">
        PORTFOLIO
      </a>

      <div className="side-rail">
        <div
          className="section-navigation"
          data-scroll-visible="false"
          data-section-navigation
        >
          <PortfolioNavigation
            ariaLabel="페이지 목차"
            className="section-nav"
          />
        </div>
        <SideContactRail contacts={content.contacts} editor={editor} />
      </div>

      <div className="shell layout">
        <div className="stage">
          <main
            className="portfolio-sections"
            data-scroll-sections
            aria-label="포트폴리오 섹션"
          >
            <PortfolioSections content={content} editor={editor} />
          </main>
        </div>
      </div>

      <NavigationTracker
        containerRef={experienceRef}
        onActiveSectionChange={editor?.onSelectSection}
        useContainerScroll={useContainerScroll}
      />

      {editor && richTextToolbar
        ? createPortal(
            <div
              aria-label="선택한 텍스트 서식"
              className="preview-rich-text-toolbar"
              onMouseDown={(event) => {
                const target = event.target;

                if (
                  target instanceof HTMLInputElement &&
                  target.type === "color"
                ) {
                  return;
                }

                event.preventDefault();
              }}
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
              <button
                aria-controls="preview-text-color-palette"
                aria-expanded={isTextColorPaletteOpen}
                aria-label="글자색 팔레트"
                className="preview-rich-text-button preview-text-color-trigger"
                data-text-color-trigger
                onClick={toggleTextColorPalette}
                title="글자색"
                type="button"
              >
                C
              </button>

              {isTextColorPaletteOpen ? (
                <div
                  aria-label="글자색 선택"
                  className="preview-text-color-palette"
                  data-text-color-palette
                  id="preview-text-color-palette"
                  role="dialog"
                >
                  <section>
                    <strong>최근 사용</strong>
                    {recentTextColors.length > 0 ? (
                      <TextColorSwatches
                        colors={recentTextColors}
                        label="최근 사용 글자색"
                        onSelect={setPendingTextColor}
                        selectedColor={pendingTextColor}
                      />
                    ) : (
                      <p className="preview-text-color-empty">
                        적용한 색상이 여기에 표시됩니다.
                      </p>
                    )}
                  </section>

                  <section>
                    <strong>포트폴리오 테마</strong>
                    <TextColorSwatches
                      colors={themeTextColors}
                      label="포트폴리오 테마 글자색"
                      onSelect={setPendingTextColor}
                      selectedColor={pendingTextColor}
                    />
                  </section>

                  <section>
                    <strong>기본 색상</strong>
                    <TextColorSwatches
                      colors={DEFAULT_TEXT_COLOR_PRESETS}
                      label="기본 글자색"
                      onSelect={setPendingTextColor}
                      selectedColor={pendingTextColor}
                    />
                  </section>

                  <div className="preview-text-color-custom">
                    <label>
                      <span>사용자 색상</span>
                      <input
                        aria-label="사용자 글자색"
                        onInput={(event) =>
                          setPendingTextColor(
                            event.currentTarget.value.toUpperCase(),
                          )
                        }
                        type="color"
                        value={pendingTextColor}
                      />
                    </label>
                    <code>{pendingTextColor}</code>
                  </div>

                  <button
                    className="preview-text-color-apply"
                    disabled={!normalizeInlineTextColor(pendingTextColor)}
                    onClick={confirmPendingTextColor}
                    type="button"
                  >
                    적용
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
