"use client";

import { useEffect, useRef, type RefObject } from "react";

import {
  PORTFOLIO_SECTIONS,
  type PortfolioScrollSectionId,
} from "@/components/layout/navigation";

interface NavigationTrackerProps {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly onActiveSectionChange?: (
    sectionId: PortfolioScrollSectionId,
  ) => void;
  readonly useContainerScroll?: boolean;
}

const sectionIds = new Set<PortfolioScrollSectionId>(
  PORTFOLIO_SECTIONS.map((section) => section.id),
);
/**
 * 문자열이 승인된 portfolio section id인지 좁힌다.
 */
function isPortfolioScrollSectionId(
  value: string,
): value is PortfolioScrollSectionId {
  return sectionIds.has(value as PortfolioScrollSectionId);
}

/**
 * 세 section의 연속 스크롤 위치와 navigation을 동기화한다.
 */
export function NavigationTracker({
  containerRef,
  onActiveSectionChange,
  useContainerScroll = false,
}: NavigationTrackerProps) {
  const onActiveSectionChangeRef = useRef(onActiveSectionChange);

  useEffect(() => {
    onActiveSectionChangeRef.current = onActiveSectionChange;
  }, [onActiveSectionChange]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const navigation = container.querySelector<HTMLElement>(
      "[data-section-navigation]",
    );
    const sectionsRoot = container.querySelector<HTMLElement>(
      "[data-scroll-sections]",
    );
    const sectionElements = new Map<PortfolioScrollSectionId, HTMLElement>();

    for (const section of PORTFOLIO_SECTIONS) {
      const element = container.querySelector<HTMLElement>(
        `[data-section="${section.id}"]`,
      );

      if (element) sectionElements.set(section.id, element);
    }

    if (!navigation || sectionElements.size === 0) return;

    const resolvedContainer: HTMLDivElement = container;
    const scrollRoot = useContainerScroll ? resolvedContainer : null;
    const scrollTarget: Window | HTMLElement = scrollRoot ?? window;
    const managesHistory = !useContainerScroll;
    const intersectingSections = new Set<PortfolioScrollSectionId>();
    let activeSection: PortfolioScrollSectionId | undefined;
    let pendingFocusFrame: number | undefined;
    let pendingInitialFrame: number | undefined;
    let suppressObserver = false;

    function setCurrentSection(
      sectionId: PortfolioScrollSectionId,
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
        onActiveSectionChangeRef.current?.(sectionId);
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
      candidates: Iterable<PortfolioScrollSectionId>,
    ): PortfolioScrollSectionId | undefined {
      const viewportCenter = getViewportCenter();
      let nearestSection: PortfolioScrollSectionId | undefined;
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

    function scheduleSectionFocus(sectionId: PortfolioScrollSectionId): void {
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
      sectionId: PortfolioScrollSectionId,
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

      if (!isPortfolioScrollSectionId(sectionId)) return;

      event.preventDefault();
      navigateToSection(sectionId, "push");
    }

    function handleHistoryNavigation(): void {
      const sectionId = window.location.hash.slice(1);

      if (isPortfolioScrollSectionId(sectionId)) {
        navigateToSection(sectionId, "none");
      }
    }

    function handleScroll(): void {
      if (typeof window.IntersectionObserver !== "function") {
        updateFromGeometry();
      }
    }

    const initialHash = managesHistory ? window.location.hash.slice(1) : "";
    const initialSection = isPortfolioScrollSectionId(initialHash)
      ? initialHash
      : "introduce";

    setCurrentSection(initialSection, { syncHash: false });

    if (isPortfolioScrollSectionId(initialHash)) {
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

            if (!sectionId || !isPortfolioScrollSectionId(sectionId)) continue;

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

    return () => {
      observer?.disconnect();
      resolvedContainer.removeEventListener("click", handleNavigationClick);
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateFromGeometry);
      window.removeEventListener("hashchange", handleHistoryNavigation);
      window.removeEventListener("popstate", handleHistoryNavigation);
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
