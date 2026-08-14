"use strict";

/* Регрессии v1.0.7 по живому отчёту: HTML вместо API и 60 целей у всех. */
const test = require("node:test");
const assert = require("node:assert/strict");
const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

const UID = "123456789012345678";

function htmlModule() {
	return {
		get: async () => ({ statusCode: 200, text: "<!DOCTYPE html><html><head></head></html>" }),
		post: async () => ({ statusCode: 200, text: "<!DOCTYPE html><html></html>" })
	};
}

function apiModule(capture = {}) {
	return {
		get: async () => ({ body: { id: UID, username: "me" }, statusCode: 200 }),
		post: async (arg) => {
			capture.post = arg;
			return {
				body: {
					tabs: {
						messages: {
							total_results: 12,
							messages: [[
								{ id: "100", channel_id: "dm1", content: "контекст", author: { id: "999999999999999999" } },
								{ id: "200", channel_id: "dm1", content: "нужное", author: { id: UID }, hit: true }
							]]
						}
					}
				},
				statusCode: 200
			};
		}
	};
}

test("v1.0.7: VerifiedRestAPI отбрасывает <!DOCTYPE html> и выбирает настоящий API", async () => {
	const good = apiModule();
	const rest = new I.VerifiedRestAPI(() => [htmlModule(), good]);
	const body = await I.restGetCompat(rest, "/users/@me", {});
	assert.equal(body.id, UID);
	assert.equal(rest.active, good);
	assert.equal(rest.checked, 2);
	assert.match(rest.samples[0], /DOCTYPE|html/i);
});

test("v1.0.7: если все кандидаты отдают HTML — транспорт честно не найден", async () => {
	const rest = new I.VerifiedRestAPI(() => [htmlModule()]);
	await assert.rejects(() => rest.ensure(), /no genuine Discord RestAPI found/);
	assert.ok(rest.samples.some((x) => /DOCTYPE|html/i.test(x)));
});

test("v1.0.7: глобальный DM tab-search — один POST и author_id массивом", async () => {
	const capture = {};
	const rest = new I.VerifiedRestAPI(() => [apiModule(capture)]);
	const tr = new I.MessageSearchTransport(rest, () => {});
	const result = await tr.searchTarget({ kind: "dm-global", id: "@me", name: "ЛС / Группа" }, UID, "слово", 5);
	assert.equal(capture.post.url, "/users/@me/messages/search/tabs");
	assert.deepEqual(capture.post.body.tabs.messages.author_id, [UID]);
	assert.equal(capture.post.body.tabs.messages.content, "слово");
	assert.equal(result.total, 12);
	assert.equal(result.messages.length, 1);
});

test("v1.0.7: из [context, hit] выбирается сообщение нужного автора, не первый контекст", async () => {
	const hit = I.pickSearchHit([
		{ id: "1", author: { id: "999999999999999999" } },
		{ id: "2", author: { id: UID }, hit: true }
	], UID);
	assert.equal(hit.id, "2");
});

test("v1.0.7: 96 серверов не дают 60 целей всем — счётчик зависит от общих серверов", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	plugin.settings.maxTargets = 60;
	const D = I.DataService;
	const saved = { guilds: D.guilds, mutualGuildIds: D.mutualGuildIds };
	try {
		D.guilds = () => Array.from({ length: 96 }, (_, i) => ({ id: `g${i}`, name: `S${i}` }));
		D.mutualGuildIds = () => new Set();
		const none = plugin.buildTargets({ user: { id: UID }, mutualGuilds: [] });
		const three = plugin.buildTargets({
			user: { id: UID },
			mutualGuilds: [{ id: "g1", name: "S1" }, { id: "g2", name: "S2" }, { id: "g3", name: "S3" }]
		});
		assert.equal(none.length, 1, "только глобальные ЛС/группы");
		assert.equal(three.length, 4, "глобальные ЛС/группы + 3 общих сервера");
		assert.notEqual(none.length, 60);
		assert.notEqual(three.length, 60);
	} finally {
		Object.assign(D, saved);
	}
});
