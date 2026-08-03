import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import { PortfolioSections } from "@/components/portfolio/PortfolioSections";
import { loadPortfolioContent } from "@/lib/content/loader";

/**
 * 검증된 build-time 콘텐츠를 단일 정적 포트폴리오 페이지로 조립한다.
 */
export default async function HomePage() {
  const content = await loadPortfolioContent();
  const featuredProject = content.sideProjects[0];
  const primarySkill = content.skills[0];
  const primaryCareer = content.careers[0];
  const primaryContact = content.contacts[0];

  return (
    <>
      <a className="skip" href="#introduce">
        본문으로 이동
      </a>

      <div className="mobile-toc shell">
        <PortfolioNavigation
          ariaLabel="모바일 페이지 목차"
          metaLabel="페이지 목차"
        />
      </div>

      <div className="shell layout">
        <aside className="rail" aria-label="포트폴리오 요약">
          <div className="rail-trigger">
            <p className="rail-name" aria-hidden="true">
              [NAME]
            </p>
            <span className="rail-trigger-hint" aria-hidden="true">
              PROFILE ↘
            </span>
          </div>

          <div className="rail-panel">
            <p className="rail-kicker">PORTFOLIO</p>

            <div className="rail-copy">
              <strong>{content.introduce.title}</strong>
              <p>{featuredProject?.name ?? "SELECTED WORK"}</p>
            </div>

            <dl className="rail-facts">
              {primarySkill ? (
                <div>
                  <dt>SKILL</dt>
                  <dd>{primarySkill.name}</dd>
                </div>
              ) : null}
              {primaryCareer ? (
                <div>
                  <dt>ROLE</dt>
                  <dd>{primaryCareer.role}</dd>
                </div>
              ) : null}
              {primaryCareer ? (
                <div>
                  <dt>STUDIO</dt>
                  <dd>{primaryCareer.company}</dd>
                </div>
              ) : null}
            </dl>

            <div className="rail-links">
              {featuredProject?.links.repository ? (
                <a
                  href={featuredProject.links.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Repository
                </a>
              ) : null}
              {primaryContact ? (
                <a
                  href={primaryContact.url}
                  target={
                    primaryContact.channel === "email" ? undefined : "_blank"
                  }
                  rel={
                    primaryContact.channel === "email"
                      ? undefined
                      : "noopener noreferrer"
                  }
                >
                  {primaryContact.label}
                </a>
              ) : null}
            </div>
          </div>
        </aside>

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
