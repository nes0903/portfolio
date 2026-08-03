import "server-only";

import { parsePortfolioDocumentContent } from "@/lib/content/model";
import type { PortfolioContentViewModel } from "@/lib/content/types";
import { getSupabaseServerEnvironment } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PortfolioDocumentRow {
  readonly content: unknown;
}

/**
 * RLS가 공개한 published 문서 하나를 조회하고 기존 Zod 계약으로 재검증한다.
 */
export async function loadPublishedPortfolioContent(): Promise<PortfolioContentViewModel> {
  const { portfolioSlug } = getSupabaseServerEnvironment();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_documents")
    .select("content")
    .eq("slug", portfolioSlug)
    .eq("published", true)
    .maybeSingle<PortfolioDocumentRow>();

  if (error) {
    throw new Error("Published portfolio content query failed");
  }

  if (!data) {
    throw new Error("Published portfolio content was not found");
  }

  return parsePortfolioDocumentContent(data.content);
}
