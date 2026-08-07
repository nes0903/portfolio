"use client";

import { useEffect } from "react";

import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

const sectionIds = new Set<PortfolioSectionId>(
  PORTFOLIO_SECTIONS.map((section) => section.id),
);
const carouselLength = PORTFOLIO_SECTIONS.length;
const carouselHalf = Math.floor(carouselLength / 2);

/**
 * 문자열이 승인된 portfolio section id인지 좁힌다.
 */
function isPortfolioSectionId(value: string): value is PortfolioSectionId {
  return sectionIds.has(value as PortfolioSectionId);
}

/**
 * 네 card의 차이를 원형 상대 위치로 변환한다.
 */
function getCircularOffset(cardIndex: number, activeIndex: number): number {
  let offset = cardIndex - activeIndex;

  if (offset > carouselHalf) {
    offset -= carouselLength;
  } else if (offset < -carouselHalf) {
    offset += carouselLength;
  }

  return offset;
}

/**
 * hash와 무한 carousel card 위치를 두 navigation에 동기화한다.
 */
export function NavigationTracker() {
  useEffect(() => {
    let pendingFocusFrame: number | undefined;
    let pendingInitialHashTimer: number | undefined;

    /**
     * Fast Refresh 뒤에도 현재 navigation DOM을 다시 찾아 갱신한다.
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
     * 활성 card를 중앙(0), 이웃 card를 좌우(-1, 1)에 원형 배치한다.
     */
    function positionCarousel(sectionId: PortfolioSectionId): void {
      const activeIndex = PORTFOLIO_SECTIONS.findIndex(
        (section) => section.id === sectionId,
      );
      const cards = document.querySelectorAll<HTMLElement>(
        "[data-carousel-card]",
      );

      if (activeIndex < 0) {
        return;
      }

      for (const [cardIndex, card] of Array.from(cards).entries()) {
        const offset = getCircularOffset(cardIndex, activeIndex);
        const wasActive = card.dataset.carouselOffset === "0";

        card.dataset.carouselOffset = String(offset);
        card.dataset.carouselPosition =
          offset === 0
            ? "active"
            : Math.abs(offset) === 1
              ? "adjacent"
              : "distant";

        if (offset === 0 && !wasActive) {
          card.scrollTop = 0;
        }
      }

      document
        .querySelector<HTMLElement>("[data-carousel]")
        ?.setAttribute("data-active-section", sectionId);
      setCurrentSection(sectionId);

      if (window.scrollX !== 0) {
        window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
      }
    }

    /**
     * card 전환 후 선택 card로 접근성 focus를 옮긴다.
     */
    function scheduleSectionFocus(sectionId: PortfolioSectionId): void {
      if (pendingFocusFrame !== undefined) {
        window.cancelAnimationFrame(pendingFocusFrame);
      }

      pendingFocusFrame = window.requestAnimationFrame(() => {
        pendingFocusFrame = undefined;
        positionCarousel(sectionId);
        document.getElementById(sectionId)?.focus({ preventScroll: true });
      });
    }

    /**
     * URL, card 위치, focus를 한 번에 같은 section으로 전환한다.
     */
    function navigateToSection(sectionId: PortfolioSectionId): void {
      if (window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, "", `#${sectionId}`);
      }

      positionCarousel(sectionId);
      scheduleSectionFocus(sectionId);
    }

    /**
     * 양옆 card, 번호, 내부 section 링크를 원형 carousel 회전으로 전환한다.
     */
    function handleNavigationClick(event: MouseEvent): void {
      const clickedElement = event.target;

      if (!(clickedElement instanceof Element)) {
        return;
      }

      const adjacentCard = clickedElement.closest<HTMLElement>(
        '[data-carousel-card][data-carousel-position="adjacent"]',
      );

      if (adjacentCard && isPortfolioSectionId(adjacentCard.id)) {
        event.preventDefault();
        navigateToSection(adjacentCard.id);
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
      navigateToSection(sectionId);
    }

    /**
     * browser history나 직접 입력한 hash를 해당 중앙 card에 반영한다.
     */
    function handleHistoryNavigation(): void {
      const sectionId = window.location.hash.slice(1);

      if (!isPortfolioSectionId(sectionId)) {
        return;
      }

      positionCarousel(sectionId);
      scheduleSectionFocus(sectionId);
    }

    const initialSectionId = window.location.hash.slice(1);

    if (isPortfolioSectionId(initialSectionId)) {
      positionCarousel(initialSectionId);
      pendingInitialHashTimer = window.setTimeout(() => {
        positionCarousel(initialSectionId);
      }, 80);
    } else {
      positionCarousel("introduce");
    }

    document.addEventListener("click", handleNavigationClick);
    window.addEventListener("hashchange", handleHistoryNavigation);
    window.addEventListener("popstate", handleHistoryNavigation);

    return () => {
      document.removeEventListener("click", handleNavigationClick);
      window.removeEventListener("hashchange", handleHistoryNavigation);
      window.removeEventListener("popstate", handleHistoryNavigation);

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
