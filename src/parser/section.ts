
import { CreaturePart } from './creature-part';
import { ISection, PartType } from './interface';
import { SpellPart } from './spell-part';
import { StringPart } from './string-part';
import { TablePart } from './table-part';
import {
    nearlyMatch,
    stringIsOnlyWhitespace,
    TABLE_HEADER_FONT_NAME,
} from './utils';

import { ITextItem } from '../pdf';
import { ItemPart } from './item-part';

// union type of all part kinds
export type Part = CreaturePart | ItemPart | SpellPart | StringPart | TablePart;

export class Section implements ISection {
    static fromSectionPart(oldSection: Section, part: Part): Section {
        const newSection = new Section(oldSection.headerLevelValue);
        newSection.minHeaderLevelValue = oldSection.minHeaderLevelValue;
        newSection.level = oldSection.level;
        newSection.parts.push(part);
        return newSection;
    }

    canHaveTables = true;

    /** value in Parser.headerLevels array */
    headerLevelValue: number;
    minHeaderLevelValue: number;

    /** Integer section level from ISection interface */
    level: number;

    parts: Part[] = [];

    constructor(headerLevelValue) {
        this.headerLevelValue = headerLevelValue;
        this.minHeaderLevelValue = headerLevelValue;
    }

    canContainHeaderLevelValue(value: number) {
        if (this.minHeaderLevelValue === this.headerLevelValue) {
            return value === this.headerLevelValue;
        } else {
            // we've got a table merged in here that we want to continue,
            // but hitting another header of same height starts a new table
            return value < this.headerLevelValue;
        }
    }

    clone(): Section {
        const clone = new Section(this.headerLevelValue);
        clone.level = this.level;
        clone.parts = this.parts.map(p => {
            if (p instanceof TablePart) {
                // special case because the getHeader modifies it
                return p.clone();
            } else {
                return p;
            }
        });
        return clone;
    }

    getHeader(removeIt: boolean = false): string {
        if (!this.parts.length) return;

        const firstPart = this.parts[0];
        const partType = firstPart.type;

        switch (partType) {
        case PartType.STRING:
            const stringSrc = removeIt
                ? this.parts.splice(0, 1)[0]
                : this.parts[0];

            return (stringSrc as StringPart).str;

        case PartType.TABLE:
            const headers = (firstPart as TablePart).headers;
            const tableSrc = removeIt
                ? headers.splice(0, 1)[0]
                : headers[0];
            return tableSrc.map(h => h.str).join('');

        case PartType.ITEM:
            // NOTE: there's nothing to remove from an ItemPart
            const item = firstPart as ItemPart;
            return item.name;

        case PartType.SPELL:
            // NOTE: there's nothing to remove from a SpellPart
            const spell = firstPart as SpellPart;
            return spell.name;

        case PartType.CREATURE:
            // NOTE: there's also nothing to remove from a CreaturePart
            const creature = firstPart as CreaturePart;
            return creature.name;
        }

        throw new Error(`Unexpected section: ${partType} / ${PartType.SPELL}`);
    }

    postProcess() {
        this.parts.forEach(p => p.postProcess());
    }

    push(item: ITextItem) {
        this.minHeaderLevelValue = Math.min(this.minHeaderLevelValue, item.height);

        if (this.canHaveTables && item.fontName === TABLE_HEADER_FONT_NAME) {
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
        const partToContinue = this.extractStringPartToContinueFor(item);
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
        if (item.height === last.lastHeight) {
            // in some special cases, the table header font is used as
            // just "bold." Fun.
            if (last.headers.length === 1
                && last.headers[0].length === 1
                && item.y === last.headers[0][0].y
            ) {
                this.parts.pop();
                this.parts.push(last.headers[0][0]);
                return;
            }
        }

        if (item.height <= last.lastHeight) {
            // continue as long as our font size is smaller or matching
            return last;
        }
    }

    private extractStringPartToContinueFor(item: ITextItem): StringPart {
        if (!this.parts.length) return;

        const str = item.str;
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

        // patterns of bold => not-bold => bold should result in a newline
        // (see: spells, esp the spell-part-test item: `handles attributes
        // split across columns`)
        if (
            beforeLast.isBoldList()
            && !last.isBoldList()
            && StringPart.from(item).isBoldList()
        ) {
            return;
        }

        if (nearlyMatch(beforeLast.x, item.x)
            && !nearlyMatch(beforeLast.y, item.y)) {

            if (item.str[0] === item.str[0].toUpperCase()) {
                // new line, starting capital; probably a list
                return;
            }

        } else if (
            beforeLast.x < item.x
            && beforeLast.y < item.y
            && this.parts.length > 2
        ) {
            // possibly new column in list
            const wayBeforeLast = this.parts[this.parts.length - 2];
            if (wayBeforeLast instanceof StringPart
                && nearlyMatch(wayBeforeLast.x, beforeLast.x)
                && wayBeforeLast.y > beforeLast.y
            ) {
                // yep, this looks like a list
                return;
            }

        } else if (
            beforeLast.x > item.x
            && beforeLast.y < item.y
            && this.parts.length >= 1
        ) {
            if (this.parts.length <= 2) {
                // only one item
                return;
            }

            // possibly new PAGE in list
            const wayBeforeLast = this.parts[this.parts.length - 2];
            if (wayBeforeLast instanceof StringPart
                && nearlyMatch(wayBeforeLast.x, beforeLast.x)
                && wayBeforeLast.y > beforeLast.y
            ) {
                // yep, this looks like a list
                return;
            }
        }

        // continue the non-whitespace-only
        if (!beforeLast.endsWithSpace()) {
            // fill in a missing space
            beforeLast.appendString(' ');
        }

        // console.log("APPEND", item, ": x=", nearlyMatch(beforeLast.x, item.x),
        //     "y=", nearlyMatch(beforeLast.y, item.y));
        return beforeLast;
    }
}
