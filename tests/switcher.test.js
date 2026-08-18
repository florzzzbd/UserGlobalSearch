"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadPlugin } = require("./load-plugin.js");

const userId = "123456789012345678";

function makeModules() {
	let badCalls = 0;
	let postCalls = 0;
	const bad = {
		getAPIBaseURL() { return "https://discord.com/api"; },
		get: async () => {
			badCalls++;
			throw new TypeError("t[1].toLowerCase is not a function");
		},
		post: async () => { throw new Error("wrong module"); }
	};
	const good = {
		get: async (arg) => {
			const url = typeof arg === "string" ? arg.split("?")[0] : arg.url;
			if (url === "/users/@me") return { body: { id: userId } };
			throw Object.assign(new Error("not found"), { status: 404 });
		},
		post: async () => {
			postCalls++;
			return {
				body: {
					tabs: {
						messages: {
							total_results: 1,
							cursor: null,
							messages: [[{
								id: "1500000000000000000",
								channel_id: "200000000000000000",
								content: "works",
								hit: true,
								author: { id: userId }
							}]]
						}
					}
				}
			};
		}
	};
	return { bad, good, stats: () => ({ badCalls, postCalls }) };
}

test("REST resolver rejects an unrelated get/post module", async () => {
	const modules = makeModules();
	const { I } = loadPlugin({
		BdApi: { Webpack: { getModule: () => [modules.bad, modules.good] } }
	});
	const rest = new I.RestResolver();
	assert.equal(await rest.ensure(), modules.good);
	assert.ok(modules.stats().badCalls > 0);
	const search = new I.MessageSearch(rest);
	const result = await search.searchTarget({ kind: "dm-global", id: "@me", name: "DM" }, userId, "", 5);
	assert.equal(result.total, 1);
	assert.equal(result.messages[0].content, "works");
	assert.equal(modules.stats().postCalls, 1);
});
