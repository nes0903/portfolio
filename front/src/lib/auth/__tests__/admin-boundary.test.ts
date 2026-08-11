// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function readSource(relativePath: string): Promise<string> {
  return readFile(resolve(process.cwd(), relativePath), "utf8");
}

describe("admin authorization boundary", () => {
  it("검증된 claims와 owner_id를 함께 확인하고 getSession을 권한 판단에 쓰지 않는다", async () => {
    const source = await readSource("src/lib/auth/admin.ts");

    expect(source).toMatch(/auth\.getClaims\s*\(/);
    expect(source).toMatch(/\.eq\("owner_id", userId\)/);
    expect(source).not.toMatch(/auth\.getSession\s*\(/);
  });

  it("저장도 owner_id 조건을 적용하고 공개·관리자 경로를 재검증한다", async () => {
    const source = await readSource("src/app/admin/actions.ts");

    expect(source).toMatch(/\.eq\("owner_id", access\.userId\)/);
    expect(source).toMatch(/revalidatePath\("\/"\)/);
    expect(source).toMatch(/revalidatePath\("\/admin"\)/);
    expect(source).toMatch(/content\.sideProjects\.flatMap/);
  });

  it("proxy가 관리자 경로만 대상으로 세션을 갱신한다", async () => {
    const source = await readSource("proxy.ts");
    const proxySource = await readSource("src/lib/supabase/proxy.ts");

    expect(source).toMatch(/matcher:\s*\["\/admin\/:path\*"\]/);
    expect(proxySource).toMatch(/auth\.getClaims\s*\(/);
    expect(proxySource).not.toMatch(/auth\.getSession\s*\(/);
  });
});
