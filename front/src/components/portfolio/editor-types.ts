import type { PortfolioSectionId } from "@/components/layout/navigation";

export interface PortfolioEditorBridge {
  readonly onSelectSection: (sectionId: PortfolioSectionId) => void;
  readonly onTextCommit: (field: string, value: string) => void;
  readonly selectedSection: PortfolioSectionId;
}

export function createEditableTextProps(
  editor: PortfolioEditorBridge | undefined,
  field: string,
) {
  if (!editor) {
    return {};
  }

  return {
    contentEditable: true,
    "data-editor-field": field,
    suppressContentEditableWarning: true,
  } as const;
}
