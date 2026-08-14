"use strict";

/* v1.0.9 regression tests: click reliability (host-level delegation, host
   re-attach without row rebuild), jump ordering (close modal, then navigate),
   navigation module validation, florzzzbd author. */
const test = require("node:test");
const assert = require("node:assert/strict");

const { installDom } = require("./dom-stub.js");
installDom();

const Plugin = require("../UserGlobalSearch.plugin.js");
const I = Plugin.__internals;

function makeInteg(plugin) {
	const root = document.createElement("div");
	root.className = "quickswitcher-x";
	const input = document.createElement("input");
	root.appendChild(input);
	const protip = document.createElement("div");
	protip.className = "protip-y";
	root.appendChild(protip);
	document.body.appendChild(root);
	const integ = new I.SwitcherIntegration(plugin);
	integ.root = root;
	integ.input = input;
	integ.active = true;
	return { integ, root };
}

test("v1.0.9: navigation module validation requires router sibling methods", () => {
	assert.equal(I.isNavigationModule(null), false);
	assert.equal(I.isNavigationModule({}), false);
	assert.equal(I.isNavigationModule({ transitionTo: () => {} }), false, "bare transitionTo is not the router");
	assert.equal(I.isNavigationModule({ transitionTo: () => {}, replaceWith: () => {} }), true);
	assert.equal(I.isNavigationModule({ transitionTo: () => {}, transitionToGuild: () => {} }), true);
	assert.equal(I.isNavigationModule({ transitionTo: () => {}, back: () => {} }), true);
});

test("v1.0.9: jumpTo closes the switcher first, navigates a tick later", async () => {
	const order = [];
	const entry = I.ModuleRegistry.entries.get("navigation");
	entry.mod = { transitionTo: () => order.push("nav"), replaceWith: () => {} };
	entry.strategy = "test";
	const plugin = new Plugin();
	plugin.closeSwitcher = () => order.push("close");
	try {
		plugin.jumpTo("/channels/g1/c1/m1");
		assert.deepEqual(order, ["close"], "modal closes immediately");
		await new Promise((r) => setTimeout(r, 90));
		assert.deepEqual(order, ["close", "nav"], "navigation follows right after");
	} finally {
		entry.mod = null;
		entry.strategy = null;
	}
});

test("v1.0.9: clicks are delegated on the host - row re-render cannot eat them", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	const calls = [];
	plugin.activateItem = (i) => calls.push(i);
	const { integ, root } = makeInteg(plugin);
	try {
		const host = integ.ensureHost();
		assert.ok(host, "host created");
		assert.ok(Array.isArray(host.listeners.click) && host.listeners.click.length === 1, "one delegated click handler on host");

		const row = document.createElement("div");
		row.className = "ugs2-row";
		row.dataset.index = "2";
		const inner = document.createElement("span");
		row.appendChild(inner);
		host.appendChild(row);

		host.listeners.click[0]({ target: inner });
		assert.deepEqual(calls, [2], "click on a deep child activates the row");

		host.listeners.click[0]({ target: host });
		assert.deepEqual(calls, [2], "click on empty area does nothing");

		assert.equal(row.listeners.click, undefined, "no per-row click binding anymore");
	} finally {
		root.remove();
	}
});

test("v1.0.9: host re-attach keeps the same node with rows and listener", () => {
	const plugin = new Plugin();
	plugin.locale = "ru";
	const { integ, root } = makeInteg(plugin);
	try {
		const host = integ.ensureHost();
		const row = document.createElement("div");
		row.className = "ugs2-row";
		row.dataset.index = "0";
		host.appendChild(row);

		host.remove(); // React "снёс" чужой узел
		assert.ok(!document.contains(host));

		const again = integ.ensureHost();
		assert.equal(again, host, "same node re-attached, not recreated");
		assert.equal(again.childNodes.length, 1, "row survived");
		assert.ok(Array.isArray(again.listeners.click) && again.listeners.click.length === 1, "delegation intact");
		assert.ok(document.contains(again), "host back in DOM");
	} finally {
		root.remove();
	}
});

test("v1.0.9: author and repo links point to florzzzbd", () => {
	assert.equal(I.PLUGIN_AUTHOR, "florzzzbd");
	assert.ok(I.CSS_TEXT.length > 1000);
});
