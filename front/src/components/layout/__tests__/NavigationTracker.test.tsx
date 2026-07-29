import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import { PORTFOLIO_SECTIONS } from "@/components/layout/navigation";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function renderTrackerWithoutObserver() {
  const queuedFrames: FrameRequestCallback[] = [];
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }),
  );
  const view = render(
    <>
      <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
      <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
      {PORTFOLIO_SECTIONS.map((section) => (
        <section id={section.id} key={section.id} tabIndex={-1}>
          {section.label}
        </section>
      ))}
      <NavigationTracker />
    </>,
  );
  return { queuedFrames, ...view };
}

function clickNavigationLink(
  label: string,
  sectionId: string,
): HTMLAnchorElement[] {
  const links = screen.getAllByRole<HTMLAnchorElement>("link", { name: label });
  const clickedLink = links[0];
  if (!clickedLink) throw new Error(`${label} navigation link가 필요합니다`);
  window.history.replaceState(null, "", `#${sectionId}`);
  clickedLink.addEventListener("click", (event) => event.preventDefault(), {
    capture: true,
  });
  fireEvent.click(clickedLink);
  return links;
}

function setCurrentDom(sectionId: string): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-nav]")) {
    if (link.dataset.nav === sectionId) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

describe("NavigationTracker", () => {
  it.each([
    ["기술", "skills"],
    ["경력", "career"],
  ] as const)(
    "%s anchor click 뒤 framework commit이 current를 되돌려도 queued frame에서 클릭 대상을 복원한다",
    (label, sectionId) => {
      const queuedFrames: FrameRequestCallback[] = [];
      vi.stubGlobal(
        "requestAnimationFrame",
        vi.fn((callback: FrameRequestCallback) => {
          queuedFrames.push(callback);
          return queuedFrames.length;
        }),
      );
      vi.stubGlobal("IntersectionObserver", undefined);

      render(
        <>
          <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
          <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
          {PORTFOLIO_SECTIONS.map((section) => (
            <section id={section.id} key={section.id} tabIndex={-1}>
              {section.label}
            </section>
          ))}
          <NavigationTracker />
        </>,
      );

      const targetLinks = screen.getAllByRole("link", { name: label });
      const targetSection = document.getElementById(sectionId);
      if (!targetSection) throw new Error(`${sectionId} section이 필요합니다`);

      window.history.replaceState(null, "", `#${sectionId}`);
      targetLinks[0]?.addEventListener("click", (event) => event.preventDefault(), {
        capture: true,
      });
      fireEvent.click(targetLinks[0] as HTMLAnchorElement);

      expect(window.location.hash).toBe(`#${sectionId}`);
      expect(queuedFrames).toHaveLength(1);
      for (const link of targetLinks) {
        expect(link).toHaveAttribute("aria-current", "location");
      }

      // framework commit이 선언된 초기 navigation props를 다시 DOM에 반영한 상황을 모사한다.
      for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-nav]")) {
        if (link.dataset.nav === "introduce") {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      }

      const queuedFrame = queuedFrames.shift();
      if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
      act(() => queuedFrame(0));

      expect(targetSection).toHaveFocus();
      for (const link of targetLinks) {
        expect(link).toHaveAttribute("aria-current", "location");
      }
      for (const link of screen.getAllByRole("link", { name: "소개" })) {
        expect(link).not.toHaveAttribute("aria-current");
      }
    },
  );

  it("rAF 뒤 observer가 이전 current를 써도 navigation scrollend에서 한 번만 클릭 대상을 복원한다", () => {
    const queuedFrames: FrameRequestCallback[] = [];
    let observerCallback: IntersectionObserverCallback | undefined;

    class IntersectionObserverStub implements IntersectionObserver {
      static latest: IntersectionObserverStub | undefined;

      readonly root = null;
      readonly rootMargin = "0px";
      readonly scrollMargin = "0px";
      readonly thresholds = [0];

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
        IntersectionObserverStub.latest = this;
      }

      disconnect(): void {}
      observe(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      unobserve(): void {}
    }

    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        queuedFrames.push(callback);
        return queuedFrames.length;
      }),
    );

    render(
      <>
        <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
        <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
        {PORTFOLIO_SECTIONS.map((section) => (
          <section id={section.id} key={section.id} tabIndex={-1}>
            {section.label}
          </section>
        ))}
        <NavigationTracker />
      </>,
    );

    const targetLinks = screen.getAllByRole("link", { name: "경력" });
    const clickedLink = targetLinks[0];
    const targetSection = document.getElementById("career");
    const introduceSection = document.getElementById("introduce");
    const skillsSection = document.getElementById("skills");
    if (!clickedLink || !targetSection || !introduceSection || !skillsSection) {
      throw new Error("navigation race fixture가 필요합니다");
    }

    window.history.replaceState(null, "", "#career");
    clickedLink.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
    });
    fireEvent.click(clickedLink);

    const queuedFrame = queuedFrames.shift();
    if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
    act(() => queuedFrame(0));
    for (const link of targetLinks) {
      expect(link).toHaveAttribute("aria-current", "location");
    }

    const notifyIntersection = (target: Element) => {
      const callback = observerCallback;
      const currentObserver = IntersectionObserverStub.latest;
      if (!callback || !currentObserver) {
        throw new Error("IntersectionObserver callback과 instance가 필요합니다");
      }
      act(() =>
        callback(
          [
            {
              intersectionRatio: 1,
              isIntersecting: true,
              target,
            } as IntersectionObserverEntry,
          ],
          currentObserver,
        ),
      );
    };

    // rAF 직후 늦게 도착한 observer 결과가 이전 section을 current로 되돌린다.
    notifyIntersection(introduceSection);
    expect(screen.getAllByRole("link", { name: "소개" })[0]).toHaveAttribute(
      "aria-current",
      "location",
    );

    act(() => window.dispatchEvent(new Event("scrollend")));
    for (const link of targetLinks) {
      expect(link).toHaveAttribute("aria-current", "location");
    }

    // navigation용 listener는 일회성이므로 이후 수동 스크롤 observer 상태를 덮지 않는다.
    notifyIntersection(skillsSection);
    act(() => window.dispatchEvent(new Event("scrollend")));
    for (const link of screen.getAllByRole("link", { name: "기술" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
  });

  it("scrollend가 오지 않으면 timeout으로 pending navigation sync를 정리한다", () => {
    vi.useFakeTimers();
    const { queuedFrames } = renderTrackerWithoutObserver();
    clickNavigationLink("경력", "career");
    const queuedFrame = queuedFrames.shift();
    if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
    act(() => queuedFrame(0));

    setCurrentDom("skills");
    act(() => vi.runAllTimers());
    act(() => window.dispatchEvent(new Event("scrollend")));

    for (const link of screen.getAllByRole("link", { name: "기술" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
  });

  it("hashchange는 이전 click의 pending scrollend sync를 취소한다", () => {
    const { queuedFrames } = renderTrackerWithoutObserver();
    clickNavigationLink("경력", "career");
    const queuedFrame = queuedFrames.shift();
    if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
    act(() => queuedFrame(0));

    window.history.replaceState(null, "", "#skills");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
    act(() => window.dispatchEvent(new Event("scrollend")));

    for (const link of screen.getAllByRole("link", { name: "기술" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
  });

  it("click target과 같은 hashchange는 pending scrollend sync를 유지한다", () => {
    const { queuedFrames } = renderTrackerWithoutObserver();
    clickNavigationLink("경력", "career");
    const queuedFrame = queuedFrames.shift();
    if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
    act(() => queuedFrame(0));

    window.history.replaceState(null, "", "#career");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));

    // hashchange 뒤 늦게 도착한 observer 결과가 이전 section을 current로 되돌린다.
    setCurrentDom("introduce");
    act(() => window.dispatchEvent(new Event("scrollend")));

    for (const link of screen.getAllByRole("link", { name: "경력" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
    for (const link of screen.getAllByRole("link", { name: "소개" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("이전 이동의 stale scrollend가 새 이동의 pending sync를 소비하지 않는다", () => {
    const { queuedFrames } = renderTrackerWithoutObserver();
    const skillsSection = document.getElementById("skills");
    if (!skillsSection) throw new Error("skills section이 필요합니다");
    vi.stubGlobal("innerHeight", 1_000);
    let skillsRect = {
      bottom: 900,
      height: 400,
      left: 0,
      right: 1_000,
      top: 500,
      width: 1_000,
      x: 0,
      y: 500,
      toJSON: () => ({}),
    };
    vi.spyOn(skillsSection, "getBoundingClientRect").mockImplementation(
      () => skillsRect,
    );

    clickNavigationLink("경력", "career");
    const careerFrame = queuedFrames.shift();
    if (!careerFrame) throw new Error("career requestAnimationFrame이 필요합니다");
    act(() => careerFrame(0));

    clickNavigationLink("기술", "skills");
    const skillsFrame = queuedFrames.shift();
    if (!skillsFrame) throw new Error("skills requestAnimationFrame이 필요합니다");
    act(() => skillsFrame(0));

    // career 이동에서 늦게 도착한 scrollend가 skills listener를 먼저 소비한다.
    act(() => window.dispatchEvent(new Event("scrollend")));
    setCurrentDom("introduce");

    skillsRect = {
      ...skillsRect,
      bottom: 700,
      height: 600,
      top: 100,
      y: 100,
    };

    // 실제 skills 이동의 scrollend에서는 skills current를 최종 복원해야 한다.
    act(() => window.dispatchEvent(new Event("scrollend")));

    for (const link of screen.getAllByRole("link", { name: "기술" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
    for (const link of screen.getAllByRole("link", { name: "소개" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("hash/focus contact가 activation line에 있으면 stale observer가 current를 덮지 않는다", () => {
    let observerCallback: IntersectionObserverCallback | undefined;

    class IntersectionObserverStub implements IntersectionObserver {
      static latest: IntersectionObserverStub | undefined;

      readonly root = null;
      readonly rootMargin = "0px";
      readonly scrollMargin = "0px";
      readonly thresholds = [0];

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
        IntersectionObserverStub.latest = this;
      }

      disconnect(): void {}
      observe(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      unobserve(): void {}
    }

    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.stubGlobal("innerHeight", 844);
    window.history.replaceState(null, "", "#contact");

    render(
      <>
        <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
        <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
        {PORTFOLIO_SECTIONS.map((section) => (
          <section id={section.id} key={section.id} tabIndex={-1}>
            {section.label}
          </section>
        ))}
        <NavigationTracker />
      </>,
    );

    const contactSection = document.getElementById("contact");
    const sideProjectsSection = document.getElementById("side-projects");
    const callback = observerCallback;
    const observer = IntersectionObserverStub.latest;
    if (!contactSection || !sideProjectsSection || !callback || !observer) {
      throw new Error("contact final-position fixture가 필요합니다");
    }

    vi.spyOn(contactSection, "getBoundingClientRect").mockReturnValue({
      bottom: 600,
      height: 580,
      left: 0,
      right: 1000,
      top: 20,
      width: 1000,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    contactSection.focus();

    expect(window.location.hash).toBe("#contact");
    expect(document.activeElement).toBe(contactSection);
    for (const link of screen.getAllByRole("link", { name: "연락처" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }

    act(() =>
      callback(
        [
          {
            intersectionRatio: 1,
            isIntersecting: true,
            target: sideProjectsSection,
          } as unknown as IntersectionObserverEntry,
        ],
        observer,
      ),
    );

    for (const link of screen.getAllByRole("link", { name: "연락처" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
    for (const link of screen.getAllByRole("link", { name: "사이드 프로젝트" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("unmount는 pending scrollend sync를 제거해 detached navigation에 개입하지 않는다", () => {
    const { queuedFrames, unmount } = renderTrackerWithoutObserver();
    const careerLinks = clickNavigationLink("경력", "career");
    const skillsLinks = screen.getAllByRole<HTMLAnchorElement>("link", {
      name: "기술",
    });
    const queuedFrame = queuedFrames.shift();
    if (!queuedFrame) throw new Error("queued requestAnimationFrame이 필요합니다");
    act(() => queuedFrame(0));
    unmount();

    for (const link of [...careerLinks, ...skillsLinks]) {
      if (link.dataset.nav === "skills") {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
    act(() => window.dispatchEvent(new Event("scrollend")));

    for (const link of skillsLinks) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
    for (const link of careerLinks) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});
