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
import { PortfolioImageGallery } from "@/components/portfolio/CareerWorkImages";
import { InlineImageEditor } from "@/components/portfolio/InlineImageEditor";
import { parseNotionListLine } from "@/components/portfolio/notion-list";
import type { PortfolioSectionVisual, SideProject } from "@/lib/content/types";
import { DEFAULT_SECTION_VISUAL } from "@/lib/content/schema";

interface SideProjectsSectionProps {
  readonly editor?: PortfolioEditorBridge;
  readonly sideProjects: readonly SideProject[];
  readonly visual?: PortfolioSectionVisual;
}

/**
 * 승인된 프로젝트를 한 번에 하나만 열리는 native disclosure 목록으로 표시한다.
 */
export function SideProjectsSection({
  editor,
  sideProjects,
  visual = DEFAULT_SECTION_VISUAL,
}: SideProjectsSectionProps) {
  return (
    <PortfolioSection
      id="side-projects"
      number="03"
      eyebrow="프로젝트"
      title="프로젝트"
      editor={editor}
      visual={visual}
      visibleHeading
    >
      {sideProjects.length === 0 ? (
        <EmptyState>표시할 프로젝트가 없습니다.</EmptyState>
      ) : (
        <div className="projects">
          {sideProjects.map((project, projectIndex) => {
            const hasApprovedLink =
              project.links.repository !== undefined ||
              project.links.demo !== undefined;

            const approvedLinkCount = editor
              ? 2
              : Number(project.links.repository !== undefined) +
                Number(project.links.demo !== undefined);

            return (
              <div
                className="project-shell"
                data-editor={editor ? "true" : undefined}
                data-project-link-count={approvedLinkCount}
                key={project.id}
              >
                <details
                  className="project"
                  name="side-projects-accordion"
                >
                <summary className="project-summary">
                  <span aria-hidden="true" className="project-index">
                    {String(projectIndex + 1).padStart(2, "0")}
                  </span>
                  <h3
                    {...createEditableTextProps(
                      editor,
                      `sideProjects:${project.id}:name`,
                    )}
                  >
                    <FormattedText text={project.name} />
                  </h3>
                  <span
                    aria-hidden={project.period ? undefined : true}
                    className="project-period"
                    {...(project.period
                      ? createEditableTextProps(
                          editor,
                          `sideProjects:${project.id}:period`,
                        )
                      : {})}
                  >
                    {project.period ? (
                      <FormattedText text={project.period} />
                    ) : null}
                  </span>
                </summary>

                <ul
                  className="chips project-tech"
                  aria-label={`${stripInlineFormatting(project.name)} 기술`}
                >
                  {project.skills.map((skill, skillIndex) => (
                    <li
                      className="chip"
                      key={`${skill}-${skillIndex}`}
                      {...createEditableTextProps(
                        editor,
                        `sideProjectSkills:${project.id}:${skillIndex}`,
                      )}
                    >
                      <FormattedText text={skill} />
                    </li>
                  ))}
                </ul>

                <div className="project-body">
                  <p
                    className="project-description"
                    {...createEditableTextProps(
                      editor,
                      `sideProjects:${project.id}:description`,
                    )}
                  >
                    <FormattedText text={project.description} />
                  </p>
                  {editor || project.highlights.length > 0 ? (
                    <ul
                      aria-label={`${stripInlineFormatting(project.name)} 상세 작업`}
                      className="project-highlights"
                      {...createEditableTextProps(
                        editor,
                        `sideProjectHighlights:${project.id}:all`,
                        { richText: "notion-list" },
                      )}
                    >
                      {(project.highlights.length > 0
                        ? project.highlights
                        : [""]
                      ).map((highlight, highlightIndex) => {
                        const line = parseNotionListLine(highlight);

                        return (
                          <li
                            data-bullet={line.isBullet ? "true" : undefined}
                            key={`${highlight}-${highlightIndex}`}
                          >
                            <FormattedText text={line.text} />
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {project.images.length > 0 ? (
                    <PortfolioImageGallery
                      contextLabel="프로젝트"
                      editor={editor}
                      heading="Project Screenshots"
                      images={project.images}
                      kind="project"
                      ownerId={project.id}
                      title={stripInlineFormatting(project.name)}
                    />
                  ) : null}
                  <InlineImageEditor
                    editor={editor}
                    images={project.images}
                    kind="project"
                    ownerId={project.id}
                    title={stripInlineFormatting(project.name)}
                  />
                </div>
                </details>

                {editor ? (
                  <span className="project-header-actions inline-project-link-editor">
                    <input
                      aria-label={`${stripInlineFormatting(project.name)} Repository URL`}
                      onChange={(event) =>
                        editor.onChangeProjectLink?.(
                          project.id,
                          "repository",
                          event.currentTarget.value,
                        )
                      }
                      placeholder="Repository URL"
                      type="url"
                      value={project.links.repository ?? ""}
                    />
                    <input
                      aria-label={`${stripInlineFormatting(project.name)} Link URL`}
                      onChange={(event) =>
                        editor.onChangeProjectLink?.(
                          project.id,
                          "demo",
                          event.currentTarget.value,
                        )
                      }
                      placeholder="Link URL"
                      type="url"
                      value={project.links.demo ?? ""}
                    />
                  </span>
                ) : hasApprovedLink ? (
                  <span className="project-header-actions">
                    {project.links.repository ? (
                      <a
                        className="project-text-link"
                        href={project.links.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${stripInlineFormatting(project.name)} Repository (새 창)`}
                      >
                        Repository ↗
                      </a>
                    ) : null}
                    {project.links.demo ? (
                      <a
                        className="project-text-link"
                        href={project.links.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${stripInlineFormatting(project.name)} Link (새 창)`}
                      >
                        Link ↗
                      </a>
                    ) : null}
                  </span>
                ) : null}
                {editor ? (
                  <button
                    aria-label={`${stripInlineFormatting(project.name)} 프로젝트 삭제`}
                    className="project-inline-delete"
                    onClick={() => {
                      if (window.confirm(`${stripInlineFormatting(project.name)} 프로젝트를 삭제할까요?`)) {
                        editor.onDeleteItem?.("project", project.id);
                      }
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            );
          })}
          {editor ? (
            <button
              className="inline-add-row"
              onClick={() => editor.onAddItem?.("project")}
              type="button"
            >
              + 프로젝트 추가
            </button>
          ) : null}
        </div>
      )}
    </PortfolioSection>
  );
}
