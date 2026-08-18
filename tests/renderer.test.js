"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPlugin } = require("./load-plugin.js");

const { source } = loadPlugin();

test("results stay top-aligned", () => {
	assert.match(source, /justify-content: flex-start/);
	assert.match(source, /position: relative !important/);
	assert.match(source, /transform: none !important/);
	assert.doesNotMatch(source, /const row = el\("div", `\$\{NS\}-row \$\{this\.native\.row/);
});

test("distributed source contains no implementation comments", () => {
	const body = source.slice(source.indexOf("*/") + 2);
	assert.doesNotMatch(body, /^\s*\/\//m);
	assert.doesNotMatch(body, /\/\*[^*]*\*\//);
});

test("old names and prefixes are gone", () => {
	assert.doesNotMatch(source, /UserGlobalSearch|GlobalUserSearch|ugs2/);
	assert.match(source, /@name AmpSearch/);
	assert.match(source, /const NS = "amps"/);
});
