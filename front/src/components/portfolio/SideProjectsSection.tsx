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
 * 승인된 프로젝트 필드와 제공된 HTTPS 링크만 native disclosure에 표시한다.
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
    >
      {sideProjects.length === 0 ? (
        <EmptyState>표시할 프로젝트가 없습니다.</EmptyState>
      ) : (
        <div className="projects">
          {sideProjects.map((project) => {
            const hasApprovedLink =
              project.links.repository !== undefined ||
              project.links.demo !== undefined;

            return (
              <article className="card project" key={project.id}>
                {project.period ? (
                  <p
                    className="eyebrow"
                    {...createEditableTextProps(
                      editor,
                      `sideProjects:${project.id}:period`,
                    )}
                  >
                    <FormattedText text={project.period} />
                  </p>
                ) : null}
                <h3
                  {...createEditableTextProps(
                    editor,
                    `sideProjects:${project.id}:name`,
                  )}
                >
                  <FormattedText text={project.name} />
                </h3>
                <p
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

                <details>
                  <summary>프로젝트 근거 보기</summary>
                  <div className="project-data">
                    {hasApprovedLink ? (
                      <div className="actions">
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
                    ) : (
                      <p className="optional">
                        Repository와 Demo는 승인된 URL이 제공될 때만 표시합니다.
                      </p>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </PortfolioSection>
  );
}
