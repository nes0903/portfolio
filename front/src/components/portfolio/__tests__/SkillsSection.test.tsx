import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SkillsContent } from "@/components/portfolio/SkillsSection";
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

describe("SkillsContent", () => {
  it("category 최초 등장 순서로 group을 만들고 group 내부 loader order를 유지한다", () => {
    const { container } = render(<SkillsContent skills={skills} />);
    const groups = [
      ...container.querySelectorAll<HTMLElement>(
        "[data-skills-content] article[aria-labelledby]",
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

  it("미제공 proficiency와 표시 정책 문구를 렌더링하지 않는다", () => {
    const { container } = render(<SkillsContent skills={skills} />);
    const groups = container.querySelectorAll("[data-skills-content] article");

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
    expect(container).not.toHaveTextContent("표시 기준");
    expect(container).not.toHaveTextContent(
      "승인된 기술만 표시하며, 제공되지 않은 숙련도는 생성하지 않습니다.",
    );
  });

  it("빈 배열에서는 표시 정책을 중복 노출하지 않는다", () => {
    const { container } = render(<SkillsContent skills={[]} />);

    expect(container).not.toHaveTextContent("표시 기준");
    expect(container).not.toHaveTextContent(
      "승인된 기술만 표시하며, 제공되지 않은 숙련도는 생성하지 않습니다.",
    );
  });

  it("빈 배열은 명시적 status empty state로 렌더링한다", () => {
    const { container } = render(<SkillsContent skills={[]} />);
    const content = container.querySelector<HTMLElement>("[data-skills-content]");

    if (!content) throw new Error("skills content가 필요합니다");
    expect(within(content).getByRole("status")).toHaveTextContent(
      /^표시할 기술이 없습니다\.$/,
    );
  });

  it("소개 내부에서 사용할 skills anchor와 h2 accessible-name을 제공한다", () => {
    const { container } = render(<SkillsContent skills={skills} />);
    const content = container.querySelector<HTMLElement>("[data-skills-content]");

    expect(content).not.toBeNull();
    expect(content).toHaveAttribute("id", "skills");
    expect(content).toHaveAttribute("aria-labelledby", "skills-title");
    expect(container.querySelector("section#skills")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "기술" }),
    ).toHaveAttribute("id", "skills-title");
    expect(
      screen.getByRole("heading", { level: 2, name: "기술" }),
    ).toHaveClass("sr-only");
  });
});
