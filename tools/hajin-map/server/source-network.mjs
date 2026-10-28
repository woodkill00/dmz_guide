import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { sites } from "./source-contract.mjs";
export function allowedURL(input) {
  const u = new URL(input);
  const fixed = Object.values(sites).some(
    (s) => u.href === s.page || u.href === s.image,
  );
  const official =
    u.hostname === "www.callofduty.com" &&
    /^\/apps\/atvi\/callofduty\/strategy-guide\/components\/maps\/map-page\/clientlibs\.[a-zA-Z0-9]+\.js$/.test(
      u.pathname,
    );
  const api =
    u.hostname === "map-vnext-server.infra-ext.activision.com" &&
    u.pathname === "/mapdata/all" &&
    u.searchParams.get("mapPath") ===
      "/content/atvi/callofduty/guides/web/en/modernwarfare4/dmz-maps/hajin" &&
    [...u.searchParams].length === 1;
  const tile =
    u.hostname === "www.callofduty.com" &&
    /^\/cdn\/blog\/guides\/maps\/mw4\/dmz\/hajin\/baselayer\/v1\/tiles\/4\/(?:[0-9]|1[0-5])\/(?:[0-9]|1[0-5])\.png$/.test(
      u.pathname,
    ) &&
    !u.search;
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    u.hash ||
    !(fixed || (official && !u.search) || api || tile)
  )
    throw Error("Remote URL is outside the fixed source registry.");
  return u;
}
export function publicAddress(ip) {
  if (isIP(ip) === 4) {
    const a = ip.split(".").map(Number);
    return !(
      a[0] === 0 ||
      a[0] === 10 ||
      a[0] === 127 ||
      a[0] >= 224 ||
      (a[0] === 169 && a[1] === 254) ||
      (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
      (a[0] === 192 && [0, 168].includes(a[1])) ||
      (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
      (a[0] === 198 && [18, 19, 51].includes(a[1])) ||
      (a[0] === 203 && a[1] === 0)
    );
  }
  // Use vetted IPv4 results; fail closed on IPv6-only DNS rather than mishandle mapped/private ranges.
  return false;
}
export function sourceNetwork(
  signal,
  requestLimit = 128,
  { resolveHost = lookup, requestHTTPS = https.get, deadlineMs = 15000 } = {},
) {
  let requests = 0,
    total = 0;
  return async function get(input, limit = 4 * 1024 * 1024, redirects = 0) {
    signal?.throwIfAborted();
    const u = allowedURL(input);
    if (++requests > requestLimit)
      throw Error("Source request budget exceeded.");
    const started = Date.now();
    const addresses = await new Promise((resolve, reject) => {
        const stop = () => {
          cleanup();
          reject(Error("Source DNS lookup cancelled."));
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(Error("Source DNS lookup timed out."));
        }, deadlineMs);
        function cleanup() {
          clearTimeout(timer);
          signal?.removeEventListener("abort", stop);
        }
        signal?.addEventListener("abort", stop, { once: true });
        Promise.resolve()
          .then(() => resolveHost(u.hostname, { all: true, family: 4 }))
          .then(
            (value) => {
              cleanup();
              resolve(value);
            },
            (e) => {
              cleanup();
              reject(e);
            },
          );
        if (signal?.aborted) stop();
      }),
      address = addresses.find((a) => publicAddress(a.address));
    signal?.throwIfAborted();
    if (!address || addresses.some((a) => !publicAddress(a.address)))
      throw Error("Source DNS did not resolve to public addresses.");
    return await new Promise((resolve, reject) => {
      const request = requestHTTPS(
        u,
        {
          signal,
          headers: {
            "Accept-Encoding": "identity",
            "User-Agent": "DMZ-local-map-check/1.0",
          },
          lookup: (_h, options, callback) =>
            callback(
              null,
              options.all ? [address] : address.address,
              address.family,
            ),
        },
        (response) => {
          response.once("close", () => request.destroy());
          if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            response.destroy();
            request.destroy();
            if (redirects >= 2) return reject(Error("Source redirect limit."));
            try {
              const next = allowedURL(
                new URL(response.headers.location, u).href,
              );
              get(next.href, limit, redirects + 1).then(resolve, reject);
            } catch (e) {
              reject(e);
            }
            return;
          }
          if (response.statusCode !== 200) {
            response.destroy();
            request.destroy();
            return reject(
              Error(
                `Source returned HTTP${response.statusCode}; previous capture retained.`,
              ),
            );
          }
          if (
            response.headers["content-encoding"] &&
            response.headers["content-encoding"] !== "identity"
          ) {
            response.destroy();
            return reject(Error("Unexpected compressed source response."));
          }
          if (Number(response.headers["content-length"]) > limit) {
            response.destroy();
            return reject(Error("Source byte limit exceeded."));
          }
          const chunks = [];
          let bytes = 0;
          response.on("data", (chunk) => {
            bytes += chunk.length;
            total += chunk.length;
            if (bytes > limit || total > 64 * 1024 * 1024) {
              response.destroy(Error("Source byte budget exceeded."));
            } else chunks.push(chunk);
          });
          response.on("end", () => resolve(Buffer.concat(chunks)));
          response.on("error", reject);
        },
      );
      const deadline = setTimeout(
        () => request.destroy(Error("Source request timed out.")),
        Math.max(1, deadlineMs - (Date.now() - started)),
      );
      request.on("close", () => clearTimeout(deadline));
      request.on("error", reject);
    });
  };
}
