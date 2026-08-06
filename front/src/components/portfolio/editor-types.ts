import type { PortfolioSectionId } from "@/components/layout/navigation";
import type { IntroductionTextBlock } from "@/lib/content/types";

export type IntroductionTextBlockLayoutPatch = Partial<
  Pick<
    IntroductionTextBlock,
    "fontSize" | "height" | "textAlign" | "width" | "x" | "y"
  >
>;

export interface PortfolioEditorBridge {
  readonly onChangeIntroductionTextBlock: (
    blockId: string,
    patch: IntroductionTextBlockLayoutPatch,
  ) => void;
  readonly onSelectIntroductionTextBlock: (blockId: string) => void;
  readonly onSelectSection: (sectionId: PortfolioSectionId) => void;
  readonly onTextCommit: (field: string, value: string) => void;
  readonly selectedIntroductionTextBlockId: string | null;
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
