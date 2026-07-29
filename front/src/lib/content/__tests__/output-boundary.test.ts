// @vitest-environment node

import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT_FILE_NAMES } from "@/test/content-fixtures";

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

describe("raw content export boundary", () => {
  it("public에 backend 원본 JSON을 staging하지 않는다", async () => {
    const publicDirectory = resolve(process.cwd(), "public");
    if (!existsSync(publicDirectory)) return;

    const publicFiles = await listFiles(publicDirectory);
    expect(publicFiles.map((file) => basename(file))).not.toEqual(
      expect.arrayContaining([...CONTENT_FILE_NAMES]),
    );
  });

  it.skipIf(!existsSync(resolve(process.cwd(), "out")))(
    "생성된 front/out에 backend 디렉터리나 원본 JSON 6개를 복사하지 않는다",
    async () => {
      const outDirectory = resolve(process.cwd(), "out");
      const outputFiles = await listFiles(outDirectory);
      const relativeOutputFiles = outputFiles.map((file) =>
        relative(outDirectory, file),
      );

      expect(existsSync(join(outDirectory, "backend"))).toBe(false);
      expect(relativeOutputFiles.map((file) => basename(file))).not.toEqual(
        expect.arrayContaining([...CONTENT_FILE_NAMES]),
      );
    },
  );
});
