import Link from "next/link";

import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

interface AdminLoginPageProps {
  readonly searchParams: Promise<{ readonly reason?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { reason } = await searchParams;
  const initialMessage =
    reason === "unauthorized"
      ? "로그인이 필요하거나 이 계정에 관리자 권한이 없습니다."
      : "";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <span className="admin-kicker">PRIVATE ACCESS</span>
        <h1 id="admin-login-title">관리자 로그인</h1>
        <p>포트폴리오 소유자 계정으로 로그인해주세요.</p>
        <LoginForm initialMessage={initialMessage} />
        <Link className="admin-back-link" href="/">
          ← 포트폴리오로 돌아가기
        </Link>
      </section>
    </main>
  );
}
