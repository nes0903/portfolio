import type { ReactNode } from "react";

import type { PortfolioSectionId } from "@/components/layout/navigation";

interface PortfolioSectionProps {
  readonly children: ReactNode;
  readonly eyebrow: string;
  readonly id: PortfolioSectionId;
  readonly number: string;
  readonly title: string;
}

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
  const Heading = id === "introduce" ? "h1" : "h2";

  return (
    <section
      id={id}
      className="section"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-section={id}
    >
      <div className="head">
        <span className="num" aria-hidden="true">
          {number}
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <Heading id={titleId}>{title}</Heading>
        </div>
      </div>
      {children}
    </section>
  );
}
