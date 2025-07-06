// vite.config.ts
import { TanStackRouterVite } from "file:///home/victor/workspace/cashpy_v2/node_modules/.pnpm/@tanstack+router-plugin@1.102.1_@tanstack+react-router@1.102.1_react-dom@18.3.1_react@1_6a30d3aed413e58e6d119a8905bdb502/node_modules/@tanstack/router-plugin/dist/esm/vite.js";
import react from "file:///home/victor/workspace/cashpy_v2/node_modules/.pnpm/@vitejs+plugin-react@4.3.4_vite@5.4.14_@types+node@20.17.17_terser@5.38.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import * as path from "path";
import { defineConfig } from "file:///home/victor/workspace/cashpy_v2/node_modules/.pnpm/vite@5.4.14_@types+node@20.17.17_terser@5.38.1/node_modules/vite/dist/node/index.js";
import topLevelAwait from "file:///home/victor/workspace/cashpy_v2/node_modules/.pnpm/vite-plugin-top-level-await@1.4.4_rollup@4.34.6_vite@5.4.14_@types+node@20.17.17_terser@5.38.1_/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import wasm from "file:///home/victor/workspace/cashpy_v2/node_modules/.pnpm/vite-plugin-wasm@3.4.1_vite@5.4.14_@types+node@20.17.17_terser@5.38.1_/node_modules/vite-plugin-wasm/exports/import.mjs";
var __vite_injected_original_dirname = "/home/victor/workspace/cashpy_v2";
var vite_config_default = defineConfig({
  plugins: [TanStackRouterVite(), react(), wasm(), topLevelAwait()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__vite_injected_original_dirname, "src") }
    ]
  },
  build: {
    assetsDir: "assets/"
  },
  base: "/dashboard/"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS92aWN0b3Ivd29ya3NwYWNlL2Nhc2hweV92MlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvdmljdG9yL3dvcmtzcGFjZS9jYXNocHlfdjIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvdmljdG9yL3dvcmtzcGFjZS9jYXNocHlfdjIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBUYW5TdGFja1JvdXRlclZpdGUgfSBmcm9tICdAdGFuc3RhY2svcm91dGVyLXBsdWdpbi92aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tIFwidml0ZS1wbHVnaW4tdG9wLWxldmVsLWF3YWl0XCI7XG5pbXBvcnQgd2FzbSBmcm9tIFwidml0ZS1wbHVnaW4td2FzbVwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbVGFuU3RhY2tSb3V0ZXJWaXRlKCksIHJlYWN0KCksIHdhc20oKSwgdG9wTGV2ZWxBd2FpdCgpLF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczogW1xuICAgICAgeyBmaW5kOiAnQCcsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJykgfSxcbiAgICBdLFxuICB9LFxuICBidWlsZDoge1xuICAgIGFzc2V0c0RpcjogJ2Fzc2V0cy8nXG4gIH0sXG4gIGJhc2U6ICcvZGFzaGJvYXJkLycsXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrUixTQUFTLDBCQUEwQjtBQUNyVCxPQUFPLFdBQVc7QUFDbEIsWUFBWSxVQUFVO0FBQ3RCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sVUFBVTtBQUxqQixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsbUJBQW1CLEdBQUcsTUFBTSxHQUFHLEtBQUssR0FBRyxjQUFjLENBQUU7QUFBQSxFQUNqRSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxFQUFFLE1BQU0sS0FBSyxhQUFrQixhQUFRLGtDQUFXLEtBQUssRUFBRTtBQUFBLElBQzNEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBLE1BQU07QUFDUixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
