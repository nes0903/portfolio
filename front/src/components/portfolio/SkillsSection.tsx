import { EmptyState } from "@/components/portfolio/EmptyState";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import type { PortfolioSectionVisual, Skill } from "@/lib/content/types";
import { DEFAULT_SECTION_VISUAL } from "@/lib/content/schema";

interface SkillsSectionProps {
  readonly editor?: PortfolioEditorBridge;
  readonly skills: readonly Skill[];
  readonly visual?: PortfolioSectionVisual;
}

interface SkillGroup {
  readonly category: string;
  readonly skills: Skill[];
}

/**
 * loader 정렬 순서를 유지하며 category의 최초 등장 순서로 skill을 묶는다.
 */
function groupSkillsByCategory(skills: readonly Skill[]): readonly SkillGroup[] {
  const groupsByCategory = new Map<string, SkillGroup>();

  /**
   * 입력 배열을 한 번 순회해 category와 group 내부 순서를 함께 보존한다.
   */
  for (const skill of skills) {
    const existingGroup = groupsByCategory.get(skill.category);

    /**
     * 기존 category에는 현재 skill을 loader 순서 그대로 추가한다.
     */
    if (existingGroup) {
      existingGroup.skills.push(skill);
    } else {
      groupsByCategory.set(skill.category, {
        category: skill.category,
        skills: [skill],
      });
    }
  }

  return [...groupsByCategory.values()];
}

/**
 * 승인된 skill name을 category별 접근 가능한 chip list로 렌더링한다.
 */
export function SkillsSection({
  editor,
  skills,
  visual = DEFAULT_SECTION_VISUAL,
}: SkillsSectionProps) {
  const groups = groupSkillsByCategory(skills);

  return (
    <PortfolioSection
      editor={editor}
      id="skills"
      number="02"
      eyebrow="기술"
      title="기술"
      visual={visual}
    >
      {groups.length === 0 ? (
        <EmptyState>표시할 기술이 없습니다.</EmptyState>
      ) : (
        <>
          <div className="skills">
            {groups.map((group, index) => {
              const titleId = `skill-category-${index}-title`;

              return (
                <article
                  className="card skill"
                  aria-labelledby={titleId}
                  key={group.category}
                >
                  <h3
                    id={titleId}
                    {...createEditableTextProps(
                      editor,
                      `skill-category:${group.skills.map(({ id }) => id).join(",")}`,
                    )}
                  >
                    {group.category}
                  </h3>
                  <ul className="chips" aria-label={`${group.category} 기술`}>
                    {group.skills.map((skill) => (
                      <li
                        className="chip"
                        key={skill.id}
                        {...createEditableTextProps(
                          editor,
                          `skills:${skill.id}:name`,
                        )}
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <div className="policy">
            <strong>표시 기준</strong>
            <span>
              승인된 기술만 표시하며, 제공되지 않은 숙련도는 생성하지 않습니다.
            </span>
          </div>
        </>
      )}
    </PortfolioSection>
  );
}
