export async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error('Input unavailable.');
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Input too large.');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > limit) throw new Error('Input too large.');
      parts.push(result.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
