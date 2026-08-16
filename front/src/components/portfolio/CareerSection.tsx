import { EmptyState } from "@/components/portfolio/EmptyState";
import {
  FormattedText,
  stripInlineFormatting,
} from "@/components/portfolio/FormattedText";
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

function getActionItems(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
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
      visibleHeading
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
                    <FormattedText text={career.company} />
                  </p>
                  <h3
                    {...createEditableTextProps(
                      editor,
                      `careers:${career.id}:role`,
                    )}
                  >
                    <FormattedText text={career.role} />
                  </h3>
                  {career.summary ? (
                    <p
                      {...createEditableTextProps(
                        editor,
                        `careers:${career.id}:summary`,
                      )}
                    >
                      <FormattedText text={career.summary} />
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
                        <FormattedText text={work.title} />
                      </summary>
                      <div className="evidence">
                        <section className="career-evidence-tech">
                          <h4>Tech</h4>
                          {work.technologies && work.technologies.length > 0 ? (
                            <ul
                              className="chips"
                              aria-label={`${stripInlineFormatting(work.title)} 기술`}
                            >
                              {work.technologies.map((technology, techIndex) => (
                                <li
                                  className="chip"
                                  key={`${technology}-${techIndex}`}
                                  {...createEditableTextProps(
                                    editor,
                                    `careerWorkTechnologies:${work.id}:${techIndex}`,
                                  )}
                                >
                                  <FormattedText text={technology} />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="optional">
                              승인된 기술 정보가 없습니다.
                            </p>
                          )}
                        </section>
                        <section>
                          <h4>Action</h4>
                          <ul
                            aria-label={`${stripInlineFormatting(work.title)} 작업 내용`}
                            className="career-evidence-list"
                            {...createEditableTextProps(
                              editor,
                              `careerWorks:${work.id}:description`,
                              { richText: "career-action" },
                            )}
                          >
                            {getActionItems(work.description).map(
                              (action, actionIndex) => (
                                <li key={`${action}-${actionIndex}`}>
                                  <FormattedText text={action} />
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                        <section>
                          <h4>Outcome</h4>
                          {work.achievements && work.achievements.length > 0 ? (
                            <ul
                              aria-label={`${stripInlineFormatting(work.title)} 성과`}
                              className="career-evidence-list"
                            >
                              {work.achievements.map(
                                (achievement, achievementIndex) => (
                                  <li
                                    key={`${achievement}-${achievementIndex}`}
                                    {...createEditableTextProps(
                                      editor,
                                      `careerWorkAchievements:${work.id}:${achievementIndex}`,
                                    )}
                                  >
                                    <FormattedText text={achievement} />
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p className="optional">
                              승인된 결과 정보가 없습니다.
                            </p>
                          )}
                        </section>
                      </div>
                      {work.images && work.images.length > 0 ? (
                        <CareerWorkImages
                          images={work.images}
                          title={stripInlineFormatting(work.title)}
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
