import {resolvePresentation,presentationAttributes} from "../../src/ui/presentation-config.mjs";
import {referencePlugin} from './server/reference-plugin.mjs';
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { sourceUpdatePlugin } from "./server/source-update-plugin.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ mode }) => ({
  plugins: [
    referencePlugin(),
    {name:"shared-page-navigation",transformIndexHtml:{order:"pre",handler(html,context){const help=context.filename.endsWith("help.html"),safe=context.filename.endsWith("safes.html"),x01=context.filename.endsWith("x01.html")||context.filename.endsWith("x01-dmzhub.html")||context.filename.endsWith("x01-workspace.html");const surface=safe?'safe-runs':'map',ui=resolvePresentation(surface);html=html.replace('<html lang="en">',`<html lang="en" ${presentationAttributes(surface)}>`);if(ui.variant==='modern')html=html.replace('</head>','<link rel="stylesheet" href="/@fs/'+fileURLToPath(new URL('../../src/ui/workspace-shell.css',import.meta.url)).replaceAll('\\','/')+'"><link rel="stylesheet" href="/src/map/modern-theme.css"></head>');return html.replace("<!-- MAIN_NAVIGATION -->",renderMainNavigation({surface:help?"help":"map",page:help?"map-help":safe?"safe-runs":x01?"x01-map":"hajin-map"}));}}},
    sourceUpdatePlugin({
      root,
      enabled: loadEnv(mode, root, "DMZ_").DMZ_ENABLE_SOURCE_UPDATES === "1",
    }),
  ],
  build:{rollupOptions:{input:{map:fileURLToPath(new URL("index.html",import.meta.url)),help:fileURLToPath(new URL("help.html",import.meta.url)),safes:fileURLToPath(new URL("safes.html",import.meta.url)),x01:fileURLToPath(new URL("x01.html",import.meta.url)),x01Dmzhub:fileURLToPath(new URL("x01-dmzhub.html",import.meta.url)),x01Workspace:fileURLToPath(new URL("x01-workspace.html",import.meta.url))}}},
  server: {
    fs: {
      allow: [
        fileURLToPath(new URL(".", import.meta.url)),
        fileURLToPath(new URL("../../src", import.meta.url)),
      ],
    },
  },
}));
