#!/usr/bin/env ts-node

import { docopt } from 'docopt';
import { fs } from 'mz';

import { IFormatter } from './src/formatter';
import { IParserConfig, parseFile } from './src/parser';
export { Parser, parseFile } from './src/parser';
export * from './src/parser/interface';

import { CompositeFormatter } from './src/formatters/composite';
import { DebugFormatter } from './src/formatters/debug';
import { JsonFormatter } from './src/formatters/json';
import { JsonSectionsFormatter } from './src/formatters/json-sections';

const formatterFactories = {
    '--debug': (stream) => new DebugFormatter(stream),
    '--json': (stream) => new JsonFormatter(stream),
    '--json-pretty': (stream) => new JsonFormatter(stream, {
        pretty: true,
    }),
    '--json-sections': (stream) => new JsonSectionsFormatter(stream),
};

function createFormatter(
    key: string,
    destination: string,
): IFormatter {
    const stream = (destination === '-' || destination === '')
        ? process.stdout
        : fs.createWriteStream(destination);
    return formatterFactories[key](stream);
}

async function main() {
    const version = require('./package.json').version;
    const opts = docopt(`
Usage:
    polymorph <srd.pdf> [options]
    polymorph -h | --help | --version

Options:
    --no-creatures          Disable creature processing; mostly useful for
                            debugging, along with --json-sections format
  Formatters:
    --debug=<file>          Simple output mostly only useful for debugging
    --json=<file>           JSON format
    --json-pretty=<file>    Identical to --json, but prettier
    --json-sections=<file>  Similar to --json, but flat (mostly for tests)

Notes:
    A hyphen (-) can be used in place of any <file> to write to
    stdout. It is not recommended to do this for more than one format.
    `.trimRight(), {
        version: `polymorph ${version}`,
    });

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
