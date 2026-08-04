"use client";

import type { CSSProperties, FocusEvent, MouseEvent } from "react";

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

export function PortfolioExperience({
  content,
  editor,
  showSkipLink = true,
}: PortfolioExperienceProps) {
  function handleTextCommit(event: FocusEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const field = target.dataset.editorField;

    if (!field) return;

    editor.onTextCommit(
      field,
      (target.innerText ?? target.textContent ?? "").trim(),
    );
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>): void {
    if (!editor) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const card = target.closest<HTMLElement>("[data-carousel-card]");
    const navigationLink = target.closest<HTMLElement>("[data-nav]");
    const sectionId = (card?.dataset.section ??
      navigationLink?.dataset.nav) as PortfolioSectionId | undefined;

    if (sectionId) {
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
    </div>
  );
}
