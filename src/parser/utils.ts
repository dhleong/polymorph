
export const TABLE_HEADER_FONT_NAME = 'g_d0_f6';

export const stringIsOnlyWhitespace =
    (str: string): boolean =>
        str.match(/^[ ]+$/) != null;

export const nearlyMatch = (a: number, b: number) =>
    Math.abs(a - b) < 0.1;
