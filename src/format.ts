
export function normalizeString(input: string): string {
    return input.replace(/[ ]+/g, ' ')
        .replace('-­‐‑', '-')
        .replace('-­‐', '-');
}
