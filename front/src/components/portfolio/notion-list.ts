export interface NotionListLine {
  readonly isBullet: boolean;
  readonly text: string;
}

const LIST_PREFIX_PATTERN = /^[-•]\s+/;

/**
 * 저장된 줄의 `- ` 또는 legacy `• ` prefix를 목록 상태로 해석한다.
 */
export function parseNotionListLine(line: string): NotionListLine {
  const trimmedLine = line.trim();
  const isBullet = LIST_PREFIX_PATTERN.test(trimmedLine);

  return {
    isBullet,
    text: isBullet ? trimmedLine.replace(LIST_PREFIX_PATTERN, "") : trimmedLine,
  };
}

export function parseNotionListText(value: string): NotionListLine[] {
  return value
    .split(/\r?\n/)
    .map(parseNotionListLine)
    .filter((line) => line.text.length > 0);
}
