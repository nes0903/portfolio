"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PortfolioCareerWorkImage } from "@/lib/content/types";

interface CareerWorkImagesProps {
  readonly images: readonly PortfolioCareerWorkImage[];
  readonly title: string;
}

function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

/**
 * 경력 작업 썸네일과 중앙 확대 뷰어를 렌더링한다.
 */
export function CareerWorkImages({ images, title }: CareerWorkImagesProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const imageCount = images.length;
  const safeViewerIndex =
    viewerIndex === null
      ? null
      : Math.min(viewerIndex, Math.max(imageCount - 1, 0));
  const activeImage =
    safeViewerIndex === null ? undefined : images[safeViewerIndex];
  const viewerOpen = viewerIndex !== null;

  function openViewer(index: number): void {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setViewerIndex(index);
  }

  function closeViewer(): void {
    setViewerIndex(null);
  }

  function moveViewer(offset: number): void {
    if (imageCount < 2) return;

    setViewerIndex((current) =>
      current === null ? current : wrapIndex(current + offset, imageCount),
    );
  }

  useEffect(() => {
    if (!viewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const restoreFocusTarget = restoreFocusRef.current;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setViewerIndex(null);
        return;
      }

      if (event.key === "ArrowLeft" && imageCount > 1) {
        event.preventDefault();
        setViewerIndex((current) =>
          current === null ? current : wrapIndex(current - 1, imageCount),
        );
      }

      if (event.key === "ArrowRight" && imageCount > 1) {
        event.preventDefault();
        setViewerIndex((current) =>
          current === null ? current : wrapIndex(current + 1, imageCount),
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTarget?.focus();
    };
  }, [imageCount, viewerOpen]);

  if (images.length === 0) return null;

  const viewer =
    activeImage && safeViewerIndex !== null
      ? createPortal(
          <div
            className="career-image-modal-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeViewer();
            }}
          >
            <section
              aria-label={`${title} 작업 이미지 뷰어`}
              aria-modal="true"
              className="career-image-modal"
              role="dialog"
            >
              <button
                aria-label="이미지 뷰어 닫기"
                className="career-image-modal-close"
                onClick={closeViewer}
                ref={closeButtonRef}
                type="button"
              >
                ×
              </button>

              <div
                className="career-image-modal-stage"
                data-single={imageCount === 1 ? "true" : undefined}
              >
                {imageCount > 1 ? (
                  <button
                    aria-label="이전 작업 이미지"
                    className="career-image-modal-arrow"
                    onClick={() => moveViewer(-1)}
                    type="button"
                  >
                    ←
                  </button>
                ) : null}
                <div className="career-image-modal-image">
                  <Image
                    alt={activeImage.alt}
                    fill
                    sizes="94vw"
                    src={activeImage.url}
                  />
                </div>
                {imageCount > 1 ? (
                  <button
                    aria-label="다음 작업 이미지"
                    className="career-image-modal-arrow"
                    onClick={() => moveViewer(1)}
                    type="button"
                  >
                    →
                  </button>
                ) : null}
              </div>

              <footer aria-live="polite">
                <span>{activeImage.alt}</span>
                <span>
                  {safeViewerIndex + 1} / {imageCount}
                </span>
              </footer>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section aria-label={`${title} 작업 스크린샷`} className="career-work-media">
        <h4>Work Screenshots</h4>
        <div className="career-work-gallery">
          {images.map((image, index) => (
            <figure key={image.path}>
              <button
                aria-label={`${image.alt} 크게 보기`}
                className="career-work-image-link"
                onClick={() => openViewer(index)}
                type="button"
              >
                <Image
                  alt={image.alt}
                  fill
                  sizes="(max-width: 720px) 100vw, 42vw"
                  src={image.url}
                />
              </button>
              <figcaption>{image.alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      {viewer}
    </>
  );
}
