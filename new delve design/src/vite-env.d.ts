/// <reference types="vite/client" />

declare const __DELVE_BUILD_ID__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APPWRITE_ENDPOINT?: string
  readonly VITE_APPWRITE_PROJECT_ID?: string
  readonly VITE_APPWRITE_EMAIL_VERIFICATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
