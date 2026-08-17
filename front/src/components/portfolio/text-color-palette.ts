import { normalizeInlineTextColor } from "@/components/portfolio/FormattedText";
import type { PortfolioVisuals } from "@/lib/content/types";

export const MAX_RECENT_TEXT_COLORS = 6;

export const DEFAULT_TEXT_COLOR_PRESETS = [
  "#F28C28",
  "#F2C94C",
  "#27AE60",
  "#00AEEF",
  "#2F80ED",
  "#9B51E0",
  "#EB5757",
  "#FFFFFF",
] as const;

function uniqueNormalizedColors(colors: readonly string[]): string[] {
  const normalizedColors: string[] = [];

  for (const color of colors) {
    const normalizedColor = normalizeInlineTextColor(color);

    if (
      normalizedColor &&
      !normalizedColors.includes(normalizedColor)
    ) {
      normalizedColors.push(normalizedColor);
    }
  }

  return normalizedColors;
}

export function createThemeTextColors(visuals: PortfolioVisuals): string[] {
  const sectionColors = Object.values(visuals.sections).flatMap((section) => [
    section.textColor,
    section.accentColor,
  ]);

  return uniqueNormalizedColors([
    visuals.textColor,
    visuals.mutedTextColor,
    visuals.accentColor,
    ...sectionColors,
  ]);
}

export function rememberRecentTextColor(
  recentColors: readonly string[],
  color: string,
): string[] {
  const normalizedColor = normalizeInlineTextColor(color);

  if (!normalizedColor) return [...recentColors];

  return uniqueNormalizedColors([
    normalizedColor,
    ...recentColors,
  ]).slice(0, MAX_RECENT_TEXT_COLORS);
}
