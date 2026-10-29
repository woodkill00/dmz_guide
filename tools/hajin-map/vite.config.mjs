import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { sourceUpdatePlugin } from "./server/source-update-plugin.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ mode }) => ({
  plugins: [
    sourceUpdatePlugin({
      root,
      enabled: loadEnv(mode, root, "DMZ_").DMZ_ENABLE_SOURCE_UPDATES === "1",
    }),
  ],
  build:{rollupOptions:{input:{map:fileURLToPath(new URL("index.html",import.meta.url)),help:fileURLToPath(new URL("help.html",import.meta.url))}}},
  server: {
    fs: {
      allow: [
        fileURLToPath(new URL(".", import.meta.url)),
        fileURLToPath(new URL("../../src", import.meta.url)),
      ],
    },
  },
}));
