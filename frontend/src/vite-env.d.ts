/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_ADMIN_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
