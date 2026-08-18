"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPlugin } = require("./load-plugin.js");

const { Plugin, source } = loadPlugin();

test("plugin metadata and constructor", () => {
	assert.equal(Plugin.name, "AmpSearch");
	assert.match(source, /@version 1\.0\.22/);
	assert.match(source, /github\.com\/florzzzbd\/AmpSearch/);
	const instance = new Plugin();
	assert.equal(instance.settings.maxUserResults, 10);
});

test("console messages are English", () => {
	const logLines = source.split("\n").filter((line) => /(?:console\.|\blog\()/.test(line));
	assert.equal(logLines.some((line) => /[А-Яа-яЁё]/.test(line)), false);
});
