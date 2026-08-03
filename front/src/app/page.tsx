import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioHeader } from "@/components/layout/PortfolioHeader";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import { PortfolioSections } from "@/components/portfolio/PortfolioSections";
import { loadPublishedPortfolioContent } from "@/lib/content/supabase-loader";

/**
 * 공개 포트폴리오 문서는 요청 시점에 Supabase에서 읽는다.
 */
export const dynamic = "force-dynamic";

/**
 * 검증된 공개 콘텐츠를 포트폴리오 페이지로 조립한다.
 */
export default async function HomePage() {
  const content = await loadPublishedPortfolioContent();

  return (
    <>
      <a className="skip" href="#introduce">
        본문으로 이동
      </a>

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
            <PortfolioSections content={content} />
          </main>

          <div className="desktop-toc">
            <PortfolioNavigation ariaLabel="페이지 목차" className="nav" />
          </div>
        </div>
      </div>

      <NavigationTracker />
    </>
  );
}
