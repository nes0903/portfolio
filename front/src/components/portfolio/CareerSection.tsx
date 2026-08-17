"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

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
import { InlineImageEditor } from "@/components/portfolio/InlineImageEditor";
import {
  parseNotionListLine,
  parseNotionListText,
} from "@/components/portfolio/notion-list";
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

interface CareerWorkSummaryTitleProps {
  readonly editor?: PortfolioEditorBridge;
  readonly field: string;
  readonly text: string;
}

function CareerWorkSummaryTitle({
  editor,
  field,
  text,
}: CareerWorkSummaryTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const titleRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;

    const title = titleRef.current;
    if (!title) return;

    title.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(title);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [isEditing]);

  function handleClick(event: MouseEvent<HTMLSpanElement>): void {
    if (!isEditing) return;

    event.preventDefault();
    event.stopPropagation();
  }

  function handleBlur(event: FocusEvent<HTMLSpanElement>): void {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Element &&
      nextTarget.closest(".preview-rich-text-toolbar")
    ) {
      return;
    }

    setIsEditing(false);
  }

  function handleDoubleClick(event: MouseEvent<HTMLSpanElement>): void {
    if (!editor) return;

    event.preventDefault();
    event.stopPropagation();
    setIsEditing(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>): void {
    if (!isEditing || event.key !== "Escape") return;

    event.preventDefault();
    event.currentTarget.blur();
  }

  return (
    <span
      className="career-work-title"
      data-editor-disclosure-title={editor ? field : undefined}
      data-editor-editing={isEditing ? "true" : undefined}
      onBlur={isEditing ? handleBlur : undefined}
      onClick={editor ? handleClick : undefined}
      onDoubleClick={editor ? handleDoubleClick : undefined}
      onKeyDown={editor ? handleKeyDown : undefined}
      key={isEditing ? "editing" : "display"}
      ref={titleRef}
      title={editor && !isEditing ? "더블클릭하여 제목 편집" : undefined}
      {...(isEditing ? createEditableTextProps(editor, field) : {})}
    >
      <FormattedText text={text} />
    </span>
  );
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
                {editor ? (
                  <span className="period inline-period-editor">
                    <input
                      aria-label={`${stripInlineFormatting(career.company)} 시작 월`}
                      onChange={(event) =>
                        editor.onChangeCareerDates?.(
                          career.id,
                          event.currentTarget.value,
                          career.endDate,
                        )
                      }
                      type="month"
                      value={career.startDate}
                    />
                    <span>–</span>
                    <input
                      aria-label={`${stripInlineFormatting(career.company)} 종료 월`}
                      onChange={(event) =>
                        editor.onChangeCareerDates?.(
                          career.id,
                          career.startDate,
                          event.currentTarget.value || null,
                        )
                      }
                      type="month"
                      value={career.endDate ?? ""}
                    />
                  </span>
                ) : (
                  <p className="period">
                    {career.startDate} – {career.endDate ?? "현재"}
                  </p>
                )}
              </div>
              {editor ? (
                <div className="inline-structure-actions">
                  <button
                    onClick={() => editor.onAddItem?.("careerWork", career.id)}
                    type="button"
                  >
                    + 작업
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`${stripInlineFormatting(career.company)} 경력과 연결 작업을 삭제할까요?`)) {
                        editor.onDeleteItem?.("career", career.id);
                      }
                    }}
                    type="button"
                  >
                    경력 삭제
                  </button>
                </div>
              ) : null}

              {career.works.length === 0 ? (
                <EmptyState>표시할 경력 작업이 없습니다.</EmptyState>
              ) : (
                <div className="disclosures">
                  {career.works.map((work, index) => (
                    <details key={work.id} open={index === 0}>
                      <summary>
                        <CareerWorkSummaryTitle
                          editor={editor}
                          field={`careerWorks:${work.id}:title`}
                          text={work.title}
                        />
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
                              { richText: "notion-list" },
                            )}
                          >
                            {parseNotionListText(work.description).map(
                              (action, actionIndex) => (
                                <li
                                  data-bullet={
                                    action.isBullet ? "true" : undefined
                                  }
                                  key={`${action.text}-${actionIndex}`}
                                >
                                  <FormattedText text={action.text} />
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                        <section>
                          <h4>Outcome</h4>
                          {editor ||
                          (work.achievements &&
                            work.achievements.length > 0) ? (
                            <ul
                              aria-label={`${stripInlineFormatting(work.title)} 성과`}
                              className="career-evidence-list"
                              {...createEditableTextProps(
                                editor,
                                `careerWorkAchievements:${work.id}:all`,
                                { richText: "notion-list" },
                              )}
                            >
                              {(work.achievements &&
                              work.achievements.length > 0
                                ? work.achievements
                                : [""]
                              ).map(
                                (achievement, achievementIndex) => {
                                  const line =
                                    parseNotionListLine(achievement);

                                  return (
                                    <li
                                      data-bullet={
                                        line.isBullet ? "true" : undefined
                                      }
                                      key={`${achievement}-${achievementIndex}`}
                                    >
                                      <FormattedText text={line.text} />
                                    </li>
                                  );
                                },
                              )}
                            </ul>
                          ) : (
                            <p className="optional">
                              승인된 결과 정보가 없습니다.
                            </p>
                          )}
                        </section>
                      </div>
                      {editor ? (
                        <div className="inline-structure-actions">
                          <button
                            className="danger"
                            onClick={() => {
                              if (window.confirm(`${stripInlineFormatting(work.title)} 작업을 삭제할까요?`)) {
                                editor.onDeleteItem?.("careerWork", work.id);
                              }
                            }}
                            type="button"
                          >
                            작업 삭제
                          </button>
                        </div>
                      ) : null}
                      {work.images && work.images.length > 0 ? (
                        <CareerWorkImages
                          editor={editor}
                          images={work.images}
                          ownerId={work.id}
                          title={stripInlineFormatting(work.title)}
                        />
                      ) : null}
                      <InlineImageEditor
                        editor={editor}
                        images={work.images ?? []}
                        kind="careerWork"
                        ownerId={work.id}
                        title={stripInlineFormatting(work.title)}
                      />
                    </details>
                  ))}
                </div>
              )}
            </article>
          ))}
          {editor ? (
            <button
              className="inline-add-row"
              onClick={() => editor.onAddItem?.("career")}
              type="button"
            >
              + 경력 추가
            </button>
          ) : null}
        </div>
      )}
    </PortfolioSection>
  );
}
