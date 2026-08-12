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

            return (
              <details
                className="project"
                key={project.id}
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
                  {project.highlights.length > 0 ? (
                    <ul
                      aria-label={`${stripInlineFormatting(project.name)} 상세 작업`}
                      className="project-highlights"
                    >
                      {project.highlights.map((highlight, highlightIndex) => (
                        <li
                          key={`${highlight}-${highlightIndex}`}
                          {...createEditableTextProps(
                            editor,
                            `sideProjectHighlights:${project.id}:${highlightIndex}`,
                          )}
                        >
                          <FormattedText text={highlight} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ul
                    className="chips"
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

                  {project.images.length > 0 ? (
                    <PortfolioImageGallery
                      contextLabel="프로젝트"
                      heading="Project Screenshots"
                      images={project.images}
                      title={stripInlineFormatting(project.name)}
                    />
                  ) : null}

                  {hasApprovedLink ? (
                    <div className="actions project-actions">
                      {project.links.repository ? (
                        <a
                          className="btn alt"
                          href={project.links.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${stripInlineFormatting(project.name)} Repository (새 창)`}
                        >
                          Repository
                        </a>
                      ) : null}
                      {project.links.demo ? (
                        <a
                          className="btn alt"
                          href={project.links.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${stripInlineFormatting(project.name)} Demo (새 창)`}
                        >
                          Demo
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </PortfolioSection>
  );
}
