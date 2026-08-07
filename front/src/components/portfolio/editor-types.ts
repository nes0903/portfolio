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

interface EditableTextOptions {
  readonly richText?: false | "career-action" | "inline";
}

export function createEditableTextProps(
  editor: PortfolioEditorBridge | undefined,
  field: string,
  options: EditableTextOptions = {},
) {
  if (!editor) {
    return {};
  }

  const richText =
    options.richText === false ? undefined : (options.richText ?? "inline");

  return {
    contentEditable: true,
    "data-editor-field": field,
    "data-editor-rich-text": richText,
    suppressContentEditableWarning: true,
  } as const;
}
