"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPlugin(overrides = {}) {
	const source = fs.readFileSync(path.join(__dirname, "..", "GlobalUserSearch.plugin.js"), "utf8");
	const sandbox = {
		module: { exports: {} },
		console,
		setTimeout,
		clearTimeout,
		setInterval,
		clearInterval,
		require,
		document: { documentElement: { lang: "en" } },
		...overrides
	};
	sandbox.globalThis = sandbox;
	vm.createContext(sandbox);
	const exposed = [
		"DEFAULT_SETTINGS", "parseAmpQuery", "normalize", "translitRuToEn", "translitEnToRu",
		"queryVariants", "plural", "buildCandidates", "searchUsers", "highlightRanges",
		"VerifiedRestAPI", "MessageSearchTransport", "extractSearchResult"
	].join(", ");
	vm.runInContext(source + `\nmodule.exports.__test = { ${exposed} };`, sandbox, { filename: "GlobalUserSearch.plugin.js" });
	return { Plugin: sandbox.module.exports, I: sandbox.module.exports.__test, sandbox, source };
}

module.exports = { loadPlugin };
