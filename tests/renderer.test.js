"use strict";

/* ============================================================================
 * Дымовые тесты рендера и панели настроек на DOM-стабе (без jsdom/Discord).
 * Проверяем структуру строк: аватарки, бейджи, подсветка, статус-точка,
 * компактный режим; а также сборку премиум-панели настроек без BdApi
 * (fallback-рендер).
 *
 * ВАЖНО: проверки URL делаются по подстрокам без схемы - литеральные
 * полные URL в файлах тестов заворачиваются конвейером в плейсхолдеры.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
installDom(); // глобалы document/HTMLElement/Node до импорта плагина

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

const baseSettings = { ...I.DEFAULT_SETTINGS };

function makeRenderer(overrides = {}) {
	return new I.RowRenderer({
		settings: { ...baseSettings, ...overrides },
		locale: "ru",
		nativeClasses: { row: "result-native", match: "match-native", note: "note-native" }
	});
}

function friendCandidate() {
	return {
		candidate: {
			user: { id: "123456789012345678", username: "sonya", globalName: "Соня", avatar: "abc123" },
			nicks: [],
			isFriend: true,
			hasDm: true,
			hasGroupDm: false,
			mutualGuilds: [{ id: "9", name: "UNIE Market" }, { id: "10", name: "NullZone" }]
		},
		score: 100
	};
}

test("renderUserRow: аватарка, нативные классы, выбор", () => {
	const r = makeRenderer();
	const row = r.renderUserRow(friendCandidate(), { selected: true, index: 0, query: "сон", status: "online" });
	assert.ok(row._classes.has("ugs2-row"));
	assert.ok(row._classes.has("result-native"), "нативный класс строки добавлен");
	assert.ok(row._classes.has("ugs2-selected"));
	assert.equal(row.getAttribute("role"), "option");
	assert.equal(row.dataset.userId, "123456789012345678");

	const img = row.querySelector(".ugs2-avatar");
	assert.ok(img, "аватарка есть");
	assert.ok(img.src.startsWith("https:"), "src - настоящий URL, не плейсхолдер");
	assert.ok(img.src.includes("cdn.discordapp.com/avatars/123456789012345678/abc123.webp"), `src: ${img.src}`);
	assert.ok(img.src.includes("size=64"));
});

test("renderUserRow: бейджи ДРУГ/СЕРВЕР×2/ЛС, handle, статус-точка, подсветка", () => {
	const r = makeRenderer();
	const row = r.renderUserRow(friendCandidate(), { selected: false, index: 0, query: "сон", status: "idle" });

	const badges = row.querySelectorAll(".ugs2-badge");
	assert.equal(badges.length, 3);
	assert.equal(badges[0].textContent, "ДРУГ");
	assert.equal(badges[1].textContent, "СЕРВЕР ×2");
	assert.equal(badges[2].textContent, "ЛС");

	assert.equal(row.querySelector(".ugs2-handle").textContent, "@sonya");
	assert.ok(row.querySelector(".ugs2-status-idle"), "точка статуса idle");

	const mark = row.querySelector(".ugs2-name mark");
	assert.ok(mark, "подсветка есть");
	assert.equal(mark.textContent, "Сон");

	const ctx = row.querySelector(".ugs2-line2");
	assert.ok(ctx.textContent.includes("Друг"));
	assert.ok(ctx.textContent.includes("2 сервера"));
	assert.ok(ctx._classes.has("note-native"), "нативный класс примечания");
});

test("renderUserRow: компактный режим и отключённые опции", () => {
	const r = makeRenderer({ compactMode: true, showBadges: false, showHandles: false, showStatusDot: false });
	const row = r.renderUserRow(friendCandidate(), { selected: false, index: 0, query: "", status: "online" });
	assert.ok(row._classes.has("ugs2-compact"));
	assert.equal(row.querySelectorAll(".ugs2-badge").length, 0);
	assert.equal(row.querySelector(".ugs2-handle"), null);
	assert.equal(row.querySelector(".ugs2-status"), null);
	assert.equal(row.querySelector(".ugs2-line2"), null, "в компакте нет второй линии");
});

test("renderUserRow: дефолтная аватарка при отсутствии хэша", () => {
	const r = makeRenderer();
	const c = friendCandidate();
	c.candidate.user.avatar = null;
	const row = r.renderUserRow(c, { selected: false, index: 0, query: "", status: "unknown" });
	const img = row.querySelector(".ugs2-avatar");
	assert.ok(img.src.startsWith("https:"));
	assert.ok(/embed\/avatars\/\d\.png$/.test(img.src), `дефолтная аватарка: ${img.src}`);
});

test("renderMessageRow: иконка #/@, подсветка контента, дата", () => {
	const r = makeRenderer();
	const item = {
		id: "999888777666555444",
		channelId: "c1",
		guildId: "g1",
		targetName: "UNIE Market",
		targetKind: "guild",
		content: "залетай в войс, мы тут",
		ts: Date.now(),
		jump: "/channels/g1/c1/999888777666555444"
	};
	const row = r.renderMessageRow(item, { selected: false, index: 0, query: "войс" });
	assert.equal(row.querySelector(".ugs2-msgicon").textContent, "U");
	assert.equal(row.querySelector(".ugs2-name").textContent, "UNIE Market");
	const mark = row.querySelector(".ugs2-line2 mark");
	assert.ok(mark);
	assert.equal(mark.textContent, "войс");
	assert.equal(row.dataset.jump, "/channels/g1/c1/999888777666555444");
});

test("renderHeader/renderEmpty/renderFooter", () => {
	const r = makeRenderer();
	const head = r.renderHeader("Пользователи: «so»", { spinning: true, text: "Ищем: 1/2" });
	assert.ok(head.querySelector(".ugs2-spinner"));
	assert.ok(head.textContent.includes("Пользователи: «so»"));
	const empty = r.renderEmpty("Никого не нашли", "Подсказка");
	assert.ok(empty.textContent.includes("Подсказка"));
	assert.ok(r.renderFooter("Enter - открыть").textContent.includes("Enter"));
});

test("панель настроек собирается без BdApi (fallback-рендер)", () => {
	const plugin = new Plugin(); // BdApi нет → дефолтные настройки, fallback-контролы
	plugin.locale = "ru"; // start() в тестах не вызывается - локаль выставляем вручную
	const panel = plugin.getSettingsPanel();
	assert.ok(panel.querySelector(".ugs2-hero"), "шапка есть");
	assert.equal(panel.querySelector(".ugs2-hero-logo").textContent, "&");
	assert.ok(panel.querySelector(".ugs2-hero-ver").textContent.includes(I.PLUGIN_VERSION));
	const links = panel.querySelectorAll(".ugs2-linkbtn");
	assert.equal(links.length, 2);
	assert.ok(links[0].href.includes("github.com"), `ссылка: ${links[0].href}`);
	assert.ok(links[0].href.startsWith("https:"), "href - настоящий URL, не плейсхолдер");
	/* карточка диагностики и кнопки */
	assert.ok(panel.textContent.includes("Самодиагностика"), "карточка диагностики есть");
	assert.ok(panel.textContent.includes("Запустить самотест"));
	assert.ok(panel.textContent.includes("Скопировать отчёт"));
	/* fallback-контролы: чекбоксы и слайдеры присутствуют */
	assert.ok(panel.querySelectorAll("input").length > 0, "контролы отрисованы");
});

test("настройки: clampInt держит диапазоны", () => {
	assert.equal(I.clampInt(9999, "maxUserResults"), 25);
	assert.equal(I.clampInt(-5, "debounceMs"), 0);
	assert.equal(I.clampInt("мусор", "totalLimit"), I.DEFAULT_SETTINGS.totalLimit);
});

/* --------------------- копирование отчёта диагностики --------------------- */

test("копирование отчёта: DiscordNative с рабочим обратным чтением → ok", async () => {
	let copied = null;
	global.DiscordNative = { clipboard: { copy: (t) => { copied = t; }, read: () => copied } };
	try {
		const plugin = new Plugin();
		plugin.locale = "ru";
		const res = await plugin.diagnostics.copyReport();
		assert.equal(res.ok, true);
		assert.equal(res.via, "DiscordNative");
		assert.ok(copied && copied.includes("\"UserGlobalSearch\""), "отчёт ушёл в буфер обмена");
		assert.ok(copied.includes("\"modules\""), "в отчёте статусы модулей");
		assert.ok(copied.includes("\"checks\""), "в отчёте результаты проверок");
		assert.ok(copied.includes("\"relationships\""), "в отчёте слепок RelationshipStore");
	} finally {
		delete global.DiscordNative;
	}
});
