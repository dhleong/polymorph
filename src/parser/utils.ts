
export const TABLE_HEADER_FONT_NAME = 'g_d0_f6';

export function isNumber(n) {
    if (n === null || n === undefined) return false;
    return typeof n === 'number' || (n as string).match(/^\d+$/);
}

export const stringIsOnlyWhitespace =
    (str: string): boolean =>
        str.match(/^[ ]+$/) != null;

export const nearlyMatch = (a: number, b: number) =>
    Math.abs(a - b) < 0.1;
