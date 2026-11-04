import {referencePlugin} from './server/reference-plugin.mjs';
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { sourceUpdatePlugin } from "./server/source-update-plugin.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ mode }) => ({
  plugins: [
    referencePlugin(),
    {name:"shared-page-navigation",transformIndexHtml(html,context){const help=context.filename.endsWith("help.html"),safe=context.filename.endsWith("safes.html");return html.replace("<!-- MAIN_NAVIGATION -->",renderMainNavigation({surface:help?"help":"map",page:help?"map-help":safe?"safe-runs":"hajin-map"}));}},
    sourceUpdatePlugin({
      root,
      enabled: loadEnv(mode, root, "DMZ_").DMZ_ENABLE_SOURCE_UPDATES === "1",
    }),
  ],
  build:{rollupOptions:{input:{map:fileURLToPath(new URL("index.html",import.meta.url)),help:fileURLToPath(new URL("help.html",import.meta.url)),safes:fileURLToPath(new URL("safes.html",import.meta.url))}}},
  server: {
    fs: {
      allow: [
        fileURLToPath(new URL(".", import.meta.url)),
        fileURLToPath(new URL("../../src", import.meta.url)),
      ],
    },
  },
}));
