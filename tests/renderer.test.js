"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
installDom();

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
	assert.ok(row._classes.has("result-native"));
	assert.ok(row._classes.has("ugs2-selected"));
	assert.equal(row.getAttribute("role"), "option");
	assert.equal(row.dataset.userId, "123456789012345678");

	const img = row.querySelector(".ugs2-avatar");
	assert.ok(img);
	assert.ok(img.src.startsWith("https:"));
	assert.ok(img.src.includes("cdn.discordapp.com/avatars/123456789012345678/abc123.webp"));
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
	assert.ok(row.querySelector(".ugs2-status-idle"));

	const mark = row.querySelector(".ugs2-name mark");
	assert.ok(mark);
	assert.equal(mark.textContent, "Сон");

	const ctx = row.querySelector(".ugs2-line2");
	assert.ok(ctx.textContent.includes("Друг"));
	assert.ok(ctx.textContent.includes("2 сервера"));
	assert.ok(ctx._classes.has("note-native"));
});

test("renderUserRow: компактный режим и отключённые опции", () => {
	const r = makeRenderer({ compactMode: true, showBadges: false, showHandles: false, showStatusDot: false });
	const row = r.renderUserRow(friendCandidate(), { selected: false, index: 0, query: "", status: "online" });
	assert.ok(row._classes.has("ugs2-compact"));
	assert.equal(row.querySelectorAll(".ugs2-badge").length, 0);
	assert.equal(row.querySelector(".ugs2-handle"), null);
	assert.equal(row.querySelector(".ugs2-status"), null);
	assert.equal(row.querySelector(".ugs2-line2"), null);
});

test("renderUserRow: дефолтная аватарка при отсутствии хэша", () => {
	const r = makeRenderer();
	const c = friendCandidate();
	c.candidate.user.avatar = null;
	const row = r.renderUserRow(c, { selected: false, index: 0, query: "", status: "unknown" });
	const img = row.querySelector(".ugs2-avatar");
	assert.ok(img.src.startsWith("https:"));
	assert.ok(/embed\/avatars\/\d\.png$/.test(img.src));
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
	const plugin = new Plugin();
	plugin.locale = "ru";
	const panel = plugin.getSettingsPanel();
	assert.ok(panel.querySelector(".ugs2-hero"));
	assert.equal(panel.querySelector(".ugs2-hero-logo").textContent, "&");
	assert.ok(panel.querySelector(".ugs2-hero-ver").textContent.includes(I.PLUGIN_VERSION));
	const links = panel.querySelectorAll(".ugs2-linkbtn");
	assert.equal(links.length, 2);
	assert.ok(links[0].href.includes("github.com"));
	assert.ok(links[0].href.startsWith("https:"));
	assert.ok(panel.textContent.includes("Самодиагностика"));
	assert.ok(panel.textContent.includes("Запустить самотест"));
	assert.ok(panel.textContent.includes("Скопировать отчёт"));
	assert.ok(panel.querySelectorAll("input").length > 0);
});

test("настройки: clampInt держит диапазоны", () => {
	assert.equal(I.clampInt(9999, "maxUserResults"), 25);
	assert.equal(I.clampInt(-5, "debounceMs"), 0);
	assert.equal(I.clampInt("мусор", "totalLimit"), I.DEFAULT_SETTINGS.totalLimit);
});

test("копирование отчёта: DiscordNative с рабочим обратным чтением → ok", async () => {
	let copied = null;
	global.DiscordNative = { clipboard: { copy: (t) => { copied = t; }, read: () => copied } };
	try {
		const plugin = new Plugin();
		plugin.locale = "ru";
		const res = await plugin.diagnostics.copyReport();
		assert.equal(res.ok, true);
		assert.equal(res.via, "DiscordNative");
		assert.ok(copied && copied.includes("\"UserGlobalSearch\""));
		assert.ok(copied.includes("\"modules\""));
		assert.ok(copied.includes("\"checks\""));
		assert.ok(copied.includes("\"relationships\""));
	} finally {
		delete global.DiscordNative;
	}
});
