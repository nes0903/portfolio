import type { ReactNode } from "react";

import type { PortfolioSectionId } from "@/components/layout/navigation";

interface PortfolioSectionProps {
  readonly children: ReactNode;
  readonly eyebrow: string;
  readonly id: PortfolioSectionId;
  readonly number: string;
  readonly title: string;
}

const initialCarouselOffsets: Readonly<Record<PortfolioSectionId, number>> = {
  introduce: 0,
  skills: 1,
  career: 2,
  "side-projects": -2,
  contact: -1,
};

/**
 * 공통 heading과 focus anchor 계약을 적용한 portfolio section.
 */
export function PortfolioSection({
  children,
  eyebrow,
  id,
  number,
  title,
}: PortfolioSectionProps) {
  const titleId = `${id}-title`;
  const isIntroduction = id === "introduce";
  const Heading = isIntroduction ? "h1" : "h2";

  return (
    <section
      id={id}
      className="section"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-section={id}
      data-carousel-card
      data-carousel-offset={initialCarouselOffsets[id]}
      aria-roledescription="slide"
    >
      {isIntroduction ? (
        <div className="head">
          <span className="num" aria-hidden="true">
            {number}
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <Heading id={titleId}>{title}</Heading>
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
