import { PORTFOLIO_SECTIONS } from "@/components/layout/navigation";

interface PortfolioNavigationProps {
  readonly ariaLabel: string;
  readonly className?: string;
}

/**
 * 연속 scroll section을 이동하는 세로형 4개 anchor 목록.
 */
export function PortfolioNavigation({
  ariaLabel,
  className,
}: PortfolioNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
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
              <span className="nav-number" aria-hidden="true">
                {section.number}
              </span>
              <span className="nav-label">{section.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
