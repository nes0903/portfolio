import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * 상위 디렉터리의 다른 lockfile과 무관하게 현재 front 앱을 Turbopack 루트로 고정한다.
 */
const frontRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * Vercel의 Next.js 런타임에서 Server Component가 Supabase를 조회한다.
 */
const nextConfig = {
  turbopack: {
    root: frontRoot,
  },
} satisfies NextConfig;

export default nextConfig;
