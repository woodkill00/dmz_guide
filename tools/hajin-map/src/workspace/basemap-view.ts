import L from "leaflet";
import type { Registration } from "./registration.ts";
/** Warp source pixels into a canonical canvas; camera and marker coordinates never change. */
export function createBasemapComparison(map: L.Map) {
  const pane =
    map.getPane("hajin-basemaps") ?? map.createPane("hajin-basemaps");
  pane.style.zIndex = "200";
  pane.style.pointerEvents = "none";
  let layer: L.ImageOverlay | undefined,
    url: string | undefined,
    generation = 0,
    controller: AbortController | undefined;
  const clear = () => {
    generation++;
    controller?.abort();
    controller = undefined;
    if (layer) {
      map.removeLayer(layer);
      layer = undefined;
    }
    if (url) {
      URL.revokeObjectURL(url);
      url = undefined;
    }
  };
  return {
    clear,
    setOpacity: (opacity: number) =>
      layer?.setOpacity(Math.min(1, Math.max(0, opacity))),
    async show(blob: Blob, registration: Registration, opacity: number) {
      clear();
      const version = generation,
        current = new AbortController();
      controller = current;
      const deadline = performance.now() + 15000;
      const pending = async <T>(work: Promise<T>): Promise<T> => {
        void work.catch(() => {});
        if (performance.now() >= deadline)
          throw new Error("Comparison decode/warp timed out.");
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abort = () => {};
        let abortListener = abort;
        try {
          return await Promise.race([
            work,
            new Promise<never>((_, reject) => {
              abortListener = () => reject(new Error("Comparison cancelled."));
              current.signal.addEventListener("abort", abortListener, {
                once: true,
              });
              timer = setTimeout(
                () => reject(new Error("Comparison decode/warp timed out.")),
                Math.max(1, deadline - performance.now()),
              );
              if (current.signal.aborted) abortListener();
            }),
          ]);
        } finally {
          clearTimeout(timer);
          current.signal.removeEventListener("abort", abortListener);
        }
      };
      const decoding = createImageBitmap(blob);
      let bitmap: ImageBitmap | undefined,
        canvas: HTMLCanvasElement | undefined;
      try {
        bitmap = await pending(decoding);
        if (version !== generation) return false;
        canvas = document.createElement("canvas");
        canvas.width = canvas.height = 4096;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable.");
        const [a, b, c, d, e, f] = registration.transform;
        context.setTransform(a, d, b, e, c, f);
        context.drawImage(bitmap, 0, 0);
        const output = await pending(
          new Promise<Blob>((resolve, reject) =>
            canvas!.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Map warp failed."))),
              "image/png",
            ),
          ),
        );
        if (version !== generation) return false;
        url = URL.createObjectURL(output);
        layer = L.imageOverlay(
          url,
          [
            [0, 0],
            [4096, 4096],
          ],
          {
            opacity,
            pane: "hajin-basemaps",
            interactive: false,
            alt: "Calibrated local comparison background",
          },
        );
        const loaded = new Promise<void>((resolve, reject) => {
          layer!.once("load", () => {
            const image = layer!.getElement();
            if (!image)
              return reject(new Error("Comparison image unavailable."));
            void image.decode().then(() => resolve(), reject);
          });
          layer!.once("error", () =>
            reject(new Error("Comparison image could not load.")),
          );
        });
        layer.addTo(map);
        await pending(loaded);
        return version === generation;
      } catch (error) {
        if (!bitmap)
          void decoding.then(
            (b) => b.close(),
            () => {},
          );
        if (current.signal.aborted) return false;
        throw error;
      } finally {
        bitmap?.close();
        if (canvas) canvas.width = canvas.height = 0;
      }
    },
    destroy: clear,
  };
}
