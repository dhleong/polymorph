polymorph [![Build Status](http://img.shields.io/travis/dhleong/polymorph.svg?style=flat)](https://travis-ci.org/dhleong/polymorph)
=========

*Transform the D&D 5e System Reference Document into a new form*

## What?

Polymorph is a CLI tool to convert the [D&D 5e Systems Reference Document][1] (SRD)
into other, non-PDF formats. Our initial focus will be on JSON.

## Why?

The SRD is a great resource, but it is not straightforward to parse meaningful
data out of a PDF—especially one with as much rich, varied content as the SRD—making
it difficult to embed or rearrange into other projects. The goal of this project
is to tackle this tricky problem and provide [pre-processed versions of the SRD][2]
available to anyone, for any purpose supported under the Open Gaming License.

## How?

The easiest way to make use of this project is to explore [latest release][2].
Output from this program will be uploaded alongside each release, so you can
download it directly and explore the formats. Each release will also have information
on what has changed in the formats.

If you need to run this project yourself for whatever reason, you'll need to know
how to use [NodeJS][3] and probably have some basic understanding of [Typescript][4].
This project is not (yet?) published on NPM, but you should be able to just clone it
and run:

    npm install

in the project root directory. That should get all the dependencies set up, though
you may also want to install `ts-node` globally (`npm i -g ts-node`) for running it.

[1]: http://dnd.wizards.com/articles/features/systems-reference-document-srd
[2]: https://github.com/dhleong/polymorph/releases/latest
[3]: https://nodejs.org/en/
[4]: https://www.typescriptlang.org/
