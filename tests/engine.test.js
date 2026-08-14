"use strict";

/* ============================================================================
 * Автотесты чистого движка плагина (node --test).
 * Здесь нет DOM и нет Discord: проверяются разбор запроса, транслит,
 * скоринг, ранжирование, дедупликация, бейджи, плюрализация и транспорт
 * (через поддельный REST-модуль).
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

/* ------------------------------ parseAmpQuery ----------------------------- */

test("parseAmpQuery: пустой запрос → browse", () => {
	assert.equal(I.parseAmpQuery("&").mode, "browse");
	assert.equal(I.parseAmpQuery("").mode, "browse");
});

test("parseAmpQuery: один ник → pick", () => {
	const r = I.parseAmpQuery("&sonya");
	assert.equal(r.mode, "pick");
	assert.equal(r.userQuery, "sonya");
});

test("parseAmpQuery: ник + текст → messages", () => {
	const r = I.parseAmpQuery("&sonya привет как дела");
	assert.equal(r.mode, "messages");
	assert.equal(r.userQuery, "sonya");
	assert.equal(r.messageQuery, "привет как дела");
	assert.equal(r.allMessages, false);
});

test("parseAmpQuery: ник + пробел → messages (все сообщения)", () => {
	const r = I.parseAmpQuery("&sonya ");
	assert.equal(r.mode, "messages");
	assert.equal(r.messageQuery, "");
	assert.equal(r.allMessages, true);
});

test("parseAmpQuery: «demo» - обычный запрос (демо-режим удалён в v1.0.3)", () => {
	const r = I.parseAmpQuery("&demo");
	assert.equal(r.mode, "pick");
	assert.equal(r.userQuery, "demo");
});

/* -------------------------------- normalize ------------------------------- */

test("normalize: регистр, ё, пробелы", () => {
	assert.equal(I.normalize("  СоНя  "), "соня");
	assert.equal(I.normalize("Ёлка"), "елка");
	assert.equal(I.normalize("a   b"), "a b");
	assert.equal(I.normalize(null), "");
});

/* ------------------------------- транслит --------------------------------- */

test("translitRuToEn: «соня» → sonya", () => {
	assert.equal(I.translitRuToEn("соня"), "sonya");
	assert.equal(I.translitRuToEn("щука"), "schuka");
	assert.equal(I.translitRuToEn("жёлтый"), "zheltyy"); // ж→zh ё→e л→l т→t ы→y й→y
});

test("translitEnToRu: sonya → «соня», диграфы", () => {
	assert.equal(I.translitEnToRu("sonya"), "соня");
	assert.equal(I.translitEnToRu("sharik"), "шарик");
});

test("queryVariants: двунаправленный транслит", () => {
	const fromRu = I.queryVariants("сОнЯ", true);
	assert.ok(fromRu.includes("соня"));
	assert.ok(fromRu.includes("sonya"));
	const fromEn = I.queryVariants("Sonya", true);
	assert.ok(fromEn.includes("sonya"));
	assert.ok(fromEn.includes("соня"));
	const off = I.queryVariants("соня", false);
	assert.deepEqual(off, ["соня"]);
});

/* -------------------------------- скоринг --------------------------------- */

test("scoreField: точное > префикс > подстрока; subsequence НЕ матчит (v1.0.3)", () => {
	const q = ["son"];
	const exact = I.scoreField(["sonya"], "sonya").score;
	const prefix = I.scoreField(q, "sonya").score;
	const sub = I.scoreField(["ony"], "sonya").score;
	const seq = I.scoreField(["sna"], "sonya").score; // s..n...a по порядку - больше не совпадение
	assert.ok(exact > prefix, "exact > prefix");
	assert.ok(prefix > sub, "prefix > substring");
	assert.ok(sub > 0, "substring > 0");
	assert.equal(seq, 0, "subsequence-only не даёт очков - рандом не матчится");
	assert.equal(I.scoreField(["zzz"], "sonya").score, 0);
	/* сама функция остаётся доступной и корректной */
	assert.ok(I.subsequenceScore("sna", "sonya") > 0);
});

test("scoreField: акроним (sb → Sonya Blade)", () => {
	assert.ok(I.scoreField(["sb"], "Sonya Blade").score > 0);
});

test("searchUsers: транслит находит «Соня» по латинскому запросу", () => {
	const candidates = I.buildCandidates({
		friends: [{ id: "1", username: "sonya", globalName: "Соня" }],
		dmUsers: [],
		guildMembers: []
	});
	const res = I.searchUsers("sonya", candidates, { translitEnabled: true, friendsFirst: true, limit: 10 });
	assert.equal(res.length, 1);
	assert.equal(String(res[0].candidate.user.id), "1");
});

test("searchUsers: друзья выше при равной базе", () => {
	const candidates = I.buildCandidates({
		friends: [{ id: "1", username: "sonya", globalName: "Sonya" }],
		dmUsers: [],
		guildMembers: [{ user: { id: "2", username: "sonya2", globalName: "Sonya" }, guildId: "g", guildName: "G", nick: null }]
	});
	const res = I.searchUsers("sonya", candidates, { translitEnabled: false, friendsFirst: true, limit: 10 });
	assert.equal(String(res[0].candidate.user.id), "1"); // друг +25 → выше
});

test("searchUsers: лимит и пустой запрос (browse)", () => {
	const mk = (i) => ({ id: String(i), username: "u" + i, globalName: "U" + i });
	const candidates = I.buildCandidates({ friends: [1, 2, 3, 4, 5].map(mk), dmUsers: [], guildMembers: [] });
	const res = I.searchUsers("", candidates, { friendsFirst: true, limit: 3 });
	assert.equal(res.length, 3);
});

test("buildCandidates: дедупликация и слияние контекстов", () => {
	const user = { id: "1", username: "sonya", globalName: "Соня" };
	const candidates = I.buildCandidates({
		friends: [user],
		dmUsers: [{ user, isGroup: false }],
		guildMembers: [
			{ user, guildId: "g1", guildName: "One", nick: "Сонька" },
			{ user, guildId: "g2", guildName: "Two", nick: null }
		]
	});
	assert.equal(candidates.length, 1);
	const c = candidates[0];
	assert.equal(c.isFriend, true);
	assert.equal(c.hasDm, true);
	assert.equal(c.mutualGuilds.length, 2);
	assert.deepEqual(c.nicks, ["Сонька"]);
});

test("computeBadges: друг + 2 сервера + ЛС + бот", () => {
	const badges = I.computeBadges({
		user: { id: "1", bot: true },
		isFriend: true,
		hasDm: true,
		mutualGuilds: [{ id: "1" }, { id: "2" }]
	});
	assert.deepEqual(badges.map((b) => b.type), ["friend", "guilds", "dm", "bot"]);
	assert.equal(badges[1].count, 2);
});

test("contextLine: «Друг · 2 сервера · ЛС» (ru)", () => {
	const line = I.contextLine({
		user: { id: "1" },
		isFriend: true,
		hasDm: true,
		hasGroupDm: false,
		mutualGuilds: [{ id: "1", name: "One" }, { id: "2", name: "Two" }]
	}, "ru", { maxMutualGuilds: 3 });
	assert.ok(line.includes("Друг"));
	assert.ok(line.includes("2 сервера"));
	assert.ok(line.includes("ЛС"));
});

test("highlightRanges: координаты совпадения", () => {
	assert.deepEqual(I.highlightRanges("Sonya", "son"), [[0, 3]]);
	assert.deepEqual(I.highlightRanges("Соня", "сон"), [[0, 3]]);
	assert.deepEqual(I.highlightRanges("abc", "z"), []);
	assert.deepEqual(I.highlightRanges("", "x"), []);
});

/* ------------------------------- плюрализация ----------------------------- */

test("plural: ru 1/2/5", () => {
	const forms = ["сервер", "сервера", "серверов"];
	assert.equal(I.plural("ru", 1, forms), "сервер");
	assert.equal(I.plural("ru", 2, forms), "сервера");
	assert.equal(I.plural("ru", 5, forms), "серверов");
	assert.equal(I.plural("ru", 11, forms), "серверов");
	assert.equal(I.plural("ru", 21, forms), "сервер");
});

test("plural: en/ja", () => {
	assert.equal(I.plural("en-US", 1, ["server", "servers"]), "server");
	assert.equal(I.plural("en-US", 2, ["server", "servers"]), "servers");
	assert.equal(I.plural("ja", 5, ["サーバー"]), "サーバー");
});

/* ------------------------------ локализация ------------------------------- */

test("detectLocale: из стора, из DOM, дефолт", () => {
	assert.equal(I.detectLocale({ locale: "ru" }), "ru");
	assert.equal(I.detectLocale({ locale: "en-GB" }), "en-GB"); // британская - свой пакет
	assert.equal(I.detectLocale(null), "en-US");                // без стора и DOM → дефолт
});

test("translate: fallback на en-US при отсутствии ключа", () => {
	assert.equal(I.translate("de", "setMaxUserResults"), "Nutzer in Vorschlägen");
	assert.equal(I.translate("xx", "setMaxUserResults"), "Users in suggestions");
	assert.equal(I.translate("ru", "loading", { done: 1, total: 2, found: 3 }), "Ищем: 1/2 · найдено 3");
	assert.equal(I.translate("ru", "nonexistent-key"), "nonexistent-key");
});

/* ------------------------------- снежинки --------------------------------- */

test("snowflake: сравнение и время", () => {
	assert.ok(I.snowflakeNewer("2000", "1000"));
	assert.ok(!I.snowflakeNewer("1000", "2000"));
	assert.equal(I.snowflakeTime("0"), 1420070400000); // (0>>22)+epoch
	assert.equal(I.snowflakeTime("не-число"), 0);
});

/* -------------------------------- транспорт ------------------------------- */

/** Поддельный REST-модуль Discord: маршрут → функция ответа. */
function fakeRest(routes) {
	const calls = [];
	return {
		calls,
		get: async (arg) => {
			const url = typeof arg === "string" ? arg.split("?")[0] : arg.url;
			calls.push(url);
			const fn = routes[url];
			if (!fn) throw Object.assign(new Error("not found"), { status: 404 });
			return { body: await fn() };
		}
	};
}

test("transport: сбор результатов по нескольким целям, сортировка по свежести", async () => {
	const rest = fakeRest({
		"/guilds/g1/messages/search": () => ({
			total_results: 2,
			messages: [[{ id: "100", channel_id: "c1", content: "старое" }], [{ id: "150", channel_id: "c1", content: "среднее" }]]
		}),
		"/guilds/g2/messages/search": () => ({
			total_results: 1,
			messages: [[{ id: "250", channel_id: "c2", content: "свежее" }]]
		}),
		"/channels/dm1/messages/search": () => ({
			total_results: 1,
			messages: [[{ id: "200", channel_id: "dm1", content: "личка" }]]
		})
	});
	const tr = new I.MessageSearchTransport(rest, () => {});
	assert.ok(tr.available());

	const targets = [
		{ kind: "guild", id: "g1", name: "G1" },
		{ kind: "guild", id: "g2", name: "G2" },
		{ kind: "dm", id: "dm1", name: "DM" }
	];
	let lastBatch = null;
	let summary = null;
	await tr.run(
		targets,
		{ userId: "u1", text: "тест", perTarget: 5, totalLimit: 40, concurrency: 2 },
		(items) => { lastBatch = items; },
		(s) => { summary = s; }
	);
	assert.ok(lastBatch);
	assert.equal(lastBatch.length, 4);
	assert.equal(lastBatch[0].id, "250"); // свежее первым
	assert.equal(lastBatch[0].jump, "/channels/g2/c2/250");
	assert.ok(summary);
	assert.equal(summary.found, 4);
	assert.equal(summary.errors, 0);
	assert.equal(rest.calls.length, 3);
});

test("transport: 403/404 считаются denied, не ошибкой", async () => {
	const rest = fakeRest({
		"/guilds/ok/messages/search": () => ({ total_results: 0, messages: [] })
	});
	const tr = new I.MessageSearchTransport(rest, () => {});
	let summary = null;
	await tr.run(
		[{ kind: "guild", id: "ok", name: "OK" }, { kind: "guild", id: "closed", name: "X" }],
		{ userId: "u", text: "", perTarget: 5, totalLimit: 40, concurrency: 1 },
		() => {},
		(s) => { summary = s; }
	);
	assert.equal(summary.denied, 1);
	assert.equal(summary.errors, 0);
});

test("transport: отмена - onDone не вызывается", async () => {
	const rest = fakeRest({
		"/guilds/g1/messages/search": () => new Promise((r) => setTimeout(() => r({ total_results: 0, messages: [] }), 40))
	});
	const tr = new I.MessageSearchTransport(rest, () => {});
	let doneCalled = false;
	let batchCalled = false;
	const p = tr.run(
		[{ kind: "guild", id: "g1", name: "G1" }],
		{ userId: "u", text: "", perTarget: 5, totalLimit: 40, concurrency: 1 },
		() => { batchCalled = true; },
		() => { doneCalled = true; }
	);
	tr.cancelAll();
	await p;
	assert.equal(doneCalled, false);
	assert.equal(batchCalled, false);
});

test("transport: 429 → один повтор после retry_after", async () => {
	let attempts = 0;
	const rest = fakeRest({
		"/guilds/g1/messages/search": () => {
			attempts++;
			if (attempts === 1) throw Object.assign(new Error("rate"), { status: 429, body: { retry_after: 0 } });
			return { total_results: 1, messages: [[{ id: "300", channel_id: "c", content: "ok" }]] };
		}
	});
	const tr = new I.MessageSearchTransport(rest, () => {});
	const r = await tr.searchTarget({ kind: "guild", id: "g1", name: "G" }, "u", "x", 5);
	assert.equal(r.messages.length, 1);
	assert.equal(attempts, 2);
});

test("transport: fallback на строковую сигнатуру get(url)", async () => {
	const rest = {
		get: async (arg) => {
			if (typeof arg === "object") throw new TypeError("old signature");
			assert.ok(arg.startsWith("/guilds/g9/messages/search?"));
			assert.ok(arg.includes("author_id=u1"));
			return { body: { total_results: 0, messages: [] } };
		}
	};
	const tr = new I.MessageSearchTransport(rest, () => {});
	const r = await tr.searchTarget({ kind: "guild", id: "g9", name: "G" }, "u1", "текст", 5);
	assert.equal(r.messages.length, 0);
});

/* --------------------------------- демо ----------------------------------- */

test("demoCandidates: 7 уникальных пользователей", () => {
	const demo = I.demoCandidates();
	assert.equal(demo.length, 7);
	assert.equal(new Set(demo.map((c) => c.user.id)).size, 7);
	assert.ok(demo.some((c) => c.isFriend));
	assert.ok(demo.some((c) => c.user.bot));
});

/* ----------------------- normalizeRelationships --------------------------- */

test("normalizeRelationships: объект, Map и {type}-форма", () => {
	assert.deepEqual([...I.normalizeRelationships({ a: 1, b: 2, c: 4 })], ["a"]);
	assert.deepEqual([...I.normalizeRelationships(new Map([["u1", 1], ["u2", 3]]))], ["u1"]);
	assert.deepEqual([...I.normalizeRelationships({ x: { type: 1 }, y: { type: 2 } })], ["x"]);
	assert.deepEqual([...I.normalizeRelationships(null)], []);
	assert.deepEqual([...I.normalizeRelationships(undefined)], []);
});

/* ------------------------------ restGetCompat ----------------------------- */

test("restGetCompat: объектная сигнатура приоритетна, строковая - запасная", async () => {
	const objectForm = { get: async (arg) => ({ body: typeof arg === "object" ? { ok: 1 } : { ok: 0 } }) };
	assert.deepEqual(await I.restGetCompat(objectForm, "/users/@me", {}), { ok: 1 });

	const stringForm = {
		get: async (arg) => {
			if (typeof arg === "object") throw new TypeError("old signature");
			return { body: { id: "42", url: arg } };
		}
	};
	const body = await I.restGetCompat(stringForm, "/users/@me", {});
	assert.equal(body.id, "42");
	assert.equal(body.url, "/users/@me"); // без «?» при пустом query

	let seen = null;
	const withQuery = {
		get: async (arg) => {
			if (typeof arg === "object") throw new TypeError("old");
			seen = arg;
			return { body: {} };
		}
	};
	await I.restGetCompat(withQuery, "/guilds/g/messages/search", { author_id: "u1", limit: 5 });
	assert.ok(seen.includes("author_id=u1"));
	assert.ok(seen.includes("limit=5"));
});
