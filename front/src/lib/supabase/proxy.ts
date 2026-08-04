import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerEnvironment } from "@/lib/supabase/env";

/**
 * 관리자 경로 요청의 세션 쿠키를 갱신하고 비로그인 접근을 차단한다.
 */
export async function updateAdminSession(request: NextRequest) {
  const environment = getSupabaseServerEnvironment();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    environment.url,
    environment.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, options, value } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if ((error || !data?.claims?.sub) && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
