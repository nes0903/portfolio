// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { getSupabaseServerEnvironment } from "@/lib/supabase/env";

vi.mock("server-only", () => ({}));

describe("getSupabaseServerEnvironment", () => {
  it("공개 연결값을 검증하고 portfolio slug 기본값을 적용한다", () => {
    expect(
      getSupabaseServerEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://portfolio.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual({
      portfolioSlug: "main",
      publishableKey: "sb_publishable_test",
      url: "https://portfolio.supabase.co",
    });
  });

  it("로컬 Supabase HTTP URL과 명시적 slug를 허용한다", () => {
    expect(
      getSupabaseServerEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
        SUPABASE_PORTFOLIO_SLUG: "developer-main",
      }).portfolioSlug,
    ).toBe("developer-main");
  });

  it("누락·잘못된 URL·잘못된 slug를 안전한 오류로 거부한다", () => {
    expect(() => getSupabaseServerEnvironment({})).toThrow(
      "Supabase environment is not configured",
    );
    expect(() =>
      getSupabaseServerEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "ftp://portfolio.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      }),
    ).toThrow("Supabase environment is not configured");
    expect(() =>
      getSupabaseServerEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://portfolio.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
        SUPABASE_PORTFOLIO_SLUG: "../private",
      }),
    ).toThrow("Supabase environment is not configured");
  });
});
