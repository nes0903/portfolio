import { redirect } from "next/navigation";

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
    <div className="admin-page">
      <PortfolioEditor initialContent={content} />
    </div>
  );
}
