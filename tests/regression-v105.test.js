"use strict";

/* v1.0.5 — точная регрессия по живым скриншотам пользователя. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { installDom } = require("./dom-stub.js");
const { document } = installDom();
const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

function nestedSwitcher() {
	const root = document.createElement("div");
	root.className = "quickswitcher-real";
	const inputWrap = document.createElement("div");
	inputWrap.className = "inputContainer-real";
	const input = document.createElement("input");
	inputWrap.appendChild(input);
	root.appendChild(inputWrap);

	const nativeResults = document.createElement("div");
	nativeResults.className = "resultsContainer-real";
	const header = document.createElement("div");
	header.className = "header-real";
	header.textContent = "ГЛОБАЛЬНЫЙ ПОИСК ПО СООБЩЕНИЯМ";
	const scroller = document.createElement("div");
	scroller.className = "resultScroller-real scroller-real";
	nativeResults.appendChild(header);
	nativeResults.appendChild(scroller);
	root.appendChild(nativeResults);

	const footer = document.createElement("div");
	footer.className = "footer-real";
	const protip = document.createElement("div");
	protip.className = "protip-real";
	for (const sym of ["@", "#", "!", "*", "$"]) {
		const s = document.createElement("span"); s.textContent = sym; protip.appendChild(s);
	}
	footer.appendChild(protip);
	root.appendChild(footer);
	document.body.appendChild(root);
	return { root, input, inputWrap, nativeResults, header, scroller, footer, protip };
}

function fakePlugin() {
	return {
		settings: { ...I.DEFAULT_SETTINGS }, locale: "ru", calls: [],
		t(key, vars) { return I.translate(this.locale, key, vars); },
		dispatchQuery(p) { this.calls.push(p); },
		requestMessagesMode() {}, activateItem() {}
	};
}

function renderRows(integ, plugin, count = 2) {
	const renderer = new I.RowRenderer({ settings: plugin.settings, locale: "ru", nativeClasses: {} });
	const rows = [];
	for (let n = 0; n < count; n++) rows.push(renderer.renderUserRow(
		{ candidate: { user: { id: String(n), username: "user" + n, globalName: "User " + n }, nicks: [], isFriend: n === 0, hasDm: false, mutualGuilds: [{ id: "g", name: "Guild" }] }, score: 1 },
		{ selected: n === 0, index: n, query: "", status: "online" }
	));
	integ.render({ header: renderer.renderHeader("Глобальный поиск по сообщениям"), rows, footer: renderer.renderFooter("Enter — сообщения") });
}

test("реальный nested DOM: хост top-level перед footer, а не внутри resultScroller", () => {
	const { root, input, nativeResults, scroller, footer } = nestedSwitcher();
	const plugin = fakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&";
	integ.evaluate();
	renderRows(integ, plugin, 3);

	assert.equal(integ.host.parentNode, root, "хост смонтирован в корень");
	assert.equal(integ.host.nextSibling, footer, "хост стоит прямо перед подсказкой");
	assert.equal(scroller.querySelector(".ugs2-host"), null, "в resultScroller хоста нет");
	assert.ok(nativeResults._classes.has("ugs2-native-hidden"), "нативная выдача скрыта точечно");
	assert.ok(!integ.host._classes.has("ugs2-native-hidden"), "наш хост не скрыт");
	assert.equal(integ.host.querySelectorAll(".ugs2-row").length, 3);
	assert.ok(integ.host.textContent.includes("Глобальный поиск по сообщениям"));

	integ.detach(); root.remove();
});

test("fallback с nested protip не передаёт чужого ребёнка в root.insertBefore", () => {
	const root = document.createElement("div"); root.className = "quickswitcher-onewrap";
	const wrap = document.createElement("div"); root.appendChild(wrap);
	const input = document.createElement("input"); wrap.appendChild(input);
	const protip = document.createElement("div"); protip.className = "protip-nested"; wrap.appendChild(protip);
	document.body.appendChild(root);
	const integ = new I.SwitcherIntegration(fakePlugin());
	integ.attach(root); input.value = "&"; integ.evaluate();
	assert.equal(integ.host.parentNode, wrap);
	assert.equal(integ.host.nextSibling, protip);
	integ.detach(); root.remove();
});

test("CSS: нет широкого result-селектора; окно и хост имеют высоту; scrollbar скрыт", () => {
	const css = I.CSS_TEXT;
	assert.ok(!css.includes('[class*="result"]:not'), "опасный селектор удалён");
	assert.ok(css.includes("min-height: 405px"), "окно раскрывается сразу");
	assert.ok(css.includes("min-height: 260px"), "область выдачи существует даже при нуле строк");
	assert.ok(css.includes("scrollbar-width: none"));
	assert.ok(css.includes(".ugs2-native-hidden"));
});

test("REST: живая форма object{req,xhr,text,statusCode,...} разбирается из text", async () => {
	const rest = { get: async () => ({
		req: {}, xhr: {}, text: '{"id":"42","username":"tester"}',
		statusText: "OK", statusCode: 200, status: 200, statusType: 2, info: {}
	}) };
	const body = await I.restGetCompat(rest, "/users/@me", {});
	assert.equal(body.id, "42");
	assert.equal(body.username, "tester");
});

test("REST: xhr.responseText тоже разбирается; HTTP 403 не повторяется другой сигнатурой", async () => {
	let calls = 0;
	const ok = { get: async () => ({ statusCode: 200, xhr: { responseText: '{"total_results":1,"messages":[]}' } }) };
	assert.equal((await I.restGetCompat(ok, "/x", {})).total_results, 1);
	const denied = { get: async () => { calls++; return { statusCode: 403, text: '{"message":"forbidden"}' }; } };
	await assert.rejects(() => I.restGetCompat(denied, "/x", {}), (e) => e.status === 403 && e.body.message === "forbidden");
	assert.equal(calls, 1, "HTTP-ответ не повторяется как другая сигнатура");
});

test("RelationshipStore: актуальный getFriendIDs с заглавным D", () => {
	const entry = I.ModuleRegistry.entries.get("relationship");
	const saved = { mod: entry.mod, strategy: entry.strategy };
	entry.mod = { getFriendIDs: () => ["10", "20"] }; entry.strategy = "test";
	try { assert.deepEqual([...I.DataService.friendIds()], ["10", "20"]); }
	finally { entry.mod = saved.mod; entry.strategy = saved.strategy; }
});

test("UserStore.getUsers — резерв для &username при пустых друзьях/серверах", () => {
	const userEntry = I.ModuleRegistry.entries.get("user");
	const saved = { mod: userEntry.mod, strategy: userEntry.strategy };
	userEntry.mod = {
		getCurrentUser: () => ({ id: "me" }),
		getUsers: () => ({ me: { id: "me", username: "me" }, u1: { id: "u1", username: "soloma_0", globalName: "so" } })
	};
	userEntry.strategy = "test";
	try {
		const cached = I.DataService.cachedUsers();
		assert.equal(cached.length, 1);
		const candidates = I.buildCandidates({ cachedUsers: cached });
		const found = I.searchUsers("soloma_0", candidates, { translitEnabled: true, friendsFirst: true, limit: 10 });
		assert.equal(found.length, 1);
		assert.equal(found[0].candidate.user.id, "u1");
	} finally { userEntry.mod = saved.mod; userEntry.strategy = saved.strategy; }
});
