import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SideProjectsSection } from "@/components/portfolio/SideProjectsSection";
import type { SideProject } from "@/lib/content/types";

afterEach(() => {
  cleanup();
});

const sideProjects: readonly SideProject[] = [
  {
    id: "first-project",
    name: "First Project",
    description: "첫 번째 프로젝트 설명",
    role: "Creator",
    skills: ["TypeScript", "Next.js"],
    links: {
      repository: "https://github.com/example/first-project",
      demo: "https://first-project.example.com",
    },
    order: 1,
  },
  {
    id: "second-project",
    name: "Second Project",
    description: "두 번째 프로젝트 설명",
    role: "Maintainer",
    skills: ["React"],
    links: {},
    order: 2,
  },
  {
    id: "third-project",
    name: "Third Project",
    description: "세 번째 프로젝트 설명",
    role: "Contributor",
    skills: ["Node.js"],
    links: { demo: "https://third-project.example.com" },
    order: 3,
  },
];

function projectCards(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      "section#side-projects .projects > article.project",
    ),
  ];
}

describe("SideProjectsSection", () => {
  it("project를 loader order로 한 번씩 표시하고 native details를 기본 closed로 둔다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const cards = projectCards(container);

    expect(cards).toHaveLength(3);
    expect(
      cards.map(
        (card) => within(card).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual(sideProjects.map((project) => project.name));

    cards.forEach((card, index) => {
      const project = sideProjects[index];
      if (!project) throw new Error("side-project fixture가 필요합니다");
      expect(within(card).getByText(project.description)).toBeInTheDocument();
      expect(within(card).getByText(project.role)).toBeInTheDocument();

      const skills = within(card).getByRole("list", {
        name: `${project.name} 기술`,
        hidden: true,
      });
      expect(
        within(skills)
          .getAllByRole("listitem", { hidden: true })
          .map((item) => item.textContent),
      ).toEqual(project.skills);

      const details = card.querySelector("details");
      if (!details) throw new Error("project details가 필요합니다");
      expect(details.open).toBe(false);
      expect(details.querySelector(":scope > summary")).toHaveTextContent(
        "프로젝트 근거 보기",
      );
    });

    for (const project of sideProjects) {
      expect(screen.getAllByText(project.name)).toHaveLength(1);
    }
    expect(container.querySelector("img, picture")).toBeNull();
  });

  it("제공된 repository/demo만 안전한 HTTPS external link로 렌더링한다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const [firstCard, secondCard, thirdCard] = projectCards(container);
    if (!firstCard || !secondCard || !thirdCard) {
      throw new Error("project card 세 개가 필요합니다");
    }

    const firstRepository = within(firstCard).getByRole("link", {
      name: "First Project Repository (새 창)",
      hidden: true,
    });
    const firstDemo = within(firstCard).getByRole("link", {
      name: "First Project Demo (새 창)",
      hidden: true,
    });
    const thirdDemo = within(thirdCard).getByRole("link", {
      name: "Third Project Demo (새 창)",
      hidden: true,
    });

    for (const link of [firstRepository, firstDemo, thirdDemo]) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")?.split(/\s+/)).toEqual(
        expect.arrayContaining(["noopener", "noreferrer"]),
      );
    }
    expect(within(secondCard).queryByRole("link", { hidden: true })).toBeNull();
    expect(within(secondCard).getByText(
      "Repository와 Demo는 승인된 URL이 제공될 때만 표시합니다.",
    )).toBeInTheDocument();
    expect(within(thirdCard).queryByText("Repository")).not.toBeInTheDocument();
  });

  it("빈 배열은 exact status empty state로 렌더링한다", () => {
    const { container } = render(<SideProjectsSection sideProjects={[]} />);
    const section = container.querySelector<HTMLElement>(
      "section#side-projects",
    );

    if (!section) throw new Error("side-projects section이 필요합니다");
    expect(within(section).getByRole("status")).toHaveTextContent(
      "표시할 프로젝트가 없습니다.",
    );
  });

  it("기존 side-projects anchor와 h2 accessible-name 계약을 유지한다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const section = container.querySelector<HTMLElement>(
      "section#side-projects",
    );

    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(section).toHaveAttribute("aria-labelledby", "side-projects-title");
    expect(
      screen.getByRole("heading", { level: 2, name: "프로젝트" }),
    ).toHaveAttribute("id", "side-projects-title");
  });
});
