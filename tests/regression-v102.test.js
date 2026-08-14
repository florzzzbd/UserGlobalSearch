"use strict";

/* ============================================================================
 * Регрессионные тесты v1.0.2 — каждый написан под конкретную поломку,
 * найденную живой самодиагностикой у пользователя:
 *  • «&demo ничего не рисует»: Discord на «&»-запросах УБИРАЕТ скроллер из
 *    DOM, а хост вставлялся в оторванный узел и восстанавливался туда же
 *    бесконечно. Теперь родитель пересчитывается на каждый рендер.
 *  • «Скопировать отчёт» врала об успехе: автокопирование подтверждается
 *    обратным чтением, иначе — окно ручного копирования.
 *  • Пробник REST молчал «id=?»: теперь показывает форму ответа.
 *  • «друзей: 0» было гаданием: в отчёт добавлен слепок RelationshipStore.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
const { document } = installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

/** Фейковое окно быстрого поиска, похожее на нативное. */
function makeSwitcherDom() {
	const root = document.createElement("div");
	root.className = "quickswitcher-3c8b1a";
	const input = document.createElement("input");
	root.appendChild(input);
	const scroller = document.createElement("div");
	scroller.className = "scroller-9f2d1c thin-31rlnD";
	root.appendChild(scroller);
	const protip = document.createElement("div");
	protip.className = "protip-1b6a9e";
	for (const sym of ["@", "#", "!", "*", "$"]) {
		const s = document.createElement("span");
		s.textContent = sym;
		protip.appendChild(s);
	}
	root.appendChild(protip);
	document.body.appendChild(root);
	return { root, input, scroller, protip };
}

/** Фейковый плагин-хозяин интеграции. */
function makeFakePlugin() {
	return {
		settings: { ...I.DEFAULT_SETTINGS },
		locale: "ru",
		calls: [],
		tabCalled: 0,
		activated: [],
		t(key, vars) { return I.translate(this.locale, key, vars); },
		dispatchQuery(parsed) { this.calls.push(parsed); },
		requestMessagesMode() { this.tabCalled++; },
		activateItem(idx) { this.activated.push(idx); }
	};
}

function renderTwoRows(integ, plugin) {
	const renderer = new I.RowRenderer({ settings: plugin.settings, locale: "ru", nativeClasses: integ.nativeClasses });
	const mk = (i) => renderer.renderUserRow(
		{ candidate: { user: { id: String(i), username: "u" + i, globalName: "U" + i }, nicks: [], isFriend: false, hasDm: false, mutualGuilds: [] }, score: 1 },
		{ selected: false, index: i, query: "", status: "online" }
	);
	integ.render({ header: renderer.renderHeader("Все пользователи"), rows: [mk(0), mk(1)], footer: null });
}

/* ------------- ГЛАВНЫЙ БАГ: Discord сносит скроллер целиком ------------- */

test("v1.0.2: Discord снёс скроллер — хост встаёт перед подсказкой, строки из lastView", () => {
	const { root, input, scroller, protip } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&demo";
	integ.evaluate();
	renderTwoRows(integ, plugin);
	assert.ok(root.querySelector(".ugs2-host"), "хост сразу top-level");
	assert.equal(scroller.querySelector(".ugs2-host"), null);

	/* Discord не нашёл ничего на «&demo» и УБРАЛ скроллер из DOM целиком —
	   ровно так выглядело окно на скрине пользователя: только инпут и подсказка */
	scroller.remove();
	assert.equal(document.contains(integ.host), true, "хост не зависит от скроллера");

	integ.handleMutations([]);
	const host = integ.host;
	assert.ok(host, "хост пересоздан");
	assert.ok(document.contains(host), "хост в ЖИВОМ документе, не в оторванном скроллере");
	assert.equal(host.parentNode, root, "родитель — корень окна");
	assert.ok(host._classes.has("ugs2-host-standalone"), "включён standalone-режим со своим скроллом");
	assert.ok(host.nextSibling === protip, "хост стоит перед подсказкой — как нативная выдача «@»");
	assert.equal(host.querySelectorAll(".ugs2-row").length, 2, "строки восстановлены из lastView");

	integ.detach();
	root.remove();
});

test("v1.0.5: хост НЕ переезжает в нативный скроллер", () => {
	const { root, input, scroller } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();

	scroller.remove(); // Discord убрал выдачу
	integ.handleMutations([]);
	assert.ok(integ.host._classes.has("ugs2-host-standalone"), "после удаления скроллера — standalone");

	const scroller2 = document.createElement("div"); // Discord вернул скроллер
	scroller2.className = "scroller-new7";
	root.appendChild(scroller2);

	renderTwoRows(integ, plugin);
	assert.equal(integ.host.parentNode, root, "хост остаётся стабильным top-level");
	assert.ok(integ.host._classes.has("ugs2-host-standalone"));
	assert.equal(root.querySelectorAll(".ugs2-row").length, 2);

	integ.detach();
	root.remove();
});

test("v1.0.2: окно без скроллера с самого начала — хост перед подсказкой", () => {
	const root = document.createElement("div");
	root.className = "quickswitcher-bare";
	const input = document.createElement("input");
	root.appendChild(input);
	const protip = document.createElement("div");
	protip.className = "protip-bare";
	root.appendChild(protip);
	document.body.appendChild(root);

	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&demo";
	integ.evaluate();
	renderTwoRows(integ, plugin);

	assert.ok(integ.host, "хост создан даже без скроллера");
	assert.equal(integ.host.parentNode, root);
	assert.ok(integ.host.nextSibling === protip, "позиция — перед подсказкой");
	assert.ok(integ.host._classes.has("ugs2-host-standalone"));

	integ.detach();
	root.remove();
});

test("v1.0.2: render не падает, когда окно уже закрыто", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();
	root.remove(); // окно закрылось между вводом и рендером
	integ.render({ header: null, rows: [], footer: null }); // не должно бросать
	integ.detach();
});

/* ------------- Честное копирование отчёта ------------- */

test("copyReport: DiscordNative врёт (read≠copy) → честный уход в execCommand", async () => {
	global.DiscordNative = { clipboard: { copy: () => {}, read: () => "чужой текст" } };
	try {
		const plugin = new Plugin();
		plugin.locale = "ru";
		const res = await plugin.diagnostics.copyReport();
		/* document.execCommand в стабе возвращает true → успех через execCommand */
		assert.equal(res.ok, true);
		assert.equal(res.via, "execCommand");
	} finally {
		delete global.DiscordNative;
	}
});

test("copyReport: все пути молчат → manual:true + окно с выделенным текстом", async () => {
	global.DiscordNative = { clipboard: { copy: () => {}, read: () => "" } };
	const oldExec = document.execCommand;
	document.execCommand = () => false;
	try {
		const plugin = new Plugin();
		plugin.locale = "ru";
		plugin.diagnostics.lastReport = { marker: "ugs-manual-test" };
		const res = await plugin.diagnostics.copyReport();
		assert.equal(res.ok, false, "честно признаём неудачу");
		assert.equal(res.manual, true, "открыт ручной путь");
		const modal = document.querySelector(".ugs2-copy-modal");
		assert.ok(modal, "окно ручного копирования показано");
		const ta = modal.querySelector("textarea");
		assert.ok(ta && ta.value.includes("ugs-manual-test"), "текст отчёта в поле, выделен для Ctrl+C");
		document.querySelector(".ugs2-copy-overlay").remove(); // убираем за собой
	} finally {
		document.execCommand = oldExec;
		delete global.DiscordNative;
	}
});

/* ------------- Пробник REST: форма ответа вместо «id=?» ------------- */

function withRest(fakeRest, fn) {
	const entry = I.ModuleRegistry.entries.get("rest");
	const saved = { mod: entry.mod, strategy: entry.strategy };
	entry.mod = fakeRest;
	entry.strategy = "test";
	return Promise.resolve()
		.then(fn)
		.finally(() => { entry.mod = saved.mod; entry.strategy = saved.strategy; });
}

test("probeTransport: id на месте → ok; без id — форма; бросок — ошибка", async () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	await withRest({ get: async () => ({ body: { id: "123456789012345678" } }) }, async () => {
		const res = await plugin.diagnostics.probeTransport();
		assert.equal(res.ok, true);
		assert.ok(res.detail.includes("id=123456789012345678"));
	});
	await withRest({ get: async () => ({ body: { statusCode: 200 } }) }, async () => {
		const res = await plugin.diagnostics.probeTransport();
		assert.equal(res.ok, false);
		assert.ok(res.detail.includes("shape:"), "форма ответа видна в detail: " + res.detail);
		assert.ok(res.detail.includes("statusCode"), "ключи ответа перечислены");
	});
	await withRest({ get: async () => { const e = new Error("boom"); e.status = 403; throw e; } }, async () => {
		const res = await plugin.diagnostics.probeTransport();
		assert.equal(res.ok, false);
		assert.ok(res.detail.includes("403"));
	});
});

/* ------------- Слепок RelationshipStore для отчёта ------------- */

function withRelationship(store, fn) {
	const entry = I.ModuleRegistry.entries.get("relationship");
	const saved = { mod: entry.mod, strategy: entry.strategy };
	entry.mod = store;
	entry.strategy = "test";
	try { fn(); } finally { entry.mod = saved.mod; entry.strategy = saved.strategy; }
}

test("relationshipDebug: Map с типами → форма, размер, гистограмма", () => {
	const plugin = new Plugin();
	withRelationship({
		getRelationships: () => new Map([["1", 1], ["2", { type: 1 }], ["3", 2]]),
		getFriendIds: () => ["1", "2"],
		isFriend: () => true
	}, () => {
		const out = plugin.diagnostics.relationshipDebug();
		assert.equal(out.shape, "Map");
		assert.equal(out.size, 3);
		assert.equal(out.typeHistogram["1"], 2, "двое друзей (type=1)");
		assert.equal(out.typeHistogram["2"], 1);
		assert.equal(out.friendIdsLen, 2);
		assert.ok(out.methods.includes("getRelationships"));
		assert.ok(Array.isArray(out.sample) && out.sample.length === 3);
	});
});

test("relationshipDebug: падающий стор не роняет диагностику", () => {
	const plugin = new Plugin();
	withRelationship({
		getRelationships: () => { throw new Error("nope"); }
	}, () => {
		const out = plugin.diagnostics.relationshipDebug();
		assert.equal(out.found, true);
		assert.ok(out.error, "ошибка записана в слепок, а не уронила отчёт");
	});
});

/* ------------- dispatchQuery под защитой ------------- */

test("dispatchQuery: падение режима уходит в журнал, а не наружу", () => {
	const plugin = new Plugin();
	plugin.runUserSearch = () => { throw new Error("boom"); };
	plugin.dispatchQuery({ mode: "browse", userQuery: "", messageQuery: "" }); // не бросает
	assert.equal(plugin.currentParsed.mode, "browse");
});
