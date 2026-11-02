import { parseBounded } from "../content/limits.mjs";
export async function readPublicJSON(path, maxBytes = 2097152, signal) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 3000),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const r = await fetch(path, { signal: controller.signal });
    if (!r.ok) throw Error("Local data unavailable");
    if (Number(r.headers.get("content-length")) > maxBytes)
      throw Error("Local data exceeds limit");
    const reader = r.body.getReader(),
      chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error("Local data exceeds limit");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let p = 0;
    for (const c of chunks) {
      bytes.set(c, p);
      p += c.length;
    }
    return parseBounded(new TextDecoder().decode(bytes), maxBytes, {
      depth: 20,
      nodes: 150000,
      string: 20000,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
