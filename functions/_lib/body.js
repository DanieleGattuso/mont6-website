/** Read a Request/Response without buffering more than the accepted byte limit. */
export class BodyTooLargeError extends Error {
    constructor() {
        super('Body exceeds the permitted size');
        this.name = 'BodyTooLargeError';
    }
}

export async function readBoundedText(source, maxBytes) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new TypeError('Invalid body limit');
    const declaredLength = source.headers.get('Content-Length');
    const reader = source.body?.getReader();
    try {
        if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
            throw new BodyTooLargeError();
        }
        if (!reader) return '';
        const decoder = new TextDecoder();
        const parts = [];
        let bytes = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > maxBytes) throw new BodyTooLargeError();
            parts.push(decoder.decode(value, { stream: true }));
        }
        parts.push(decoder.decode());
        return parts.join('');
    } catch (error) {
        // Stop the upstream immediately; a stalled cancellation must not delay rejection.
        if (reader) void reader.cancel().catch(() => {});
        throw error;
    } finally {
        reader?.releaseLock();
    }
}
