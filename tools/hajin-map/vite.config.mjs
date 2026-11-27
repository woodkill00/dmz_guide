import { LOCAL_SERVICE_PORTS } from "../../src/domain/local-services.mjs";
import { createServiceLinkHandler } from "../../scripts/local-service-links.mjs";
import {
  resolvePresentation,
  presentationAttributes,
} from "../../src/ui/presentation-config.mjs";
import { referencePlugin } from "./server/reference-plugin.mjs";
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { sourceUpdatePlugin } from "./server/source-update-plugin.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
const unified = process.env.DMZ_UNIFIED_SITE === "1";
export default defineConfig(({ mode }) => ({
  base: unified ? "/map/" : "/",
  publicDir: unified ? false : "public",
  plugins: [
    {
      name: "local-service-links",
      apply: "serve",
      configureServer(server) {
        const handler = createServiceLinkHandler({ service: "legacyMap" });
        server.middlewares.use((req, res, next) => {
          if (!handler(req, res)) next();
        });
      },
    },
    referencePlugin(),
    {
      name: "shared-page-navigation",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          const help = context.filename.endsWith("help.html"),
            loot = context.filename.endsWith("loot.html"),
            safe = context.filename.endsWith("safes.html") || loot,
            x01 =
              context.filename.endsWith("x01.html") ||
              context.filename.endsWith("x01-dmzhub.html") ||
              context.filename.endsWith("x01-workspace.html");
          const surface = safe ? "safe-runs" : "map",
            ui = resolvePresentation(surface);
          html = html.replace(
            '<html lang="en">',
            `<html lang="en" ${presentationAttributes(surface)}>`,
          );
          if (ui.variant === "modern")
            html = html.replace(
              "</head>",
              '<link rel="stylesheet" href="/@fs/' +
                fileURLToPath(
                  new URL("../../src/ui/workspace-shell.css", import.meta.url),
                ).replaceAll("\\", "/") +
                '"><link rel="stylesheet" href="/src/map/modern-theme.css"></head>',
            );
          if (unified)
            html = html.replace(
              /((?:href|src)="|(?:href|src)=')\/(?!\/|src\/|@fs\/|local-services\/)([^"']*)/g,
              (_, a, b) => a + "/map/" + b,
            );
          html = html.replace(
            /<body\b[^>]*>/,
            (body) =>
              body +
              '<details class="local-transfer-notice"><summary>Saved map data</summary><a href="' +
              (unified ? "/map/migrate/" : "/migration.html") +
              '">Transfer from your old browser address</a></details>',
          );
          return html.replace(
            "<!-- MAIN_NAVIGATION -->",
            renderMainNavigation({
              surface: help ? "help" : "map",
              page: help
                ? "map-help"
                : loot
                  ? "loot-runs"
                  : safe
                    ? "safe-runs"
                    : x01
                      ? "x01-map"
                      : "hajin-map",
              mapBase: unified ? "/map/" : "/",
            }),
          );
        },
      },
    },
    sourceUpdatePlugin({
      root,
      enabled: loadEnv(mode, root, "DMZ_").DMZ_ENABLE_SOURCE_UPDATES === "1",
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        map: fileURLToPath(new URL("index.html", import.meta.url)),
        help: fileURLToPath(new URL("help.html", import.meta.url)),
        safes: fileURLToPath(new URL("safes.html", import.meta.url)),
        loot: fileURLToPath(new URL("loot.html", import.meta.url)),
        x01: fileURLToPath(new URL("x01.html", import.meta.url)),
        x01Dmzhub: fileURLToPath(new URL("x01-dmzhub.html", import.meta.url)),
        migration: fileURLToPath(new URL("migration.html", import.meta.url)),
        x01Workspace: fileURLToPath(
          new URL("x01-workspace.html", import.meta.url),
        ),
      },
    },
  },
  server: {
    port: LOCAL_SERVICE_PORTS.legacyMap,
    fs: {
      allow: [
        fileURLToPath(new URL(".", import.meta.url)),
        fileURLToPath(new URL("../../src", import.meta.url)),
      ],
    },
  },
}));
