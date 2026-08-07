/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Reversible-cutover toggle (constitution Principle I): "s3" is the default,
  // proven path; "turso" is the new path while it's being verified. Removed
  // once the migration's cutover phase makes "turso" the only path.
  readonly VITE_DATA_SOURCE?: "s3" | "turso";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
