export const INTRODUCTION_VERTICAL_UNIT_PX = 5;
export const INTRODUCTION_CANVAS_BOTTOM_GAP_PX = 48;
export const INTRODUCTION_TEXT_BLOCK_GAP_UNITS = 4;
export const INTRODUCTION_MAX_VERTICAL_UNITS = 10_000;
export const INTRODUCTION_MIN_HEIGHT_UNITS = 8;

interface IntroductionVerticalLayout {
  readonly height: number;
  readonly y: number;
}

export function getIntroductionCanvasMinimumHeight(
  blocks: readonly IntroductionVerticalLayout[],
): number {
  const bottom = blocks.reduce(
    (maximum, block) => Math.max(maximum, block.y + block.height),
    0,
  );

  return Math.ceil(
    bottom * INTRODUCTION_VERTICAL_UNIT_PX +
      INTRODUCTION_CANVAS_BOTTOM_GAP_PX,
  );
}
