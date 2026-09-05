/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  /** Unset in a local-only build. See src/lib/supabase/client.ts. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
