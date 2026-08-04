"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 필요할 때만 생성하는 브라우저 Supabase client.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase browser environment is not configured");
  }

  return createBrowserClient(url, publishableKey);
}
