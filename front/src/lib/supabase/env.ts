import "server-only";

import { z } from "zod";

const supabaseServerEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    },
    { message: "Expected an HTTP(S) Supabase URL" },
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  SUPABASE_PORTFOLIO_SLUG: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(64)
    .default("main"),
});

export interface SupabaseServerEnvironment {
  readonly publishableKey: string;
  readonly portfolioSlug: string;
  readonly url: string;
}

/**
 * 요청 시점에 공개 Supabase 연결 환경을 검증한다.
 */
export function getSupabaseServerEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SupabaseServerEnvironment {
  const result = supabaseServerEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      "Supabase environment is not configured; required=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return {
    publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    portfolioSlug: result.data.SUPABASE_PORTFOLIO_SLUG,
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
  };
}
