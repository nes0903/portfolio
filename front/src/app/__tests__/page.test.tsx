import "@testing-library/jest-dom/vitest";

import axe from "axe-core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import { loadPublishedPortfolioContent } from "@/lib/content/supabase-loader";
import type { PortfolioContentViewModel } from "@/lib/content/types";
import { DEFAULT_PORTFOLIO_VISUALS } from "@/lib/content/schema";

vi.mock("@/lib/content/supabase-loader", () => ({
  loadPublishedPortfolioContent: vi.fn(),
}));

const navigationHrefs = [
  "#introduce",
  "#career",
  "#side-projects",
  "#contact",
] as const;

const populatedContent = {
  introduce: {
    title: "제품을 끝까지 책임지는 개발자",
    content: "검증 가능한 제품을 만들고 운영합니다.",
  },
  skills: [
    { id: "typescript", name: "TypeScript", category: "Language", order: 1 },
  ],
  careers: [
    {
      id: "career-1",
      company: "Example Company",
      role: "Frontend Engineer",
      startDate: "2024-01",
      endDate: null,
      summary: "정적 콘텐츠 플랫폼 개발",
      order: 1,
      works: [
        {
          id: "work-1",
          careerId: "career-1",
          title: "콘텐츠 계약 구축",
          description: "빌드 전에 콘텐츠를 검증했습니다.",
          achievements: ["잘못된 배포를 사전에 차단"],
          technologies: ["TypeScript", "Zod"],
          order: 1,
        },
      ],
    },
  ],
  sideProjects: [
    {
      id: "project-1",
      name: "Portfolio",
      period: "2026",
      description: "검증된 JSON 기반 정적 포트폴리오",
      highlights: ["공개 전 콘텐츠 검증"],
      images: [],
      skills: ["Next.js", "TypeScript"],
      links: { repository: "https://github.com/example/portfolio" },
      order: 1,
    },
  ],
  contacts: [
    {
      id: "email",
      channel: "email",
      label: "Email",
      value: "hello@example.com",
      url: "mailto:hello@example.com",
      order: 1,
    },
  ],
  visuals: DEFAULT_PORTFOLIO_VISUALS,
} satisfies PortfolioContentViewModel;

const emptyCollectionsContent = {
  ...populatedContent,
  skills: [],
  careers: [],
  sideProjects: [],
  contacts: [],
} satisfies PortfolioContentViewModel;

const loaderMock = vi.mocked(loadPublishedPortfolioContent);

async function renderHomePage(
  content: PortfolioContentViewModel = populatedContent,
) {
  loaderMock.mockResolvedValue(content);
  const page = await HomePage();
  return render(page);
}

beforeEach(() => {
  loaderMock.mockReset();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("portfolio home page shell", () => {
  it("본문 skip link와 단일 세로형 4개 anchor navigation을 제공한다", async () => {
    await renderHomePage();

    expect(screen.getByRole("link", { name: "본문으로 이동" })).toHaveAttribute(
      "href",
      "#introduce",
    );

    const navigation = screen.getByRole("navigation", {
      name: "페이지 목차",
    });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(navigationHrefs);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("단일 페이지 landmark와 이름이 연결된 4개 focusable section을 렌더링한다", async () => {
    const { container } = await renderHomePage();

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(container.querySelector(".site-header")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("link", { name: "PORTFOLIO" })).toHaveAttribute(
      "href",
      "#introduce",
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-starfield]")).toHaveLength(1);
    expect(container.querySelectorAll("main > section")).toHaveLength(4);

    for (const id of [
      "introduce",
      "career",
      "side-projects",
      "contact",
    ]) {
      const section = container.querySelector<HTMLElement>(`section#${id}`);
      expect(section).not.toBeNull();
      expect(section).toHaveAttribute("tabindex", "-1");
      expect(section).toHaveAttribute("aria-labelledby", `${id}-title`);
      expect(container.querySelector(`#${id}-title`)).toBeInTheDocument();
    }
  });

  it("소개 h1 하나와 이후 section h2를 사용하고 heading level을 건너뛰지 않는다", async () => {
    const { container } = await renderHomePage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: populatedContent.introduce.title,
      }),
    ).toHaveAttribute("id", "introduce-title");
    expect(container.querySelectorAll("h1")).toHaveLength(1);

    expect(
      screen.getByRole("heading", { level: 2, name: "기술" }),
    ).toHaveAttribute("id", "skills-title");
    expect(container.querySelector("section#skills")).toBeNull();
    expect(container.querySelector("section#introduce #skills")).not.toBeNull();

    for (const [id, name] of [
      ["career", "경력"],
      ["side-projects", "프로젝트"],
      ["contact", "연락처"],
    ] as const) {
      expect(screen.getByRole("heading", { level: 2, name })).toHaveAttribute(
        "id",
        `${id}-title`,
      );
    }

    const headingLevels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    headingLevels.slice(1).forEach((level, index) => {
      const previousLevel = headingLevels[index];
      if (previousLevel === undefined) {
        throw new Error("이전 heading level이 필요합니다");
      }
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
    });
  });

  it("선택적 배열이 비면 각 section에서 성공 콘텐츠와 구분되는 empty state를 표시한다", async () => {
    const { container } = await renderHomePage(emptyCollectionsContent);

    const introduction = container.querySelector<HTMLElement>("#introduce");
    if (!introduction) throw new Error("introduce section이 필요합니다");
    expect(
      within(introduction).getByText("표시할 기술이 없습니다.", {
        selector: '[role="status"]',
      }),
    ).toHaveTextContent("표시할 기술이 없습니다.");

    for (const [sectionId, message] of [
      ["career", "표시할 경력이 없습니다."],
      ["side-projects", "표시할 프로젝트가 없습니다."],
      ["contact", "표시할 연락처가 없습니다."],
    ] as const) {
      const section = container.querySelector<HTMLElement>(`#${sectionId}`);
      if (!section) throw new Error(`${sectionId} section이 필요합니다`);
      expect(
        within(section).getByText(message, { selector: '[role="status"]' }),
      ).toHaveTextContent(message);
    }
  });

  it("name placeholder와 profile panel 없이 주황색 side brand를 렌더링한다", async () => {
    const { container } = await renderHomePage();

    expect(container).not.toHaveTextContent("[NAME]");
    expect(screen.getByText("PORTFOLIO")).toBeInTheDocument();
    expect(screen.queryByText("PROFILE")).not.toBeInTheDocument();
    expect(screen.queryByText("VIEW ↘")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("포트폴리오 요약")).not.toBeInTheDocument();
  });

  it("serious 및 critical axe 위반이 없다", async () => {
    const { container } = await renderHomePage();
    const result = await axe.run(container, {
      rules: {
        // jsdom에는 canvas 구현이 없어 색상 대비는 실제 브라우저 검증으로 분리한다.
        "color-contrast": { enabled: false },
      },
    });
    const blockingViolations = result.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );

    expect(blockingViolations).toEqual([]);
  });
});
