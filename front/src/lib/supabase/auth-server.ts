import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseServerEnvironment } from "@/lib/supabase/env";

/**
 * Server Component와 Server Action에서 동일한 Supabase 쿠키 세션을 사용한다.
 */
export async function createAuthenticatedServerSupabaseClient() {
  const environment = getSupabaseServerEnvironment();
  const cookieStore = await cookies();

  return createServerClient(environment.url, environment.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, options, value } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component에서는 쿠키를 쓸 수 없다. proxy가 토큰 갱신을 담당한다.
        }
      },
    },
  });
}
