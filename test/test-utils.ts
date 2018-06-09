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

const formattingByStr = {
    b: Formatting.Bold,
    bi: Formatting.BoldItalic,
    i: Formatting.Italic,
};

export function parsePage(items: any[]): Section[] {
    const parser = new Parser();
    parser.processPage(items.map(raw => textItem(raw)));
    parser.postProcess();

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
    section.parts.should.have.lengthOf(1);

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

    static section(json: any): Section {
        const section = new Section(-1);
        section.level = json.level;
        section.parts = json.contents.map(JsonParser.thing);
        return section;
    }

    static text(json: any): StringPart {
        const part = new StringPart(json.text);
        part.formatting = formatSpansFromJson(json.spans);
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

        default:
            throw new Error(`Unhandled JSON type ${json.type}`);
        }
    }
}

export function parseJsonSections(text: string): Section[] {
    return text.split('\n')
        .filter(t => t.length)
        .map(t => JSON.parse(t))
        .map(JsonParser.section);
}

export async function loadJsonSections(dataFileName: string): Promise<Section[]> {
    let root = process.cwd();
    while (root.includes('/test')) {
        root = path.dirname(root);
    }

    const data = await fs.readFile(`${root}/test/data/${dataFileName}`);
    return parseJsonSections(data.toString());
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
