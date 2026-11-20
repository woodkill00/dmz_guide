import ports from "./local-services.json" with { type: "json" };
if (
  !ports ||
  Object.keys(ports).sort().join() !== "author,guide,legacyMap,manager" ||
  Object.values(ports).some(
    (port) => !Number.isInteger(port) || port < 1 || port > 65535,
  )
)
  throw Error("Local service configuration requires four valid ports");
export const LOCAL_SERVICE_PORTS = Object.freeze(ports);
export function servicePath(service, destination = "/") {
  if (!Object.hasOwn(ports, service)) throw Error("Unknown local service");
  validateDestination(destination);
  return (
    "/local-services/" +
    service +
    "/?destination=" +
    encodeURIComponent(destination)
  );
}
export function validateDestination(path) {
  if (
    typeof path !== "string" ||
    path.length > 4096 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(path)
  )
    throw Error("Local destination must be a bounded relative path");
  const parsed = new URL(path, "http://local.invalid");
  if (parsed.origin !== "http://local.invalid")
    throw Error("Invalid local destination");
  return path;
}
export function serviceOrigin(service, origin, overrides = {}) {
  if (!Object.hasOwn(ports, service)) throw Error("Unknown local service");
  const url = new URL(origin);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw Error("Local services require a loopback HTTP origin");
  const port = overrides[service] ?? ports[service];
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid local service port");
  url.port = String(port);
  return url.origin;
}
