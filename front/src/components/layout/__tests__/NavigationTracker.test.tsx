import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

interface CarouselFixture {
  readonly cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
  readonly queuedFrames: FrameRequestCallback[];
  readonly unmount: () => void;
}

const initialOffsets = [0, 1, 2, -1] as const;

function renderCarouselTracker(): CarouselFixture {
  const queuedFrames: FrameRequestCallback[] = [];
  const cancelAnimationFrameMock = vi.fn();

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);

  const view = render(
    <>
      <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
      <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
      <main data-carousel>
        {PORTFOLIO_SECTIONS.map((section, index) => (
          <section
            id={section.id}
            key={section.id}
            tabIndex={-1}
            data-carousel-card
            data-carousel-offset={initialOffsets[index]}
          >
            {section.label}
          </section>
        ))}
      </main>
      <NavigationTracker />
    </>,
  );

  return {
    cancelAnimationFrameMock,
    queuedFrames,
    unmount: view.unmount,
  };
}

function expectCurrentSection(sectionId: PortfolioSectionId): void {
  for (const section of PORTFOLIO_SECTIONS) {
    for (const link of screen.getAllByRole("link", { name: section.label })) {
      if (section.id === sectionId) {
        expect(link).toHaveAttribute("aria-current", "location");
      } else {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  }
}

function expectCardOffsets(
  expected: Readonly<Record<PortfolioSectionId, number>>,
): void {
  for (const section of PORTFOLIO_SECTIONS) {
    expect(document.getElementById(section.id)).toHaveAttribute(
      "data-carousel-offset",
      String(expected[section.id]),
    );
  }
}

function clickSection(label: string): void {
  const links = screen.getAllByRole<HTMLAnchorElement>("link", { name: label });
  const link = links[0];
  if (!link) throw new Error(`${label} navigation link가 필요합니다`);
  fireEvent.click(link);
}

function clickCard(sectionId: PortfolioSectionId): void {
  const card = document.getElementById(sectionId);
  if (!card) throw new Error(`${sectionId} card가 필요합니다`);
  fireEvent.click(card);
}

function runNextFrame(queuedFrames: FrameRequestCallback[]): void {
  const frame = queuedFrames.shift();
  if (!frame) throw new Error("requestAnimationFrame callback이 필요합니다");
  act(() => frame(0));
}

describe("NavigationTracker infinite carousel", () => {
  it("초기에는 04, 01, 02 card가 왼쪽, 중앙, 오른쪽에 배치된다", () => {
    renderCarouselTracker();

    expectCardOffsets({
      introduce: 0,
      career: 1,
      "side-projects": 2,
      contact: -1,
    });
    expectCurrentSection("introduce");
    expect(document.querySelector("[data-carousel]")).toHaveAttribute(
      "data-active-section",
      "introduce",
    );
  });

  it("02를 클릭하면 01, 02, 03 card가 왼쪽, 중앙, 오른쪽으로 회전한다", () => {
    const { queuedFrames } = renderCarouselTracker();
    const careerSection = document.getElementById("career");
    if (!careerSection) throw new Error("career section이 필요합니다");

    clickSection("경력");

    expect(window.location.hash).toBe("#career");
    expectCardOffsets({
      introduce: -1,
      career: 0,
      "side-projects": 1,
      contact: 2,
    });
    expectCurrentSection("career");

    runNextFrame(queuedFrames);
    expect(careerSection).toHaveFocus();
  });

  it("04와 01 사이를 양끝 없이 한 칸으로 순환한다", () => {
    const { queuedFrames } = renderCarouselTracker();

    clickSection("연락처");
    runNextFrame(queuedFrames);
    expectCardOffsets({
      introduce: 1,
      career: -2,
      "side-projects": -1,
      contact: 0,
    });

    clickSection("소개");
    runNextFrame(queuedFrames);
    expectCardOffsets({
      introduce: 0,
      career: 1,
      "side-projects": 2,
      contact: -1,
    });
    expectCurrentSection("introduce");
  });

  it("양옆 card를 클릭하면 해당 card가 중앙으로 이동한다", () => {
    const { queuedFrames } = renderCarouselTracker();

    clickCard("career");
    expect(window.location.hash).toBe("#career");
    expectCardOffsets({
      introduce: -1,
      career: 0,
      "side-projects": 1,
      contact: 2,
    });
    expectCurrentSection("career");
    runNextFrame(queuedFrames);
    expect(document.getElementById("career")).toHaveFocus();

    clickCard("introduce");
    expect(window.location.hash).toBe("#introduce");
    expectCardOffsets({
      introduce: 0,
      career: 1,
      "side-projects": 2,
      contact: -1,
    });
  });

  it("현재 중앙 card 자체를 클릭해도 불필요한 전환을 만들지 않는다", () => {
    const { queuedFrames } = renderCarouselTracker();

    clickCard("introduce");

    expect(window.location.hash).toBe("");
    expect(queuedFrames).toHaveLength(0);
    expectCurrentSection("introduce");
  });

  it("화면 밖 card 때문에 생긴 document 가로 이동을 원위치로 복원한다", () => {
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollX", 420);
    vi.stubGlobal("scrollY", 0);
    vi.stubGlobal("scrollTo", scrollToMock);

    renderCarouselTracker();

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: "auto",
      left: 0,
      top: 0,
    });
  });

  it("hashchange도 해당 card를 중앙에 배치하고 focus를 옮긴다", () => {
    const { queuedFrames } = renderCarouselTracker();
    const contactSection = document.getElementById("contact");
    if (!contactSection) throw new Error("contact section이 필요합니다");

    window.history.replaceState(null, "", "#contact");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));

    expectCardOffsets({
      introduce: 1,
      career: -2,
      "side-projects": -1,
      contact: 0,
    });
    expectCurrentSection("contact");

    runNextFrame(queuedFrames);
    expect(contactSection).toHaveFocus();
  });

  it("초기 hash도 hydration 직후 해당 card 위치를 복원한다", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "#side-projects");
    renderCarouselTracker();

    expectCardOffsets({
      introduce: -2,
      career: -1,
      "side-projects": 0,
      contact: 1,
    });
    expectCurrentSection("side-projects");

    act(() => vi.runAllTimers());
    expectCurrentSection("side-projects");
  });

  it("Fast Refresh 뒤 추가된 navigation에도 current를 반영한다", () => {
    renderCarouselTracker();
    const navigation = document.querySelector("nav");
    if (!navigation) throw new Error("복제할 navigation이 필요합니다");

    const refreshedNavigation = navigation.cloneNode(true) as HTMLElement;
    document.body.append(refreshedNavigation);

    try {
      clickSection("경력");
      expectCurrentSection("career");
    } finally {
      refreshedNavigation.remove();
    }
  });

  it("unmount 시 pending focus frame과 global listener를 정리한다", () => {
    const { cancelAnimationFrameMock, queuedFrames, unmount } =
      renderCarouselTracker();

    clickSection("경력");
    expect(queuedFrames).toHaveLength(1);

    unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);

    window.history.replaceState(null, "", "#contact");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
    expect(queuedFrames).toHaveLength(1);
  });
});
