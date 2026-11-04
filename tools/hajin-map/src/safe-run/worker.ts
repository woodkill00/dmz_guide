import { solveRun } from "./domain.ts";
self.onmessage = (event) => {
  try {
    self.postMessage({ result: solveRun(event.data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Route calculation failed.",
    });
  }
};
