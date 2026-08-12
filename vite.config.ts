import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

// Plain `vite`/`pnpm run dev` has no /api/* functions at all, so the app's
// guest-login path (which only needs Turso guest-DB credentials, no Cognito)
// otherwise 404s and the UI never gets data. `vercel dev` (pnpm run dev:api)
// does serve /api, but trades away HMR to work around a CSP/HMR conflict —
// see commit f7dfcf4. This middleware re-implements just the guest branch of
// api/turso-token.ts in-process, so `pnpm run dev` gets real guest-database
// data with full HMR intact.
// Must match api/turso-token.ts's GUEST_ACCOUNT_CONFIG and the synthetic
// chart of accounts produced by scripts/generate-guest-data.mjs.
const GUEST_ACCOUNT_CONFIG = {
  expenses: "ce17d2f2bb362a53ae5c62d50baee397",
  income: "9e1be4b28d1f9e69595b47dbfe6841b5",
  checking: "681d053b91fcac8c821104aa8f0654d8",
  savings: "3ff48dea9c47c8a88ffc4aad6e5e658d",
  assets: "20bb44503f9f2284666a65e579893545",
  working: "2420479bcc3a877765428488a6202f1d",
  liability: "a32b51509376bec72d8de729c368f7dd",
  investments: "da104b4daee51a3744b8791cbe100533",
  taxes: "71c73988df20dc8143c7249bbf7debd5",
  taxesAll: ["30894ffbf3c148afcbcfcd9e58053b3a", "3c4023ff55eb3529ebcdbb3463f28d5e"],
  tripDesc: "Trip",
};

const mintReadOnlyToken = async (orgSlug: string, platformToken: string, databaseName: string) => {
  const response = await fetch(
    `https://api.turso.tech/v1/organizations/${orgSlug}/databases/${databaseName}/auth/tokens?expiration=1h&authorization=read-only`,
    { method: "POST", headers: { Authorization: `Bearer ${platformToken}` } },
  );
  if (!response.ok) {
    throw new Error(`Turso token mint failed for ${databaseName}: ${response.status}`);
  }
  const { jwt } = (await response.json()) as { jwt: string };
  return jwt;
};

function devGuestApiPlugin(): Plugin {
  return {
    name: "dev-guest-turso-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/dashboard/api/turso-token", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }

        const orgSlug = process.env.TURSO_ORG_SLUG;
        const platformToken = process.env.TURSO_PLATFORM_TOKEN;
        const guestDatabaseName = process.env.TURSO_GUEST_DATABASE_NAME;
        const guestDatabaseUrl = process.env.TURSO_GUEST_DATABASE_URL;

        if (!orgSlug || !platformToken || !guestDatabaseName || !guestDatabaseUrl) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "Missing Turso guest env vars — run 'vercel env pull .env.local' first (see .env.example)",
            }),
          );
          return;
        }

        try {
          const token = await mintReadOnlyToken(orgSlug, platformToken, guestDatabaseName);
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              url: guestDatabaseUrl,
              token,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              accountConfig: GUEST_ACCOUNT_CONFIG,
            }),
          );
        } catch (error) {
          console.error("[dev-guest-turso-api] token mint failed", error);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: "Guest token mint failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Plain `vite` doesn't load .env.local's non-VITE_-prefixed vars into
  // process.env the way `vercel dev` does — pull them in explicitly so the
  // dev-only guest API middleware above can reach the Turso credentials.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [
      tailwindcss(),
      tanstackRouter(),
      react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } }),
      devGuestApiPlugin(),
    ],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
    },
    build: {
      outDir: "dist/dashboard",
      assetsDir: "assets/",
      rollupOptions: {
        output: {
          // Route/module chunks are also often named "index-*" (many route folders have
          // an index.tsx), which collides with the real entry chunk in size-limit's glob
          // (package.json's "size-limit" config) — give the entry a distinct prefix.
          entryFileNames: "assets/main-[hash].js",
        },
      },
    },
    base: "/dashboard/",
  };
});
