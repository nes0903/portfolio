// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { describe, expect, it } from "vitest";

const FRONT_ROOT = process.cwd();
const REPOSITORY_ROOT = resolve(FRONT_ROOT, "..");
const WORKFLOW_PATH = resolve(
  REPOSITORY_ROOT,
  ".github/workflows/portfolio-pages.yml",
);

describe("Vercel Next.js runtime boundary", () => {
  it("정적 export와 GitHub repository basePath를 사용하지 않는다", async () => {
    const config = (await import("../../next.config")).default as NextConfig;

    expect(config).not.toHaveProperty("output");
    expect(config).not.toHaveProperty("basePath");
    expect(config).not.toHaveProperty("assetPrefix");
  });

  it("홈 페이지를 요청 시점 Supabase 조회 경계로 유지한다", async () => {
    const pageSource = await readFile(
      resolve(FRONT_ROOT, "src/app/page.tsx"),
      "utf8",
    );

    expect(pageSource).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
    expect(pageSource).toMatch(/loadPublishedPortfolioContent\(\)/);
    expect(pageSource).not.toMatch(/loadPortfolioContent\(\)/);
  });
});

describe("repository CI boundary", () => {
  it("GitHub Pages 배포 대신 검증 파이프라인만 실행한다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run build");
    expect(workflow).not.toMatch(
      /actions\/(?:configure-pages|upload-pages-artifact|deploy-pages)/,
    );
    expect(workflow).not.toContain("NEXT_PUBLIC_BASE_PATH");
    expect(workflow).not.toContain("front/out");
  });

  it("Vercel 환경값이나 Supabase 비밀 키를 저장소 workflow에 넣지 않는다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");

    expect(workflow).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).not.toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(workflow).not.toMatch(/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
  });
});
