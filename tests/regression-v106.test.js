"use strict";

/* ============================================================================
 * Регрессионные тесты v1.0.6 — каждый написан под конкретную поломку,
 * найденную живым репортом пользователя («60/60 · найдено 0» при живой
 * переписке, поиск медленный):
 *  • ЛС и группы срезались лимитом maxTargets, т.к. добавлялись последними —
 *    теперь цели: ЛС → общие серверы → группы → остальные, лимит в конце.
 *  • Мусорный ответ REST тихо считался «нулём результатов» — теперь это
 *    ошибка с описанием формы, видимая в прогрессе и сводке.
 *  • Объектная сигнатура REST могла молча возвращать мусор — теперь один
 *    раз пробуется строковая, рабочая запоминается на весь прогон.
 *  • Скорость: ранний выход при наборе totalLimit, параллельность 4.
 *  • Пробник самотеста делает реальный поисковый запрос, а не только @me.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
const { document } = installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

/** Поддельный REST-модуль Discord: маршрут → функция ответа. */
function fakeRest(routes) {
	const calls = [];
	const call = async (arg) => {
		const url = typeof arg === "string" ? arg.split("?")[0] : arg.url;
		calls.push(arg);
		const fn = routes[url];
		if (!fn) throw Object.assign(new Error("not found"), { status: 404 });
		return { body: await fn(arg) };
	};
	return { calls, get: call, post: call };
}

/* ---------- Мусорный ответ — ошибка с формой, а не тихий ноль ---------- */

test("v1.0.6: ответ без messages/total_results — ошибка с формой, видимая в прогрессе", async () => {
	const rest = fakeRest({ "/guilds/g1/messages/search": () => ({ weird: true }) });
	const tr = new I.MessageSearchTransport(rest, () => {});
	const progress = [];
	let summary = null;
	await tr.run(
		[{ kind: "guild", id: "g1", name: "G1" }],
		{ userId: "u", text: "", perTarget: 5, totalLimit: 40, concurrency: 1 },
		(items, p) => progress.push(p),
		(s) => { summary = s; }
	);
	assert.equal(summary.found, 0);
	assert.equal(summary.errors, 1, "мусор = ошибка, а не ноль");
	assert.ok(summary.errorSamples[0].includes("shape"), "форма ответа описана в сводке");
	assert.equal(progress.at(-1).errors, 1, "счётчик ошибок дошёл до UI-прогресса");
});

/* ---------- Авто-определение строковой сигнатуры при молчаливом мусоре ---------- */

test("v1.0.6: объектная форма молча вернула мусор → строковая, запоминается на прогон", async () => {
	const seen = [];
	const rest = {
		get: async (arg) => {
			seen.push(typeof arg);
			if (typeof arg === "object") return { body: { junk: 1 } }; // молчаливый мусор
			return { body: { total_results: 1, messages: [[{ id: "9", channel_id: "c", content: "ok" }]] } };
		}
	};
	const tr = new I.MessageSearchTransport(rest, () => {});
	const r = await tr.searchTarget({ kind: "guild", id: "g", name: "G" }, "u", "", 5);
	assert.equal(r.messages.length, 1, "строковая форма дала результат");
	assert.equal(tr.form, "string", "рабочая сигнатура запомнена");
	seen.length = 0;
	const r2 = await tr.searchTarget({ kind: "guild", id: "g2", name: "G2" }, "u", "", 5);
	assert.equal(r2.messages.length, 1);
	assert.equal(seen[0], "string", "вторая цель сразу идёт строковой формой — без лишних проб");
});

/* ---------- Ранний выход: достаточно результатов → остальные цели не ищем ---------- */

test("v1.0.6: ранний выход при наборе totalLimit — оставшиеся цели не запрашиваются", async () => {
	const routes = {};
	for (let i = 1; i <= 6; i++) {
		routes[`/guilds/g${i}/messages/search`] = () => ({
			total_results: 2,
			messages: [[{ id: `${i}01`, channel_id: "c", content: "a" }], [{ id: `${i}02`, channel_id: "c", content: "b" }]]
		});
	}
	const rest = fakeRest(routes);
	const tr = new I.MessageSearchTransport(rest, () => {});
	let summary = null;
	await tr.run(
		Array.from({ length: 6 }, (_, i) => ({ kind: "guild", id: `g${i + 1}`, name: `G${i + 1}` })),
		{ userId: "u", text: "", perTarget: 5, totalLimit: 3, concurrency: 1 },
		() => {},
		(s) => { summary = s; }
	);
	assert.equal(summary.found, 3, "итог обрезан до totalLimit");
	assert.ok(rest.calls.length < 6, `ранний выход: запросов ${rest.calls.length} из 6`);
});

/* ---------- v1.0.7: только реальные персональные цели ---------- */

test("v1.0.7: buildTargets — один глобальный ЛС-поиск + только общие серверы", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	const D = I.DataService;
	const saved = {
		guilds: D.guilds,
		mutualGuildIds: D.mutualGuildIds,
		dmChannelId: D.dmChannelId,
		privateChannels: D.privateChannels
	};
	try {
		D.guilds = () => [{ id: "g1", name: "A" }, { id: "g2", name: "B" }, { id: "g3", name: "C" }];
		D.mutualGuildIds = () => new Set(["g3"]);
		D.dmChannelId = () => "dm9";
		D.privateChannels = () => [
			{ id: "gr1", type: 3, recipients: [{ id: "u1" }], name: "Клуб" }, // объектная форма recipients
			{ id: "gr2", type: 3, recipients: ["u1"], name: null },            // строковая форма
			{ id: "gr3", type: 3, recipients: ["someone-else"], name: "X" }   // без пользователя
		];
		const targets = plugin.buildTargets({ user: { id: "u1" }, mutualGuilds: [{ id: "g3", name: "C" }] });
		assert.deepEqual(targets.map((t) => t.id), ["@me", "g3"]);
		assert.equal(targets[0].kind, "dm-global", "все ЛС/группы покрывает одна нативная цель");

		/* Факт с живого отчёта: 96 серверов больше не превращаются в одинаковые 60. */
		D.guilds = () => Array.from({ length: 96 }, (_, i) => ({ id: `big${i}`, name: `S${i}` }));
		D.mutualGuildIds = () => new Set();
		D.privateChannels = () => [];
		plugin.settings.maxTargets = 60;
		const t2 = plugin.buildTargets({ user: { id: "u1" }, mutualGuilds: [] });
		assert.deepEqual(t2.map((t) => t.id), ["@me"], "нет общих серверов → 1 цель, не 60");
	} finally {
		Object.assign(D, saved);
	}
});

/* ---------- Пробник: реальный поисковый запрос, а не только @me ---------- */

function withRest(fake, fn) {
	const entry = I.ModuleRegistry.entries.get("rest");
	const saved = { mod: entry.mod, strategy: entry.strategy };
	entry.mod = fake;
	entry.strategy = "test";
	return Promise.resolve()
		.then(fn)
		.finally(() => { entry.mod = saved.mod; entry.strategy = saved.strategy; });
}

test("v1.0.6: пробник делает реальный поиск и показывает его итог в detail", async () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	const D = I.DataService;
	const savedPC = D.privateChannels;
	D.privateChannels = () => [{ id: "dm1", type: 1, recipients: ["u2"] }];
	try {
		await withRest(fakeRest({
			"/users/@me": () => ({ id: "123456789012345678" }),
			"/users/@me/messages/search/tabs": () => ({
				tabs: { messages: { total_results: 7, messages: [[{ id: "1", channel_id: "dm1", content: "x", author: { id: "123456789012345678" }, hit: true }]] } }
			})
		}), async () => {
			plugin.transport = new I.MessageSearchTransport(I.ModuleRegistry.get("rest"), () => {});
			const res = await plugin.diagnostics.probeTransport();
			assert.equal(res.ok, true);
			assert.ok(res.detail.includes("id=123456789012345678"), res.detail);
			assert.ok(res.detail.includes("global search: OK") && res.detail.includes("total=7"), res.detail);
		});
	} finally {
		D.privateChannels = savedPC;
	}
});
