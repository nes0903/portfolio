import { PORTFOLIO_SECTIONS } from "@/components/layout/navigation";

interface PortfolioNavigationProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly metaLabel?: string;
}

/**
 * desktop rail과 mobile TOC가 공유하는 5개 anchor 목록.
 */
export function PortfolioNavigation({
  ariaLabel,
  className,
  metaLabel,
}: PortfolioNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      {metaLabel ? <span className="meta">{metaLabel}</span> : null}
      <ol>
        {PORTFOLIO_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              data-nav={section.id}
              aria-current={
                section.id === "introduce" ? "location" : undefined
              }
            >
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
