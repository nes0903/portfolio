"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { AdminFormState } from "@/lib/auth/form-state";
import { getSupabaseServerEnvironment } from "@/lib/supabase/env";
import { createAuthenticatedServerSupabaseClient } from "@/lib/supabase/auth-server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

/**
 * 이메일·비밀번호를 Supabase Auth로 검증하고 owner 계정만 통과시킨다.
 */
export async function loginAction(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const credentials = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { message: "이메일과 비밀번호를 확인해주세요.", status: "error" };
  }

  const supabase = await createAuthenticatedServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error || !data.user) {
    return { message: "이메일 또는 비밀번호가 올바르지 않습니다.", status: "error" };
  }

  const { portfolioSlug } = getSupabaseServerEnvironment();
  const { data: ownedDocument, error: ownerError } = await supabase
    .from("portfolio_documents")
    .select("slug")
    .eq("slug", portfolioSlug)
    .eq("owner_id", data.user.id)
    .maybeSingle<{ readonly slug: string }>();

  if (ownerError || !ownedDocument) {
    await supabase.auth.signOut();
    return { message: "이 계정에는 관리자 권한이 없습니다.", status: "error" };
  }

  redirect("/admin");
}
