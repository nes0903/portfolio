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

      <header className="site-banner shell">
        <a className="site-id" href="#introduce" aria-label="포트폴리오 처음으로">
          [NAME]
        </a>
        <div className="banner-meta" aria-label="포트폴리오 정보">
          <span>SOFTWARE ENGINEER</span>
          <span>PORTFOLIO / SELECTED WORK</span>
        </div>
      </header>

      <div className="mobile-toc shell">
        <PortfolioNavigation
          ariaLabel="모바일 페이지 목차"
          metaLabel="페이지 목차"
        />
      </div>

      <div className="shell layout">
        <aside className="rail" aria-label="포트폴리오 요약">
          <p className="rail-kicker">PORTFOLIO</p>
          <p className="rail-name" aria-hidden="true">
            [NAME]
          </p>

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
                target={primaryContact.channel === "email" ? undefined : "_blank"}
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
        </aside>

        <div className="stage">
          <div className="reel-track" aria-hidden="true">
            <span>01A</span>
            <span>02</span>
            <span>03A</span>
            <span>04</span>
            <span>05A</span>
          </div>

          <main>
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
