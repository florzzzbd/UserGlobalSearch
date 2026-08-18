"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPlugin } = require("./load-plugin.js");

const { I } = loadPlugin();

test("query modes", () => {
	assert.equal(I.parseAmpQuery("&").mode, "browse");
	assert.equal(I.parseAmpQuery("&sonya").mode, "pick");
	assert.equal(I.parseAmpQuery("&sonya ").mode, "messages");
	assert.equal(I.parseAmpQuery("&sonya hello").messageQuery, "hello");
});

test("normalization and transliteration", () => {
	assert.equal(I.normalize("  Ёлка  Палка "), "елка палка");
	assert.equal(I.translitRuToEn("соня"), "sonya");
	assert.equal(I.translitEnToRu("sonya"), "соня");
	assert.deepEqual(Array.from(I.queryVariants("соня", true)).sort(), ["sonya", "соня"].sort());
});

test("user ranking", () => {
	const users = I.buildCandidates({
		cachedUsers: [],
		friends: [{ id: "1", username: "sonya", globalName: "Соня" }],
		dmUsers: [{ user: { id: "2", username: "sonya2", globalName: "Sonya" }, isGroup: false }],
		guildMembers: []
	});
	const result = I.searchUsers("sonya", users, { translitEnabled: true, friendsFirst: true, limit: 10 });
	assert.equal(result.length, 2);
	assert.equal(result[0].candidate.user.id, "1");
});

test("plural and highlight ranges", () => {
	assert.equal(I.plural("ru", 1, ["сервер", "сервера", "серверов"]), "сервер");
	assert.equal(I.plural("ru", 5, ["сервер", "сервера", "серверов"]), "серверов");
	assert.deepEqual(Array.from(I.highlightRanges("Foo Bar", "bar"), (range) => Array.from(range)), [[4, 7]]);
});
