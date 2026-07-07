/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// @fontsource packages ship CSS with no type declarations.
declare module '@fontsource-variable/*'
declare module '@fontsource/*'
