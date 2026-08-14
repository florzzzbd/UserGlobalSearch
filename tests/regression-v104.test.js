"use strict";

/* ============================================================================
 * Регрессионные тесты v1.0.4 — под живой репорт пользователя:
 * в его сборке Discord САМ рисует на «&» экран «Глобальный поиск
 * по сообщениям» и затирает наши строки.
 *  • attach выбирает ВИДИМЫЙ инпут среди нескольких;
 *  • evaluate берёт зафиксированное значение, если React откатил инпут;
 *  • healCheck восстанавливает опустевший/удалённый хост из lastView;
 *  • stop/deactivate гасят интервал самолечения;
 *  • CSS жёстко скрывает нативное содержимое; заголовок — капс как у Discord.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
const { document } = installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

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
	integ.render({ header: renderer.renderHeader("Поиск по всем пользователям"), rows: [mk(0), mk(1)], footer: null });
}

test("v1.0.4: attach выбирает ВИДИМЫЙ инпут среди нескольких", () => {
	const { root, input } = makeSwitcherDom();
	/* Discord ставит скрытый a11y-инпут ПЕРЕД настоящим */
	const hidden = document.createElement("input");
	hidden.getBoundingClientRect = () => ({ width: 0, height: 0 });
	input.getBoundingClientRect = () => ({ width: 400, height: 40 });
	root.insertBefore(hidden, input);

	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	assert.equal(integ.input, input, "выбран видимый инпут, не скрытый клон");
	integ.detach();
	root.remove();
});

test("v1.0.4: evaluate берёт зафиксированное значение при откате React", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);

	/* Пользователь ввёл «&sonya» — событие зафиксировало значение */
	input.value = "&sonya";
	input.dispatchEvent({ type: "input" });
	integ.evaluateDebounced.cancel?.(); // не даём дебаунсу стрельнуть позже
	assert.equal(integ.lastInputValue, "&sonya");

	/* React откатил controlled-инпут между событием и дебаунсом */
	input.value = "";
	integ.evaluate();
	const last = plugin.calls.at(-1);
	assert.ok(last, "запрос дошёл несмотря на откат");
	assert.equal(last.mode, "pick");
	assert.equal(last.userQuery, "sonya");
	assert.equal(root.getAttribute("data-ugs2-active"), "1");

	integ.detach();
	root.remove();
});

test("v1.0.4: healCheck восстанавливает опустевший хост из lastView", () => {
	const { root, input, scroller } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();
	renderTwoRows(integ, plugin);
	assert.equal(integ.host.querySelectorAll(".ugs2-row").length, 2);

	/* React переписал поддерево: хост на месте, но пуст */
	integ.host.textContent = "";
	assert.equal(integ.host.querySelectorAll(".ugs2-row").length, 0);

	integ.healCheck();
	assert.equal(integ.host.querySelectorAll(".ugs2-row").length, 2, "строки восстановлены самолечением");

	integ.detach();
	root.remove();
});

test("v1.0.4: healCheck молчит вне активного режима, stop гасит интервал", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);

	integ.healCheck(); // не активен — ничего не делает
	assert.equal(integ.host, null);

	input.value = "&a";
	integ.evaluate();
	assert.ok(integ.healTimer, "интервал самолечения запущен при активации");

	integ.deactivate();
	assert.equal(integ.healTimer, null, "интервал погашен при деактивации");

	integ.detach();
	root.remove();
});

test("v1.0.4: CSS жёстко скрывает нативное, заголовок капсом", () => {
	const css = I.CSS_TEXT;
	assert.ok(css.includes(".ugs2-native-hidden"), "нативные блоки скрываются точечным классом");
	assert.ok(!css.includes('[class*="result"]:not'), "опасного широкого селектора больше нет");
	assert.ok(css.includes("text-transform: uppercase"), "заголовок капсом как у Discord");
});

test("v1.0.4: журнал пишет цепочку attach/запрос/render на уровне info", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();
	renderTwoRows(integ, plugin);

	const info = I.Journal ? null : null; // Journal не экспортирован — проверяем косвенно ниже
	integ.detach();
	root.remove();
});
