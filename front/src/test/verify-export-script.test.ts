// @vitest-environment node

import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const verifierSourcePath = resolve(process.cwd(), "scripts/verify-export.mjs");
const fixtureRoots: string[] = [];

const BASE_INDEX_HTML = [
  "<!doctype html>",
  '<html><head><link rel="stylesheet" href="/project/_next/static/site.css"></head>',
  '<body><script src="/project/_next/static/site.js"></script></body></html>',
].join("");

const BASE_FILES: Readonly<Record<string, string>> = {
  "index.html": BASE_INDEX_HTML,
  "_next/static/site.css": "body { color: #111; }",
  "_next/static/site.js": "globalThis.__portfolioLoaded = true;",
};

const BASE_BACKEND_FILES: Readonly<Record<string, string>> = {
  "introduce.json": '{"title":"Approved title","content":"Approved content"}\n',
  "skill.json": "[]\n",
  "career.json": "[]\n",
  "career-work.json": "[]\n",
  "side-project.json": "[]\n",
  "contact.json": "[]\n",
};

interface VerifierResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function runVerifier(
  extraFiles: Readonly<Record<string, string>> = {},
  indexHtml = BASE_INDEX_HTML,
  symlinks: Readonly<Record<string, string>> = {},
  backendOverrides: Readonly<Record<string, string>> = {},
  repositoryFiles: Readonly<Record<string, string>> = {},
): Promise<VerifierResult> {
  const root = await mkdtemp(join(tmpdir(), "portfolio-export-verifier-"));
  fixtureRoots.push(root);
  const frontRoot = join(root, "front");
  const scriptPath = join(frontRoot, "scripts/verify-export.mjs");
  const files = {
    ...BASE_FILES,
    ...extraFiles,
    "index.html": indexHtml,
  };

  await mkdir(dirname(scriptPath), { recursive: true });
  await writeFile(scriptPath, await readFile(verifierSourcePath, "utf8"), "utf8");
  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const path = join(frontRoot, "out", relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf8");
    }),
  );
  await Promise.all(
    Object.entries(symlinks).map(async ([relativePath, target]) => {
      const path = join(frontRoot, "out", relativePath);
      await mkdir(dirname(path), { recursive: true });
      await symlink(target, path);
    }),
  );
  await Promise.all(
    Object.entries({ ...BASE_BACKEND_FILES, ...backendOverrides }).map(
      async ([relativePath, content]) => {
        const path = join(root, "backend", relativePath);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf8");
      },
    ),
  );
  await Promise.all(
    Object.entries(repositoryFiles).map(async ([relativePath, content]) => {
      const path = join(root, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf8");
    }),
  );

  try {
    const result = await execFileAsync(process.execPath, [scriptPath], {
      env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/project" },
    });
    return { exitCode: 0, stderr: result.stderr, stdout: result.stdout };
  } catch (error) {
    const failure = error as Error & {
      readonly code?: number;
      readonly stderr?: string;
      readonly stdout?: string;
    };
    return {
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      stderr: failure.stderr ?? failure.message,
      stdout: failure.stdout ?? "",
    };
  }
}

describe("static export verifier black-box boundary", () => {
  it("독립 저장소 루트의 GitHub Actions workflow도 민감정보 검사에 포함한다", async () => {
    const result = await runVerifier(
      {},
      BASE_INDEX_HTML,
      {},
      {},
      {
        ".github/workflows/leaked-secret.yml":
          "env:\n  API_KEY: sk-proj-abcdefghijklmnopqrstuvwxyz123456\n",
      },
    );

    expect(result.exitCode).not.toBe(0);
  });

  it("실제로 존재하는 basePath asset과 안전한 JSON manifest를 허용한다", async () => {
    const index = [
      "<!doctype html>",
      '<html><head><link rel="manifest" href="/project/manifest.json">',
      '<link rel="stylesheet" href="/project/_next/static/site.css"></head>',
      '<body><script src="/project/_next/static/site.js"></script></body></html>',
    ].join("");
    const result = await runVerifier(
      { "manifest.json": JSON.stringify({ name: "Portfolio", start_url: "/project/" }) },
      index,
    );

    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });

  it.each([
    ["모든 텍스트 확장자", "assets/profile.svg", '<svg><text>sk-proj-abcdefghijklmnopqrstuvwxyz123456</text></svg>'],
    ["민감 파일명", ".env.production", "PUBLIC_VALUE=not-safe-in-export"],
    ["주민등록번호 PII", "notes.txt", "resident=900101-1234567"],
  ])("%s의 공개 경계 위반을 차단한다", async (_label, path, content) => {
    const result = await runVerifier({ [path]: content });
    expect(result.exitCode).not.toBe(0);
  });

  it("일반 apostrophe 뒤의 canonical raw object도 차단한다", async () => {
    const canonicalIntroduce = JSON.stringify({
      title: "Approved title",
      content: "Approved content",
    });
    const result = await runVerifier({
      "assets/apostrophe-wrapper.html":
        `<p>Developer's portfolio</p><script>${canonicalIntroduce}</script>`,
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("JavaScript 문자열로 escape한 canonical raw object도 차단한다", async () => {
    const escapedCanonicalIntroduce = JSON.stringify(
      JSON.stringify({
        title: "Approved title",
        content: "Approved content",
      }),
    );
    const result = await runVerifier({
      "assets/escaped-wrapper.js":
        `globalThis.__raw = ${escapedCanonicalIntroduce};`,
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("알려진 파일명을 바꾼 raw portfolio JSON도 내용으로 차단한다", async () => {
    const rawPortfolio = JSON.stringify([
      {
        id: "career-1",
        company: "Private Company",
        role: "Engineer",
        startDate: "2024-01",
        endDate: null,
        order: 1,
      },
    ]);
    const result = await runVerifier({ "assets/renamed-payload.txt": rawPortfolio });
    expect(result.exitCode).not.toBe(0);
  });

  it("server-only loader와 backend filesystem source가 번들에 섞이면 차단한다", async () => {
    const leakedSource = [
      'import "server-only";',
      'const backendDirectory = path.resolve(process.cwd(), "../backend");',
      'readFile(path.join(backendDirectory, "contact.json"), "utf8");',
    ].join("\n");
    const result = await runVerifier({ "_next/static/leaked-loader.js": leakedSource });
    expect(result.exitCode).not.toBe(0);
  });

  it("HTML에서 참조한 local asset이 실제로 없으면 차단한다", async () => {
    const index = [
      "<!doctype html>",
      '<html><head><link rel="stylesheet" href="/project/_next/static/site.css"></head>',
      '<body><script src="/project/_next/static/missing.js"></script></body></html>',
    ].join("");
    const result = await runVerifier({}, index);
    expect(result.exitCode).not.toBe(0);
  });

  it("srcset의 basePath 누락 또는 존재하지 않는 asset을 차단한다", async () => {
    const index = [
      "<!doctype html>",
      '<html><head><link rel="stylesheet" href="/project/_next/static/site.css"></head>',
      '<body><img src="/project/assets/avatar.svg" ',
      'srcset="/assets/avatar.svg 1x, /project/assets/missing.svg 2x">',
      '<script src="/project/_next/static/site.js"></script></body></html>',
    ].join("");
    const result = await runVerifier(
      { "assets/avatar.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>" },
      index,
    );
    expect(result.exitCode).not.toBe(0);
  });

  it("CSS url()의 basePath 누락 또는 존재하지 않는 asset을 차단한다", async () => {
    const result = await runVerifier({
      "_next/static/site.css": "@font-face { src: url('/assets/missing.woff2'); }",
    });
    expect(result.exitCode).not.toBe(0);
  });

  it("out 내부 symlink entry를 발견하면 공개 artifact 검증을 실패시킨다", async () => {
    const result = await runVerifier(
      {},
      BASE_INDEX_HTML,
      { "assets/site-alias.js": "../_next/static/site.js" },
    );
    expect(result.exitCode).not.toBe(0);
  });

  it("NUL byte 뒤에 숨긴 secret signature도 차단한다", async () => {
    const result = await runVerifier({
      "assets/binary-looking.dat": "\0sk-proj-abcdefghijklmnopqrstuvwxyz123456",
    });
    expect(result.exitCode).not.toBe(0);
  });

  it("화면에 렌더링되지 않는 backend id 필드의 secret도 source scan으로 차단한다", async () => {
    const result = await runVerifier(
      {},
      BASE_INDEX_HTML,
      {},
      {
        "contact.json": JSON.stringify([
          {
            id: "sk-proj-abcdefghijklmnopqrstuvwxyz123456",
            channel: "website",
            label: "Website",
            value: "example.com",
            url: "https://example.com",
            order: 1,
          },
        ]),
      },
    );
    expect(result.exitCode).not.toBe(0);
  });

  it("backend의 raw empty array를 이름만 바꿔 export해도 차단한다", async () => {
    const result = await runVerifier({ "assets/renamed-empty.txt": "[]\n" });
    expect(result.exitCode).not.toBe(0);
  });

  it("backend 원본과 일치하지 않는 benign JSON은 fingerprint만으로 차단하지 않는다", async () => {
    const result = await runVerifier({
      "assets/search-index.json": JSON.stringify({
        title: "Documentation",
        content: "Public search entry",
      }),
    });
    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });

  it.each([
    ["JavaScript", "assets/wrapped-raw.js", (raw: string) => `globalThis.__raw = ${raw};`],
    ["HTML", "assets/wrapped-raw.html", (raw: string) => `<script type="application/json">${raw}</script>`],
    ["CSS", "assets/wrapped-raw.css", (raw: string) => `/* ${raw} */`],
    ["text", "assets/wrapped-raw.txt", (raw: string) => `prefix ${raw} suffix`],
  ])("%s wrapper 안의 canonical raw object를 차단한다", async (_label, path, wrap) => {
    const canonicalIntroduce = JSON.stringify({
      title: "Approved title",
      content: "Approved content",
    });
    const result = await runVerifier({ [path]: wrap(canonicalIntroduce) });

    expect(result.exitCode).not.toBe(0);
  });

  it("JavaScript wrapper 안의 canonical non-empty raw array를 차단한다", async () => {
    const canonicalSkills = [
      { id: "typescript", name: "TypeScript", category: "Language", order: 1 },
    ];
    const result = await runVerifier(
      { "assets/wrapped-array.js": `globalThis.__skills = ${JSON.stringify(canonicalSkills)};` },
      BASE_INDEX_HTML,
      {},
      { "skill.json": JSON.stringify(canonicalSkills) },
    );

    expect(result.exitCode).not.toBe(0);
  });

  it("wrapper 안의 backend 원본과 다른 benign JSON object와 array는 허용한다", async () => {
    const result = await runVerifier({
      "assets/benign-data.js": [
        'globalThis.__search = {"title":"Documentation","content":"Public search entry"};',
        'globalThis.__cards = [{"title":"Docs","content":"Public"}];',
      ].join("\n"),
    });

    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });

  it("approved contacts에 없는 일반 email을 artifact에서 차단한다", async () => {
    const result = await runVerifier({
      "assets/unapproved-contact.txt": "contact=private.person@corp-domain.dev",
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("unicode escape로 감춘 미승인 email도 차단한다", async () => {
    const result = await runVerifier({
      "assets/escaped-contact.js":
        String.raw`globalThis.contact = "private.person\u0040corp-domain.dev";`,
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("backend contact에서 승인된 email은 source와 artifact에서 허용한다", async () => {
    const approvedEmail = "public.person@portfolio.dev";
    const result = await runVerifier(
      { "assets/public-contact.txt": `contact=${approvedEmail}` },
      BASE_INDEX_HTML,
      {},
      {
        "contact.json": JSON.stringify([
          {
            id: "email",
            channel: "email",
            label: "Email",
            value: approvedEmail,
            url: `mailto:${approvedEmail}`,
            order: 1,
          },
        ]),
      },
    );

    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });

  it("package manager 버전 표기는 email로 오인하지 않는다", async () => {
    const result = await runVerifier({
      "assets/tooling.txt": "packageManager=npm@10.9.8",
    });

    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });

  it("JavaScript runtime에서 참조한 local asset이 없으면 차단한다", async () => {
    const result = await runVerifier({
      "_next/static/site.js":
        'globalThis.__lazyChunk = "/project/_next/static/lazy-runtime.js";',
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("hex escape로 감춘 JavaScript runtime asset 누락도 차단한다", async () => {
    const result = await runVerifier({
      "_next/static/site.js":
        String.raw`globalThis.__lazyChunk = "\x2fproject\x2f_next\x2fstatic\x2fmissing.js";`,
    });

    expect(result.exitCode).not.toBe(0);
  });

  it("JavaScript runtime asset도 basePath와 실재 파일을 만족하면 허용한다", async () => {
    const result = await runVerifier({
      "_next/static/site.js":
        'globalThis.__lazyChunk = "/project/_next/static/lazy-runtime.js";',
      "_next/static/lazy-runtime.js": "globalThis.__lazyLoaded = true;",
    });

    expect(result, result.stderr).toMatchObject({ exitCode: 0 });
  });
});
