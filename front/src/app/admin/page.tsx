import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/admin/actions";
import { PortfolioEditor } from "@/components/admin/PortfolioEditor";
import { getPortfolioAdminAccess } from "@/lib/auth/admin";
import { loadEditablePortfolioContent } from "@/lib/content/admin-loader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await getPortfolioAdminAccess();

  if (!access) {
    redirect("/admin/login?reason=unauthorized");
  }

  const content = await loadEditablePortfolioContent(access.supabase, access.slug);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">PORTFOLIO CMS</span>
          <h1>콘텐츠 편집</h1>
          <p>섹션별 내용을 수정하고 저장하면 공개 화면이 바로 갱신됩니다.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="admin-button" href="/" target="_blank">
            공개 화면 보기
          </Link>
          <form action={logoutAction}>
            <button className="admin-button" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <PortfolioEditor initialContent={content} />
    </main>
  );
}
