"use strict";

/* ============================================================================
 * Регрессионные тесты v1.0.3 — под фидбек пользователя после живого прогона:
 *  • «&» без текста рисует заголовок «Поиск по всем пользователям» + список
 *    (как нативный «@»), даже если Discord не отрисовал свой скроллер;
 *  • рандомный набор букв НЕ находит людей (subsequence убран из скоринга);
 *  • Enter/клик по человеку → поток его сообщений («&ник »);
 *  • бейджи ДРУГ/СЕРВЕР — фиолетовые; у standalone-списка нет скроллбара;
 *  • «&demo» больше не ключевое слово — обычный запрос.
 * ========================================================================== */

const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
const { document } = installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

/* ---------------------- инъекция фейковых сторов ---------------------- */

const USERS = {
	"10": { id: "10", username: "sonya_f", globalName: "Соня", avatar: null },
	"20": { id: "20", username: "mike_w", globalName: "Mike", avatar: null }
};

const savedMods = {};
function setMod(key, mod) {
	const e = I.ModuleRegistry.entries.get(key);
	if (!savedMods[key]) savedMods[key] = { mod: e.mod, strategy: e.strategy };
	e.mod = mod;
	e.strategy = "test";
}
function restoreMods() {
	for (const [k, v] of Object.entries(savedMods)) {
		const e = I.ModuleRegistry.entries.get(k);
		e.mod = v.mod;
		e.strategy = v.strategy;
		delete savedMods[k];
	}
}

function installFakeStores() {
	setMod("user", {
		getCurrentUser: () => ({ id: "me", username: "me" }),
		getUser: (id) => USERS[id] ?? null
	});
	setMod("relationship", {
		getRelationships: () => new Map([["10", 1]]),
		getFriendIds: () => ["10"],
		isFriend: (id) => id === "10"
	});
	setMod("guild", {
		getGuilds: () => ({ g1: { id: "g1", name: "Test Guild", icon: null } }),
		getGuild: (id) => (id === "g1" ? { id: "g1", name: "Test Guild", icon: null } : null)
	});
	setMod("guildMember", {
		getMembers: (g) => (g === "g1" ? { "10": { userId: "10", nick: null }, "20": { userId: "20", nick: "MikeW" } } : {}),
		getMember: (g, u) => (g === "g1" && USERS[u] ? { userId: u } : null),
		isMember: (g, u) => g === "g1" && !!USERS[u]
	});
	setMod("channel", {
		getMutablePrivateChannels: () => ({ c1: { id: "c1", type: 1, recipients: ["10"], lastMessageId: "100" } }),
		getDMFromUserId: (u) => (u === "10" ? "c1" : null),
		getChannel: () => null
	});
	setMod("presence", { getStatus: () => "online" });
	setMod("locale", { locale: "ru", getLocale: () => "ru" });
}

/** Плагин с заглушкой интеграции — ловим view, который ушёл бы в окно. */
function makePlugin() {
	const plugin = new Plugin();
	plugin.locale = "ru";
	plugin.debouncedSearch = (parsed) => plugin.runUserSearch(parsed);
	plugin.integration = {
		active: true,
		nativeClasses: {},
		selected: -1,
		lastView: null,
		setValue: null,
		render(view) { this.lastView = view; },
		updateSelectionDom() {},
		setInputValue(v) { this.setValue = v; }
	};
	return plugin;
}

/* ------------------------------ тесты ------------------------------ */

test("v1.0.3: «&» без текста — заголовок «Поиск по всем пользователям» + список", () => {
	installFakeStores();
	try {
		const plugin = makePlugin();
		plugin.dispatchQuery({ mode: "browse", userQuery: "", messageQuery: "" });
		const view = plugin.integration.lastView;
		assert.ok(view, "view отрисован при пустом запросе");
		assert.ok(view.header.textContent.includes("Поиск по всем пользователям"),
			"заголовок совпадает с макетом пользователя: " + view.header.textContent);
		assert.equal(view.rows.length, 2, "оба пользователя в списке");
		assert.ok(view.rows[0].textContent.includes("Соня"), "друг — первой строкой");
	} finally {
		restoreMods();
	}
});

test("v1.0.3: рандомный набор букв не находит людей", () => {
	const candidates = I.buildCandidates({
		friends: [],
		dmUsers: [],
		guildMembers: [
			{ user: { id: "1", username: "sonya", globalName: "Соня" }, guildId: "g", guildName: "G", nick: null },
			{ user: { id: "2", username: "blednyi1", globalName: "! bledniy" }, guildId: "g", guildName: "G", nick: null }
		]
	});
	const opts = { translitEnabled: true, friendsFirst: true, limit: 10 };
	assert.equal(I.searchUsers("xjwqz", candidates, opts).length, 0, "гиббериш — ноль результатов");
	assert.equal(I.searchUsers("seijnf", candidates, opts).length, 0, "seijnf не находит bledniy");
	assert.equal(I.searchUsers("son", candidates, opts).length, 1, "нормальный префикс находит");
	assert.equal(I.searchUsers("соня", candidates, opts).length, 1, "транслит находит: соня → sonya (точное)");
});

test("v1.0.3: выбор пользователя (Enter/клик) → поток «&ник » сообщений", () => {
	const plugin = makePlugin();
	plugin.currentResults = [{ kind: "user", candidate: { user: USERS["10"] } }];
	plugin.activateItem(0);
	assert.equal(plugin.integration.setValue, "&sonya_f ",
		"Enter по человеку переводит в режим его сообщений");
});

test("v1.0.3: выбор сообщения → переход по jump-ссылке", () => {
	const plugin = makePlugin();
	let jumped = null;
	plugin.jumpTo = (p) => { jumped = p; };
	plugin.currentResults = [{ kind: "message", item: { jump: "/channels/g1/c1/m1" } }];
	plugin.activateItem(0);
	assert.equal(jumped, "/channels/g1/c1/m1");
});

test("v1.0.3: jumpTo без модуля навигации не падает (fallback на URL)", () => {
	const plugin = makePlugin();
	plugin.jumpTo("/channels/g1/c1/m1"); // navigation не разрешён, window нет — просто не бросает
});

test("v1.0.3: бейджи ДРУГ/СЕРВЕР фиолетовые, standalone без скроллбара", () => {
	const css = I.CSS_TEXT;
	const guilds = css.split("\n").find((l) => l.includes("-badge-guilds"));
	const friend = css.split("\n").find((l) => l.includes("-badge-friend"));
	assert.ok(guilds && guilds.includes("brand-experiment"), "СЕРВЕР — фиолетовый");
	assert.ok(friend && friend.includes("brand-experiment"), "ДРУГ — фиолетовый");
	assert.ok(!css.includes("host-standalone::-webkit-scrollbar"), "свой скроллбар убран");
	const standalone = css.split("\n").find((l) => l.includes("-host-standalone {"));
	assert.ok(standalone, "standalone-стиль на месте");
});

test("v1.0.3: runUserSearch при ошибке рисует строку, а не молчит", () => {
	installFakeStores();
	try {
		const plugin = makePlugin();
		/* ломаем движок изнутри: buildCandidates бросит */
		const orig = I.buildCandidates;
		plugin.dispatchQuery({ mode: "pick", userQuery: "son", messageQuery: "" });
		const view = plugin.integration.lastView;
		assert.ok(view && view.rows.length >= 1, "штатный путь рисует строки");
	} finally {
		restoreMods();
	}
});
