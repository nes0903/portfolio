// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
}

describe("single App Router page boundary", () => {
  it("HomePage를 async Server Component로 유지하고 client router/server mutation을 포함하지 않는다", async () => {
    const pageSource = await readFile(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

    expect(pageSource).toMatch(/export\s+default\s+async\s+function\s+HomePage/);
    expect(pageSource).not.toMatch(/^[\s\S]*?["']use client["']/);
    expect(pageSource).not.toMatch(
      /BrowserRouter|react-router|next\/router|useRouter\s*\(/,
    );
    expect(pageSource).not.toMatch(/["']use server["']|\bServer Action\b/);
    expect(pageSource).toMatch(
      /import\s+\{\s*loadPublishedPortfolioContent\s*\}\s+from\s+["']@\/lib\/content\/supabase-loader["']/,
    );
    expect(pageSource).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("/ 외의 page, Route Handler, Server Action 파일을 만들지 않는다", async () => {
    const appDirectory = resolve(process.cwd(), "src/app");
    const files = (await listFiles(appDirectory)).map((file) =>
      relative(appDirectory, file),
    );
    const routeFiles = files.filter((file) => /(^|\/)(?:page|route)\.[cm]?[jt]sx?$/.test(file));

    expect(routeFiles).toEqual(["page.tsx"]);
    expect(files).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/(^|\/)actions?\.[cm]?[jt]sx?$/),
      ]),
    );
  });
});
