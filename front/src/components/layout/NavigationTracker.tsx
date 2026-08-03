"use client";

import { useEffect } from "react";

import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

const sectionIds = new Set<PortfolioSectionId>(
  PORTFOLIO_SECTIONS.map((section) => section.id),
);

/**
 * 문자열이 승인된 portfolio section id인지 좁힌다.
 */
function isPortfolioSectionId(value: string): value is PortfolioSectionId {
  return sectionIds.has(value as PortfolioSectionId);
}

/**
 * carousel 위치, hash, 두 navigation의 current 상태를 동기화한다.
 */
export function NavigationTracker() {
  useEffect(() => {
    let pendingSyncFrame: number | undefined;
    let pendingFocusFrame: number | undefined;
    let pendingInitialHashTimer: number | undefined;

    /**
     * Fast Refresh 뒤에도 현재 carousel DOM을 다시 찾는다.
     */
    function getCarousel(): HTMLElement | null {
      return document.querySelector<HTMLElement>("[data-carousel]");
    }

    /**
     * 현재 렌더링된 다섯 section을 navigation 순서대로 반환한다.
     */
    function getSections(): readonly HTMLElement[] {
      return PORTFOLIO_SECTIONS.map((section) =>
        document.getElementById(section.id),
      ).filter((section): section is HTMLElement => section !== null);
    }

    /**
     * desktop와 mobile navigation에서 현재 section만 표시한다.
     */
    function setCurrentSection(sectionId: PortfolioSectionId): void {
      const navigationLinks = document.querySelectorAll<HTMLAnchorElement>(
        "a[data-nav]",
      );

      for (const link of navigationLinks) {
        if (link.dataset.nav === sectionId) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    }

    /**
     * carousel 중앙선에 가장 가까운 section을 활성 카드로 판정한다.
     */
    function getCenteredSection(): PortfolioSectionId | undefined {
      const carousel = getCarousel();

      if (!carousel) {
        return undefined;
      }

      const carouselRect = carousel.getBoundingClientRect();
      const activationLine = carouselRect.left + carouselRect.width / 2;
      let nearestSectionId: PortfolioSectionId | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const section of getSections()) {
        const sectionRect = section.getBoundingClientRect();

        if (sectionRect.width === 0 && sectionRect.height === 0) {
          continue;
        }

        if (
          sectionRect.left <= activationLine &&
          sectionRect.right >= activationLine &&
          isPortfolioSectionId(section.id)
        ) {
          return section.id;
        }

        const sectionCenter = sectionRect.left + sectionRect.width / 2;
        const distance = Math.abs(sectionCenter - activationLine);

        if (distance < nearestDistance && isPortfolioSectionId(section.id)) {
          nearestDistance = distance;
          nearestSectionId = section.id;
        }
      }

      return nearestSectionId;
    }

    /**
     * 지정한 section 카드를 carousel의 왼쪽 경계로 이동한다.
     */
    function scrollToSection(
      sectionId: PortfolioSectionId,
      behavior: ScrollBehavior,
    ): void {
      const carousel = getCarousel();
      const section = document.getElementById(sectionId);

      if (!carousel || !section) {
        return;
      }

      const carouselRect = carousel.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const targetLeft =
        carousel.scrollLeft + sectionRect.left - carouselRect.left;

      if (typeof carousel.scrollTo === "function") {
        carousel.scrollTo({ left: targetLeft, behavior });
      } else {
        carousel.scrollLeft = targetLeft;
      }
    }

    /**
     * 현재 가로 위치에 맞춰 두 navigation의 활성 번호를 갱신한다.
     */
    function syncCurrentSection(): void {
      const sectionId = getCenteredSection();

      if (sectionId) {
        setCurrentSection(sectionId);
      }
    }

    /**
     * 고빈도 carousel scroll/resize 이벤트를 frame마다 한 번만 계산한다.
     */
    function scheduleCurrentSectionSync(): void {
      if (pendingSyncFrame !== undefined) {
        return;
      }

      pendingSyncFrame = window.requestAnimationFrame(() => {
        pendingSyncFrame = undefined;
        syncCurrentSection();
      });
    }

    /**
     * document capture listener에서 carousel 자체의 scroll만 처리한다.
     */
    function handleDocumentScroll(event: Event): void {
      const target = event.target;

      if (target instanceof Element && target.matches("[data-carousel]")) {
        scheduleCurrentSectionSync();
      }
    }

    /**
     * 번호 또는 내부 section 링크를 가로 carousel 이동으로 전환한다.
     */
    function handleNavigationClick(event: MouseEvent): void {
      const clickedElement = event.target;

      if (!(clickedElement instanceof Element)) {
        return;
      }

      const link = clickedElement.closest<HTMLAnchorElement>('a[href^="#"]');

      if (!link) {
        return;
      }

      const sectionId = link.hash.slice(1);

      if (!isPortfolioSectionId(sectionId)) {
        return;
      }

      event.preventDefault();

      if (window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, "", `#${sectionId}`);
      }

      setCurrentSection(sectionId);
      scrollToSection(sectionId, "smooth");

      if (pendingFocusFrame !== undefined) {
        window.cancelAnimationFrame(pendingFocusFrame);
      }

      pendingFocusFrame = window.requestAnimationFrame(() => {
        pendingFocusFrame = undefined;
        document.getElementById(sectionId)?.focus({ preventScroll: true });
      });
    }

    /**
     * browser history나 직접 입력한 hash를 해당 carousel 카드에 반영한다.
     */
    function handleHistoryNavigation(): void {
      const sectionId = window.location.hash.slice(1);

      if (!isPortfolioSectionId(sectionId)) {
        return;
      }

      setCurrentSection(sectionId);
      scrollToSection(sectionId, "smooth");
      document.getElementById(sectionId)?.focus({ preventScroll: true });
    }

    const initialSectionId = window.location.hash.slice(1);

    if (isPortfolioSectionId(initialSectionId)) {
      const restoreInitialSection = (): void => {
        setCurrentSection(initialSectionId);
        scrollToSection(initialSectionId, "instant");
        document
          .getElementById(initialSectionId)
          ?.focus({ preventScroll: true });
      };

      pendingFocusFrame = window.requestAnimationFrame(() => {
        pendingFocusFrame = undefined;
        restoreInitialSection();
      });
      pendingInitialHashTimer = window.setTimeout(
        restoreInitialSection,
        80,
      );
    } else {
      setCurrentSection("introduce");
    }

    document.addEventListener("click", handleNavigationClick);
    document.addEventListener("scroll", handleDocumentScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("hashchange", handleHistoryNavigation);
    window.addEventListener("popstate", handleHistoryNavigation);
    window.addEventListener("resize", scheduleCurrentSectionSync);

    return () => {
      document.removeEventListener("click", handleNavigationClick);
      document.removeEventListener("scroll", handleDocumentScroll, true);
      window.removeEventListener("hashchange", handleHistoryNavigation);
      window.removeEventListener("popstate", handleHistoryNavigation);
      window.removeEventListener("resize", scheduleCurrentSectionSync);

      if (pendingSyncFrame !== undefined) {
        window.cancelAnimationFrame(pendingSyncFrame);
      }

      if (pendingFocusFrame !== undefined) {
        window.cancelAnimationFrame(pendingFocusFrame);
      }

      if (pendingInitialHashTimer !== undefined) {
        window.clearTimeout(pendingInitialHashTimer);
      }
    };
  }, []);

  return null;
}
