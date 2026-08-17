import type { PortfolioSectionId } from "@/components/layout/navigation";
import type {
  Contact,
  IntroductionTextBlock,
  PortfolioSectionVisual,
} from "@/lib/content/types";

export type IntroductionTextBlockLayoutPatch = Partial<
  Pick<
    IntroductionTextBlock,
    "fontSize" | "height" | "textAlign" | "width" | "x" | "y"
  >
>;

export interface PortfolioEditorBridge {
  readonly onAddItem?: (
    kind: "career" | "careerWork" | "contact" | "project" | "skill",
    parentId?: string,
  ) => void;
  readonly onChangeIntroductionTextBlock: (
    blockId: string,
    patch: IntroductionTextBlockLayoutPatch,
  ) => void;
  readonly onChangeRecentTextColors: (colors: readonly string[]) => void;
  readonly onChangeCareerDates?: (
    careerId: string,
    startDate: string,
    endDate: string | null,
  ) => void;
  readonly onChangeContactStructure?: (
    contactId: string,
    channel: Contact["channel"],
    url: string,
  ) => void;
  readonly onChangeProjectLink?: (
    projectId: string,
    key: "demo" | "repository",
    value: string,
  ) => void;
  readonly onChangeSectionVisual?: (
    sectionId: PortfolioSectionId,
    patch: Partial<PortfolioSectionVisual>,
  ) => void;
  readonly onChangeGalleryImageAlt?: (
    kind: "careerWork" | "project",
    ownerId: string,
    path: string,
    alt: string,
  ) => void;
  readonly onRemoveGalleryImage?: (
    kind: "careerWork" | "project",
    ownerId: string,
    path: string,
  ) => void;
  readonly onRemoveSectionBackground?: (sectionId: PortfolioSectionId) => void;
  readonly onDeleteItem?: (
    kind: "career" | "careerWork" | "contact" | "project" | "skill",
    id: string,
  ) => void;
  readonly onUploadGalleryImages?: (
    kind: "careerWork" | "project",
    ownerId: string,
    files: readonly File[],
  ) => void;
  readonly onUploadSectionBackground?: (
    sectionId: PortfolioSectionId,
    file: File,
  ) => void;
  readonly onSelectIntroductionTextBlock: (blockId: string) => void;
  readonly onSelectSection: (sectionId: PortfolioSectionId) => void;
  readonly onTextCommit: (field: string, value: string) => void;
  readonly selectedIntroductionTextBlockId: string | null;
  readonly selectedSection: PortfolioSectionId;
}

interface EditableTextOptions {
  readonly richText?: false | "inline" | "notion-list";
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
