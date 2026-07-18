import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { resolveSupabaseDataConfig } from "./config";

export function isSupabaseConfigured() {
  return resolveSupabaseDataConfig(process.env).mode === "supabase";
}

export async function createClient() {
  const config = resolveSupabaseDataConfig(process.env);

  if (config.mode !== "supabase") {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createSupabaseClient(config.url, config.apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-application-name": "serenity-investment-intelligence",
      },
    },
  });
}
