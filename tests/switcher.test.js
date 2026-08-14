"use strict";

/* ============================================================================
 * Тесты интеграции с Quick Switcher на DOM-стабе:
 *  • привязка к окну и добавление «&» в нативную подсказку;
 *  • активация режима по вводу «&», деактивация на обычном вводе;
 *  • наш хост живёт ВНУТРИ нативного скроллера (не оверлей);
 *  • клавиатура: стрелки двигают выбор циклически, Tab/Enter уходят в плагин.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
const { document } = installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

/** Сборка фейкового окна быстрого поиска, похожего на нативное. */
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

function keydown(input, key) {
	const ev = {
		type: "keydown",
		key,
		preventDefault() { this.defaultPrevented = true; },
		stopPropagation() { this.stopped = true; },
		defaultPrevented: false,
		stopped: false
	};
	input.dispatchEvent(ev);
	return ev;
}

test("attach: «&» добавляется в подсказку рядом с @ # ! * $", () => {
	const { root, protip } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);

	const amp = protip.querySelector(".ugs2-protip-amp");
	assert.ok(amp, "символ & вставлен");
	assert.equal(amp.textContent, "&");
	assert.equal(amp.title, "& - глобальный поиск пользователей");
	/* повторный attach не дублирует */
	integ.patchProtip(root);
	assert.equal(protip.querySelectorAll(".ugs2-protip-amp").length, 1);
	integ.detach();
	root.remove();
});

test("evaluate: «&» активирует режим, обычный ввод - деактивирует", () => {
	const { root, input, scroller } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);

	input.value = "&so";
	integ.evaluate();
	assert.equal(plugin.calls.at(-1).mode, "pick");
	assert.equal(plugin.calls.at(-1).userQuery, "so");
	assert.equal(root.getAttribute("data-ugs2-active"), "1");
	assert.ok(root.querySelector(".ugs2-host"), "хост смонтирован top-level вне нативного скроллера");
	assert.equal(scroller.querySelector(".ugs2-host"), null, "в нативном скроллере хоста нет");

	input.value = "обычный запрос";
	integ.evaluate();
	assert.equal(root.getAttribute("data-ugs2-active"), null);
	assert.equal(root.querySelector(".ugs2-host"), null, "хост убран после деактивации");

	integ.detach();
	root.remove();
});

test("render: строки рисуются в хосте, выбор подсвечивается", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();

	const renderer = new I.RowRenderer({ settings: plugin.settings, locale: "ru", nativeClasses: integ.nativeClasses });
	const mk = (i) => renderer.renderUserRow(
		{ candidate: { user: { id: String(i), username: "u" + i, globalName: "U" + i }, nicks: [], isFriend: false, hasDm: false, mutualGuilds: [] }, score: 1 },
		{ selected: false, index: i, query: "", status: "online" }
	);
	integ.render({ header: renderer.renderHeader("Все пользователи"), rows: [mk(0), mk(1), mk(2)], footer: renderer.renderFooter("hint") });
	assert.equal(integ.itemCount, 3);

	integ.selected = 1;
	integ.updateSelectionDom();
	const rows = integ.host.querySelectorAll(".ugs2-row");
	assert.ok(rows[1]._classes.has("ugs2-selected"));
	assert.ok(!rows[0]._classes.has("ugs2-selected"));

	integ.detach();
	root.remove();
});

test("клавиатура: стрелки цикличны, Enter/Tab уходят в плагин, остальное - Discord", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();
	integ.itemCount = 3;
	integ.selected = 0;

	keydown(input, "ArrowDown");
	assert.equal(integ.selected, 1);
	keydown(input, "ArrowUp");
	assert.equal(integ.selected, 0);
	keydown(input, "ArrowUp"); // цикл вверх → последняя
	assert.equal(integ.selected, 2);

	const enter = keydown(input, "Enter");
	assert.ok(enter.defaultPrevented, "Enter перехвачен в нашем режиме");
	assert.deepEqual(plugin.activated, [2]);

	const tab = keydown(input, "Tab");
	assert.ok(tab.defaultPrevented);
	assert.equal(plugin.tabCalled, 1);

	const esc = keydown(input, "Escape");
	assert.equal(esc.defaultPrevented, false, "Esc не перехватывается - нативное закрытие");

	/* В неактивном режиме стрелки НЕ перехватываются */
	integ.deactivate();
	const down = keydown(input, "ArrowDown");
	assert.equal(down.defaultPrevented, false);

	integ.detach();
	root.remove();
});

test("setInputValue: значение + событие input доходят до плагина", () => {
	const { root, input } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	integ.setInputValue("&sonya ");
	assert.equal(input.value, "&sonya ");
	assert.equal(plugin.calls.at(-1).mode, "messages");
	assert.equal(plugin.calls.at(-1).allMessages, true);
	integ.detach();
	root.remove();
});

/* ------------------- восстановление после перерисовки Discord ------------- */

test("хост восстанавливается после того, как React снёс чужой узел", () => {
	const { root, input, scroller } = makeSwitcherDom();
	const plugin = makeFakePlugin();
	const integ = new I.SwitcherIntegration(plugin);
	integ.attach(root);
	input.value = "&a";
	integ.evaluate();

	const renderer = new I.RowRenderer({ settings: plugin.settings, locale: "ru", nativeClasses: integ.nativeClasses });
	const mk = (i) => renderer.renderUserRow(
		{ candidate: { user: { id: String(i), username: "u" + i, globalName: "U" + i }, nicks: [], isFriend: false, hasDm: false, mutualGuilds: [] }, score: 1 },
		{ selected: false, index: i, query: "", status: "online" }
	);
	integ.render({ header: renderer.renderHeader("Все пользователи"), rows: [mk(0), mk(1)], footer: null });
	assert.ok(root.querySelector(".ugs2-host"));
	assert.equal(root.querySelectorAll(".ugs2-row").length, 2);

	/* React сносит чужой узел при своей перерисовке - симулируем */
	integ.host.remove();
	assert.equal(root.querySelector(".ugs2-host"), null);

	/* Наблюдатель замечает пропажу и мгновенно восстанавливает последний вид */
	integ.handleMutations([]);
	const host = root.querySelector(".ugs2-host");
	assert.ok(host, "хост восстановлен");
	assert.equal(host.querySelectorAll(".ugs2-row").length, 2, "строки на месте");

	integ.detach();
	root.remove();
});
