
import { normalizeString } from '../format';
import {
    FormatSpan, Formatting,
    IStringPart,
    PartType,
} from './interface';
import { stringIsOnlyWhitespace } from './utils';

import { ITextItem } from '../pdf';

const fontToFormatting = {
    g_d0_f1: Formatting.Italic,
    g_d0_f12: Formatting.Bold,
    g_d0_f14: Formatting.Bold,
    g_d0_f3: Formatting.Bold,
    g_d0_f5: Formatting.BoldItalic,
    g_d0_f7: Formatting.Italic,
    g_d0_f8: Formatting.Bold,
};

export class StringPart implements IStringPart {

    static from(item: ITextItem): StringPart {
        return new StringPart(
            normalizeString(item.str),
            item.x,
            item.y,
            item.width,
            item.height,
            item.fontName,
        );
    }

    readonly type = PartType.STRING;

    formatting: FormatSpan[] = [];

    constructor(
        public str: string,
        readonly x: number = 0,
        readonly y: number = 0,
        public width: number = 0,
        readonly height: number = 0,
        fontName: string = null,
    ) {
        this.pushFormattingForFont(fontName, 0);
    }

    append(item: ITextItem) {
        const start = this.str.length;
        this.str += normalizeString(item.str);
        this.width += item.width;

        this.pushFormattingForFont(item.fontName, start);
    }

    prepend(item: StringPart, separator = ' ') {
        const oldLen = this.str.length;
        const prefix = item.str.trimRight();
        const trimmed = this.str.trimLeft();

        const increment = prefix.length +
            separator.length -
            (oldLen - trimmed.length);

        this.str = prefix + separator + trimmed;

        for (const span of this.formatting) {
            span.start += increment;
        }

        this.formatting.splice(0, 0, ...item.formatting);

        // attempt to merge spans
        const lastNewI = item.formatting.length - 1;
        const firstOldI = item.formatting.length;
        const lastNew = this.formatting[lastNewI];
        if (firstOldI >= this.formatting.length) {
            // no existing formatting; nothing to merge
            return;
        }

        const firstOld = this.formatting[firstOldI];
        if (lastNew.start + lastNew.length + separator.length === firstOld.start
            && lastNew.format === firstOld.format
        ) {
            this.formatting.splice(firstOldI, 1);
            lastNew.length += firstOld.length + separator.length;
        }
    }

    /**
     * @return True if the column starting at our `.x` with
     *  our `.width` could contain the given `x` value
     */
    couldContain(x: number): boolean {
        return this.x <= x && x <= this.x + this.width;
    }

    postProcess() {
        this.str = this.str.trimRight();
    }

    isOnlyWhitespace() {
        return stringIsOnlyWhitespace(this.str);
    }

    endsWithSpace(): boolean {
        return this.str.endsWith(' ');
    }

    toJson(): any {
        return this.str;
    }

    toString(): string {
        let str = '';
        let i = 0;
        for (const span of this.formatting) {
            // if there are unformatted parts in-between, add them:
            if (span.start > i) {
                str += this.str.substring(i, span.start);
                i = span.start;
            }

            if (span.isBold) str += '**';
            if (span.isItalic) str += '_';

            str += this.str.substr(span.start, span.length);

            if (span.isItalic) str += '_';
            if (span.isBold) str += '**';

            i += span.length;
        }

        if (i < this.str.length) {
            // add any un-spanned
            str += this.str.substr(i);
        }

        return str;
    }

    valueOf(): string {
        return this.str;
    }

    private pushFormattingForFont(fontName: string, start: number) {
        const length = this.str.length - start;
        const formatting = fontToFormatting[fontName];
        if (formatting && this.formatting.length) {
            // attempt to combine with a previous span
            const prev = this.formatting[this.formatting.length - 1];
            if (prev.start + prev.length === start
                && prev.format === formatting
            ) {
                prev.length += length;
                return;
            }
        }

        if (formatting) {
            this.formatting.push(new FormatSpan(
                formatting,
                start,
                length,
            ));
        }
    }

}