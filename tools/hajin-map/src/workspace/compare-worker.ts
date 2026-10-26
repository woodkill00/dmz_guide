import { suggest } from "./compare.ts";
addEventListener("message", (event: MessageEvent) => {
  try {
    postMessage({ ok: true, result: suggest(event.data) });
  } catch (error) {
    postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Comparison failed.",
    });
  }
});
