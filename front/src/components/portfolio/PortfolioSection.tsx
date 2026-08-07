import type { CSSProperties, ReactNode } from "react";

import type { PortfolioSectionId } from "@/components/layout/navigation";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import { FormattedText } from "@/components/portfolio/FormattedText";
import type { PortfolioSectionVisual } from "@/lib/content/types";

interface PortfolioSectionProps {
  readonly children: ReactNode;
  readonly editor?: PortfolioEditorBridge;
  readonly eyebrow: string;
  readonly id: PortfolioSectionId;
  readonly number: string;
  readonly renderTitle?: boolean;
  readonly title: string;
  readonly titleField?: string;
  readonly visual: PortfolioSectionVisual;
}

type SectionStyle = CSSProperties & {
  readonly "--paper": string;
  readonly "--section-background": string;
  readonly "--signal": string;
  readonly "--signal-soft": string;
};

const initialCarouselOffsets: Readonly<Record<PortfolioSectionId, number>> = {
  introduce: 0,
  career: 1,
  "side-projects": 2,
  contact: -1,
};

/**
 * 공통 heading과 focus anchor 계약을 적용한 portfolio section.
 */
export function PortfolioSection({
  children,
  editor,
  eyebrow,
  id,
  number,
  renderTitle = true,
  title,
  titleField,
  visual,
}: PortfolioSectionProps) {
  const titleId = `${id}-title`;
  const isIntroduction = id === "introduce";
  const Heading = isIntroduction ? "h1" : "h2";
  const sectionStyle: SectionStyle = {
    "--paper": visual.textColor,
    "--section-background": visual.backgroundColor,
    "--signal": visual.accentColor,
    "--signal-soft": visual.accentColor,
  };
  const image = visual.backgroundImage;

  return (
    <section
      id={id}
      className="section"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-section={id}
      data-carousel-card
      data-carousel-offset={initialCarouselOffsets[id]}
      data-editor-selected={editor?.selectedSection === id ? "true" : undefined}
      data-has-background-image={image ? "true" : undefined}
      aria-roledescription="slide"
      onClick={editor ? () => editor.onSelectSection(id) : undefined}
      style={sectionStyle}
    >
      {image ? (
        <div
          aria-hidden="true"
          className="section-background-image"
          style={{
            backgroundImage: `url("${image.url}")`,
            backgroundPosition: `${image.positionX}% ${image.positionY}%`,
          }}
        >
          <span
            className="section-background-overlay"
            style={{
              backgroundColor: visual.backgroundColor,
              opacity: image.overlayOpacity,
            }}
          />
        </div>
      ) : null}
      {isIntroduction ? (
        <div className="head">
          <span className="num" aria-hidden="true">
            {number}
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            {renderTitle ? (
              <Heading
                id={titleId}
                {...(titleField
                  ? createEditableTextProps(editor, titleField)
                  : {})}
              >
                <FormattedText text={title} />
              </Heading>
            ) : null}
          </div>
        </div>
      ) : (
        <Heading className="sr-only" id={titleId}>
          {title}
        </Heading>
      )}
      {children}
    </section>
  );
}
