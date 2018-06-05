import * as pdf from 'pdf-parse';

export interface IPageData {
    pageIndex: number;

    getTextContent(opts: ITextContentOptions): Promise<ITextContent>;
}

export interface ITextContentOptions {

    // if true, replaces all occurrences of whitespace with standard spaces (0x20).
    normalizeWhitespace?: boolean;

    // if true, do not attempt to combine same line TextItem's.
    disableCombineTextItems?: boolean;
}

export interface ITextContent {
    items: ITextItem[];
    style: Map<string, ITextStyle>;
}

export interface ITextItem {
    str: string;
    dir?: string;
    height?: number;
    width?: number;
    fontName?: string;
    transform?: number[];

    x?: number;
    y?: number;
}

export interface ITextStyle {
    ascent: number;
    descent: number;
    vertical: boolean;
    fontFamily: string;
}

class WrappedTextItem implements ITextItem {

    private base: ITextItem;

    constructor(base: ITextItem) {
        this.base = base;
    }

    get str() { return this.base.str; }
    get dir() { return this.base.dir; }
    get height() { return this.base.height; }
    get width() { return this.base.width; }
    get fontName() { return this.base.fontName; }
    get transform() { return this.base.transform; }

    get x() {
        // transform => [scaleX, 0, 0, scaleY, x, y];
        return this.base.transform[4];
    }
    set x(value) {
        this.base.transform[4] = value;
    }

    get y() {
        // transform => [scaleX, 0, 0, scaleY, x, y];
        return this.base.transform[5];
    }
    set y(value) {
        this.base.transform[5] = value;
    }
}

export async function processPdf(
    data,
    onEachPage: (page: IPageData, content: ITextContent) => void,
) {
    await pdf(data, {
        pagerender: async (pageData: IPageData) => {
            const opts = {
                // replaces all occurrences of whitespace with standard spaces (0x20).
                normalizeWhitespace: true,

                // do not attempt to combine same line TextItem's.
                disableCombineTextItems: false,
            };

            const content = await pageData.getTextContent(opts);
            content.items = content.items.map((textItem) => new WrappedTextItem(textItem));
            return onEachPage(pageData, content);
        },
    });
}
