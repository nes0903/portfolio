"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPortfolioAdminAccess } from "@/lib/auth/admin";
import type { AdminFormState } from "@/lib/auth/form-state";
import { portfolioDocumentContentSchema } from "@/lib/content/model";
import { createAuthenticatedServerSupabaseClient } from "@/lib/supabase/auth-server";

const serializedContentSchema = z.string().min(2).max(512_000);

/**
 * 관리자 편집 내용을 재검증한 뒤 owner 조건과 RLS를 모두 적용해 저장한다.
 */
export async function savePortfolioAction(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const access = await getPortfolioAdminAccess();

  if (!access) {
    return {
      message: "세션이 만료되었거나 편집 권한이 없습니다.",
      status: "error",
    };
  }

  const serializedResult = serializedContentSchema.safeParse(
    formData.get("content"),
  );

  if (!serializedResult.success) {
    return { message: "저장할 내용이 올바르지 않습니다.", status: "error" };
  }

  let untrustedContent: unknown;

  try {
    untrustedContent = JSON.parse(serializedResult.data);
  } catch {
    return { message: "저장할 내용을 읽을 수 없습니다.", status: "error" };
  }

  const contentResult = portfolioDocumentContentSchema.safeParse(untrustedContent);

  if (!contentResult.success) {
    const firstIssue = contentResult.error.issues[0];
    const field = firstIssue?.path.join(".") || "content";

    return {
      message: `입력값을 확인해주세요. (${field})`,
      status: "error",
    };
  }

  const { data, error } = await access.supabase
    .from("portfolio_documents")
    .update({
      content: contentResult.data,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", access.slug)
    .eq("owner_id", access.userId)
    .select("slug")
    .single<{ readonly slug: string }>();

  if (error || !data) {
    return {
      message: "저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      status: "error",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { message: "저장했습니다. 공개 화면에도 반영되었습니다.", status: "success" };
}

/**
 * 현재 Supabase 세션을 제거하고 로그인 화면으로 이동한다.
 */
export async function logoutAction(): Promise<never> {
  const supabase = await createAuthenticatedServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
