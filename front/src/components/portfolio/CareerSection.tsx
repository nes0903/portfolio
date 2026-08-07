import { EmptyState } from "@/components/portfolio/EmptyState";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { CareerWorkImages } from "@/components/portfolio/CareerWorkImages";
import type {
  CareerWithWorks,
  PortfolioSectionVisual,
} from "@/lib/content/types";
import { DEFAULT_SECTION_VISUAL } from "@/lib/content/schema";

interface CareerSectionProps {
  readonly careers: readonly CareerWithWorks[];
  readonly editor?: PortfolioEditorBridge;
  readonly visual?: PortfolioSectionVisual;
}

/**
 * 검증된 경력과 joined work를 native disclosure 목록으로 렌더링한다.
 */
export function CareerSection({
  careers,
  editor,
  visual = DEFAULT_SECTION_VISUAL,
}: CareerSectionProps) {
  return (
    <PortfolioSection
      editor={editor}
      id="career"
      number="02"
      eyebrow="경력"
      title="경력"
      visual={visual}
    >
      {careers.length === 0 ? (
        <EmptyState>표시할 경력이 없습니다.</EmptyState>
      ) : (
        <div className="career-list">
          {careers.map((career) => (
            <article className="career" key={career.id}>
              <div className="career-top">
                <div>
                  <p
                    className="eyebrow"
                    {...createEditableTextProps(
                      editor,
                      `careers:${career.id}:company`,
                    )}
                  >
                    {career.company}
                  </p>
                  <h3
                    {...createEditableTextProps(
                      editor,
                      `careers:${career.id}:role`,
                    )}
                  >
                    {career.role}
                  </h3>
                  {career.summary ? (
                    <p
                      {...createEditableTextProps(
                        editor,
                        `careers:${career.id}:summary`,
                      )}
                    >
                      {career.summary}
                    </p>
                  ) : null}
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
                      <summary
                        {...createEditableTextProps(
                          editor,
                          `careerWorks:${work.id}:title`,
                        )}
                      >
                        {work.title}
                      </summary>
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
                          <p
                            {...createEditableTextProps(
                              editor,
                              `careerWorks:${work.id}:description`,
                            )}
                          >
                            {work.description}
                          </p>
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
                      {work.images && work.images.length > 0 ? (
                        <CareerWorkImages
                          images={work.images}
                          title={work.title}
                        />
                      ) : null}
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
