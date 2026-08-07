import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import { FormattedText } from "@/components/portfolio/FormattedText";
import {
  getIntroductionCanvasMinimumHeight,
  INTRODUCTION_MAX_VERTICAL_UNITS,
  INTRODUCTION_MIN_HEIGHT_UNITS,
  INTRODUCTION_TEXT_BLOCK_GAP_UNITS,
  INTRODUCTION_VERTICAL_UNIT_PX,
} from "@/lib/content/introduction-layout";
import type {
  Introduce,
  IntroductionTextBlock,
} from "@/lib/content/types";

interface IntroductionTextCanvasProps {
  readonly blocks: readonly IntroductionTextBlock[];
  readonly editor?: PortfolioEditorBridge;
  readonly introduce: Introduce;
}

interface IntroductionTextBlockViewProps {
  readonly block: IntroductionTextBlock;
  readonly displayY: number;
  readonly editor?: PortfolioEditorBridge;
  readonly introduce: Introduce;
}

interface PointerInteraction {
  readonly canvasWidth: number;
  readonly height: number;
  lastOverlapArea: number;
  readonly mode: InteractionMode;
  readonly obstacles: readonly TextBlockRectangle[];
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface TextBlockRectangle {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

type InteractionMode =
  | "move"
  | "resize-bottom"
  | "resize-left"
  | "resize-right";

type TextBlockStyle = CSSProperties & {
  readonly "--text-block-font-size": string;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundLayoutValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function getOverlapArea(
  rectangle: TextBlockRectangle,
  obstacles: readonly TextBlockRectangle[],
): number {
  return obstacles.reduce((total, obstacle) => {
    const overlapWidth = Math.max(
      0,
      Math.min(rectangle.x + rectangle.width, obstacle.x + obstacle.width) -
        Math.max(rectangle.x, obstacle.x),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(rectangle.y + rectangle.height, obstacle.y + obstacle.height) -
        Math.max(rectangle.y, obstacle.y),
    );

    return total + overlapWidth * overlapHeight;
  }, 0);
}

function getBlockOrder(block: IntroductionTextBlock): number {
  if (block.kind === "title") return 0;
  if (block.kind === "body") return 1;
  return 2;
}

function resolveBlockVerticalPositions(
  blocks: readonly IntroductionTextBlock[],
  measuredHeights: ReadonlyMap<string, number>,
): Readonly<Record<string, number>> {
  const placed: TextBlockRectangle[] = [];
  const positions: Record<string, number> = {};
  const ordered = blocks
    .map((block, index) => ({ block, index }))
    .toSorted(
      (left, right) =>
        left.block.y - right.block.y ||
        getBlockOrder(left.block) - getBlockOrder(right.block) ||
        left.index - right.index,
    );

  ordered.forEach(({ block }) => {
    const height = Math.max(
      block.height,
      measuredHeights.get(block.id) ?? block.height,
    );
    let y = block.y;

    placed.forEach((rectangle) => {
      const horizontallyOverlaps =
        block.x < rectangle.x + rectangle.width &&
        block.x + block.width > rectangle.x;
      const verticallyOverlaps =
        y < rectangle.y + rectangle.height && y + height > rectangle.y;

      if (horizontallyOverlaps && verticallyOverlaps) {
        y = rectangle.y + rectangle.height + INTRODUCTION_TEXT_BLOCK_GAP_UNITS;
      }
    });

    y = clamp(
      roundLayoutValue(y),
      0,
      INTRODUCTION_MAX_VERTICAL_UNITS - height,
    );
    positions[block.id] = y;
    placed.push({
      height,
      width: block.width,
      x: block.x,
      y,
    });
  });

  return positions;
}

function equalVerticalPositions(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([id, y]) => right[id] === y)
  );
}

function getElementRectangle(
  element: HTMLElement,
  canvasRect: DOMRect,
): TextBlockRectangle | null {
  const elementRect = element.getBoundingClientRect();
  if (elementRect.width <= 0 || elementRect.height <= 0) return null;

  return {
    height: elementRect.height / INTRODUCTION_VERTICAL_UNIT_PX,
    width: (elementRect.width / canvasRect.width) * 100,
    x: ((elementRect.left - canvasRect.left) / canvasRect.width) * 100,
    y:
      (elementRect.top - canvasRect.top) /
      INTRODUCTION_VERTICAL_UNIT_PX,
  };
}

function getBlockLabel(block: IntroductionTextBlock): string {
  if (block.kind === "title") return "소개 제목";
  if (block.kind === "body") return "소개 내용";
  return "추가 텍스트";
}

interface ParagraphLinesProps {
  readonly paragraph: string;
}

function ParagraphLines({ paragraph }: ParagraphLinesProps) {
  const lines = paragraph.split(/\r?\n/);

  return lines.map((line, index) => (
    <Fragment key={index}>
      <FormattedText text={line} />
      {index < lines.length - 1 ? (
        <>
          <br />{" "}
        </>
      ) : null}
    </Fragment>
  ));
}

function IntroductionTextBlockView({
  block,
  displayY,
  editor,
  introduce,
}: IntroductionTextBlockViewProps) {
  const interactionRef = useRef<PointerInteraction | null>(null);
  const style: TextBlockStyle = {
    "--text-block-font-size": `${block.fontSize}px`,
    left: `${block.x}%`,
    minHeight: `${block.height * INTRODUCTION_VERTICAL_UNIT_PX}px`,
    textAlign: block.textAlign,
    top: `${displayY * INTRODUCTION_VERTICAL_UNIT_PX}px`,
    width: `${block.width}%`,
  };
  const isSelected = editor?.selectedIntroductionTextBlockId === block.id;

  function beginInteraction(
    event: ReactPointerEvent<HTMLButtonElement>,
    mode: PointerInteraction["mode"],
  ): void {
    if (!editor) return;

    const canvas = event.currentTarget.closest<HTMLElement>(
      ".introduction-text-canvas",
    );
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width === 0) return;

    const blockElement = event.currentTarget.closest<HTMLElement>(
      ".introduction-text-block",
    );
    const renderedRectangle = blockElement
      ? getElementRectangle(blockElement, canvasRect)
      : null;
    const interactionRectangle = renderedRectangle ?? {
      height: block.height,
      width: block.width,
      x: block.x,
      y: block.y,
    };
    const obstacles = Array.from(
      canvas.querySelectorAll<HTMLElement>("[data-text-block-id]"),
    ).flatMap((element) => {
      if (element.dataset.textBlockId === block.id) return [];
      const rectangle = getElementRectangle(element, canvasRect);
      return rectangle ? [rectangle] : [];
    });

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    editor.onSelectIntroductionTextBlock(block.id);
    interactionRef.current = {
      canvasWidth: canvasRect.width,
      height: clamp(
        interactionRectangle.height,
        INTRODUCTION_MIN_HEIGHT_UNITS,
        INTRODUCTION_MAX_VERTICAL_UNITS,
      ),
      lastOverlapArea: getOverlapArea(interactionRectangle, obstacles),
      mode,
      obstacles,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      width: clamp(interactionRectangle.width, 10, 100),
      x: clamp(interactionRectangle.x, 0, 90),
      y: clamp(
        interactionRectangle.y,
        0,
        INTRODUCTION_MAX_VERTICAL_UNITS,
      ),
    };
  }

  function continueInteraction(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const interaction = interactionRef.current;
    if (!editor || !interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    const deltaX =
      ((event.clientX - interaction.startClientX) / interaction.canvasWidth) *
      100;
    const deltaY =
      (event.clientY - interaction.startClientY) /
      INTRODUCTION_VERTICAL_UNIT_PX;

    if (interaction.mode === "move") {
      const nextRectangle = {
        height: interaction.height,
        width: interaction.width,
        x: clamp(interaction.x + deltaX, 0, 100 - interaction.width),
        y: clamp(
          interaction.y + deltaY,
          0,
          INTRODUCTION_MAX_VERTICAL_UNITS - interaction.height,
        ),
      };
      const nextOverlapArea = getOverlapArea(
        nextRectangle,
        interaction.obstacles,
      );

      if (nextOverlapArea > interaction.lastOverlapArea + 0.01) return;

      interaction.lastOverlapArea = nextOverlapArea;
      editor.onChangeIntroductionTextBlock(block.id, {
        x: roundLayoutValue(nextRectangle.x),
        y: roundLayoutValue(nextRectangle.y),
      });
      return;
    }

    if (interaction.mode === "resize-left") {
      const nextX = clamp(
        interaction.x + deltaX,
        0,
        interaction.x + interaction.width - 10,
      );
      editor.onChangeIntroductionTextBlock(block.id, {
        width: roundLayoutValue(
          interaction.width - (nextX - interaction.x),
        ),
        x: roundLayoutValue(nextX),
      });
      return;
    }

    if (interaction.mode === "resize-right") {
      editor.onChangeIntroductionTextBlock(block.id, {
        width: roundLayoutValue(
          clamp(interaction.width + deltaX, 10, 100 - interaction.x),
        ),
      });
      return;
    }

    editor.onChangeIntroductionTextBlock(block.id, {
      height: roundLayoutValue(
        clamp(
          interaction.height + deltaY,
          INTRODUCTION_MIN_HEIGHT_UNITS,
          INTRODUCTION_MAX_VERTICAL_UNITS - interaction.y,
        ),
      ),
    });
  }

  function endInteraction(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const controlProps = {
    onPointerCancel: endInteraction,
    onPointerMove: continueInteraction,
    onPointerUp: endInteraction,
  } as const;

  return (
    <div
      className="introduction-text-block"
      data-editor-block={editor ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      data-text-block-id={block.id}
      data-text-block-kind={block.kind}
      onClick={
        editor
          ? (event) => {
              event.stopPropagation();
              editor.onSelectIntroductionTextBlock(block.id);
            }
          : undefined
      }
      style={style}
    >
      {editor ? (
        <>
          <button
            aria-label={`${getBlockLabel(block)} 이동`}
            className="introduction-text-block-edge introduction-text-block-edge-move"
            onPointerDown={(event) => beginInteraction(event, "move")}
            type="button"
            {...controlProps}
          />
          <button
            aria-label={`${getBlockLabel(block)} 왼쪽 변 크기 조절`}
            className="introduction-text-block-edge introduction-text-block-edge-left"
            onPointerDown={(event) => beginInteraction(event, "resize-left")}
            type="button"
            {...controlProps}
          />
          <button
            aria-label={`${getBlockLabel(block)} 오른쪽 변 크기 조절`}
            className="introduction-text-block-edge introduction-text-block-edge-right"
            onPointerDown={(event) => beginInteraction(event, "resize-right")}
            type="button"
            {...controlProps}
          />
          <button
            aria-label={`${getBlockLabel(block)} 아래쪽 변 크기 조절`}
            className="introduction-text-block-edge introduction-text-block-edge-bottom"
            onPointerDown={(event) => beginInteraction(event, "resize-bottom")}
            type="button"
            {...controlProps}
          />
        </>
      ) : null}

      <div className="introduction-text-block-content">
        {block.kind === "title" ? (
          <h1
            id="introduce-title"
            {...createEditableTextProps(editor, "introduce.title")}
          >
            <FormattedText text={introduce.title} />
          </h1>
        ) : null}

        {block.kind === "body" ? (
          editor ? (
            <p
              className="lead visual-inline-multiline"
              {...createEditableTextProps(editor, "introduce.content")}
            >
              <FormattedText text={introduce.content} />
            </p>
          ) : (
            introduce.content
              .split(/\r?\n\s*\r?\n/)
              .filter((paragraph) => paragraph.trim().length > 0)
              .map((paragraph, index) => (
                <p className="lead" key={index}>
                  <ParagraphLines paragraph={paragraph} />
                </p>
              ))
          )
        ) : null}

        {block.kind === "custom" ? (
          <p
            className="introduction-custom-text visual-inline-multiline"
            {...createEditableTextProps(
              editor,
              `introductionTextBlocks:${block.id}:text`,
            )}
          >
            <FormattedText text={block.text} />
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function IntroductionTextCanvas({
  blocks,
  editor,
  introduce,
}: IntroductionTextCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef(editor);
  const reportedPositionsRef = useRef(new Map<string, number>());
  const [correctedPositions, setCorrectedPositions] = useState<
    Readonly<Record<string, number>>
  >({});
  const [canvasHeight, setCanvasHeight] = useState(() =>
    getIntroductionCanvasMinimumHeight(blocks),
  );

  useLayoutEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    function measureLayout(): void {
      const measuredHeights = new Map<string, number>();
      Array.from(
        canvasElement.querySelectorAll<HTMLElement>("[data-text-block-id]"),
      ).forEach((element) => {
        const id = element.dataset.textBlockId;
        if (!id) return;
        measuredHeights.set(
          id,
          element.getBoundingClientRect().height /
            INTRODUCTION_VERTICAL_UNIT_PX,
        );
      });

      const resolvedPositions = resolveBlockVerticalPositions(
        blocks,
        measuredHeights,
      );
      const corrections = Object.fromEntries(
        blocks.flatMap((block) => {
          const y = resolvedPositions[block.id] ?? block.y;
          return y !== block.y ? [[block.id, y] as const] : [];
        }),
      );
      setCorrectedPositions((current) =>
        equalVerticalPositions(current, corrections) ? current : corrections,
      );

      blocks.forEach((block) => {
        const y = corrections[block.id];
        if (y === undefined) {
          reportedPositionsRef.current.delete(block.id);
          return;
        }
        if (reportedPositionsRef.current.get(block.id) === y) return;

        reportedPositionsRef.current.set(block.id, y);
        editorRef.current?.onChangeIntroductionTextBlock(block.id, { y });
      });

      const positionedBlocks = blocks.map((block) => ({
        height: Math.max(
          block.height,
          measuredHeights.get(block.id) ?? block.height,
        ),
        y: resolvedPositions[block.id] ?? block.y,
      }));
      const nextHeight = getIntroductionCanvasMinimumHeight(positionedBlocks);

      setCanvasHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    }

    measureLayout();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measureLayout);
    canvasElement
      .querySelectorAll<HTMLElement>("[data-text-block-id]")
      .forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [blocks]);

  return (
    <div
      className="introduction-text-canvas"
      data-editor-canvas={editor ? "true" : undefined}
      ref={canvasRef}
      style={{ height: `${canvasHeight}px` }}
    >
      {blocks.map((block) => (
        <IntroductionTextBlockView
          block={block}
          displayY={correctedPositions[block.id] ?? block.y}
          editor={editor}
          introduce={introduce}
          key={block.id}
        />
      ))}
    </div>
  );
}
