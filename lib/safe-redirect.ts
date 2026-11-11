export function safeRedirect(next: string, origin: string): URL {
    try {
        const destination = new URL(next, origin);
        if (destination.origin === origin && !destination.username && !destination.password) return destination;
    } catch { /* Fall back to home for malformed destinations. */ }
    return new URL('/', origin);
}
