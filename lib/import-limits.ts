export const MAX_INPUT_LENGTH = 40_000;
export const MAX_REQUEST_BYTES = 200_000;

export async function readLimitedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
    if (!body) return '';
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > limit) {
                await reader.cancel();
                throw new Error('Request too large');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(bytes);
}
