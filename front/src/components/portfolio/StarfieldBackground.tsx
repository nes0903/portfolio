"use client";

import { useEffect, useRef } from "react";

interface Star {
  color: "cool" | "white";
  depth: number;
  size: number;
  x: number;
  y: number;
}

const FAR_DEPTH = 1;
const NEAR_DEPTH = 0.08;
const FORWARD_SPEED = 0.028;
const MAX_DEVICE_PIXEL_RATIO = 2;
const STAR_SEED = 0x5f3759df;

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function getStarCount(width: number, height: number): number {
  if (width <= 820) {
    return Math.min(120, Math.max(80, Math.round((width * height) / 3200)));
  }

  return Math.min(220, Math.max(140, Math.round((width * height) / 9000)));
}

function resetStar(
  star: Star,
  random: () => number,
  width: number,
  height: number,
  depth = FAR_DEPTH,
): void {
  star.color = random() < 0.15 ? "cool" : "white";
  star.depth = depth;
  star.size = 0.45 + random() * 0.9;
  star.x = (random() - 0.5) * width * depth;
  star.y = (random() - 0.5) * height * depth;
}

function createStars(
  width: number,
  height: number,
  random: () => number,
): Star[] {
  return Array.from({ length: getStarCount(width, height) }, () => {
    const star: Star = {
      color: "white",
      depth: FAR_DEPTH,
      size: 1,
      x: 0,
      y: 0,
    };
    resetStar(
      star,
      random,
      width,
      height,
      NEAR_DEPTH + random() * (FAR_DEPTH - NEAR_DEPTH),
    );
    return star;
  });
}

function drawStarfield(
  context: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedMilliseconds: number,
  random: () => number,
  advance: boolean,
): void {
  context.clearRect(0, 0, width, height);

  const driftX = Math.sin(elapsedMilliseconds * 0.00012) * 10;
  const driftY = Math.cos(elapsedMilliseconds * 0.00009) * 6;
  const centerX = width / 2 + driftX;
  const centerY = height / 2 + driftY;

  for (const star of stars) {
    if (advance) star.depth -= FORWARD_SPEED * deltaSeconds;

    const scale = 1 / Math.max(star.depth, NEAR_DEPTH);
    const screenX = centerX + star.x * scale;
    const screenY = centerY + star.y * scale;

    if (
      star.depth <= NEAR_DEPTH ||
      screenX < -64 ||
      screenX > width + 64 ||
      screenY < -64 ||
      screenY > height + 64
    ) {
      resetStar(star, random, width, height);
      continue;
    }

    const progress = 1 - star.depth;
    const radius = star.size * (0.55 + progress * 1.55);
    const alpha = 0.24 + progress * 0.68;
    const color = star.color === "cool" ? "168, 204, 255" : "238, 242, 255";

    if (progress > 0.58) {
      const previousDepth = Math.min(FAR_DEPTH, star.depth + 0.018);
      const previousScale = 1 / previousDepth;
      context.beginPath();
      context.moveTo(centerX + star.x * previousScale, centerY + star.y * previousScale);
      context.lineTo(screenX, screenY);
      context.strokeStyle = `rgba(${color}, ${alpha * 0.16})`;
      context.lineWidth = Math.max(0.35, radius * 0.42);
      context.stroke();
    }

    context.beginPath();
    context.arc(screenX, screenY, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(${color}, ${alpha})`;
    context.fill();
  }
}

/**
 * 화면 전체에서 느린 전진감을 만드는 비상호작용 Canvas 별 배경.
 */
export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) return;

    const drawingContext = canvasElement.getContext("2d");

    if (!drawingContext) return;

    const canvas = canvasElement;
    const context = drawingContext;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let stars: Star[] = [];
    let random = createSeededRandom(STAR_SEED);
    let frameId: number | null = null;
    let lastTimestamp = performance.now();

    function stopAnimation(): void {
      if (frameId === null) return;
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    function animate(timestamp: number): void {
      frameId = null;
      const deltaSeconds = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      drawStarfield(
        context,
        stars,
        width,
        height,
        deltaSeconds,
        timestamp,
        random,
        true,
      );

      if (!document.hidden && !motionQuery.matches) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    function startAnimation(): void {
      if (frameId !== null || document.hidden || motionQuery.matches) return;
      lastTimestamp = performance.now();
      frameId = window.requestAnimationFrame(animate);
    }

    function resizeCanvas(): void {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      random = createSeededRandom(
        STAR_SEED ^ Math.imul(width, 73856093) ^ Math.imul(height, 19349663),
      );
      stars = createStars(width, height, random);
      drawStarfield(
        context,
        stars,
        width,
        height,
        0,
        performance.now(),
        random,
        false,
      );
    }

    function handleVisibilityChange(): void {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    }

    function handleMotionChange(): void {
      if (motionQuery.matches) {
        stopAnimation();
        drawStarfield(
          context,
          stars,
          width,
          height,
          0,
          performance.now(),
          random,
          false,
        );
      } else {
        startAnimation();
      }
    }

    resizeCanvas();
    startAnimation();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      stopAnimation();
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="space-starfield"
      data-starfield
      ref={canvasRef}
    />
  );
}
