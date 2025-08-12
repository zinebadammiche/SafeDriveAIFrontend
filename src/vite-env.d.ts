/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string; // optionnel si tu veux un fallback
  // ajoute ici d'autres VITE_*
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
