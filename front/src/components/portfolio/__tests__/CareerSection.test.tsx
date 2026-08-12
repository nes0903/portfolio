import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CareerSection } from "@/components/portfolio/CareerSection";
import type { CareerWithWorks } from "@/lib/content/types";

afterEach(() => {
  cleanup();
});

const careers: readonly CareerWithWorks[] = [
  {
    id: "first-career",
    company: "First Company",
    role: "Platform Engineer",
    startDate: "2020-01",
    endDate: "2022-12",
    summary: "플랫폼의 검증 가능성을 높였습니다.",
    order: 1,
    works: [
      {
        id: "contract-work",
        careerId: "first-career",
        title: "콘텐츠 계약 구축",
        description:
          "- [b]빌드 전에[/b] 콘텐츠 오류를 차단했습니다.\n- [u]계약 오류[/u]를 [i]빠르게[/i] [mark]자동으로 검증[/mark]했습니다.",
        achievements: ["잘못된 배포를 사전에 차단", "검증 시간을 단축"],
        images: [
          {
            alt: "콘텐츠 검증 관리자 화면",
            path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
            url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
          },
          {
            alt: "콘텐츠 검증 결과 화면",
            path: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
            url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
          },
        ],
        order: 1,
      },
      {
        id: "tooling-work",
        careerId: "first-career",
        title: "개발 도구 개선",
        description: "반복 작업을 자동화했습니다.",
        technologies: ["TypeScript", "Vitest"],
        order: 2,
      },
    ],
  },
  {
    id: "current-career",
    company: "Current Company",
    role: "Senior Frontend Engineer",
    startDate: "2023-01",
    endDate: null,
    order: 2,
    works: [
      {
        id: "static-work",
        careerId: "current-career",
        title: "정적 사이트 구축",
        description: "서버 런타임 없는 포트폴리오를 구축했습니다.",
        order: 1,
      },
    ],
  },
  {
    id: "no-work-career",
    company: "No Work Company",
    role: "Software Engineer",
    startDate: "2018-03",
    endDate: "2019-12",
    summary: "회사와 역할 정보만 승인되었습니다.",
    order: 3,
    works: [],
  },
];

function careerArticles(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      "section#career .career-list > article.career",
    ),
  ];
}

function actionItems(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-•]\s*/, "")
        .replace(/\[(?:\/)?(?:b|i|u|mark)\]/g, ""),
    )
    .filter(Boolean);
}

describe("CareerSection", () => {
  it("join된 career/work를 각 회사 아래 loader order로 정확히 한 번 렌더링한다", () => {
    const { container } = render(<CareerSection careers={careers} />);
    const articles = careerArticles(container);

    expect(articles).toHaveLength(3);
    expect(
      articles.map(
        (article) => within(article).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual(careers.map((career) => career.role));

    articles.forEach((article, careerIndex) => {
      const career = careers[careerIndex];
      if (!career) throw new Error("career fixture가 필요합니다");

      expect(within(article).getByText(career.company)).toBeInTheDocument();
      expect(
        within(article).getByRole("heading", {
          level: 3,
          name: career.role,
        }),
      ).toBeInTheDocument();
      const careerTop = article.querySelector<HTMLElement>(":scope > .career-top");
      if (!careerTop) throw new Error("career header가 필요합니다");
      if (career.summary) {
        expect(within(careerTop).getByText(career.summary)).toBeInTheDocument();
      }
      expect(within(article).getByText(
        `${career.startDate} – ${career.endDate ?? "현재"}`,
      )).toBeInTheDocument();

      const details = [...article.querySelectorAll("details")];
      expect(details).toHaveLength(career.works.length);
      expect(
        details.map((detail) => detail.querySelector(":scope > summary")?.textContent),
      ).toEqual(career.works.map((work) => work.title));

      details.forEach((detail, workIndex) => {
        const work = career.works[workIndex];
        if (!work) throw new Error("career-work fixture가 필요합니다");
        expect(detail.open).toBe(workIndex === 0);
        expect(
          within(detail)
            .getByRole("list", { name: `${work.title} 작업 내용` })
            .querySelectorAll("li"),
        ).toHaveLength(actionItems(work.description).length);
      });
    });

    for (const career of careers) {
      expect(screen.getAllByText(career.company)).toHaveLength(1);
      for (const work of career.works) {
        expect(screen.getAllByText(work.title)).toHaveLength(1);
      }
    }
  });

  it("각 work details를 3개 evidence section과 승인 데이터/optional 문구로 매핑한다", () => {
    render(<CareerSection careers={careers} />);

    for (const career of careers) {
      for (const work of career.works) {
        const summary = screen.getByText(work.title);
        const details = summary.closest("details");
        if (!details) throw new Error(`${work.title} details가 필요합니다`);
        const evidenceSections = [
          ...details.querySelectorAll<HTMLElement>(":scope > .evidence > section"),
        ];

        expect(evidenceSections).toHaveLength(3);
        expect(
          evidenceSections.map(
            (section) =>
              within(section).getByRole("heading", { level: 4 }).textContent,
          ),
        ).toEqual(["Tech", "Action", "Outcome"]);

        const [tech, action, outcome] = evidenceSections;
        if (!tech || !action || !outcome) {
          throw new Error("evidence section 세 개가 필요합니다");
        }

        expect(
          within(action)
            .getAllByRole("listitem")
            .map((item) => item.textContent),
        ).toEqual(actionItems(work.description));

        if (work.achievements) {
          expect(
            within(outcome)
              .getAllByRole("listitem")
              .map((item) => item.textContent),
          ).toEqual(work.achievements);
        } else {
          expect(
            within(outcome).getByText("승인된 결과 정보가 없습니다."),
          ).toBeInTheDocument();
        }

        if (work.technologies) {
          expect(
            within(tech)
              .getAllByRole("listitem")
              .map((item) => item.textContent),
          ).toEqual(work.technologies);
        } else {
          expect(
            within(tech).getByText("승인된 기술 정보가 없습니다."),
          ).toBeInTheDocument();
        }
      }
    }
  });

  it("사진 클릭으로 중앙 뷰어를 열고 순환한 뒤 바깥 클릭으로 닫는다", () => {
    render(<CareerSection careers={careers} />);
    const work = careers[0]?.works[0];
    const firstImage = work?.images?.[0];
    const secondImage = work?.images?.[1];
    if (!work || !firstImage || !secondImage) {
      throw new Error("경력 작업 이미지 fixture 두 개가 필요합니다");
    }

    fireEvent.click(
      screen.getByRole("button", { name: `${firstImage.alt} 크게 보기` }),
    );

    const dialog = screen.getByRole("dialog", {
      name: `${work.title} 작업 이미지 뷰어`,
    });
    expect(
      within(dialog).getByRole("img", { name: firstImage.alt }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "다음 작업 이미지" }),
    );
    expect(
      within(dialog).getByRole("img", { name: secondImage.alt }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "다음 작업 이미지" }),
    );
    expect(
      within(dialog).getByRole("img", { name: firstImage.alt }),
    ).toBeInTheDocument();

    const backdrop = document.querySelector<HTMLElement>(
      ".career-image-modal-backdrop",
    );
    if (!backdrop) throw new Error("이미지 뷰어 배경이 필요합니다");
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Action의 굵게, 기울임, 밑줄, 하이라이트 서식을 렌더링한다", () => {
    render(<CareerSection careers={careers} />);

    expect(screen.getByText("빌드 전에").tagName).toBe("STRONG");
    expect(screen.getByText("계약 오류").tagName).toBe("U");
    expect(screen.getByText("빠르게").tagName).toBe("EM");
    expect(screen.getByText("자동으로 검증").tagName).toBe("MARK");
  });

  it("work가 없는 career와 careers 빈 배열을 명시적 status로 구분한다", () => {
    const { container, rerender } = render(<CareerSection careers={careers} />);
    const noWorkCareer = careerArticles(container)[2];
    if (!noWorkCareer) throw new Error("work 없는 career article이 필요합니다");
    expect(within(noWorkCareer).getByRole("status")).toHaveTextContent(
      "표시할 경력 작업이 없습니다.",
    );

    rerender(<CareerSection careers={[]} />);
    const section = container.querySelector<HTMLElement>("section#career");
    if (!section) throw new Error("career section이 필요합니다");
    expect(within(section).getByRole("status")).toHaveTextContent(
      "표시할 경력이 없습니다.",
    );
  });

  it("기존 career anchor와 h2 accessible-name 계약을 유지한다", () => {
    const { container } = render(<CareerSection careers={careers} />);
    const section = container.querySelector<HTMLElement>("section#career");

    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(section).toHaveAttribute("aria-labelledby", "career-title");
    expect(
      screen.getByRole("heading", { level: 2, name: "경력" }),
    ).toHaveAttribute("id", "career-title");
    expect(section?.querySelector(".section-heading")).toHaveTextContent(
      "02경력",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "경력" }),
    ).not.toHaveClass("sr-only");
  });
});
