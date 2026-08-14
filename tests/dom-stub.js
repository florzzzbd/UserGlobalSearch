"use strict";

class TextNode {
	constructor(data) {
		this.data = String(data);
		this.nodeType = 3;
		this.parentNode = null;
	}
	get textContent() {
		return this.data;
	}
}

class El {
	constructor(tag) {
		this.tagName = String(tag).toUpperCase();
		this.nodeType = 1;
		this.childNodes = [];
		this.parentNode = null;
		this.attributes = {};
		this.dataset = {};
		this.style = {};
		this._classes = new Set();
		this.listeners = {};
		this.value = "";
		this.title = "";
		this.disabled = false;
		this.src = "";
		this.href = "";
		this.type = "";
		this.checked = false;
	}

	get className() {
		return [...this._classes].join(" ");
	}
	set className(v) {
		this._classes = new Set(String(v ?? "").split(/\s+/).filter(Boolean));
	}
	get classList() {
		const s = this._classes;
		return {
			add: (...c) => c.forEach((x) => { if (x) s.add(x); }),
			remove: (...c) => c.forEach((x) => s.delete(x)),
			toggle: (c, force) => {
				const f = force === undefined ? !s.has(c) : !!force;
				if (f) s.add(c); else s.delete(c);
				return f;
			},
			contains: (c) => s.has(c)
		};
	}

	get children() {
		return this.childNodes.filter((n) => n instanceof El);
	}
	get firstChild() {
		return this.childNodes[0] ?? null;
	}
	get nextSibling() {
		if (!this.parentNode) return null;
		const i = this.parentNode.childNodes.indexOf(this);
		return this.parentNode.childNodes[i + 1] ?? null;
	}

	setAttribute(k, v) { this.attributes[k] = String(v); }
	getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
	removeAttribute(k) { delete this.attributes[k]; }

	appendChild(node) {
		if (node.parentNode) node.remove();
		node.parentNode = this;
		this.childNodes.push(node);
		return node;
	}
	insertBefore(node, ref) {
		if (node.parentNode) node.remove();
		node.parentNode = this;
		const i = ref == null ? -1 : this.childNodes.indexOf(ref);
		if (i < 0) this.childNodes.push(node);
		else this.childNodes.splice(i, 0, node);
		return node;
	}
	remove() {
		if (this.parentNode) {
			const i = this.parentNode.childNodes.indexOf(this);
			if (i >= 0) this.parentNode.childNodes.splice(i, 1);
			this.parentNode = null;
		}
	}

	get textContent() {
		return this.childNodes.map((c) => c.textContent).join("");
	}
	set textContent(v) {
		this.childNodes = [];
		if (v !== "" && v != null) this.appendChild(new TextNode(v));
	}

	addEventListener(type, fn) {
		(this.listeners[type] ??= []).push(fn);
	}
	removeEventListener(type, fn) {
		const arr = this.listeners[type];
		if (!arr) return;
		const i = arr.indexOf(fn);
		if (i >= 0) arr.splice(i, 1);
	}
	dispatchEvent(ev) {
		const arr = this.listeners[ev.type] ?? [];
		for (const f of arr) f(ev);
		return true;
	}

	focus() {}
	click() { this.dispatchEvent({ type: "click" }); }
	scrollIntoView() {}

	matches(sel) { return matchSimple(this, sel); }

	closest(sel) {
		let n = this;
		while (n) {
			if (n.matches && n.matches(sel)) return n;
			n = n.parentNode;
		}
		return null;
	}

	contains(node) {
		let n = node;
		while (n) {
			if (n === this) return true;
			n = n.parentNode;
		}
		return false;
	}
	querySelector(sel) { return queryAll(this, sel)[0] ?? null; }
	querySelectorAll(sel) { return queryAll(this, sel); }
}

function matchSimple(node, sel) {
	if (!(node instanceof El)) return false;
	sel = String(sel).trim();
	if (sel === "*") return true;

	const attr = sel.match(/\[class\*="([^"]+)"\]/);
	const rest = attr ? sel.replace(attr[0], "") : sel;

	let tag = "";
	let classes = [];
	if (rest) {
		const parts = rest.split(".");
		if (!rest.startsWith(".")) tag = parts.shift();
		classes = parts.filter(Boolean);
	}
	if (tag && node.tagName !== tag.toUpperCase()) return false;
	for (const c of classes) {
		if (!node._classes.has(c)) return false;
	}
	if (attr) {
		return [...node._classes].some((c) => c.includes(attr[1]));
	}
	return true;
}

function* descendants(node) {
	for (const c of node.childNodes) {
		if (c instanceof El) {
			yield c;
			yield* descendants(c);
		}
	}
}

function queryAll(root, sel) {
	const parts = String(sel).trim().split(/\s+/).filter(Boolean);
	let current = [root];
	for (const part of parts) {
		const next = [];
		for (const ctx of current) {
			for (const desc of descendants(ctx)) {
				if (matchSimple(desc, part)) next.push(desc);
			}
		}
		current = next;
	}
	return current;
}

function createDocument() {
	const documentElement = new El("html");
	const head = new El("head");
	const body = new El("body");
	documentElement.appendChild(head);
	documentElement.appendChild(body);
	return {
		documentElement,
		head,
		body,
		createElement: (t) => new El(t),
		createTextNode: (d) => new TextNode(d),
		querySelector: (s) => documentElement.querySelector(s),
		querySelectorAll: (s) => documentElement.querySelectorAll(s),
		contains(node) {
			let cur = node;
			while (cur) {
				if (cur === documentElement) return true;
				cur = cur.parentNode;
			}
			return false;
		},
		execCommand: () => true
	};
}

function installDom() {
	const doc = createDocument();
	global.document = doc;
	global.HTMLElement = El;
	global.Node = { TEXT_NODE: 3 };
	global.MutationObserver = class {
		constructor(cb) { this.cb = cb; }
		observe() {}
		disconnect() {}
	};
	return { document: doc, El, TextNode };
}

module.exports = { installDom, createDocument, El, TextNode, matchSimple, queryAll };
