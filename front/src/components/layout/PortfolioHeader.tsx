/**
 * 이름 placeholder 없이 포트폴리오 정체성과 section 범위만 표시한다.
 */
export function PortfolioHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <a className="site-brand" href="#introduce">
          PORTFOLIO
        </a>
      </div>
    </header>
  );
}
