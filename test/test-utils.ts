import * as path from 'path';

import { fs } from 'mz';

import {
    FormatSpan, Formatting,
    Parser, Section,
    StringPart, TablePart,
} from '../src/parser';
import { TABLE_HEADER_FONT_NAME } from '../src/parser/utils';

import { DepthTracker } from '../src/depth-tracker';
import { ITextItem } from '../src/pdf';

// tslint:disable-next-line
const footerString = `Not    for    resale.    Permission    granted    to    print    or    photocopy    this    document    for    personal    use    only`;

const formattingByStr = {
    b: Formatting.Bold,
    bi: Formatting.BoldItalic,
    i: Formatting.Italic,
};

export function pageParserOf(items: any[]) {
    const parser = new Parser();

    const pages = [];
    const footerIndex = items.findIndex(item => item.str === footerString);
    if (footerIndex === -1) {
        pages.push(items);
    } else {
        pages.push(items.slice(0, footerIndex));

        // tslint:disable-next-line
        pages.push(parser['skipFooters'](items.slice(footerIndex)));
    }

    for (const page of pages) {
        parser.processPage(page.map(raw => textItem(raw)));
    }
    parser.postProcess();

    return parser;
}

export function parsePage(items: any[]): Section[] {
    const parser = pageParserOf(items);
    const sections = parser['sections'] as Section[]; // tslint:disable-line
    return sections;
}

/**
 * Parse the given items and assert tha they belong to
 * a single Table in a single Section
 */
export function tableSection(items: any[]): TablePart {
    const sections = parsePage(items);
    sections.should.have.lengthOf(1, JSON.stringify(items));

    const section = sections[0];
    section.parts.should.have.lengthOf(1, JSON.stringify(section));

    return section.parts[0] as TablePart;
}

/**
 * Less strict than {@link tableSection}
 */
export function tableFromSection(items: any[]): TablePart {
    // FIXME can we just use this instead of tableSection?
    const sections = parsePage(items);
    const section = sections[0];
    section.parts.should.have.lengthOf(1, JSON.stringify(section));

    return section.parts[0] as TablePart;
}

export function textItem(obj: any): ITextItem {
    return {
        dir: 'rtl',
        fontName: obj.tableHeader
            ? TABLE_HEADER_FONT_NAME
            : 'g_d0_f2',
        height: 40.0,
        transform: [],
        width: 20.0,

        ...obj,
    };
}

export function formatSpanFromJson(json): FormatSpan {
    return new FormatSpan(
        formattingByStr[json.style],
        json.start,
        json.length,
    );
}

export function formatSpansFromJson(json: any[]): FormatSpan[] {
    return json.map(formatSpanFromJson);
}

export class JsonParser {

    static section(json: any, canHaveTables: boolean = true): Section {
        const section = new Section(-1);
        section.canHaveTables = canHaveTables;
        section.level = json.level;
        section.parts = (json.contents || json.parts).map(JsonParser.thing);
        return section;
    }

    static text(json: any): StringPart {
        const part = new StringPart(json.text);
        part.formatting = formatSpansFromJson(json.spans);
        return part;
    }

    static stringPart(json: any): StringPart {
        const part = new StringPart(json.str);
        part.formatting = json.formatting;
        return part;
    }

    static table(json: any): TablePart {
        const part = new TablePart();
        part.headers = json.headers.map(row =>
            row.map(h => JsonParser.thing(h)),
        );
        return part;
    }

    /** when you're not sure what it is */
    static thing(json: any) {
        if (typeof(json) === 'string') {
            return new StringPart(json);
        }

        switch (json.type) {
        case 'section':
            return JsonParser.section(json);
        case 'text':
            return JsonParser.text(json);

        case 'table':
            return JsonParser.table(json);

        case 2:
            return JsonParser.stringPart(json);

        default:
            throw new Error(`Unhandled JSON type ${json.type}`);
        }
    }
}

export function parseJsonSections(
    text: string,
    canHaveTables: boolean = true,
): Section[] {
    return text.split('\n')
        .filter(t => t.length)
        .map(t => JSON.parse(t))
        .map(json => JsonParser.section(json, canHaveTables));
}

async function resolveFileData(dataFileName: string): Promise<Buffer> {
    let root = process.cwd();
    while (root.includes('/test')) {
        root = path.dirname(root);
    }

    return fs.readFile(`${root}/test/data/${dataFileName}`);
}

export async function loadJsonSections(
    dataFileName: string,
    canHaveTables: boolean = true,
): Promise<Section[]> {
    const data = await resolveFileData(dataFileName);
    return parseJsonSections(data.toString(), canHaveTables);
}

export async function loadTextItems(
    dataFileName: string,
): Promise<ITextItem[]> {
    const data = await resolveFileData(dataFileName);
    return data.toString().split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line))
        .map(textItem);
}

export function postProcessSections(input: Section[]): Section[] {
    const parser = new Parser();

    // Mock the DepthTracker so it returns the actual heights;
    // tslint:disable-next-line
    const headerLevels: DepthTracker = parser['headerLevels'];
    headerLevels.pickLevelFor = (height) => height;

    for (const s of input) {
        s.headerLevelValue = s.level;
    }

    // tslint:disable-next-line
    parser['sections'] = input;
    parser.postProcess();

    // tslint:disable-next-line
    return parser['sections'];
}
