import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerEnvironment } from "@/lib/supabase/env";
import { createAuthenticatedServerSupabaseClient } from "@/lib/supabase/auth-server";

export interface PortfolioAdminAccess {
  readonly slug: string;
  readonly supabase: SupabaseClient;
  readonly userId: string;
}

/**
 * 검증된 JWT의 사용자와 문서 owner_id가 일치할 때만 관리자 권한을 반환한다.
 */
export async function getPortfolioAdminAccess(): Promise<PortfolioAdminAccess | null> {
  const supabase = await createAuthenticatedServerSupabaseClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { portfolioSlug } = getSupabaseServerEnvironment();
  const { data, error } = await supabase
    .from("portfolio_documents")
    .select("slug")
    .eq("slug", portfolioSlug)
    .eq("owner_id", userId)
    .maybeSingle<{ readonly slug: string }>();

  if (error || !data) {
    return null;
  }

  return { slug: data.slug, supabase, userId };
}
