"use strict";

/* Regression tests for v1.0.8: guild icons, guilds-only mode, 33 locales,
   native toggles, no-reload navigation, search speed, text cleanup. */
const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

const DISCORD_LOCALES = ["ar", "bg", "cs", "da", "de", "el", "en-GB", "en-US", "es-419", "es-ES",
	"fi", "fr", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt", "nl", "no", "pl", "pt-BR",
	"ro", "ru", "sv-SE", "th", "tr", "uk", "vi", "zh-CN", "zh-TW"];

const UID = "123456789012345678";

test("v1.0.8: all 33 Discord locales exist with full key parity", () => {
	for (const loc of DISCORD_LOCALES) assert.ok(I.I18N[loc], `locale ${loc} missing`);
	const ref = Object.keys(I.I18N["en-US"]).sort().join("|");
	for (const loc of DISCORD_LOCALES) {
		assert.equal(Object.keys(I.I18N[loc]).sort().join("|"), ref, `${loc} keys differ from en-US`);
	}
});

test("v1.0.8: no em-dashes anywhere in UI strings", () => {
	for (const [loc, pack] of Object.entries(I.I18N)) {
		for (const [k, v] of Object.entries(pack)) {
			for (const s of Array.isArray(v) ? v : [v]) {
				assert.ok(!String(s).includes("—"), `em-dash at ${loc}.${k}`);
			}
		}
	}
});

test("v1.0.8: detectLocale maps every Discord locale to a pack", () => {
	for (const loc of DISCORD_LOCALES) {
		assert.equal(I.detectLocale({ locale: loc }), loc, `${loc} should resolve to itself`);
	}
	assert.equal(I.detectLocale({ locale: "pt-br" }), "pt-BR");
	assert.equal(I.detectLocale({ locale: "fil" }), "en-US");
	assert.equal(I.detectLocale({ locale: "en" }), "en-US");
});

test("v1.0.8: searchOnlyGuilds drops the global DM target", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	plugin.settings.searchOnlyGuilds = true;
	const t1 = plugin.buildTargets({ user: { id: UID }, mutualGuilds: [{ id: "9", name: "S" }] });
	assert.ok(!t1.some((t) => t.kind === "dm-global"), "no dm-global when guilds only");
	assert.ok(t1.some((t) => t.kind === "guild"), "guild targets stay");
	plugin.settings.searchOnlyGuilds = false;
	const t2 = plugin.buildTargets({ user: { id: UID }, mutualGuilds: [] });
	assert.ok(t2.some((t) => t.kind === "dm-global"), "dm-global back when off");
});

test("v1.0.8: message rows render server icon image or letter fallback", () => {
	const r = new I.RowRenderer({ settings: { ...I.DEFAULT_SETTINGS }, locale: "ru", nativeClasses: {} });
	const withIcon = r.renderMessageRow({
		id: "999888777666555444", channelId: "c1", guildId: "g1", targetName: "UNIE",
		targetKind: "guild", iconUrl: "https://cdn.discordapp.com/icons/g1/ab12cd.webp?size=64",
		content: "привет", ts: Date.now(), jump: "/channels/g1/c1/999888777666555444"
	}, { selected: false, index: 0, query: "" });
	const img = withIcon.querySelector(".ugs2-msgicon img");
	assert.ok(img, "icon img rendered");
	assert.ok(img.src.includes("icons/g1"), `guild icon url: ${img.src}`);
	const noIcon = r.renderMessageRow({
		id: "2", channelId: "c1", guildId: "g1", targetName: "UNIE",
		targetKind: "guild", iconUrl: null, content: "текст", ts: Date.now(), jump: "/channels/g1/c1/2"
	}, { selected: false, index: 1, query: "" });
	assert.equal(noIcon.querySelector(".ugs2-msgicon").textContent, "U");
});

test("v1.0.8: toItem resolves guild icon through the guild store", () => {
	const tr = new I.MessageSearchTransport({}, () => {});
	const orig = I.DataService.getGuild;
	I.DataService.getGuild = (id) => ({ id, name: "UNIE", icon: "ab12cd" });
	try {
		const item = tr.toItem({ id: "999888777666555444", channel_id: "c1", content: "hi" }, { kind: "guild", id: "g1", name: "UNIE" });
		assert.ok(item.iconUrl && item.iconUrl.includes("icons/g1/ab12cd"), `icon: ${item.iconUrl}`);
	} finally {
		I.DataService.getGuild = orig;
	}
});

test("v1.0.8: jumpTo without navigation module uses history API, no reload", async () => {
	const calls = { push: [], assign: [], events: [] };
	global.window = {
		history: { pushState: (s, t, p) => calls.push.push(p) },
		dispatchEvent: (e) => calls.events.push(e.type),
		location: { assign: (u) => calls.assign.push(u) }
	};
	global.PopStateEvent = class { constructor(type) { this.type = type; } };
	const plugin = new Plugin();
	plugin.closeSwitcher = () => {};
	try {
		plugin.jumpTo("/channels/g1/c1/m1");
		await new Promise((r) => setTimeout(r, 90));
		assert.deepEqual(calls.push, ["/channels/g1/c1/m1"]);
		assert.deepEqual(calls.events, ["popstate"]);
		assert.equal(calls.assign.length, 0, "no full reload");
	} finally {
		delete global.window;
		delete global.PopStateEvent;
	}
});

test("v1.0.8: repeat query renders cached rows instantly, then refreshes", async () => {
	let posts = 0;
	const rest = {
		get: async () => ({ body: { id: UID }, statusCode: 200 }),
		post: async () => {
			posts++;
			return { body: { tabs: { messages: { total_results: 1, messages: [[
				{ id: "999888777666555444", channel_id: "c1", content: "привет", author: { id: UID }, hit: true }
			]] } } }, statusCode: 200 };
		}
	};
	const tr = new I.MessageSearchTransport(rest, () => {});
	const targets = [{ kind: "dm-global", id: "@me", name: "DM" }];
	const opts = { userId: UID, text: "прив", perTarget: 5, totalLimit: 40, concurrency: 4 };
	await tr.run(targets, opts, () => {}, () => {});
	assert.equal(posts, 1);
	const progress = [];
	await tr.run(targets, opts, (items, p) => progress.push({ found: p.found, done: p.done }), () => {});
	assert.ok(progress[0].found > 0 && progress[0].done === 0, "first batch comes from cache instantly");
	assert.equal(posts, 2, "fresh fetch still runs in background");
});

test("v1.0.8: faster defaults - concurrency 6, cap 8, guilds-only flag exists", () => {
	assert.equal(I.DEFAULT_SETTINGS.searchConcurrency, 6);
	assert.equal(I.SETTING_LIMITS.searchConcurrency.max, 8);
	assert.equal(I.DEFAULT_SETTINGS.searchOnlyGuilds, false);
});

test("v1.0.8: settings render as Discord-style toggles, zero checkboxes", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	const node = plugin.renderControls();
	const switches = node.querySelectorAll(".ugs2-switch");
	assert.ok(switches.length >= 12, `toggles: ${switches.length}`);
	for (const sw of switches) {
		assert.equal(sw.attributes.role, "switch");
		assert.ok(["true", "false"].includes(sw.attributes["aria-checked"]));
	}
	const inputs = node.querySelectorAll("input");
	assert.ok(inputs.length >= 7, `sliders: ${inputs.length}`);
	for (const inp of inputs) assert.equal(inp.type, "range", "only range inputs allowed");
});
