import {
  serviceOrigin,
  validateDestination,
  LOCAL_SERVICE_PORTS,
} from "../src/domain/local-services.mjs";
export function createServiceLinkHandler({
  ports = {},
  service = "guide",
} = {}) {
  return (req, res) => {
    if (!req.url?.startsWith("/local-services/")) return false;
    const send = (status, text) => {
      res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : text);
      return true;
    };
    const host = req.headers.host;
    const count = (name) =>
      (req.rawHeaders || []).filter(
        (value, index) => index % 2 === 0 && value.toLowerCase() === name,
      ).length;
    if (
      count("host") !== 1 ||
      count("origin") > 1 ||
      count("sec-fetch-site") > 1
    )
      return send(403, "Ambiguous local request headers");
    if (
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host || "") ||
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress,
      ) ||
      (req.headers.origin && req.headers.origin !== `http://${host}`) ||
      (req.headers["sec-fetch-site"] &&
        !["same-origin", "none"].includes(req.headers["sec-fetch-site"]))
    )
      return send(403, "Local same-origin navigation only");
    if (!["GET", "HEAD"].includes(req.method))
      return send(405, "GET or HEAD only");
    try {
      const url = new URL(req.url, `http://${host}`),
        match = /^\/local-services\/([a-zA-Z]+)\/$/.exec(url.pathname);
      if (!match || !Object.hasOwn(LOCAL_SERVICE_PORTS, match[1]))
        return send(404, "Unknown local service");
      if (
        url.searchParams.getAll("destination").length !== 1 ||
        [...url.searchParams.keys()].some((k) => k !== "destination")
      )
        return send(400, "One relative destination required");
      const destination = validateDestination(
        url.searchParams.get("destination"),
      );
      const origin =
        match[1] === service
          ? `http://${host}`
          : serviceOrigin(match[1], `http://${host}`, ports);
      res.writeHead(302, {
        Location: new URL(destination, origin).href,
        "Cache-Control": "no-store",
      });
      res.end();
      return true;
    } catch {
      return send(400, "Invalid local service destination");
    }
  };
}
