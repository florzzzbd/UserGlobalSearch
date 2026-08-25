"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPlugin } = require("./load-plugin.js");

const { source } = loadPlugin();

test("results live in a scrollable host under the switcher input", () => {
	assert.match(source, /\.\$\{NS\}-host \{/);
	assert.match(source, /display: flex;\s*\n\s*flex-direction: column;/);
	assert.match(source, /overflow-y: auto;/);
	assert.match(source, /max-height: min\(390px, 58vh\)/);
});

test("rows keep their own class even without a native row", () => {
	// раньше класс собирался без фолбэка и в список попадало слово "undefined",
	// поэтому `?? ""` с последующим trim() обязателен в обоих местах сборки строки
	const matches = source.match(/`\$\{NS\}-row \$\{this\.native\.row \?\? ""\}`\.trim\(\)/g) || [];
	assert.ok(matches.length >= 2, `expected guarded row class in >= 2 places, found ${matches.length}`);
	assert.doesNotMatch(source, /`\$\{NS\}-row \$\{this\.native\.row\}`/);
});

test("old names and prefixes are gone", () => {
	assert.doesNotMatch(source, /AmpSearch|NS = "amps"/);
	assert.match(source, /@name UserGlobalSearch/);
	assert.match(source, /const NS = "ugs2"/);
});
