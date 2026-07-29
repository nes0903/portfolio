import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * Next.js Core Web Vitals와 TypeScript 권장 규칙을 적용한다.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
