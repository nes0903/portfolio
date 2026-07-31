// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("content loader server boundary", () => {
  it("server-only 경계에서 sibling back을 filesystem으로 읽고 runtime fetch를 사용하지 않는다", async () => {
    const loaderSource = await readFile(
      resolve(process.cwd(), "src/lib/content/loader.ts"),
      "utf8",
    );

    expect(loaderSource).toMatch(/^\s*import\s+["']server-only["'];/);
    expect(loaderSource).toMatch(/from\s+["']node:fs(?:\/promises)?["']/);
    expect(loaderSource).toMatch(/from\s+["']node:path["']/);
    expect(loaderSource).toMatch(
      /path\.resolve\(process\.cwd\(\),\s*["']\.\.\/back["']\)/,
    );
    expect(loaderSource).not.toMatch(/["']use client["']/);
    expect(loaderSource).not.toMatch(/\bfetch\s*\(/);
  });
});
