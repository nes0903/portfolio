import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerEnvironment } from "@/lib/supabase/env";

/**
 * 공개 읽기 전용 요청에 사용하는 서버 Supabase client.
 * 브라우저 세션 저장은 관리자 인증 단계에서 별도 client로 구성한다.
 */
export function createServerSupabaseClient() {
  const environment = getSupabaseServerEnvironment();

  return createClient(environment.url, environment.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
