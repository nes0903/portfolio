import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SkillsSection } from "@/components/portfolio/SkillsSection";
import type { Skill } from "@/lib/content/types";

afterEach(() => {
  cleanup();
});

const skills = [
  { id: "react", name: "React", category: "Zeta Frontend", order: 1 },
  { id: "node", name: "Node.js", category: "Alpha Backend", order: 2 },
  { id: "typescript", name: "TypeScript", category: "Zeta Frontend", order: 3 },
  { id: "postgres", name: "PostgreSQL", category: "Middle Data", order: 4 },
] as const satisfies readonly Skill[];

describe("SkillsSection", () => {
  it("category 최초 등장 순서로 group을 만들고 group 내부 loader order를 유지한다", () => {
    const { container } = render(<SkillsSection skills={skills} />);
    const groups = [
      ...container.querySelectorAll<HTMLElement>(
        "section#skills article[aria-labelledby]",
      ),
    ];

    expect(groups).toHaveLength(3);
    expect(
      groups.map(
        (group) => within(group).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual(["Zeta Frontend", "Alpha Backend", "Middle Data"]);

    const expectedNamesByCategory = [
      ["React", "TypeScript"],
      ["Node.js"],
      ["PostgreSQL"],
    ];

    groups.forEach((group, index) => {
      const heading = within(group).getByRole("heading", { level: 3 });
      expect(group).toHaveAttribute("aria-labelledby", heading.id);
      const list = within(group).getByRole("list", {
        name: `${heading.textContent} 기술`,
      });
      expect(
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(expectedNamesByCategory[index]);
    });

    for (const skill of skills) {
      expect(screen.getAllByText(skill.name)).toHaveLength(1);
    }
  });

  it("미제공 proficiency를 생성하지 않고 exact 표시 정책을 한 번만 렌더링한다", () => {
    const { container } = render(<SkillsSection skills={skills} />);
    const groups = container.querySelectorAll("section#skills article");

    groups.forEach((group) => {
      expect(
        group.querySelector(
          [
            "progress",
            "meter",
            '[role="progressbar"]',
            "[aria-valuenow]",
            "[aria-valuemin]",
            "[aria-valuemax]",
            "[data-score]",
            "[data-level]",
            "[data-progress]",
          ].join(", "),
        ),
      ).toBeNull();
      expect(group).not.toHaveTextContent(
        /초급|중급|고급|beginner|intermediate|advanced|\bscore\b|\bprogress\b|\d+\s*%|\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/i,
      );
    });
    const policies = container.querySelectorAll<HTMLElement>(
      "section#skills div.policy",
    );
    expect(policies).toHaveLength(1);
    const policy = policies[0];
    if (!policy) throw new Error("skills policy가 필요합니다");
    expect(within(policy).getByText("표시 기준", { selector: "strong" })).toBeInTheDocument();
    expect(
      within(policy).getByText(
        "승인된 기술만 표시하며, 제공되지 않은 숙련도는 생성하지 않습니다.",
        { selector: "span" },
      ),
    ).toBeInTheDocument();
  });

  it("빈 배열에서는 표시 정책을 중복 노출하지 않는다", () => {
    const { container } = render(<SkillsSection skills={[]} />);

    expect(container).not.toHaveTextContent("표시 기준");
    expect(container).not.toHaveTextContent(
      "승인된 기술만 표시하며, 제공되지 않은 숙련도는 생성하지 않습니다.",
    );
  });

  it("빈 배열은 명시적 status empty state로 렌더링한다", () => {
    const { container } = render(<SkillsSection skills={[]} />);
    const section = container.querySelector<HTMLElement>("section#skills");

    if (!section) throw new Error("skills section이 필요합니다");
    expect(within(section).getByRole("status")).toHaveTextContent(
      /^표시할 기술이 없습니다\.$/,
    );
  });

  it("기존 skills anchor와 h2 accessible-name 계약을 유지한다", () => {
    const { container } = render(<SkillsSection skills={skills} />);
    const section = container.querySelector<HTMLElement>("section#skills");

    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(section).toHaveAttribute("aria-labelledby", "skills-title");
    expect(
      screen.getByRole("heading", { level: 2, name: "기술" }),
    ).toHaveAttribute("id", "skills-title");
  });
});
