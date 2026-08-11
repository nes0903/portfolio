import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SideProjectsSection } from "@/components/portfolio/SideProjectsSection";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import type { SideProject } from "@/lib/content/types";

afterEach(() => {
  cleanup();
});

const sideProjects: readonly SideProject[] = [
  {
    id: "first-project",
    name: "First Project",
    period: "2026",
    description: "첫 번째 프로젝트 설명",
    highlights: ["첫 번째 상세 작업", "두 번째 상세 작업"],
    images: [],
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
    period: "2025-07~",
    description: "두 번째 프로젝트 설명",
    highlights: [],
    images: [],
    skills: ["React"],
    links: {},
    order: 2,
  },
  {
    id: "third-project",
    name: "Third Project",
    description: "세 번째 프로젝트 설명",
    highlights: ["세 번째 상세 작업"],
    images: [],
    skills: ["Node.js"],
    links: { demo: "https://third-project.example.com" },
    order: 3,
  },
];

function projectDisclosures(container: HTMLElement): HTMLDetailsElement[] {
  return [
    ...container.querySelectorAll<HTMLDetailsElement>(
      "section#side-projects .projects > details.project",
    ),
  ];
}

describe("SideProjectsSection", () => {
  it("project를 loader order의 compact disclosure로 한 번씩 표시하고 기본 closed로 둔다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const disclosures = projectDisclosures(container);

    expect(disclosures).toHaveLength(3);
    expect(
      disclosures.map(
        (disclosure) =>
          within(disclosure).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual(sideProjects.map((project) => project.name));

    disclosures.forEach((disclosure, index) => {
      const project = sideProjects[index];
      if (!project) throw new Error("side-project fixture가 필요합니다");
      const summary = disclosure.querySelector<HTMLElement>(":scope > summary");
      if (!summary) throw new Error("project summary가 필요합니다");

      expect(disclosure.open).toBe(false);
      expect(disclosure).toHaveAttribute("name", "side-projects-accordion");
      expect(within(summary).getByText(String(index + 1).padStart(2, "0")))
        .toBeInTheDocument();
      expect(within(summary).getByText(project.name)).toBeInTheDocument();
      if (project.period) {
        expect(within(summary).getByText(project.period)).toBeInTheDocument();
      }

      expect(within(disclosure).getByText(project.description))
        .toBeInTheDocument();

      if (project.highlights.length > 0) {
        const highlights = within(disclosure).getByRole("list", {
          name: `${project.name} 상세 작업`,
          hidden: true,
        });
        expect(
          within(highlights)
            .getAllByRole("listitem", { hidden: true })
            .map((item) => item.textContent),
        ).toEqual(project.highlights);
      }

      const skills = within(disclosure).getByRole("list", {
        name: `${project.name} 기술`,
        hidden: true,
      });
      expect(
        within(skills)
          .getAllByRole("listitem", { hidden: true })
          .map((item) => item.textContent),
      ).toEqual(project.skills);
    });

    for (const project of sideProjects) {
      expect(screen.getAllByText(project.name)).toHaveLength(1);
    }
    expect(screen.queryByText("프로젝트 근거 보기")).toBeNull();
    expect(container.querySelector("img, picture")).toBeNull();
  });

  it("모든 project를 같은 exclusive details 그룹으로 묶는다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const disclosures = projectDisclosures(container);

    expect(disclosures).toHaveLength(sideProjects.length);
    expect(new Set(disclosures.map((item) => item.getAttribute("name"))))
      .toEqual(new Set(["side-projects-accordion"]));
    expect(disclosures.every((item) => item.open === false)).toBe(true);
  });

  it("관리자 미리보기의 기존 project inline editor field를 유지한다", () => {
    const editor: PortfolioEditorBridge = {
      onChangeIntroductionTextBlock: vi.fn(),
      onSelectIntroductionTextBlock: vi.fn(),
      onSelectSection: vi.fn(),
      onTextCommit: vi.fn(),
      selectedIntroductionTextBlockId: null,
      selectedSection: "side-projects",
    };
    const { container } = render(
      <SideProjectsSection editor={editor} sideProjects={[sideProjects[0]!]} />,
    );

    for (const field of [
      "sideProjects:first-project:name",
      "sideProjects:first-project:period",
      "sideProjects:first-project:description",
      "sideProjectHighlights:first-project:0",
      "sideProjectSkills:first-project:0",
    ]) {
      expect(container.querySelector(`[data-editor-field="${field}"]`))
        .not.toBeNull();
    }
  });

  it("프로젝트 이미지를 갤러리와 좌우 이동 가능한 modal로 표시한다", () => {
    const projectWithImages: SideProject = {
      ...sideProjects[0]!,
      images: [
        {
          alt: "첫 번째 화면",
          path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
          url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
        },
        {
          alt: "두 번째 화면",
          path: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
          url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
        },
      ],
    };

    render(<SideProjectsSection sideProjects={[projectWithImages]} />);
    fireEvent.click(screen.getByText("First Project"));
    fireEvent.click(screen.getByRole("button", { name: "첫 번째 화면 크게 보기" }));

    const dialog = screen.getByRole("dialog", {
      name: "First Project 프로젝트 이미지 뷰어",
    });
    expect(within(dialog).getByText("첫 번째 화면")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "다음 프로젝트 이미지" }),
    );
    expect(within(dialog).getByText("두 번째 화면")).toBeInTheDocument();

    fireEvent.click(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("제공된 repository/demo만 안전한 HTTPS external link로 렌더링한다", () => {
    const { container } = render(
      <SideProjectsSection sideProjects={sideProjects} />,
    );
    const [firstCard, secondCard, thirdCard] = projectDisclosures(container);
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
    expect(screen.queryByText(
      "Repository와 Demo는 승인된 URL이 제공될 때만 표시합니다.",
    )).toBeNull();
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
