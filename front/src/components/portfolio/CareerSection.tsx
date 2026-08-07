import type { ReactNode } from "react";

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

function getActionItems(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

interface InlineFormatMatch {
  readonly close: string;
  readonly index: number;
  readonly open: string;
  readonly type: "bold" | "highlight" | "italic" | "underline";
}

const INLINE_FORMATS: readonly Omit<InlineFormatMatch, "index">[] = [
  { close: "[/b]", open: "[b]", type: "bold" },
  { close: "[/i]", open: "[i]", type: "italic" },
  { close: "[/u]", open: "[u]", type: "underline" },
  { close: "[/mark]", open: "[mark]", type: "highlight" },
];

function findInlineFormat(text: string): InlineFormatMatch | undefined {
  let closest: InlineFormatMatch | undefined;

  for (const format of INLINE_FORMATS) {
    const index = text.indexOf(format.open);

    if (index >= 0 && (!closest || index < closest.index)) {
      closest = { ...format, index };
    }
  }

  return closest;
}

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const format = findInlineFormat(text);

  if (!format) return text ? [text] : [];

  const contentStart = format.index + format.open.length;
  const closeIndex = text.indexOf(format.close, contentStart);

  if (closeIndex < 0) return [text];

  const before = text.slice(0, format.index);
  const content = renderInlineFormatting(
    text.slice(contentStart, closeIndex),
    `${keyPrefix}-content`,
  );
  const after = renderInlineFormatting(
    text.slice(closeIndex + format.close.length),
    `${keyPrefix}-after`,
  );
  const formatted =
    format.type === "bold" ? (
      <strong key={`${keyPrefix}-bold`}>{content}</strong>
    ) : format.type === "italic" ? (
      <em key={`${keyPrefix}-italic`}>{content}</em>
    ) : format.type === "underline" ? (
      <u key={`${keyPrefix}-underline`}>{content}</u>
    ) : (
      <mark key={`${keyPrefix}-highlight`}>{content}</mark>
    );

  return before ? [before, formatted, ...after] : [formatted, ...after];
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
                        <section>
                          <h4>Action</h4>
                          <ul
                            aria-label={`${work.title} 작업 내용`}
                            className="career-evidence-list"
                            data-editor-rich-text={
                              editor ? "career-action" : undefined
                            }
                            {...createEditableTextProps(
                              editor,
                              `careerWorks:${work.id}:description`,
                            )}
                          >
                            {getActionItems(work.description).map(
                              (action, actionIndex) => (
                                <li key={`${action}-${actionIndex}`}>
                                  {renderInlineFormatting(
                                    action,
                                    `${work.id}-action-${actionIndex}`,
                                  )}
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                        <section>
                          <h4>Outcome</h4>
                          {work.achievements && work.achievements.length > 0 ? (
                            <ul
                              aria-label={`${work.title} 성과`}
                              className="career-evidence-list"
                            >
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
