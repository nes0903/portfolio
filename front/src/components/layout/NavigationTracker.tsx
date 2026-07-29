"use client";

import { useEffect } from "react";

import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

const sectionIds = new Set<PortfolioSectionId>(
  PORTFOLIO_SECTIONS.map((section) => section.id),
);
const scrollEndTimeoutMilliseconds = 1_000;

/**
 * 문자열이 승인된 portfolio section id인지 좁힌다.
 */
function isPortfolioSectionId(value: string): value is PortfolioSectionId {
  return sectionIds.has(value as PortfolioSectionId);
}

/**
 * hash와 viewport 교차 상태를 두 navigation의 aria-current에 동기화한다.
 */
export function NavigationTracker() {
  useEffect(() => {
    const navigationLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[data-nav]"),
    );
    const hashLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
    );
    const sections = PORTFOLIO_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((section): section is HTMLElement => section !== null);
    let pendingScrollEndHandler: (() => void) | undefined;
    let pendingScrollEndSectionId: PortfolioSectionId | undefined;
    let pendingScrollEndTimer: number | undefined;

    /**
     * desktop와 mobile anchor에서 현재 section만 location으로 표시한다.
     */
    function setCurrentSection(sectionId: PortfolioSectionId): void {
      /**
       * 두 navigation의 모든 링크를 같은 상태로 갱신한다.
       */
      for (const link of navigationLinks) {
        /**
         * 현재 section 링크에만 aria-current를 남긴다.
         */
        if (link.dataset.nav === sectionId) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    }

    /**
     * section이 현재 viewport의 navigation activation line을 포함하는지 확인한다.
     */
    function containsActivationLine(
      sectionId: PortfolioSectionId,
      allowUnknownGeometry = false,
    ): boolean {
      const section = document.getElementById(sectionId);

      if (!section) {
        return false;
      }

      const activationLine = window.innerHeight * 0.3;
      const sectionRect = section.getBoundingClientRect();

      /**
       * layout engine이 없는 단위 테스트에서는 교차 상태를 판정할 수 없다.
       */
      if (sectionRect.width === 0 && sectionRect.height === 0) {
        return allowUnknownGeometry;
      }

      return (
        sectionRect.top <= activationLine &&
        sectionRect.bottom >= activationLine
      );
    }

    /**
     * 재클릭 또는 unmount 전에 이전 navigation scrollend listener를 제거한다.
     */
    function clearPendingScrollEndHandler(): void {
      if (pendingScrollEndHandler) {
        window.removeEventListener("scrollend", pendingScrollEndHandler);
        pendingScrollEndHandler = undefined;
      }

      pendingScrollEndSectionId = undefined;

      if (pendingScrollEndTimer !== undefined) {
        window.clearTimeout(pendingScrollEndTimer);
        pendingScrollEndTimer = undefined;
      }
    }

    /**
     * navigation scroll이 끝날 때 클릭 대상을 한 번만 current로 확정한다.
     */
    function confirmCurrentSectionOnScrollEnd(
      sectionId: PortfolioSectionId,
    ): void {
      clearPendingScrollEndHandler();

      const handleScrollEnd = (): void => {
        /**
         * navigation 대상이 실제 activation line에 도착한 경우에만 확정한다.
         * 수동 스크롤에서 발생한 늦은 scrollend가 이전 클릭을 복원하지 않게 한다.
         */
        if (
          window.location.hash === `#${sectionId}` &&
          containsActivationLine(sectionId, true)
        ) {
          clearPendingScrollEndHandler();
          setCurrentSection(sectionId);
        }
      };

      pendingScrollEndHandler = handleScrollEnd;
      pendingScrollEndSectionId = sectionId;
      window.addEventListener("scrollend", handleScrollEnd);
      pendingScrollEndTimer = window.setTimeout(
        clearPendingScrollEndHandler,
        scrollEndTimeoutMilliseconds,
      );
    }

    /**
     * hash 대상 section을 current로 표시하고 keyboard focus를 옮긴다.
     */
    function focusHashTarget(): void {
      const sectionId = window.location.hash.slice(1);

      /**
       * 승인된 다섯 anchor 이외의 hash는 page focus를 변경하지 않는다.
       */
      if (!isPortfolioSectionId(sectionId)) {
        return;
      }

      setCurrentSection(sectionId);
      document.getElementById(sectionId)?.focus({ preventScroll: true });
    }

    /**
     * 다른 hash navigation은 이전 click의 scrollend 확정을 취소하고 즉시 반영한다.
     */
    function handleHashChange(): void {
      const sectionId = window.location.hash.slice(1);

      if (pendingScrollEndSectionId !== sectionId) {
        clearPendingScrollEndHandler();
      }

      focusHashTarget();
    }

    /**
     * 같은 hash를 다시 누른 경우에도 target focus를 보장한다.
     */
    function handleNavigationClick(event: Event): void {
      const link = event.currentTarget;

      /**
       * 등록 대상은 anchor로 한정하지만 런타임 타입도 확인한다.
       */
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      const sectionId = link.hash.slice(1);

      /**
       * 승인된 section 링크만 focus 동기화 대상으로 사용한다.
       */
      if (!isPortfolioSectionId(sectionId)) {
        return;
      }

      confirmCurrentSectionOnScrollEnd(sectionId);
      setCurrentSection(sectionId);
      window.requestAnimationFrame(() => {
        setCurrentSection(sectionId);
        document.getElementById(sectionId)?.focus({ preventScroll: true });
      });
    }

    /**
     * 최초 hash가 있으면 hydrate 직후 해당 section 상태를 복원한다.
     */
    focusHashTarget();
    window.addEventListener("hashchange", handleHashChange);

    /**
     * skip link를 포함한 내부 anchor listener를 한 client leaf에서 함께 관리한다.
     */
    for (const link of hashLinks) {
      link.addEventListener("click", handleNavigationClick);
    }

    let observer: IntersectionObserver | undefined;

    /**
     * focus된 hash section이 viewport activation line을 포함하면 그 section id를 반환한다.
     */
    function getActiveHashSectionAtActivationLine():
      | PortfolioSectionId
      | undefined {
      const sectionId = window.location.hash.slice(1);

      /**
       * 승인되지 않은 hash는 observer 우선순위에 개입하지 않는다.
       */
      if (!isPortfolioSectionId(sectionId)) {
        return undefined;
      }

      const hashSection = document.getElementById(sectionId);

      /**
       * keyboard focus가 실제 hash section에 남아 있을 때만 navigation 의도를 보존한다.
       */
      if (!hashSection || document.activeElement !== hashSection) {
        return undefined;
      }

      /**
       * 수동 스크롤로 activation line을 벗어나면 기존 observer 결과를 사용한다.
       */
      if (!containsActivationLine(sectionId)) {
        return undefined;
      }

      return sectionId;
    }

    /**
     * IntersectionObserver가 있는 브라우저에서 viewport 기반 current를 갱신한다.
     */
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const activeHashSectionId =
            getActiveHashSectionAtActivationLine();

          /**
           * 최종 hash 위치에 남아 있으면 늦게 도착한 이전 section entry를 무시한다.
           */
          if (activeHashSectionId) {
            setCurrentSection(activeHashSectionId);
            return;
          }

          const currentEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (left, right) => right.intersectionRatio - left.intersectionRatio,
            )[0];

          /**
           * 교차한 승인 section이 있을 때만 navigation 상태를 변경한다.
           */
          if (
            currentEntry &&
            isPortfolioSectionId(currentEntry.target.id)
          ) {
            setCurrentSection(currentEntry.target.id);
          }
        },
        {
          rootMargin: "-24% 0px -62% 0px",
          threshold: [0, 0.1, 0.5],
        },
      );

      /**
       * 정확히 다섯 콘텐츠 section을 관찰한다.
       */
      for (const section of sections) {
        observer.observe(section);
      }
    }

    /**
     * unmount 시 global listener와 observer를 모두 제거한다.
     */
    return () => {
      window.removeEventListener("hashchange", handleHashChange);

      /**
       * 등록한 모든 내부 anchor click listener를 대칭적으로 제거한다.
       */
      for (const link of hashLinks) {
        link.removeEventListener("click", handleNavigationClick);
      }

      clearPendingScrollEndHandler();
      observer?.disconnect();
    };
  }, []);

  return null;
}
