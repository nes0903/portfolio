import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IntroductionSection } from "@/components/portfolio/IntroductionSection";
import type { Skill } from "@/lib/content/types";

afterEach(() => {
  cleanup();
});

const skills = [
  { id: "typescript", name: "TypeScript", category: "Language", order: 1 },
] as const satisfies readonly Skill[];

describe("IntroductionSection", () => {
  it("introduce title/content를 임의 문구나 중복 없이 정확히 렌더링한다", () => {
    const introduce = {
      title: "고유한 소개 제목 73",
      content:
        "첫 문단 첫 줄 73\n첫 문단 둘째 줄 73\n\n두 번째 문단 첫 줄 73\n두 번째 문단 둘째 줄 73",
    } as const;
    const { container } = render(
      <IntroductionSection introduce={introduce} skills={skills} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: introduce.title }),
    ).toHaveAttribute("id", "introduce-title");
    expect(screen.getAllByText(introduce.title)).toHaveLength(1);

    const section = container.querySelector<HTMLElement>("section#introduce");
    if (!section) throw new Error("introduce section이 필요합니다");
    const contentParagraphs = [...section.querySelectorAll("p.lead")];

    expect(contentParagraphs).toHaveLength(2);
    expect(contentParagraphs[0]).toHaveTextContent(
      "첫 문단 첫 줄 73 첫 문단 둘째 줄 73",
    );
    expect(contentParagraphs[1]).toHaveTextContent(
      "두 번째 문단 첫 줄 73 두 번째 문단 둘째 줄 73",
    );
    expect(contentParagraphs[0]?.querySelectorAll("br")).toHaveLength(1);
    expect(contentParagraphs[1]?.querySelectorAll("br")).toHaveLength(1);

    for (const line of introduce.content.split(/\n+/)) {
      if (line.length === 0) continue;
      expect((container.textContent?.split(line).length ?? 1) - 1).toBe(1);
    }
  });

  it("기존 introduce anchor focus와 accessible-name 계약을 유지한다", () => {
    const { container } = render(
      <IntroductionSection
        introduce={{ title: "소개 계약", content: "소개 본문" }}
        skills={skills}
      />,
    );

    const section = container.querySelector<HTMLElement>("section#introduce");
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(section).toHaveAttribute("aria-labelledby", "introduce-title");
    expect(container.querySelector("#introduce-title")).toBe(
      section?.querySelector("h1"),
    );
  });

  it("CTA 없이 승인된 proof 부재 empty status만 표시한다", () => {
    const { container } = render(
      <IntroductionSection
        introduce={{ title: "소개 계약", content: "승인된 소개 본문" }}
        skills={skills}
      />,
    );
    const section = container.querySelector<HTMLElement>("section#introduce");
    if (!section) throw new Error("introduce section이 필요합니다");

    expect(within(section).queryByRole("link")).not.toBeInTheDocument();
    expect(within(section).getByRole("status")).toHaveTextContent(
      /^표시할 소개 근거가 없습니다\.$/,
    );
  });

  it("기술을 별도 carousel section 없이 소개 안에 렌더링한다", () => {
    const { container } = render(
      <IntroductionSection
        introduce={{ title: "소개 계약", content: "소개 본문" }}
        skills={skills}
      />,
    );
    const introduction = container.querySelector("section#introduce");

    expect(introduction?.querySelector("#skills")).not.toBeNull();
    expect(container.querySelector("section#skills")).toBeNull();
    expect(
      within(introduction as HTMLElement).getByRole("heading", {
        level: 2,
        name: "기술",
      }),
    ).toHaveAttribute("id", "skills-title");
  });
});
