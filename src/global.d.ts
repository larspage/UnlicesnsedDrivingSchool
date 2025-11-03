/// <reference types="vite/client" />

declare const __DEV_CREDENTIALS__: boolean;

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}