
import { ISection } from './interface';
import { StringPart } from './string-part';
import { TablePart } from './table-part';
import {
    stringIsOnlyWhitespace,
    TABLE_HEADER_FONT_NAME,
} from './utils';

import { ITextItem } from '../pdf';

// union type of all part kinds
export type Part = StringPart | TablePart;

export class Section implements ISection {
    /** value in Parser.headerLevels array */
    headerLevelValue: number;

    /** Integer section level from ISection interface */
    level: number;

    parts: Part[] = [];

    constructor(headerLevelValue) {
        this.headerLevelValue = headerLevelValue;
    }

    postProcess() {
        this.parts.forEach(p => p.postProcess());
    }

    push(item: ITextItem) {
        if (item.fontName === TABLE_HEADER_FONT_NAME) {
            this.pushTablePart(item);
            return;
        }

        const tableToContinue = this.extractTablePartToContinue(item);
        if (tableToContinue) {
            tableToContinue.feed(item);
            return;
        }

        this.pushString(item);
    }

    pushString(item: ITextItem) {
        const partToContinue = this.extractStringPartToContinueFor(item.str);
        if (partToContinue) {
            partToContinue.append(item);
            return;
        }

        this.parts.push(StringPart.from(item));
    }

    pushTablePart(item: ITextItem) {
        const partToContinue = this.extractTablePartToContinue();
        if (partToContinue) {
            partToContinue.feed(item);
            return;
        }

        const newTable = new TablePart();
        newTable.feed(item);
        this.parts.push(newTable);
    }

    private extractTablePartToContinue(item?: ITextItem): TablePart {
        if (!this.parts.length) return;

        const last = this.parts[this.parts.length - 1];
        if (!(last instanceof TablePart)) return;

        // if no item provided, always return the table
        if (!item) return last;

        // if provided, compare with item
        if (item.height <= last.lastHeight) {
            // continue as long as our font size is smaller or matching
            return last;
        }
    }

    private extractStringPartToContinueFor(str: string): StringPart {
        if (!this.parts.length) return;

        if (str.startsWith('•')) {
            // bulleted list always gets a new part
            return;
        }

        if (stringIsOnlyWhitespace(str)) {
            // only-whitespace parts must always be added as-is.
            // this is so we can distinguish between an actual paragraph
            // break (indicated by two sets of only-whitespace) and just
            // ...some kind of PDF wackiness (indicated by a single
            // instance of a whitespace-only part).
            return;
        }

        const last = this.parts[this.parts.length - 1];
        if (!(last instanceof StringPart)) return;
        if (!last.isOnlyWhitespace()) {
            // if there's any text, continue it.
            return last;
        }

        if (this.parts.length < 2) return;

        // either there's a single whitespace, in which case we don't
        // want this and we'll continue `beforeLast` below, or there
        // are two whitespaces and they should both go since it's
        // a paragraph break.
        this.parts.pop();

        const beforeLast = this.parts[this.parts.length - 1];
        if (!(beforeLast instanceof StringPart)) return;
        if (beforeLast.isOnlyWhitespace()) {
            // don't continue, and remove the whitespace
            this.parts.pop();
            return;
        }

        // continue the non-whitespace-only
        if (!beforeLast.endsWithSpace()) {
            // fill in a missing space
            beforeLast.str += ' ';
        }

        return beforeLast;
    }
}