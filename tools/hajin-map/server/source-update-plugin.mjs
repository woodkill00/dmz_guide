import { randomBytes, timingSafeEqual } from "node:crypto";
import { SourceUpdates } from "./source-update-service.mjs";
export function localRequest(req) {
  const host = req.headers.host;
  const remote = req.socket.remoteAddress;
  if (
    !/^127\.0\.0\.1:\d+$/.test(host ?? "") ||
    !["127.0.0.1", "::ffff:127.0.0.1"].includes(remote)
  )
    return false;
  return (
    (!req.headers.origin || req.headers.origin === `http://${host}`) &&
    (!req.headers["sec-fetch-site"] ||
      req.headers["sec-fetch-site"] === "same-origin")
  );
}
export function sourceUpdatePlugin({ root, enabled = false, service } = {}) {
  const updates = service ?? new SourceUpdates(root, { enabled });
  const token = randomBytes(32).toString("hex");
  return {
    name: "owner-local-source-updates",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("close", () => updates.dispose());
      server.middlewares.use("/__map-updates", async (req, res, next) => {
        if (!req.url?.startsWith("/")) return next();
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("X-Content-Type-Options", "nosniff");
        const send = (code, data) => {
          res.statusCode = code;
          res.end(JSON.stringify(data));
        };
        try {
          if (!localRequest(req))
            return send(403, { error: "Local same-origin requests only." });
          if (req.method === "GET" && req.url === "/capabilities")
            return send(200, { ...(await updates.capabilities()), token });
          const supplied = Buffer.from(
            String(req.headers["x-map-update-token"] ?? ""),
          );
          if (
            supplied.length !== token.length ||
            !timingSafeEqual(supplied, Buffer.from(token))
          )
            return send(403, { error: "Local update token required." });
          let body = "";
          if (req.method === "POST") {
            if (
              req.headers.origin !== `http://${req.headers.host}` ||
              req.headers["content-type"] !== "application/json"
            )
              return send(403, { error: "Same-origin JSON required." });
            for await (const chunk of req) {
              body += chunk;
              if (Buffer.byteLength(body) > 4096)
                return send(413, { error: "Update request too large." });
            }
            const value = JSON.parse(body);
            if (!value || Object.keys(value).length)
              throw Error("Update actions accept an empty object only.");
          }
          if (req.method === "POST" && req.url === "/prepare")
            return send(200, await updates.prepare());
          if(req.method==="GET"&&req.url==="/history")return send(200,await updates.history());
          if (req.method === "GET" && req.url === "/jobs")
            return send(200, await updates.list());
          const match =
            /^\/jobs\/([a-f0-9-]{36})(?:\/(reserve|activate|cancel))?$/.exec(
              req.url,
            );
          if (match && req.method === "GET" && !match[2])
            return send(200, await updates.get(match[1]));
          if (match && req.method === "POST" && match[2])
            return send(200, await updates[match[2]](match[1]));
          return send(404, { error: "Unknown update action." });
        } catch (e) {
          send(409, { error: String(e.message).slice(0, 500) });
        }
      });
    },
  };
}
