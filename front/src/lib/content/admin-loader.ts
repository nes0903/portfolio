import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  portfolioDocumentContentSchema,
  type PortfolioDocumentContent,
} from "@/lib/content/model";

interface EditablePortfolioDocumentRow {
  readonly content: unknown;
}

/**
 * RLS로 소유권이 확인된 원본 JSONB 문서를 편집 가능한 형태로 반환한다.
 */
export async function loadEditablePortfolioContent(
  supabase: SupabaseClient,
  slug: string,
): Promise<PortfolioDocumentContent> {
  const { data, error } = await supabase
    .from("portfolio_documents")
    .select("content")
    .eq("slug", slug)
    .single<EditablePortfolioDocumentRow>();

  if (error || !data) {
    throw new Error("Editable portfolio content query failed");
  }

  const parsed = portfolioDocumentContentSchema.safeParse(data.content);

  if (!parsed.success) {
    throw new Error("Editable portfolio content failed schema validation");
  }

  return parsed.data;
}
