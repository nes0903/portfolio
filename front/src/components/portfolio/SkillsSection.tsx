import { EmptyState } from "@/components/portfolio/EmptyState";
import {
  FormattedText,
  stripInlineFormatting,
} from "@/components/portfolio/FormattedText";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import type { Skill } from "@/lib/content/types";

interface SkillsContentProps {
  readonly editor?: PortfolioEditorBridge;
  readonly skills: readonly Skill[];
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
 * 소개 section 안에서 승인된 skill name을 category별 chip list로 렌더링한다.
 */
export function SkillsContent({
  editor,
  skills,
}: SkillsContentProps) {
  const groups = groupSkillsByCategory(skills);

  return (
    <div
      aria-labelledby="skills-title"
      className="introduction-skills"
      data-skills-content
      id="skills"
    >
      <div className="introduction-skills-heading">
        <p className="eyebrow">기술</p>
        <h2 className="sr-only" id="skills-title">
          기술
        </h2>
      </div>
      {groups.length === 0 ? (
        <EmptyState>표시할 기술이 없습니다.</EmptyState>
      ) : (
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
                  <FormattedText text={group.category} />
                </h3>
                <ul
                  className="chips"
                  aria-label={`${stripInlineFormatting(group.category)} 기술`}
                >
                  {group.skills.map((skill) => (
                    <li
                      className="chip"
                      key={skill.id}
                      {...createEditableTextProps(
                        editor,
                        `skills:${skill.id}:name`,
                      )}
                    >
                      <FormattedText text={skill.name} />
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
