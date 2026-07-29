import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * 상위 디렉터리의 다른 lockfile과 무관하게 현재 front 앱을 Turbopack 루트로 고정한다.
 */
const frontRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * GitHub Pages가 제공한 repository base path를 Next.js 형식으로 정규화한다.
 */
function normalizeBasePath(rawBasePath: string | undefined): string {
  const normalizedPath =
    rawBasePath?.trim().replace(/^\/+|\/+$/g, "") ?? "";

  return normalizedPath === "" ? "" : `/${normalizedPath}`;
}

/**
 * GitHub Pages 배포를 위한 완전 정적 export 설정.
 */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
  turbopack: {
    root: frontRoot,
  },
} satisfies NextConfig;

export default nextConfig;
