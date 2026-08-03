import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "PORTFOLIO",
  description: "Build-time validated portfolio content",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

/**
 * 애플리케이션 전역 문서 구조를 제공한다.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
