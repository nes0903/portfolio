"use client";

import { useEffect, type RefObject } from "react";

import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

interface NavigationTrackerProps {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly useContainerScroll?: boolean;
}

const sectionIds = new Set<PortfolioSectionId>(
  PORTFOLIO_SECTIONS.map((section) => section.id),
);
const MOBILE_NAVIGATION_HIDE_DELAY = 1_200;

/**
 * 문자열이 승인된 portfolio section id인지 좁힌다.
 */
function isPortfolioSectionId(value: string): value is PortfolioSectionId {
  return sectionIds.has(value as PortfolioSectionId);
}

/**
 * 네 section의 연속 스크롤 위치와 세로 navigation을 동기화한다.
 */
export function NavigationTracker({
  containerRef,
  useContainerScroll = false,
}: NavigationTrackerProps) {
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const navigation = container.querySelector<HTMLElement>(
      "[data-section-navigation]",
    );
    const sectionsRoot = container.querySelector<HTMLElement>(
      "[data-scroll-sections]",
    );
    const sectionElements = new Map<PortfolioSectionId, HTMLElement>();

    for (const section of PORTFOLIO_SECTIONS) {
      const element = container.querySelector<HTMLElement>(
        `[data-section="${section.id}"]`,
      );

      if (element) sectionElements.set(section.id, element);
    }

    if (!navigation || sectionElements.size === 0) return;

    const resolvedContainer: HTMLDivElement = container;
    const resolvedNavigation: HTMLElement = navigation;
    const scrollRoot = useContainerScroll ? resolvedContainer : null;
    const scrollTarget: Window | HTMLElement = scrollRoot ?? window;
    const managesHistory = !useContainerScroll;
    const intersectingSections = new Set<PortfolioSectionId>();
    let activeSection: PortfolioSectionId | undefined;
    let hideNavigationTimer: number | undefined;
    let pendingFocusFrame: number | undefined;
    let pendingInitialFrame: number | undefined;
    let navigationFocused = false;
    let pointerActive = false;
    let suppressObserver = false;

    function setCurrentSection(
      sectionId: PortfolioSectionId,
      options: { readonly syncHash: boolean },
    ): void {
      if (activeSection !== sectionId) {
        activeSection = sectionId;

        const navigationLinks = resolvedContainer.querySelectorAll<HTMLAnchorElement>(
          "a[data-nav]",
        );

        for (const link of navigationLinks) {
          if (link.dataset.nav === sectionId) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        }

        sectionsRoot?.setAttribute("data-active-section", sectionId);
      }

      if (
        options.syncHash &&
        managesHistory &&
        window.location.hash !== `#${sectionId}`
      ) {
        window.history.replaceState(null, "", `#${sectionId}`);
      }
    }

    function getViewportCenter(): number {
      if (!scrollRoot) return window.innerHeight / 2;

      const rootRect = scrollRoot.getBoundingClientRect();
      return rootRect.top + rootRect.height / 2;
    }

    function getNearestSection(
      candidates: Iterable<PortfolioSectionId>,
    ): PortfolioSectionId | undefined {
      const viewportCenter = getViewportCenter();
      let nearestSection: PortfolioSectionId | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const sectionId of candidates) {
        const section = sectionElements.get(sectionId);

        if (!section) continue;

        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSection = sectionId;
        }
      }

      return nearestSection;
    }

    function updateFromGeometry(): void {
      if (suppressObserver) return;

      const viewportCenter = getViewportCenter();
      const centeredSections = PORTFOLIO_SECTIONS.flatMap(({ id }) => {
        const section = sectionElements.get(id);

        if (!section) return [];

        const rect = section.getBoundingClientRect();
        return rect.top <= viewportCenter && rect.bottom >= viewportCenter
          ? [id]
          : [];
      });
      const candidates =
        centeredSections.length > 0
          ? centeredSections
          : intersectingSections.size > 0
            ? intersectingSections
            : PORTFOLIO_SECTIONS.map(({ id }) => id);
      const nearestSection = getNearestSection(candidates);

      if (nearestSection) {
        setCurrentSection(nearestSection, { syncHash: true });
      }
    }

    function scheduleSectionFocus(sectionId: PortfolioSectionId): void {
      if (pendingFocusFrame !== undefined) {
        window.cancelAnimationFrame(pendingFocusFrame);
      }

      pendingFocusFrame = window.requestAnimationFrame(() => {
        pendingFocusFrame = undefined;
        sectionElements.get(sectionId)?.focus({ preventScroll: true });
      });
    }

    function getScrollBehavior(): ScrollBehavior {
      return typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
    }

    function navigateToSection(
      sectionId: PortfolioSectionId,
      historyMode: "none" | "push",
      focusSection = true,
    ): void {
      const section = sectionElements.get(sectionId);

      if (!section) return;

      if (
        historyMode === "push" &&
        managesHistory &&
        window.location.hash !== `#${sectionId}`
      ) {
        window.history.pushState(null, "", `#${sectionId}`);
      }

      setCurrentSection(sectionId, { syncHash: false });
      section.scrollIntoView({
        behavior: getScrollBehavior(),
        block: "start",
      });

      if (focusSection) scheduleSectionFocus(sectionId);
    }

    function handleNavigationClick(event: MouseEvent): void {
      const clickedElement = event.target;

      if (!(clickedElement instanceof Element)) return;

      const link = clickedElement.closest<HTMLAnchorElement>('a[href^="#"]');

      if (!link || !resolvedContainer.contains(link)) return;

      const sectionId = link.hash.slice(1);

      if (!isPortfolioSectionId(sectionId)) return;

      event.preventDefault();
      navigateToSection(sectionId, "push");
    }

    function handleHistoryNavigation(): void {
      const sectionId = window.location.hash.slice(1);

      if (isPortfolioSectionId(sectionId)) {
        navigateToSection(sectionId, "none");
      }
    }

    function clearHideNavigationTimer(): void {
      if (hideNavigationTimer === undefined) return;

      window.clearTimeout(hideNavigationTimer);
      hideNavigationTimer = undefined;
    }

    function scheduleNavigationHide(): void {
      clearHideNavigationTimer();
      hideNavigationTimer = window.setTimeout(() => {
        hideNavigationTimer = undefined;

        if (pointerActive || navigationFocused) {
          scheduleNavigationHide();
          return;
        }

        resolvedNavigation.dataset.scrollVisible = "false";
      }, MOBILE_NAVIGATION_HIDE_DELAY);
    }

    function revealNavigation(): void {
      resolvedNavigation.dataset.scrollVisible = "true";
      scheduleNavigationHide();
    }

    function handleScroll(): void {
      revealNavigation();

      if (typeof window.IntersectionObserver !== "function") {
        updateFromGeometry();
      }
    }

    function handleNavigationFocus(): void {
      navigationFocused = true;
      revealNavigation();
    }

    function handleNavigationBlur(event: FocusEvent): void {
      const nextTarget = event.relatedTarget;
      navigationFocused =
        nextTarget instanceof Node && resolvedNavigation.contains(nextTarget);
      scheduleNavigationHide();
    }

    function handlePointerDown(): void {
      pointerActive = true;
      revealNavigation();
    }

    function handlePointerEnd(): void {
      pointerActive = false;
      scheduleNavigationHide();
    }

    resolvedNavigation.dataset.scrollVisible = "false";

    const initialHash = managesHistory ? window.location.hash.slice(1) : "";
    const initialSection = isPortfolioSectionId(initialHash)
      ? initialHash
      : "introduce";

    setCurrentSection(initialSection, { syncHash: false });

    if (isPortfolioSectionId(initialHash)) {
      suppressObserver = true;
      sectionElements.get(initialHash)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
      pendingInitialFrame = window.requestAnimationFrame(() => {
        pendingInitialFrame = undefined;
        sectionElements.get(initialHash)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        suppressObserver = false;
        setCurrentSection(initialHash, { syncHash: false });
      });
    }

    let observer: IntersectionObserver | undefined;

    if (typeof window.IntersectionObserver === "function") {
      observer = new window.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const sectionId = (entry.target as HTMLElement).dataset.section;

            if (!sectionId || !isPortfolioSectionId(sectionId)) continue;

            if (entry.isIntersecting) {
              intersectingSections.add(sectionId);
            } else {
              intersectingSections.delete(sectionId);
            }
          }

          const nearestSection = getNearestSection(intersectingSections);

          if (nearestSection && !suppressObserver) {
            setCurrentSection(nearestSection, { syncHash: true });
          }
        },
        {
          root: scrollRoot,
          rootMargin: "-45% 0px -45% 0px",
          threshold: 0,
        },
      );

      for (const section of sectionElements.values()) observer.observe(section);
    }

    resolvedContainer.addEventListener("click", handleNavigationClick);
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateFromGeometry);
    window.addEventListener("hashchange", handleHistoryNavigation);
    window.addEventListener("popstate", handleHistoryNavigation);
    resolvedNavigation.addEventListener("focusin", handleNavigationFocus);
    resolvedNavigation.addEventListener("focusout", handleNavigationBlur);
    resolvedNavigation.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      observer?.disconnect();
      resolvedContainer.removeEventListener("click", handleNavigationClick);
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateFromGeometry);
      window.removeEventListener("hashchange", handleHistoryNavigation);
      window.removeEventListener("popstate", handleHistoryNavigation);
      resolvedNavigation.removeEventListener("focusin", handleNavigationFocus);
      resolvedNavigation.removeEventListener("focusout", handleNavigationBlur);
      resolvedNavigation.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      clearHideNavigationTimer();

      if (pendingFocusFrame !== undefined) {
        window.cancelAnimationFrame(pendingFocusFrame);
      }

      if (pendingInitialFrame !== undefined) {
        window.cancelAnimationFrame(pendingInitialFrame);
      }
    };
  }, [containerRef, useContainerScroll]);

  return null;
}
