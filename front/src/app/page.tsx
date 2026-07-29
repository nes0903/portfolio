import { IndexSignal } from "@/components/layout/IndexSignal";
import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import { PortfolioSections } from "@/components/portfolio/PortfolioSections";
import { loadPortfolioContent } from "@/lib/content/loader";

/**
 * 검증된 build-time 콘텐츠를 단일 정적 포트폴리오 페이지로 조립한다.
 */
export default async function HomePage() {
  const content = await loadPortfolioContent();

  return (
    <>
      <a className="skip" href="#introduce">
        본문으로 이동
      </a>

      <header className="site-banner shell">
        <IndexSignal />
        <div className="brand-name">
          [NAME]
          <small>/ PORTFOLIO</small>
        </div>
      </header>

      <div className="mobile-toc shell">
        <PortfolioNavigation
          ariaLabel="모바일 페이지 목차"
          metaLabel="페이지 목차"
        />
      </div>

      <div className="shell layout">
        <aside className="rail" aria-label="포트폴리오 탐색">
          <div className="brand">
            <IndexSignal />
            <div className="brand-name">
              [NAME]
              <small>/ PORTFOLIO</small>
            </div>
          </div>

          <span className="status">BUILD-TIME CONTENT</span>
          <PortfolioNavigation ariaLabel="페이지 목차" className="nav" />
        </aside>

        <main>
          <PortfolioSections content={content} />
        </main>
      </div>

      <footer>
        <div className="shell footer">
          <span>[NAME] / PORTFOLIO</span>
          <span className="meta">Evidence follows structure.</span>
        </div>
      </footer>

      <NavigationTracker />
    </>
  );
}
