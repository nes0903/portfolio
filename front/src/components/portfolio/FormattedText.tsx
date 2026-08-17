import type { ReactNode } from "react";

interface FormattedTextProps {
  readonly text: string;
}

interface InlineFormatMatch {
  readonly close: string;
  readonly color?: string;
  readonly index: number;
  readonly open: string;
  readonly type: "bold" | "color" | "highlight" | "italic" | "underline";
}

const INLINE_FORMATS: readonly Omit<InlineFormatMatch, "index">[] = [
  { close: "[/b]", open: "[b]", type: "bold" },
  { close: "[/i]", open: "[i]", type: "italic" },
  { close: "[/u]", open: "[u]", type: "underline" },
  { close: "[/mark]", open: "[mark]", type: "highlight" },
];

const INLINE_COLOR_OPEN_PATTERN = /\[color=(#[0-9a-fA-F]{6})\]/;
const INLINE_FORMAT_TAG_PATTERN =
  /\[(?:\/)?(?:b|i|u|mark)\]|\[color=#[0-9a-fA-F]{6}\]|\[\/color\]/g;

export function normalizeInlineTextColor(value: string): string | null {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null;
}

function findInlineFormat(text: string): InlineFormatMatch | undefined {
  let closest: InlineFormatMatch | undefined;

  for (const format of INLINE_FORMATS) {
    const index = text.indexOf(format.open);

    if (index >= 0 && (!closest || index < closest.index)) {
      closest = { ...format, index };
    }
  }

  const colorMatch = INLINE_COLOR_OPEN_PATTERN.exec(text);

  if (
    colorMatch?.index !== undefined &&
    colorMatch[0] &&
    colorMatch[1] &&
    (!closest || colorMatch.index < closest.index)
  ) {
    const color = normalizeInlineTextColor(colorMatch[1]);

    if (color) {
      closest = {
        close: "[/color]",
        color,
        index: colorMatch.index,
        open: colorMatch[0],
        type: "color",
      };
    }
  }

  return closest;
}

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const format = findInlineFormat(text);

  if (!format) return text ? [text] : [];

  const contentStart = format.index + format.open.length;
  const closeIndex = text.indexOf(format.close, contentStart);

  if (closeIndex < 0) return [text];

  const before = text.slice(0, format.index);
  const content = renderInlineFormatting(
    text.slice(contentStart, closeIndex),
    `${keyPrefix}-content`,
  );
  const after = renderInlineFormatting(
    text.slice(closeIndex + format.close.length),
    `${keyPrefix}-after`,
  );
  const formatted =
    format.type === "bold" ? (
      <strong key={`${keyPrefix}-bold`}>{content}</strong>
    ) : format.type === "italic" ? (
      <em key={`${keyPrefix}-italic`}>{content}</em>
    ) : format.type === "underline" ? (
      <u key={`${keyPrefix}-underline`}>{content}</u>
    ) : format.type === "color" && format.color ? (
      <span
        data-text-color={format.color}
        key={`${keyPrefix}-color-${format.color}`}
        style={{ color: format.color }}
      >
        {content}
      </span>
    ) : (
      <mark key={`${keyPrefix}-highlight`}>{content}</mark>
    );

  return before ? [before, formatted, ...after] : [formatted, ...after];
}

export function stripInlineFormatting(text: string): string {
  return text.replace(INLINE_FORMAT_TAG_PATTERN, "");
}

/**
 * 허용된 경량 마크업만 React 요소로 변환한다.
 */
export function FormattedText({ text }: FormattedTextProps) {
  return (
    <span className="formatted-text">
      {renderInlineFormatting(text, "formatted-text")}
    </span>
  );
}
