#!/usr/bin/env ts-node

import { docopt } from 'docopt';
import { fs } from 'mz';

import { IFormatter } from './src/formatter';
import { IParserConfig, parseFile } from './src/parser';
import { processPdf } from './src/pdf';

export { Parser, parseFile } from './src/parser';
export * from './src/parser/interface';

import { CompositeFormatter } from './src/formatters/composite';
import { DebugFormatter } from './src/formatters/debug';
import { JsonFormatter } from './src/formatters/json';
import { JsonSectionsFormatter } from './src/formatters/json-sections';
import { WishFormatter } from './src/formatters/wish';

const formatterFactories = {
    '--debug': (stream) => new DebugFormatter(stream),
    '--json': (stream) => new JsonFormatter(stream),
    '--json-pretty': (stream) => new JsonFormatter(stream, {
        pretty: true,
    }),
    '--json-sections': (stream) => new JsonSectionsFormatter(stream),
    '--wish': (stream) => new WishFormatter(stream),
};

function streamForDestination(destination: string): NodeJS.WritableStream {
    return (destination === '-' || destination === '')
        ? process.stdout
        : fs.createWriteStream(destination);
}

function createFormatter(
    key: string,
    destination: string,
): IFormatter {
    const stream = streamForDestination(destination);
    return formatterFactories[key](stream);
}

async function dumpRawTo(srd: string, stream: NodeJS.WritableStream) {
    const data = await fs.readFile(srd);
    await processPdf(data, (_, content) => {
        for (const textItem of content.items) {
            stream.write(JSON.stringify(textItem.toJson()));
            stream.write('\n');
        }
    });
}

async function main() {
    const version = require('./package.json').version;
    const opts = docopt(`
Usage:
    polymorph <srd.pdf> [options]
    polymorph <srd.pdf> --raw=<file>
    polymorph -h | --help | --version

Options:
    --no-creatures          Disable creature processing; mostly useful for
                            debugging, along with --json-sections format
  Formatters:
    --debug=<file>          Simple output mostly only useful for debugging
    --json=<file>           JSON format
    --json-pretty=<file>    Identical to --json, but prettier
    --json-sections=<file>  Similar to --json, but flat (mostly for tests)
    --raw=<file>            Output a newline-separted list of raw PDF TextItems.
                            Note that if this is provided, no other
                            formatters will run
    --wish=<file>           Formatted for use with the WISH project

Notes:
    A hyphen (-) can be used in place of any <file> to write to
    stdout. It is not recommended to do this for more than one format.
    `.trimRight(), {
        version: `polymorph ${version}`,
    });

    if (opts['--raw']) {
        const stream = streamForDestination(opts['--raw']);
        await dumpRawTo(opts['<srd.pdf>'], stream);
        stream.end();
        return;
    }

    const parserConfig: IParserConfig = {
        processCreatures: !opts['--no-creatures'],
    };

    const sections = await parseFile(opts['<srd.pdf>'], parserConfig);

    // create formatter(s)
    const formatters: IFormatter[] = [];
    for (const key of Object.keys(formatterFactories)) {
        if (opts[key]) {
            formatters.push(createFormatter(key, opts[key]));
        }
    }
    if (!formatters.length) {
        console.error('No output format options specified. Try polymorph -h');
        process.exit(1);
    }

    // composite formatters together
    const formatter: IFormatter = new CompositeFormatter(formatters);

    // process and format
    for (const section of sections) {
        await formatter.format(section);
    }

    // finish up
    formatter.end();
}

if (require.main === module) {
    main().catch((e) => {
        console.error('ERROR!');
        console.error(e);
    });
}
