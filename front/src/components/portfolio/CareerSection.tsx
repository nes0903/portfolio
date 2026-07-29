import { EmptyState } from "@/components/portfolio/EmptyState";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import type { CareerWithWorks } from "@/lib/content/types";

interface CareerSectionProps {
  readonly careers: readonly CareerWithWorks[];
}

/**
 * 검증된 경력과 joined work를 native disclosure 목록으로 렌더링한다.
 */
export function CareerSection({ careers }: CareerSectionProps) {
  return (
    <PortfolioSection id="career" number="03" eyebrow="경력" title="경력">
      {careers.length === 0 ? (
        <EmptyState>표시할 경력이 없습니다.</EmptyState>
      ) : (
        <div className="career-list">
          {careers.map((career) => (
            <article className="career" key={career.id}>
              <div className="career-top">
                <div>
                  <p className="eyebrow">{career.company}</p>
                  <h3>{career.role}</h3>
                  {career.summary ? <p>{career.summary}</p> : null}
                </div>
                <p className="period">
                  {career.startDate} – {career.endDate ?? "현재"}
                </p>
              </div>

              {career.works.length === 0 ? (
                <EmptyState>표시할 경력 작업이 없습니다.</EmptyState>
              ) : (
                <div className="disclosures">
                  {career.works.map((work, index) => (
                    <details key={work.id} open={index === 0}>
                      <summary>{work.title}</summary>
                      <div className="evidence">
                        <section>
                          <h4>Context</h4>
                          {career.summary ? (
                            <p>{career.summary}</p>
                          ) : (
                            <p className="optional">
                              승인된 맥락 정보가 없습니다.
                            </p>
                          )}
                        </section>
                        <section>
                          <h4>Action</h4>
                          <p>{work.description}</p>
                        </section>
                        <section>
                          <h4>Verified Outcome</h4>
                          {work.achievements && work.achievements.length > 0 ? (
                            <ul aria-label={`${work.title} 성과`}>
                              {work.achievements.map((achievement) => (
                                <li key={achievement}>{achievement}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="optional">
                              승인된 결과 정보가 없습니다.
                            </p>
                          )}
                        </section>
                        <section>
                          <h4>Tech</h4>
                          {work.technologies && work.technologies.length > 0 ? (
                            <ul
                              className="chips"
                              aria-label={`${work.title} 기술`}
                            >
                              {work.technologies.map((technology) => (
                                <li className="chip" key={technology}>
                                  {technology}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="optional">
                              승인된 기술 정보가 없습니다.
                            </p>
                          )}
                        </section>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </PortfolioSection>
  );
}
