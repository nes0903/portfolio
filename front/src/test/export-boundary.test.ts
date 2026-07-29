// @vitest-environment node

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTENT_FILE_NAMES } from "@/test/content-fixtures";

const OUT_DIRECTORY = resolve(process.cwd(), "out");
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
] as const;

const PII_PLACEHOLDER_PATTERNS = [
  /\b(?:YOUR|TODO|REPLACE_ME)[-_ ]?(?:EMAIL|PHONE|ADDRESS|NAME)\b/i,
  /<(?:email|phone|address|name)>/i,
  /\b(?:user|name|hello)@example\.com\b/i,
  /\b010-0000-0000\b/,
] as const;

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

function normalizeBasePath(raw: string | undefined): string {
  const path = raw?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return path === "" ? "" : `/${path}`;
}

describe.skipIf(!existsSync(OUT_DIRECTORY))("static export artifact boundary", () => {
  it("backend 원본, Git metadata, source map을 산출물에 포함하지 않는다", async () => {
    const files = await listFiles(OUT_DIRECTORY);
    const relativeFiles = files.map((file) => relative(OUT_DIRECTORY, file));

    for (const file of relativeFiles) {
      const segments = file.split(sep);
      expect(segments).not.toContain("backend");
      expect(segments).not.toContain(".git");
      expect(extname(file)).not.toBe(".map");
    }
    expect(relativeFiles.map((file) => basename(file))).not.toEqual(
      expect.arrayContaining([...CONTENT_FILE_NAMES]),
    );
  });

  it("산출물에 raw backend 경로, 강한 secret, PII placeholder를 남기지 않는다", async () => {
    const files = (await listFiles(OUT_DIRECTORY)).filter((file) =>
      TEXT_EXTENSIONS.has(extname(file)),
    );

    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content, relative(OUT_DIRECTORY, file)).not.toMatch(
        /(?:\.\.\/|\/)backend\/(?:introduce|skill|career|career-work|side-project|contact)\.json/,
      );
      for (const secretPattern of SECRET_PATTERNS) {
        expect(content, relative(OUT_DIRECTORY, file)).not.toMatch(secretPattern);
      }
      for (const placeholderPattern of PII_PLACEHOLDER_PATTERNS) {
        expect(content, relative(OUT_DIRECTORY, file)).not.toMatch(placeholderPattern);
      }
    }
  });

  it("index의 root-relative local asset URL에 빌드 basePath를 적용한다", async () => {
    const indexPath = join(OUT_DIRECTORY, "index.html");
    expect(existsSync(indexPath)).toBe(true);
    const html = await readFile(indexPath, "utf8");
    const expectedBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
    const localUrls = [...html.matchAll(/(?:href|src)=["'](\/[^"']*)["']/g)].map(
      ([, url]) => url,
    );

    expect(localUrls.length).toBeGreaterThan(0);
    for (const url of localUrls) {
      expect(url).toMatch(
        expectedBasePath === ""
          ? /^\//
          : new RegExp(`^${expectedBasePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\/|$)`),
      );
    }
  });
});
