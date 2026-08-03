// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_ROOT = resolve(process.cwd(), "../supabase");

async function readMigration(suffix: string): Promise<string> {
  const migrationsDirectory = resolve(SUPABASE_ROOT, "migrations");
  const files = await readdir(migrationsDirectory);
  const migrationNames = files.filter((file) => file.endsWith(suffix));

  expect(migrationNames).toHaveLength(1);
  const migrationName = migrationNames[0];
  if (!migrationName) throw new Error(`${suffix} migration이 필요합니다`);
  return readFile(resolve(migrationsDirectory, migrationName), "utf8");
}

function readPortfolioMigration(): Promise<string> {
  return readMigration("_create_portfolio_documents.sql");
}

describe("portfolio_documents migration", () => {
  it("JSONB 문서 계약과 owner 조회용 인덱스를 만든다", async () => {
    const migration = await readPortfolioMigration();

    expect(migration).toMatch(
      /create table public\.portfolio_documents[\s\S]*?slug text primary key/,
    );
    expect(migration).toMatch(/content jsonb not null/);
    expect(migration).toMatch(/jsonb_typeof\(content\) = 'object'/);
    expect(migration).toMatch(
      /create index portfolio_documents_owner_id_idx[\s\S]*?\(owner_id\)/,
    );
  });

  it("RLS를 켜고 published 공개 읽기만 anon에 허용한다", async () => {
    const migration = await readPortfolioMigration();

    expect(migration).toMatch(
      /alter table public\.portfolio_documents enable row level security/,
    );
    expect(migration).toMatch(
      /grant select on table public\.portfolio_documents to anon, authenticated/,
    );
    expect(migration).toMatch(
      /for select\s+to anon, authenticated\s+using \(published\)/,
    );
    expect(migration).not.toMatch(/grant (?:insert|update|delete)[^;]*to anon/);
  });

  it("인증 사용자의 쓰기는 auth.uid owner 조건을 USING과 WITH CHECK에 적용한다", async () => {
    const migration = await readPortfolioMigration();

    expect(migration).toMatch(
      /for insert\s+to authenticated\s+with check \(\(select auth\.uid\(\)\) = owner_id\)/,
    );
    expect(migration).toMatch(
      /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = owner_id\)\s+with check \(\(select auth\.uid\(\)\) = owner_id\)/,
    );
    expect(migration).not.toMatch(/for delete|grant delete/);
  });

  it("최종 읽기 정책은 role별 하나로 합쳐 published 또는 owner만 허용한다", async () => {
    const migration = await readMigration(
      "_optimize_portfolio_read_policies.sql",
    );

    expect(migration).toMatch(
      /for select\s+to anon\s+using \(published\)/,
    );
    expect(migration).toMatch(
      /for select\s+to authenticated\s+using \(\s*published\s+or \(select auth\.uid\(\)\) = owner_id\s*\)/,
    );
    expect(migration).not.toMatch(/to anon, authenticated/);
  });

  it("현재 공개 포트폴리오를 main published 문서로 seed한다", async () => {
    const seed = await readFile(resolve(SUPABASE_ROOT, "seed.sql"), "utf8");

    expect(seed).toMatch(
      /insert into public\.portfolio_documents[\s\S]*?'main'/,
    );
    expect(seed).toContain('"careerWorks"');
    expect(seed).toContain('"sideProjects"');
    expect(seed).toMatch(/\$portfolio\$::jsonb,\s+true,\s+null/);
  });
});
