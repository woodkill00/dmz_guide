/** Typed compatibility surface for the existing browser-safe native raster modules. */
declare module "*/client/raster-editor.mjs" {
  export function normalizeRaster(
    bytes: Uint8Array,
    options?: {
      signal?: AbortSignal;
      maxDimension?: number;
      keepOriginal?: boolean;
    },
  ): Promise<{
    bytes: Uint8Array;
    mime: string;
    width: number;
    height: number;
    sha256: string;
    sourceWidth: number;
    sourceHeight: number;
    sourceBytes: number;
  }>;
  export function decodeRaster(
    bytes: Uint8Array,
    mime: string,
    signal?: AbortSignal,
    deadline?: number,
  ): Promise<{ width: number; height: number }>;
}
declare module "*/content/portable.mjs" {
  export function imageInfo(bytes: Uint8Array): {
    mime: string;
    width: number;
    height: number;
  };
  export function base64FromBytes(bytes: Uint8Array): string;
  export function bytesFromBase64(text: string): Uint8Array;
}
