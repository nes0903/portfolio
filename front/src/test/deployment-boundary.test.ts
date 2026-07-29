// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

const FRONT_ROOT = process.cwd();
const REPOSITORY_ROOT = resolve(FRONT_ROOT, "..");
const WORKFLOW_PATH = resolve(
  REPOSITORY_ROOT,
  ".github/workflows/portfolio-pages.yml",
);

const REQUIRED_ACTIONS = [
  "actions/checkout",
  "actions/configure-pages",
  "actions/setup-node",
  "actions/upload-pages-artifact",
  "actions/deploy-pages",
] as const;

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  }
  vi.resetModules();
});

async function loadNextConfig(rawBasePath?: string): Promise<NextConfig> {
  if (rawBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = rawBasePath;
  }
  vi.resetModules();
  return (await import("../../next.config")).default as NextConfig;
}

function topLevelBlock(source: string, key: string): string {
  const lines = source.split(/\r?\n/);
  const keyPattern = new RegExp(`^(?:${key}|["']${key}["']):\\s*(?:#.*)?$`);
  const start = lines.findIndex((line) => keyPattern.test(line));
  expect(start, `top-level ${key} 블록`).toBeGreaterThanOrEqual(0);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && /^\S/.test(line) && !/^\s*#/.test(line)) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function workflowJobContaining(source: string, needle: string): string {
  const jobs = topLevelBlock(source, "jobs");
  const lines = jobs.split(/\r?\n/);
  const starts = lines
    .map((line, index) => (/^  [A-Za-z0-9_-]+:\s*(?:#.*)?$/.test(line) ? index : -1))
    .filter((index) => index >= 0);

  for (const [position, start] of starts.entries()) {
    const end = starts[position + 1] ?? lines.length;
    const block = lines.slice(start, end).join("\n");
    if (block.includes(needle)) return block;
  }
  throw new Error(`workflow job에서 ${needle}를 찾을 수 없습니다`);
}

function workflowStepContaining(source: string, needle: string): string {
  const lines = source.split(/\r?\n/);
  const needleLine = lines.findIndex((line) => line.includes(needle));
  expect(needleLine, `workflow step의 ${needle}`).toBeGreaterThanOrEqual(0);

  let start = needleLine;
  while (start >= 0 && !/^\s+-\s+/.test(lines[start] ?? "")) start -= 1;
  expect(start, `${needle} step 시작`).toBeGreaterThanOrEqual(0);

  const indentation = /^\s*/.exec(lines[start] ?? "")?.[0].length ?? -1;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^\s+-\s+/.test(line) && (/^\s*/.exec(line)?.[0].length ?? -2) === indentation) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function yamlMappingEntries(
  source: string,
  key: string,
  expectedIndentation: number,
): Record<string, string> {
  const lines = source.split(/\r?\n/);
  const keyPattern = new RegExp(
    `^ {${expectedIndentation}}${key}:\\s*(\\{\\})?\\s*$`,
  );
  const start = lines.findIndex((line) => keyPattern.test(line));
  expect(start, `${key} mapping`).toBeGreaterThanOrEqual(0);
  if ((lines[start] ?? "").trim().endsWith("{}")) return {};

  const entries: Record<string, string> = {};
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    const indentation = /^\s*/.exec(line)?.[0].length ?? 0;
    if (indentation <= expectedIndentation) break;
    const entry = new RegExp(
      `^ {${expectedIndentation + 2}}([a-z-]+):\\s*([^\\s#]+)\\s*$`,
    ).exec(line);
    if (entry?.[1] !== undefined && entry[2] !== undefined) {
      entries[entry[1]] = entry[2];
    }
  }
  return entries;
}

describe("Next.js GitHub Pages boundary", () => {
  it("정적 export와 trailing slash를 사용하고 assetPrefix를 두지 않는다", async () => {
    const config = await loadNextConfig();

    expect(config).toMatchObject({ output: "export", trailingSlash: true });
    expect(config).not.toHaveProperty("assetPrefix");
  });

  it.each([
    [undefined, ""],
    ["", ""],
    ["/", ""],
    [" portfolio ", "/portfolio"],
    ["///portfolio///", "/portfolio"],
  ])("NEXT_PUBLIC_BASE_PATH %j를 %j로 정규화한다", async (raw, expected) => {
    const config = await loadNextConfig(raw);
    expect(config.basePath).toBe(expected);
  });
});

describe("GitHub Pages deployment workflow boundary", () => {
  it("요구한 이벤트에서만 검증 파이프라인을 시작한다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");
    const triggers = topLevelBlock(workflow, "on");

    expect(triggers).toMatch(/^  pull_request:\s*(?:\{\})?\s*$/m);
    expect(triggers).toMatch(
      /^  push:\s*$[\s\S]*?^    branches:\s*$[\s\S]*?^\s+-\s+main\s*$/m,
    );
    expect(triggers).toMatch(/^  workflow_dispatch:\s*(?:\{\})?\s*$/m);
  });

  it("job별 최소 권한을 격리하고 concurrency는 workflow 전역에 둔다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");
    expect(yamlMappingEntries(workflow, "permissions", 0)).toEqual({});

    const buildJob = workflowJobContaining(workflow, "npm ci");
    expect(yamlMappingEntries(buildJob, "permissions", 4)).toEqual({
      contents: "read",
      pages: "read",
    });

    const deployJob = workflowJobContaining(workflow, "actions/deploy-pages@");
    expect(yamlMappingEntries(deployJob, "permissions", 4)).toEqual({
      pages: "write",
      "id-token": "write",
    });

    const concurrency = topLevelBlock(workflow, "concurrency");
    expect(concurrency).toMatch(/^  group:\s*\S+/m);
    expect(concurrency).toMatch(/^  cancel-in-progress:\s*\S.+$/m);
    expect(topLevelBlock(workflow, "jobs")).not.toMatch(/^ {4}concurrency:/m);
  });

  it("PR은 실행별 group으로 취소하고 main·수동 배포는 고정 group으로 분리한다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");
    const concurrency = topLevelBlock(workflow, "concurrency");
    const group = /^  group:\s*(.+?)\s*$/m.exec(concurrency)?.[1];
    const cancelInProgress =
      /^  cancel-in-progress:\s*(.+?)\s*$/m.exec(concurrency)?.[1];

    expect(group).toBeDefined();
    expect(group).toMatch(
      /\$\{\{\s*github\.event_name\s*==\s*["']pull_request["']\s*&&\s*(?:format\([^)]*github\.event\.pull_request\.number[^)]*\)|github\.event\.pull_request\.number)\s*\|\|\s*["']deploy["']\s*\}\}/,
    );
    expect(group).not.toMatch(/github\.(?:ref|head_ref|sha|run_id)/);
    expect(cancelInProgress).toMatch(
      /^\$\{\{\s*github\.event_name\s*==\s*["']pull_request["']\s*\}\}$/,
    );
  });

  it("공식 action만 변경 불가능한 40자 commit SHA로 고정한다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");
    const uses = [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*["']?([^\s"'#]+)["']?\s*$/gm)].map(
      ([, value]) => value,
    );

    expect(uses.length).toBeGreaterThanOrEqual(REQUIRED_ACTIONS.length);
    const actionNames: string[] = [];
    for (const use of uses) {
      expect(use).toBeDefined();
      const separator = use?.lastIndexOf("@") ?? -1;
      const action = use?.slice(0, separator);
      const revision = use?.slice(separator + 1);
      expect(REQUIRED_ACTIONS).toContain(action);
      expect(revision).toMatch(/^[0-9a-f]{40}$/i);
      if (action !== undefined) actionNames.push(action);
    }
    expect(actionNames).toEqual(expect.arrayContaining([...REQUIRED_ACTIONS]));
  });

  it("고정 Node 버전과 front npm ci를 사용한다", async () => {
    const [workflow, nodeVersion] = await Promise.all([
      readFile(WORKFLOW_PATH, "utf8"),
      readFile(resolve(FRONT_ROOT, ".nvmrc"), "utf8"),
    ]);
    expect(nodeVersion.trim()).toBe("22.23.1");

    const setupNodeStep = workflowStepContaining(workflow, "actions/setup-node@");
    expect(setupNodeStep).toMatch(
      /(?:node-version:\s*["']?22\.23\.1["']?|node-version-file:\s*["']?front\/\.nvmrc["']?)/,
    );

    const installStep = workflowStepContaining(workflow, "npm ci");
    const installJob = workflowJobContaining(workflow, "npm ci");
    const hasStepDirectory = /working-directory:\s*front\s*$/.test(
      installStep,
    );
    const hasJobDefaultDirectory =
      /defaults:\s*$[\s\S]*?run:\s*$[\s\S]*?working-directory:\s*front\s*$/m.test(
        installJob,
      );
    expect(hasStepDirectory || hasJobDefaultDirectory).toBe(true);
  });

  it("typecheck, lint, test, build, verify를 순서대로 실행하고 동적 basePath를 사용한다", async () => {
    const [workflow, packageSource] = await Promise.all([
      readFile(WORKFLOW_PATH, "utf8"),
      readFile(resolve(FRONT_ROOT, "package.json"), "utf8"),
    ]);
    const commands = [
      "npm run typecheck",
      "npm run lint",
      "npm test",
      "npm run build",
    ];
    const positions = commands.map((command) => workflow.indexOf(command));
    const verifyMatch = /npm run (verify(?::[A-Za-z0-9_-]+)?)/.exec(workflow);
    positions.push(verifyMatch?.index ?? -1);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));

    const packageJson = JSON.parse(packageSource) as {
      scripts?: Record<string, string>;
    };
    const verifyScript = verifyMatch?.[1];
    expect(verifyScript).toBeDefined();
    expect(packageJson.scripts).toHaveProperty(verifyScript ?? "__missing_verify__");

    const assignments = [
      ...workflow.matchAll(/^\s*NEXT_PUBLIC_BASE_PATH:\s*["']?([^\n"']+)["']?\s*$/gm),
    ].map(([, value]) => value?.trim());
    expect(assignments.length).toBeGreaterThan(0);
    for (const assignment of assignments) {
      expect(assignment).toMatch(
        /\$\{\{\s*(?:steps\.[A-Za-z0-9_-]+\.outputs\.base_path|github\.event\.repository\.name)\s*\}\}/,
      );
    }
  });

  it("정적 산출물만 업로드하고 deploy를 pull request에서 차단한다", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");
    const uploadStep = workflowStepContaining(workflow, "actions/upload-pages-artifact@");
    expect(uploadStep).toMatch(/^\s*path:\s*["']?front\/out\/?["']?\s*$/m);
    expect(workflow).not.toContain("docs/portfolio/front");

    const deployJob = workflowJobContaining(workflow, "actions/deploy-pages@");
    expect(deployJob).toMatch(
      /^\s*if:\s*(?:\$\{\{\s*)?github\.event_name\s*!=\s*["']pull_request["']\s*(?:\}\})?\s*$/m,
    );
    expect(deployJob).toMatch(
      /environment:\s*(?:github-pages\s*$|[\s\S]*?name:\s*github-pages\s*$)/m,
    );
  });
});
