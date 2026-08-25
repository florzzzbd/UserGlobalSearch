/**
 * @name UserGlobalSearch
 * @author florzzz
 * @version 1.0.22
 * @description Global user search in the Quick Switcher (Ctrl+K) via the & symbol: pick a person, see their recent messages across all mutual servers, DMs and group chats.
 * @invite YPuDp5SXN
 * @donate https://www.donationalerts.com/r/florzzzzzzz
 * @website https://github.com/florzzzbd/UserGlobalSearch
 * @source https://github.com/florzzzbd/UserGlobalSearch/blob/main/GlobalUserSearch.plugin.js
 * @updateUrl https://raw.githubusercontent.com/florzzzbd/UserGlobalSearch/main/GlobalUserSearch.plugin.js
 * @license MIT
 */

"use strict";

const PLUGIN_NAME = "UserGlobalSearch";
const PLUGIN_VERSION = "1.0.22";
const PLUGIN_AUTHOR = "florzzz";
const PLUGIN_FILE_NAME = "GlobalUserSearch.plugin.js";
const UPDATE_URL = "https://raw.githubusercontent.com/florzzzbd/UserGlobalSearch/main/GlobalUserSearch.plugin.js";
// give discord a moment to boot before checking for updates
const UPDATE_CHECK_DELAY_MS = 2500;

const NodeFS = require("fs");
const NodePath = require("path");

const NS = "ugs2";

const TRIGGER = "&";

// default settings. users already have saved ones, new keys just get merged in
const DEFAULT_SETTINGS = Object.freeze({

	maxUserResults: 10,
	debounceMs: 250,
	translitEnabled: true,
	friendsFirst: true,
	includeDMs: true,
	includeGuildMembers: true,

	showStatusDot: true,
	showBadges: true,
	showHandles: true,
	showContextLine: true,
	compactMode: false,
	maxMutualGuilds: 3,

	messageSearchEnabled: true,
	searchOnlyGuilds: false,
	perTargetLimit: 5,
	maxTargets: 60,
	totalLimit: 40,
	searchConcurrency: 6,

	debugLogs: false,
	welcomed: false
});

// slider bounds so nobody cranks the request limits to insane values
const SETTING_LIMITS = Object.freeze({
	maxUserResults:    { min: 3, max: 25, step: 1 },
	debounceMs:        { min: 0, max: 800, step: 50 },
	maxMutualGuilds:   { min: 1, max: 6, step: 1 },
	perTargetLimit:    { min: 1, max: 15, step: 1 },
	maxTargets:        { min: 5, max: 150, step: 5 },
	totalLimit:        { min: 5, max: 60, step: 5 },
	searchConcurrency: { min: 1, max: 8, step: 1 }
});

const AVATAR_SIZE = 64;

const SEARCH_REQUEST_TIMEOUT_MS = 12000;

const SEARCH_CACHE_TTL_MS = 45000;

const I18N = {

	"ru": {
		headerPickUsers: "Пользователи: «{q}»",
		headerPickAll: "Поиск по всем пользователям",
		headerMessagesFor: "Сообщения {name}: «{q}»",
		headerAllMessages: "Все сообщения: {name}",
		emptyUsers: "Никого не нашли по запросу «{q}».",
		emptyUsersHint: "Попробуйте другое написание или транслит: sonya / соня.",
		emptyMessages: "Сообщений не найдено. Попробуйте изменить запрос.",
		errNoTransport: "Поиск сообщений недоступен в этой сборке Discord. Выбор пользователей работает.",
		errNoTargets: "Нет общих серверов и чатов с этим пользователем.",
		errGeneric: "Что-то пошло не так. Подробности в журнале настроек.",
		loading: "Ищем: {done}/{total} · найдено {found}",
		loadingErrors: "· ошибок {n}",
		emptyMessagesErrors: "Запросы завершились с ошибками ({n}). Откройте настройки плагина и запустите самотест - отчёт покажет причину.",
		badgeFriend: "ДРУГ",
		badgeServer: "СЕРВЕР",
		badgeDm: "ЛС",
		badgeBot: "БОТ",
		ctxFriend: "Друг",
		ctxDm: "ЛС",
		ctxGroup: "Группа",
		ctxMore: "+{n}",
		hintPick: "Enter - сообщения пользователя · ↑↓ - выбор · Esc - закрыть",
		hintMessages: "Enter - перейти к сообщению · Esc - закрыть",
		protipTitle: "& - глобальный поиск пользователей",
		pluralGuilds: ["сервер", "сервера", "серверов"],
		pluralDms: ["чат", "чата", "чатов"],
		pluralResults: ["результат", "результата", "результатов"],
		catSearch: "Поиск",
		catAppearance: "Интерфейс",
		catMessages: "Поиск сообщений",
		catAdvanced: "Служебные",
		setMaxUserResults: "Пользователей в подсказке",
		setMaxUserResultsDesc: "Сколько строк показывать при вводе «&ник».",
		setDebounce: "Задержка поиска",
		setDebounceDesc: "Пауза после ввода перед стартом поиска (мс).",
		setTranslit: "Транслитерация",
		setTranslitDesc: "«соня» находит «Sonya», а «sonya» находит «Соня».",
		setFriendsFirst: "Друзья первыми",
		setFriendsFirstDesc: "Друзья всегда вверху списка, затем ЛС и серверы.",
		setIncludeDMs: "Личные и групповые чаты",
		setIncludeDMsDesc: "Искать среди собеседников из лички.",
		setIncludeMembers: "Участники серверов",
		setIncludeMembersDesc: "Искать среди участников всех ваших серверов.",
		setStatusDot: "Точка статуса",
		setStatusDotDesc: "Зелёная/жёлтая/красная точка на аватарке.",
		setBadges: "Бейджи",
		setBadgesDesc: "Пометки ДРУГ, СЕРВЕР, ЛС, БОТ рядом с именем.",
		setHandles: "@username справа",
		setHandlesDesc: "Показывать ник в правой части строки.",
		setContextLine: "Строка контекста",
		setContextLineDesc: "«Друг · 3 сервера · ЛС» под именем.",
		setCompact: "Компактный режим",
		setCompactDesc: "Однострочные результаты, больше строк на экране.",
		setMaxMutual: "Серверов в строке контекста",
		setMaxMutualDesc: "Сколько названий общих серверов перечислять.",
		setMsgEnabled: "Режим «&ник текст»",
		setMsgEnabledDesc: "Поиск сообщений пользователя по всем серверам и чатам.",
		setOnlyGuilds: "Искать только на серверах",
		setOnlyGuildsDesc: "Не искать сообщения в личных и групповых чатах.",
		setPerTarget: "Результатов с сервера",
		setPerTargetDesc: "Лимит сообщений с одного сервера или чата.",
		setMaxTargets: "Максимум серверов за поиск",
		setMaxTargetsDesc: "Больше - медленнее, но полнее охват.",
		setTotalLimit: "Всего строк в списке",
		setTotalLimitDesc: "Общий лимит результатов сообщений.",
		setConcurrency: "Параллельных запросов",
		setConcurrencyDesc: "Не ставьте слишком высоко - Discord режет частые запросы.",
		setDebug: "Подробные логи",
		setDebugDesc: "Отладочный вывод в консоль (Ctrl+Shift+I).",
		btnReset: "Сбросить настройки",
		btnResetDone: "Настройки сброшены к значениям по умолчанию",
		diagTitle: "Самодиагностика",
		diagDesc: "Один клик - и плагин проверит себя: модули Discord, движок, рендер. Отчёт можно отправить автору.",
		diagRun: "Запустить самотест",
		diagCopy: "Скопировать отчёт",
		diagTransport: "Проверить поиск сообщений (1 запрос)",
		diagOk: "Все проверки пройдены",
		diagFail: "Есть проблемы: {n}",
		diagNever: "Самотест ещё не запускался",
		copied: "Скопировано в буфер обмена",
		manualCopyBtn: "Ручное копирование",
		manualCopyTitle: "Скопируйте отчёт вручную",
		manualCopyHint: "Автокопирование не подтвердилось. Текст отчёта уже выделен - нажмите Ctrl+C (Cmd+C на Mac) и вставьте его в чат.",
		manualCopyClose: "Готово",
		about: "«&ник» - найти человека по всем общим серверам и чатам. «&ник текст» - его сообщения везде, где вы состоите. Интерфейс полностью нативный: тема Discord применяется автоматически.",
		footerHotkeys: "Ctrl+K - быстрый поиск · & - режим плагина · Tab - из имени в сообщения",
		toastWelcome: "UserGlobalSearch: откройте Ctrl+K и введите &",
		linkGithub: "GitHub",
		linkIssues: "Сообщить о проблеме",
		sectionMessages: "Сообщения"
	},

	"en-US": {
		headerPickUsers: "Users: \"{q}\"",
		headerPickAll: "Search all users",
		headerMessagesFor: "Messages by {name}: \"{q}\"",
		headerAllMessages: "All messages: {name}",
		emptyUsers: "No one found for \"{q}\".",
		emptyUsersHint: "Try another spelling or transliteration: sonya / соня.",
		emptyMessages: "No messages found. Try a different query.",
		errNoTransport: "Message search is unavailable in this Discord build. User picking still works.",
		errNoTargets: "No mutual servers or chats with this user.",
		errGeneric: "Something went wrong. See the log in settings.",
		loading: "Searching: {done}/{total} · found {found}",
		loadingErrors: "· {n} errors",
		emptyMessagesErrors: "Requests failed ({n}). Open plugin settings and run the self-test to see why.",
		badgeFriend: "FRIEND",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Friend",
		ctxDm: "DM",
		ctxGroup: "Group",
		ctxMore: "+{n}",
		hintPick: "Enter - user's messages · ↑↓ - select · Esc - close",
		hintMessages: "Enter - jump to message · Esc - close",
		protipTitle: "& - global user search",
		pluralGuilds: ["server", "servers"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["result", "results"],
		catSearch: "Search",
		catAppearance: "Appearance",
		catMessages: "Message search",
		catAdvanced: "Advanced",
		setMaxUserResults: "Users in suggestions",
		setMaxUserResultsDesc: "Rows shown for \"&name\".",
		setDebounce: "Search delay",
		setDebounceDesc: "Pause after typing before the search starts (ms).",
		setTranslit: "Transliteration",
		setTranslitDesc: "\"соня\" finds \"Sonya\", \"sonya\" finds \"Соня\".",
		setFriendsFirst: "Friends first",
		setFriendsFirstDesc: "Friends on top, then DMs and servers.",
		setIncludeDMs: "Direct and group chats",
		setIncludeDMsDesc: "Search among your DM partners.",
		setIncludeMembers: "Server members",
		setIncludeMembersDesc: "Search among members of all your servers.",
		setStatusDot: "Status dot",
		setStatusDotDesc: "Presence dot on the avatar.",
		setBadges: "Badges",
		setBadgesDesc: "FRIEND, SERVER, DM, BOT labels next to the name.",
		setHandles: "@username on the right",
		setHandlesDesc: "Show the handle at the row's right edge.",
		setContextLine: "Context line",
		setContextLineDesc: "\"Friend · 3 servers · DM\" under the name.",
		setCompact: "Compact mode",
		setCompactDesc: "Single-line results, more rows on screen.",
		setMaxMutual: "Servers in context line",
		setMaxMutualDesc: "How many mutual server names to list.",
		setMsgEnabled: "\"&name text\" mode",
		setMsgEnabledDesc: "Search a user's messages across servers and chats.",
		setOnlyGuilds: "Search servers only",
		setOnlyGuildsDesc: "Skip DMs and group chats when searching messages.",
		setPerTarget: "Results per server",
		setPerTargetDesc: "Message limit per server or chat.",
		setMaxTargets: "Max targets per search",
		setMaxTargetsDesc: "Higher is slower but broader.",
		setTotalLimit: "Total rows",
		setTotalLimitDesc: "Overall message result limit.",
		setConcurrency: "Parallel requests",
		setConcurrencyDesc: "Keep it moderate - Discord rate-limits bursts.",
		setDebug: "Verbose logs",
		setDebugDesc: "Debug output to the console (Ctrl+Shift+I).",
		btnReset: "Reset settings",
		btnResetDone: "Settings were reset to defaults",
		diagTitle: "Self-diagnostics",
		diagDesc: "One click checks everything: Discord modules, engine, renderer. Send the report to the author if something fails.",
		diagRun: "Run self-test",
		diagCopy: "Copy report",
		diagTransport: "Test message search (1 request)",
		diagOk: "All checks passed",
		diagFail: "Issues found: {n}",
		diagNever: "Self-test has not run yet",
		copied: "Copied to clipboard",
		manualCopyBtn: "Manual copy",
		manualCopyTitle: "Copy the report manually",
		manualCopyHint: "Auto-copy could not be verified. The report text is already selected - press Ctrl+C (Cmd+C on Mac) and paste it into the chat.",
		manualCopyClose: "Done",
		about: "\"&name\" finds a person across all mutual servers and chats. \"&name text\" finds their messages. The interface follows your Discord theme automatically.",
		footerHotkeys: "Ctrl+K - quick switcher · & - plugin mode · Tab - from name to messages",
		toastWelcome: "UserGlobalSearch: press Ctrl+K and type &",
		linkGithub: "GitHub",
		linkIssues: "Report an issue",
		sectionMessages: "Messages"
	},

	"en-GB": {
		headerPickUsers: "Users: \"{q}\"",
		headerPickAll: "Search all users",
		headerMessagesFor: "Messages by {name}: \"{q}\"",
		headerAllMessages: "All messages: {name}",
		emptyUsers: "No one found for \"{q}\".",
		emptyUsersHint: "Try another spelling or transliteration: sonya / соня.",
		emptyMessages: "No messages found. Try a different query.",
		errNoTransport: "Message search is unavailable in this Discord build. User picking still works.",
		errNoTargets: "No mutual servers or chats with this user.",
		errGeneric: "Something went wrong. See the log in settings.",
		loading: "Searching: {done}/{total} · found {found}",
		loadingErrors: "· {n} errors",
		emptyMessagesErrors: "Requests failed ({n}). Open plugin settings and run the self-test to see why.",
		badgeFriend: "FRIEND",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Friend",
		ctxDm: "DM",
		ctxGroup: "Group",
		ctxMore: "+{n}",
		hintPick: "Enter - user's messages · ↑↓ - select · Esc - close",
		hintMessages: "Enter - jump to message · Esc - close",
		protipTitle: "& - global user search",
		pluralGuilds: ["server", "servers"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["result", "results"],
		catSearch: "Search",
		catAppearance: "Appearance",
		catMessages: "Message search",
		catAdvanced: "Advanced",
		setMaxUserResults: "Users in suggestions",
		setMaxUserResultsDesc: "Rows shown for \"&name\".",
		setDebounce: "Search delay",
		setDebounceDesc: "Pause after typing before the search starts (ms).",
		setTranslit: "Transliteration",
		setTranslitDesc: "\"соня\" finds \"Sonya\", \"sonya\" finds \"Соня\".",
		setFriendsFirst: "Friends first",
		setFriendsFirstDesc: "Friends on top, then DMs and servers.",
		setIncludeDMs: "Direct and group chats",
		setIncludeDMsDesc: "Search amongst your DM partners.",
		setIncludeMembers: "Server members",
		setIncludeMembersDesc: "Search amongst members of all your servers.",
		setStatusDot: "Status dot",
		setStatusDotDesc: "Presence dot on the avatar.",
		setBadges: "Badges",
		setBadgesDesc: "FRIEND, SERVER, DM, BOT labels next to the name.",
		setHandles: "@username on the right",
		setHandlesDesc: "Show the handle at the row's right edge.",
		setContextLine: "Context line",
		setContextLineDesc: "\"Friend · 3 servers · DM\" under the name.",
		setCompact: "Compact mode",
		setCompactDesc: "Single-line results, more rows on screen.",
		setMaxMutual: "Servers in context line",
		setMaxMutualDesc: "How many mutual server names to list.",
		setMsgEnabled: "\"&name text\" mode",
		setMsgEnabledDesc: "Search a user's messages across servers and chats.",
		setOnlyGuilds: "Search servers only",
		setOnlyGuildsDesc: "Skip DMs and group chats when searching messages.",
		setPerTarget: "Results per server",
		setPerTargetDesc: "Message limit per server or chat.",
		setMaxTargets: "Max targets per search",
		setMaxTargetsDesc: "Higher is slower but broader.",
		setTotalLimit: "Total rows",
		setTotalLimitDesc: "Overall message result limit.",
		setConcurrency: "Parallel requests",
		setConcurrencyDesc: "Keep it moderate - Discord rate-limits bursts.",
		setDebug: "Verbose logs",
		setDebugDesc: "Debug output to the console (Ctrl+Shift+I).",
		btnReset: "Reset settings",
		btnResetDone: "Settings were reset to defaults",
		diagTitle: "Self-diagnostics",
		diagDesc: "One click checks everything: Discord modules, engine, renderer. Send the report to the author if something fails.",
		diagRun: "Run self-test",
		diagCopy: "Copy report",
		diagTransport: "Test message search (1 request)",
		diagOk: "All checks passed",
		diagFail: "Issues found: {n}",
		diagNever: "Self-test has not run yet",
		copied: "Copied to clipboard",
		manualCopyBtn: "Manual copy",
		manualCopyTitle: "Copy the report manually",
		manualCopyHint: "Auto-copy could not be verified. The report text is already selected - press Ctrl+C (Cmd+C on Mac) and paste it into the chat.",
		manualCopyClose: "Done",
		about: "\"&name\" finds a person across all mutual servers and chats. \"&name text\" finds their messages. The interface follows your Discord theme automatically.",
		footerHotkeys: "Ctrl+K - quick switcher · & - plugin mode · Tab - from name to messages",
		toastWelcome: "UserGlobalSearch: press Ctrl+K and type &",
		linkGithub: "GitHub",
		linkIssues: "Report an issue",
		sectionMessages: "Messages"
	},

	"uk": {
		headerPickUsers: "Користувачі: «{q}»",
		headerPickAll: "Пошук серед усіх користувачів",
		headerMessagesFor: "Повідомлення {name}: «{q}»",
		headerAllMessages: "Усі повідомлення: {name}",
		emptyUsers: "Нікого не знайдено за запитом «{q}».",
		emptyUsersHint: "Спробуйте інше написання або трансліт: sonya / соня.",
		emptyMessages: "Повідомлень не знайдено. Спробуйте змінити запит.",
		errNoTransport: "Пошук повідомлень недоступний у цій збірці Discord. Вибір користувачів працює.",
		errNoTargets: "Немає спільних серверів і чатів з цим користувачем.",
		errGeneric: "Щось пішло не так. Деталі в журналі налаштувань.",
		loading: "Шукаємо: {done}/{total} · знайдено {found}",
		loadingErrors: "· помилок {n}",
		emptyMessagesErrors: "Запити завершилися з помилками ({n}). Відкрийте налаштування плагіна й запустіть самотест - звіт покаже причину.",
		badgeFriend: "ДРУГ",
		badgeServer: "СЕРВЕР",
		badgeDm: "ОП",
		badgeBot: "БОТ",
		ctxFriend: "Друг",
		ctxDm: "ОП",
		ctxGroup: "Група",
		ctxMore: "+{n}",
		hintPick: "Enter - повідомлення користувача · ↑↓ - вибір · Esc - закрити",
		hintMessages: "Enter - перейти до повідомлення · Esc - закрити",
		protipTitle: "& - глобальний пошук користувачів",
		pluralGuilds: ["сервер", "сервери", "серверів"],
		pluralDms: ["чат", "чати", "чатів"],
		pluralResults: ["результат", "результати", "результатів"],
		catSearch: "Пошук",
		catAppearance: "Інтерфейс",
		catMessages: "Пошук повідомлень",
		catAdvanced: "Службові",
		setMaxUserResults: "Користувачів у підказці",
		setMaxUserResultsDesc: "Скільки рядків показувати при введенні «&нік».",
		setDebounce: "Затримка пошуку",
		setDebounceDesc: "Пауза після введення перед стартом пошуку (мс).",
		setTranslit: "Транслітерація",
		setTranslitDesc: "«соня» знаходить «Sonya», а «sonya» знаходить «Соня».",
		setFriendsFirst: "Друзі першими",
		setFriendsFirstDesc: "Друзі завжди вгорі списку, далі ОП і сервери.",
		setIncludeDMs: "Особисті та групові чати",
		setIncludeDMsDesc: "Шукати серед співрозмовників з особистих.",
		setIncludeMembers: "Учасники серверів",
		setIncludeMembersDesc: "Шукати серед учасників усіх ваших серверів.",
		setStatusDot: "Точка статусу",
		setStatusDotDesc: "Зелена/жовта/червона точка на аватарці.",
		setBadges: "Бейджі",
		setBadgesDesc: "Позначки ДРУГ, СЕРВЕР, ОП, БОТ поруч з ім'ям.",
		setHandles: "@username праворуч",
		setHandlesDesc: "Показувати нік у правій частині рядка.",
		setContextLine: "Рядок контексту",
		setContextLineDesc: "«Друг · 3 сервери · ОП» під ім'ям.",
		setCompact: "Компактний режим",
		setCompactDesc: "Однорядкові результати, більше рядків на екрані.",
		setMaxMutual: "Серверів у рядку контексту",
		setMaxMutualDesc: "Скільки назв спільних серверів перераховувати.",
		setMsgEnabled: "Режим «&нік текст»",
		setMsgEnabledDesc: "Пошук повідомлень користувача по всіх серверах і чатах.",
		setOnlyGuilds: "Шукати лише на серверах",
		setOnlyGuildsDesc: "Не шукати повідомлення в особистих і групових чатах.",
		setPerTarget: "Результатів із сервера",
		setPerTargetDesc: "Ліміт повідомлень з одного сервера або чату.",
		setMaxTargets: "Максимум серверів за пошук",
		setMaxTargetsDesc: "Більше - повільніше, але повніше охоплення.",
		setTotalLimit: "Усього рядків у списку",
		setTotalLimitDesc: "Загальний ліміт результатів повідомлень.",
		setConcurrency: "Паралельних запитів",
		setConcurrencyDesc: "Не ставте надто високо - Discord ріже часті запити.",
		setDebug: "Докладні логи",
		setDebugDesc: "Налагоджувальний вивід у консоль (Ctrl+Shift+I).",
		btnReset: "Скинути налаштування",
		btnResetDone: "Налаштування скинуто до типових",
		diagTitle: "Самодіагностика",
		diagDesc: "Один клік - і плагін перевірить себе: модулі Discord, рушій, рендер. Звіт можна надіслати автору.",
		diagRun: "Запустити самотест",
		diagCopy: "Скопіювати звіт",
		diagTransport: "Перевірити пошук повідомлень (1 запит)",
		diagOk: "Усі перевірки пройдено",
		diagFail: "Є проблеми: {n}",
		diagNever: "Самотест ще не запускався",
		copied: "Скопійовано в буфер обміну",
		manualCopyBtn: "Ручне копіювання",
		manualCopyTitle: "Скопіюйте звіт вручну",
		manualCopyHint: "Автокопіювання не підтвердилося. Текст звіту вже виділений - натисніть Ctrl+C (Cmd+C на Mac) і вставте його в чат.",
		manualCopyClose: "Готово",
		about: "«&нік» - знайти людину по всіх спільних серверах і чатах. «&нік текст» - її повідомлення всюди, де ви перебуваєте. Інтерфейс повністю нативний: тема Discord застосовується автоматично.",
		footerHotkeys: "Ctrl+K - швидкий пошук · & - режим плагіна · Tab - з імені в повідомлення",
		toastWelcome: "UserGlobalSearch: відкрийте Ctrl+K і введіть &",
		linkGithub: "GitHub",
		linkIssues: "Повідомити про проблему",
		sectionMessages: "Повідомлення"
	}
};

const PLURAL_TRIPLE = new Set(["ru", "uk"]);

const PLURAL_SINGLE = new Set([]);

function plural(locale, n, forms) {
	if (!Array.isArray(forms) || !forms.length) return "";
	if (forms.length === 1 || PLURAL_SINGLE.has(locale)) return forms[0];
	const abs = Math.abs(n);
	if (PLURAL_TRIPLE.has(locale) && forms.length >= 3) {
		const mod10 = abs % 10;
		const mod100 = abs % 100;
		if (mod10 === 1 && mod100 !== 11) return forms[0];
		if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
		return forms[2];
	}

	return abs === 1 ? forms[0] : (forms[1] ?? forms[0]);
}

function detectLocale(localeStore) {
	const candidates = [];
	try {
		const fromStore = localeStore?.locale ?? localeStore?.getLocale?.();
		if (typeof fromStore === "string") candidates.push(fromStore);
	} catch (e) {  }
	try {
		const fromDom = document.documentElement?.lang;
		if (typeof fromDom === "string" && fromDom) candidates.push(fromDom);
	} catch (e) {  }
	candidates.push("en-US");

	for (const raw of candidates) {
		if (!raw) continue;
		const norm = String(raw).replace("_", "-");
		if (I18N[norm]) return norm;
		const lower = norm.toLowerCase();
		for (const key of Object.keys(I18N)) {
			if (key.toLowerCase() === lower) return key;
		}
		const base = lower.split("-")[0];
		for (const key of Object.keys(I18N)) {
			if (key.toLowerCase().split("-")[0] === base) return key;
		}
	}
	return "en-US";
}

function translate(locale, key, vars) {
	const pack = I18N[locale] || I18N["en-US"];
	let s = pack[key];
	if (s == null) s = I18N["en-US"][key];
	if (s == null) return key;
	if (typeof s !== "string") return s;
	if (vars) {
		for (const k of Object.keys(vars)) {
			s = s.split("{" + k + "}").join(String(vars[k]));
		}
	}
	return s;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) {
		for (const part of String(className).split(/\s+/)) {
			if (part) node.classList.add(part);
		}
	}
	if (text != null) node.textContent = String(text);
	return node;
}

function toInt(value, fallback) {
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clampInt(value, key) {
	const lim = SETTING_LIMITS[key];
	const def = DEFAULT_SETTINGS[key];
	let n = toInt(value, def);
	if (lim) n = Math.min(lim.max, Math.max(lim.min, n));
	return n;
}

function debounce(fn, wait) {
	let timer = 0;
	const wrapped = function (...args) {
		clearTimeout(timer);
		timer = setTimeout(() => fn.apply(this, args), wait);
	};
	wrapped.cancel = () => clearTimeout(timer);
	return wrapped;
}

function normalize(str) {
	return String(str ?? "")
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\s+/g, " ")
		.trim();
}

function hasCyrillic(str) {
	return /[\u0400-\u04FF]/.test(str);
}

// dumb table-based transliteration, works better than fancy libs for our use case
const TRANSLIT_MAP = Object.freeze({
	"а": "a",  "б": "b",  "в": "v",  "г": "g",  "д": "d",
	"е": "e",  "ё": "e",  "ж": "zh", "з": "z",  "и": "i",
	"й": "y",  "к": "k",  "л": "l",  "м": "m",  "н": "n",
	"о": "o",  "п": "p",  "р": "r",  "с": "s",  "т": "t",
	"у": "u",  "ф": "f",  "х": "kh", "ц": "ts", "ч": "ch",
	"ш": "sh", "щ": "sch","ъ": "",   "ы": "y",  "ь": "",
	"э": "e",  "ю": "yu", "я": "ya"
});

const TRANSLIT_MAP_REVERSE = (() => {
	const rev = {};
	for (const [ru, en] of Object.entries(TRANSLIT_MAP)) {
		if (en && rev[en] == null) rev[en] = ru;
	}
	return rev;
})();

function translitRuToEn(str) {
	let out = "";
	for (const ch of String(str)) out += TRANSLIT_MAP[ch] ?? ch;
	return out;
}

function translitEnToRu(str) {
	const s = String(str);
	let out = "";
	let i = 0;
	const keys3 = ["sch"];
	const keys2 = ["zh", "kh", "ts", "ch", "sh", "yu", "ya"];
	while (i < s.length) {
		const tri = s.slice(i, i + 3);
		const duo = s.slice(i, i + 2);
		if (keys3.includes(tri) && TRANSLIT_MAP_REVERSE[tri]) {
			out += TRANSLIT_MAP_REVERSE[tri]; i += 3; continue;
		}
		if (keys2.includes(duo) && TRANSLIT_MAP_REVERSE[duo]) {
			out += TRANSLIT_MAP_REVERSE[duo]; i += 2; continue;
		}
		out += TRANSLIT_MAP_REVERSE[s[i]] ?? s[i];
		i += 1;
	}
	return out;
}

function queryVariants(query, translitEnabled) {
	const norm = normalize(query);
	const set = new Set([norm]);
	if (translitEnabled && norm) {
		if (hasCyrillic(norm)) set.add(translitRuToEn(norm));
		else set.add(translitEnToRu(norm));
	}
	return [...set].filter(Boolean);
}

function snowflakeNewer(a, b) {
	const sa = String(a ?? "0");
	const sb = String(b ?? "0");
	if (sa.length !== sb.length) return sa.length > sb.length;
	return sa > sb;
}

function snowflakeTime(id) {
	try {
		return Number((BigInt(String(id)) >> 22n) + 1420070400000n);
	} catch (e) {
		return 0;
	}
}

function relativeTime(ts, locale) {
	try {
		const then = Number(ts);
		if (!then) return "";
		const diff = then - Date.now();
		const abs = Math.abs(diff);
		const rtf = new Intl.RelativeTimeFormat(locale || "en-US", { numeric: "auto" });
		if (abs < 60 * 1000) return rtf.format(Math.trunc(diff / 1000), "second");
		if (abs < 60 * 60 * 1000) return rtf.format(Math.trunc(diff / 60000), "minute");
		if (abs < 24 * 60 * 60 * 1000) return rtf.format(Math.trunc(diff / 3600000), "hour");
		if (abs < 30 * 86400000) return rtf.format(Math.trunc(diff / 86400000), "day");
		return new Date(then).toLocaleDateString(locale || undefined, { day: "numeric", month: "short", year: "numeric" });
	} catch (e) {
		return "";
	}
}

function escapeRegExp(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function displayName(user) {
	return user?.globalName ?? user?.global_name ?? user?.username ?? "?";
}

function avatarUrl(user, size = AVATAR_SIZE) {
	try {
		if (user && typeof user.getAvatarURL === "function") {
			const url = user.getAvatarURL(null, size);
			if (url) return url;
		}
	} catch (e) {  }
	try {
		if (user && user.avatar) {
			const ext = String(user.avatar).startsWith("a_") ? "gif" : "webp";
			return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
		}
		if (user && user.id != null) {
			const idx = Number((BigInt(String(user.id)) >> 22n) % 6n);
			return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
		}
	} catch (e) {  }
	return "https://cdn.discordapp.com/embed/avatars/0.png";
}

function guildIconUrl(guild, size = 32) {
	try {
		if (!guild) return null;
		if (typeof guild.getIconURL === "function") {
			const url = guild.getIconURL(size);
			if (url) return url;
		}
		if (guild.icon) {
			const ext = String(guild.icon).startsWith("a_") ? "gif" : "webp";
			return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=${size}`;
		}
	} catch (e) {  }
	return null;
}

function acronym(str) {
	return String(str ?? "")
		.split(/[\s\-_.,;:!?]+/)
		.filter(Boolean)
		.map((w) => w[0])
		.join("")
		.toLowerCase();
}

function truncate(str, max) {
	const s = String(str ?? "");
	return s.length > max ? s.slice(0, Math.max(0, max - 1)) + "…" : s;
}

const LOG_LIMIT = 200;

const Journal = {
	records: [],
	debugEnabled: false,

	add(level, scope, message, data) {
		const rec = {
			ts: Date.now(),
			level,
			scope,
			message: String(message),
			data: data === undefined ? undefined : safeSerialize(data)
		};
		this.records.push(rec);
		if (this.records.length > LOG_LIMIT) this.records.splice(0, this.records.length - LOG_LIMIT);
		this.toConsole(rec);
	},

	toConsole(rec) {

		if (rec.level === "debug" && !this.debugEnabled) return;
		const tag = `%c[${PLUGIN_NAME}]%c[${rec.scope}]`;
		const styleMain = "color:#fff;background:#5865f2;border-radius:3px;padding:0 4px;font-weight:600;";
		const styleScope = "color:#949ba4;";
		const fn = rec.level === "error" ? "error" : rec.level === "warn" ? "warn" : "log";
		try {
			if (rec.data !== undefined) console[fn](tag, styleMain, styleScope, rec.message, rec.data);
			else console[fn](tag, styleMain, styleScope, rec.message);
		} catch (e) {  }
	},

	debug(scope, msg, data) { this.add("debug", scope, msg, data); },
	info(scope, msg, data)  { this.add("info",  scope, msg, data); },
	warn(scope, msg, data)  { this.add("warn",  scope, msg, data); },
	error(scope, msg, data) { this.add("error", scope, msg, data); },

	dump() { return this.records.slice(); },
	clear() { this.records.length = 0; }
};

function parsePluginMeta(source) {
	const match = String(source ?? "").match(/\/\*\*([\s\S]*?)\*\//);
	if (!match) return {};
	const meta = {};
	for (const line of match[1].split(/\r?\n/)) {
		const field = line.match(/^\s*\*\s*@([A-Za-z][\w-]*)\s+(.+?)\s*$/);
		if (field) meta[field[1]] = field[2];
	}
	return meta;
}

function parseVersion(version) {
	const text = String(version ?? "").trim().replace(/^v/i, "");
	const split = text.split("-", 2);
	const core = split[0].split(".").map((part) => {
		const match = String(part).match(/^\d+/);
		return match ? Number(match[0]) : 0;
	});
	return { core, pre: split.length > 1 ? split[1].split(".") : [] };
}

function comparePluginVersions(left, right) {
	const a = parseVersion(left);
	const b = parseVersion(right);
	const width = Math.max(a.core.length, b.core.length, 3);
	for (let i = 0; i < width; i++) {
		const av = a.core[i] ?? 0;
		const bv = b.core[i] ?? 0;
		if (av !== bv) return av > bv ? 1 : -1;
	}
	if (!a.pre.length && !b.pre.length) return 0;
	if (!a.pre.length) return 1;
	if (!b.pre.length) return -1;
	const preWidth = Math.max(a.pre.length, b.pre.length);
	for (let i = 0; i < preWidth; i++) {
		if (a.pre[i] === undefined) return -1;
		if (b.pre[i] === undefined) return 1;
		const an = /^\d+$/.test(a.pre[i]) ? Number(a.pre[i]) : null;
		const bn = /^\d+$/.test(b.pre[i]) ? Number(b.pre[i]) : null;
		if (an !== null && bn !== null && an !== bn) return an > bn ? 1 : -1;
		if (an !== null && bn === null) return -1;
		if (an === null && bn !== null) return 1;
		if (a.pre[i] !== b.pre[i]) return a.pre[i] > b.pre[i] ? 1 : -1;
	}
	return 0;
}

function validatePluginUpdateSource(source) {
	const text = String(source ?? "");
	if (text.length < 1000 || !text.includes("module.exports")) {
		throw new Error("Downloaded update is not a valid plugin file");
	}
	const meta = parsePluginMeta(text);
	if (meta.name !== PLUGIN_NAME) {
		throw new Error(`Update name mismatch: expected ${PLUGIN_NAME}, got ${meta.name ?? "missing"}`);
	}
	if (!/^v?\d+(?:\.\d+){1,3}(?:-[0-9A-Za-z.-]+)?$/.test(String(meta.version ?? "").trim())) {
		throw new Error("Downloaded update has no valid version");
	}
	return { source: text, meta, version: String(meta.version).trim() };
}

function resolveInstalledPluginPath() {
	const folder = String(globalThis.BdApi?.Plugins?.folder ?? "");
	if (!folder) throw new Error("BetterDiscord plugins folder is unavailable");
	try {
		if (typeof __filename === "string" && /\.plugin\.js$/i.test(__filename)) {
			const fileDir = NodePath.resolve(NodePath.dirname(__filename));
			if (fileDir === NodePath.resolve(folder)) return __filename;
		}
	} catch (e) {}
	try {
		for (const file of NodeFS.readdirSync(folder)) {
			if (!/\.plugin\.js$/i.test(file)) continue;
			const candidate = NodePath.join(folder, file);
			const head = NodeFS.readFileSync(candidate, "utf8").slice(0, 4096);
			if (parsePluginMeta(head).name === PLUGIN_NAME) return candidate;
		}
	} catch (e) {}
	return NodePath.join(folder, PLUGIN_FILE_NAME);
}

async function fetchPluginUpdateSource(url = UPDATE_URL) {
	const separator = url.includes("?") ? "&" : "?";
	const requestUrl = `${url}${separator}_ugs=${Date.now()}`;
	const api = globalThis.BdApi;
	const fetcher = typeof api?.Net?.fetch === "function"
		? (input, init) => api.Net.fetch(input, init)
		: (typeof fetch === "function" ? fetch : null);
	if (!fetcher) throw new Error("No network fetch API is available");
	const response = await fetcher(requestUrl, { cache: "no-store" });
	const status = Number(response?.status ?? 0);
	if (!response || response.ok === false || status >= 400) {
		throw new Error(`Update request failed with HTTP ${status || "unknown"}`);
	}
	return String(await response.text());
}

async function writePluginUpdate(targetPath, source) {
	const checked = validatePluginUpdateSource(source);
	const tempPath = `${targetPath}.update-${Date.now()}.tmp`;
	await NodeFS.promises.writeFile(tempPath, checked.source, "utf8");
	const verification = await NodeFS.promises.readFile(tempPath, "utf8");
	validatePluginUpdateSource(verification);
	try {
		await NodeFS.promises.rename(tempPath, targetPath);
	} catch (renameError) {
		try {
			await NodeFS.promises.writeFile(targetPath, verification, "utf8");
		} finally {
			try { await NodeFS.promises.unlink(tempPath); } catch (e) {}
		}
	}
	return checked;
}

function safeSerialize(value) {
	try {
		if (value instanceof Error) {
			return { name: value.name, message: value.message, stack: value.stack };
		}
		return JSON.parse(JSON.stringify(value));
	} catch (e) {
		return String(value);
	}
}

const CSS_TEXT = `

div[class*="quickswitcher"][data-${NS}-active="1"] {
	height: auto !important;
	min-height: 405px !important;
	max-height: calc(100vh - 80px) !important;
	overflow: visible !important;
}

.${NS}-native-hidden {
	display: none !important;
}

.${NS}-host {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	width: 100%;
	min-height: 260px;
	max-height: min(390px, 58vh);
	overflow-y: auto;
	overflow-x: hidden;
	padding: 0 0 8px;
	flex-shrink: 0;
}
.${NS}-host::-webkit-scrollbar {
	width: 16px;
	height: 16px;
	background: transparent;
}
.${NS}-host::-webkit-scrollbar-track,
.${NS}-host::-webkit-scrollbar-thumb {
	background-clip: padding-box;
	border: 4px solid transparent;
	border-radius: 8px;
}
.${NS}-host::-webkit-scrollbar-track {
	background-color: var(--scrollbar-auto-track, transparent);
}
.${NS}-host::-webkit-scrollbar-thumb {
	min-height: 40px;
	background-color: var(--scrollbar-auto-thumb, var(--background-modifier-accent));
}
.${NS}-host::-webkit-scrollbar-button,
.${NS}-host::-webkit-scrollbar-button:single-button,
.${NS}-host::-webkit-scrollbar-corner {
	display: none !important;
	width: 0 !important;
	height: 0 !important;
	background: transparent !important;
}
.${NS}-host-standalone { width: 100%; flex-shrink: 0; }

.${NS}-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 16px;
	margin: 0 8px;
	border-radius: 4px;
	cursor: pointer;
	user-select: none;
}
.${NS}-row:hover {
	background: var(--background-modifier-hover);
}
.${NS}-row.${NS}-selected {
	background: var(--background-modifier-selected);
}
.${NS}-row:active {
	background: var(--background-modifier-active);
}
.${NS}-row.${NS}-compact {
	padding: 3px 16px;
}

.${NS}-iconbox {
	position: relative;
	width: 32px;
	height: 32px;
	flex-shrink: 0;
}
.${NS}-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: block;
	background: var(--background-secondary-alt);
}
.${NS}-compact .${NS}-iconbox { width: 24px; height: 24px; }
.${NS}-compact .${NS}-avatar  { width: 24px; height: 24px; }
.${NS}-status {
	position: absolute;
	right: -1px;
	bottom: -1px;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	border: 2px solid var(--background-floating, var(--background-primary));
	box-sizing: border-box;
}
.${NS}-status-online  { background: var(--status-positive, #23a55a); }
.${NS}-status-idle    { background: var(--status-warning, #f0b232); }
.${NS}-status-dnd     { background: var(--status-danger,  #f23f43); }
.${NS}-status-offline,
.${NS}-status-invisible,
.${NS}-status-unknown { background: var(--text-faint, #80848e); }

.${NS}-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
}
.${NS}-line1 {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
	line-height: 18px;
	min-width: 0;
}
.${NS}-name {
	font-weight: 600;
	color: var(--interactive-active);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
.${NS}-handle {
	margin-left: auto;
	padding-left: 12px;
	font-size: 13px;
	color: var(--text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 40%;
	flex-shrink: 0;
}
.${NS}-line2 {
	font-size: 12px;
	line-height: 16px;
	color: var(--text-muted);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.${NS}-row mark {
	background: none;
	color: var(--text-brand);
	font-weight: 700;
}
.${NS}-line2 mark {
	color: var(--text-normal);
	background: var(--background-modifier-accent);
	border-radius: 2px;
	padding: 0 1px;
}

.${NS}-badge {
	flex-shrink: 0;
	padding: 1px 5px;
	border-radius: 4px;
	font-size: 10px;
	line-height: 13px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	color: #fff;
	background: var(--brand-500, var(--brand-experiment, #5865f2));
}
.${NS}-badge-friend { background: var(--brand-500, var(--brand-experiment, #5865f2)); }
.${NS}-badge-guilds { background: var(--brand-500, var(--brand-experiment, #5865f2)); }
.${NS}-badge-dm     { background: var(--background-accent, #4e5058); }
.${NS}-badge-bot    { background: var(--status-warning, #f0b232); color: #1e1f22; }

.${NS}-header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px 4px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: var(--text-muted);
}
.${NS}-header .${NS}-grow { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.${NS}-progress {
	font-weight: 500;
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.${NS}-spinner {
	width: 12px;
	height: 12px;
	border: 2px solid var(--text-muted);
	border-top-color: transparent;
	border-radius: 50%;
	animation: ${NS}-spin 0.8s linear infinite;
}
@keyframes ${NS}-spin { to { transform: rotate(360deg); } }
.${NS}-empty {
	padding: 18px 14px 20px;
	text-align: center;
	font-size: 13px;
	line-height: 1.5;
	color: var(--text-muted);
}
.${NS}-footer {
	padding: 8px 14px 10px;
	font-size: 11px;
	color: var(--text-muted);
}
.${NS}-footer b { color: var(--text-normal); font-weight: 600; }

.${NS}-protip-amp {
	color: var(--text-brand) !important;
	font-weight: 700;
	cursor: help;
}

.${NS}-copy-overlay {
	position: fixed;
	inset: 0;
	z-index: 4000;
	background: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
}
.${NS}-copy-modal {
	width: 560px;
	max-width: 90vw;
	background: var(--background-primary);
	border-radius: 8px;
	padding: 16px;
	box-shadow: var(--elevation-high, 0 12px 24px rgba(0, 0, 0, 0.45));
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.${NS}-copy-title {
	font-size: 16px;
	font-weight: 700;
	color: var(--header-primary);
}
.${NS}-copy-hint {
	font-size: 13px;
	line-height: 1.4;
	color: var(--text-muted);
}
.${NS}-copy-text {
	width: 100%;
	height: 220px;
	resize: none;
	background: var(--background-secondary);
	color: var(--text-normal);
	border: 1px solid var(--background-modifier-accent);
	border-radius: 4px;
	padding: 8px;
	font-family: var(--font-code, monospace);
	font-size: 11px;
	box-sizing: border-box;
}
.${NS}-copy-btnrow {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.${NS}-msgicon {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--background-secondary-alt);
	color: var(--text-muted);
	flex-shrink: 0;
	font-size: 15px;
	font-weight: 700;
}

.${NS}-settings {
	display: flex;
	flex-direction: column;
	gap: 16px;
	color: var(--text-normal);
	padding-bottom: 24px;
}

.${NS}-hero {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px;
	border-radius: 8px;
	background: linear-gradient(135deg, var(--background-secondary) 0%, var(--background-secondary-alt) 100%);
	border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
}
.${NS}-hero-logo {
	width: 46px;
	height: 46px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26px;
	font-weight: 800;
	color: #fff;
	background: var(--brand-500, var(--brand-experiment, #5865f2));
	box-shadow: var(--elevation-low, 0 2px 6px rgba(0,0,0,0.25));
	flex-shrink: 0;
	user-select: none;
}
.${NS}-hero-main { flex: 1; min-width: 0; }
.${NS}-hero-title {
	font-size: 17px;
	font-weight: 700;
	color: var(--header-primary, var(--interactive-active));
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}
.${NS}-hero-ver {
	font-size: 11px;
	font-weight: 700;
	padding: 2px 7px;
	border-radius: 999px;
	background: var(--brand-500, var(--brand-experiment, #5865f2));
	color: #fff;
}
.${NS}-hero-sub {
	margin-top: 2px;
	font-size: 13px;
	color: var(--text-muted);
}
.${NS}-hero-links {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	flex-wrap: wrap;
}
.${NS}-linkbtn {
	font-size: 12px;
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 4px;
	color: var(--text-link, #00a8fc);
	background: var(--background-primary);
	border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
	cursor: pointer;
	text-decoration: none;
}
.${NS}-linkbtn:hover { text-decoration: underline; }

.${NS}-card {
	border-radius: 8px;
	background: var(--background-secondary);
	border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
	padding: 14px 16px;
}
.${NS}-card-title {
	font-size: 13px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--header-secondary, var(--text-muted));
	margin-bottom: 8px;
}
.${NS}-card-text {
	font-size: 13px;
	line-height: 1.55;
	color: var(--text-muted);
}

.${NS}-btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	border: none;
	border-radius: 4px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	color: #fff;
	background: var(--brand-500, var(--brand-experiment, #5865f2));
	transition: filter 0.1s ease;
}
.${NS}-btn:hover { filter: brightness(1.12); }
.${NS}-btn:active { filter: brightness(0.9); }
.${NS}-btn-secondary {
	color: var(--text-normal);
	background: var(--background-secondary-alt);
	border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
}
.${NS}-btn-danger { background: var(--status-danger, #f23f43); }
.${NS}-btnrow { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

.${NS}-diaggrid {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 4px 12px;
	margin-top: 10px;
	font-size: 12.5px;
	font-family: var(--font-code, monospace);
}
.${NS}-diag-ok   { color: var(--status-positive, #23a55a); font-weight: 700; }
.${NS}-diag-bad  { color: var(--status-danger, #f23f43); font-weight: 700; }
.${NS}-diag-warn { color: var(--status-warning, #f0b232); font-weight: 700; }
.${NS}-diag-key  { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.${NS}-logview {
	margin-top: 10px;
	max-height: 180px;
	overflow-y: auto;
	border-radius: 6px;
	background: var(--background-tertiary);
	padding: 8px 10px;
	font-family: var(--font-code, monospace);
	font-size: 11.5px;
	line-height: 1.6;
	color: var(--text-muted);
	white-space: pre-wrap;
	word-break: break-word;
}

.${NS}-settings-footer {
	font-size: 11.5px;
	color: var(--text-muted);
	text-align: center;
	padding-top: 4px;
}
.${NS}-settings-footer b { color: var(--text-normal); }

.${NS}-msgicon img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 50%;
	display: block;
}

.${NS}-setrow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 10px 0;
	border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
}
.${NS}-card .${NS}-setrow:first-of-type { border-top: none; }
.${NS}-setrow-text { flex: 1; min-width: 0; }
.${NS}-setrow-name { font-size: 14px; font-weight: 500; color: var(--text-normal); }
.${NS}-setrow-note { margin-top: 2px; font-size: 12px; line-height: 1.4; color: var(--text-muted); }
.${NS}-switch {
	position: relative;
	width: 40px;
	height: 24px;
	border: none;
	border-radius: 999px;
	background: var(--background-modifier-active, #4e5058);
	cursor: pointer;
	flex-shrink: 0;
	padding: 0;
	transition: background-color 0.15s ease;
}
.${NS}-switch[aria-checked="true"] { background: var(--brand-500, #5865f2); }
.${NS}-switch-knob {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: #fff;
	transition: left 0.15s ease;
	box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.${NS}-switch[aria-checked="true"] .${NS}-switch-knob { left: 19px; }
.${NS}-switch:focus-visible { outline: 2px solid var(--text-link, #00a8fc); outline-offset: 2px; }
.${NS}-setrow-slider { display: block; }
.${NS}-slider-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.${NS}-slider-val {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
	background: var(--background-tertiary, var(--background-primary));
	padding: 2px 8px;
	border-radius: 4px;
}
.${NS}-slider {
	width: 100%;
	margin-top: 8px;
	accent-color: var(--brand-500, #5865f2);
	cursor: pointer;
}

`;

const ModuleRegistry = {

	entries: new Map(),

	define(key, label, required, strategies) {
		this.entries.set(key, { label, required, mod: null, strategy: null, error: null, strategies });
	},

	resolve(key) {
		const entry = this.entries.get(key);
		if (!entry) return null;
		if (entry.mod || entry.strategy) return entry.mod;
		for (const [name, fn] of entry.strategies) {
			try {
				const mod = fn();
				if (mod) {
					entry.mod = mod;
					entry.strategy = name;
					Journal.debug("webpack", `${entry.label}: found via ${name}`);
					return mod;
				}
			} catch (e) {
				entry.error = String(e?.message ?? e);
				Journal.debug("webpack", `${entry.label}: strategy ${name} failed`, entry.error);
			}
		}
		entry.strategy = "none";
		if (entry.required) Journal.error("webpack", `${entry.label}: NOT FOUND (required)`);
		else Journal.warn("webpack", `${entry.label}: not found (optional)`);
		return null;
	},

	get(key) {
		return this.resolve(key);
	},

	report() {
		const out = {};
		for (const [key, e] of this.entries) {
			this.resolve(key);
			out[key] = {
				label: e.label,
				required: e.required,
				found: !!e.mod,
				strategy: e.strategy,
				error: e.error
			};
		}
		return out;
	}
};

function webpackApi() {
	try {
		return (typeof BdApi !== "undefined" && BdApi?.Webpack) ? BdApi.Webpack : null;
	} catch (e) {
		return null;
	}
}

function tryGetStore(name) {
	const W = webpackApi();
	if (!W) return null;
	try {
		if (typeof W.getStore === "function") return W.getStore(name) ?? null;
	} catch (e) {  }
	return null;
}

function tryGetModule(filter, { first = true, searchExports = false } = {}) {
	const W = webpackApi();
	if (!W || typeof W.getModule !== "function") return null;
	try {
		return W.getModule(filter, { first, searchExports }) ?? null;
	} catch (e) {
		return null;
	}
}

function hasFns(...names) {
	return (m) => !!m && names.every((n) => typeof m[n] === "function");
}

function isNavigationModule(m) {
	return !!m && typeof m.transitionTo === "function"
		&& (typeof m.replaceWith === "function" || typeof m.transitionToGuild === "function"
			|| typeof m.back === "function" || typeof m.goBack === "function");
}

function moduleMatches(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	if (value instanceof Set) return [...value];
	return [value];
}

function collectRestCandidates() {
	const W = webpackApi();
	if (!W || typeof W.getModule !== "function") return [];
	const out = [];
	const seen = new Set();
	const add = (m) => {
		for (const x of [m, m?.default, m?.RestAPI, m?.HTTP]) {
			if (!x || typeof x.get !== "function" || typeof x.post !== "function" || seen.has(x)) continue;
			seen.add(x);
			out.push(x);
		}
	};
	const filter = (m) => !!m && typeof m.get === "function" && typeof m.post === "function";
	for (const opts of [
		{ first: false, searchExports: true },
		{ first: false, searchExports: false }
	]) {
		try {
			for (const m of moduleMatches(W.getModule(filter, opts))) add(m);
		} catch (e) {  }
	}

	out.sort((a, b) => Number(typeof b.getAPIBaseURL === "function") - Number(typeof a.getAPIBaseURL === "function"));
	return out.slice(0, 40);
}

function withTimeout(promise, ms, label) {
	let timer;
	return Promise.race([
		Promise.resolve(promise).finally(() => clearTimeout(timer)),
		new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms); })
	]);
}

class VerifiedRestAPI {
	constructor(provider = collectRestCandidates) {
		this.provider = provider;
		this.active = null;
		this.preferredForm = null;
		this.resolving = null;
		this.checked = 0;
		this.samples = [];
	}

	async ensure() {
		if (this.active) return this.active;
		if (this.resolving) return this.resolving;
		this.resolving = this.resolveCandidates().finally(() => { this.resolving = null; });
		return this.resolving;
	}

	async resolveCandidates() {
		const candidates = this.provider();
		this.checked = candidates.length;
		this.samples = [];
		for (let index = 0; index < candidates.length; index++) {
			const candidate = candidates[index];
			for (const form of ["object", "string"]) {
				try {
					const arg = form === "object" ? { url: "/users/@me", query: {} } : "/users/@me";
					const raw = await withTimeout(Reflect.apply(candidate.get, candidate, [arg]), 1800, `REST #${index + 1}`);
					const body = decodeRestResponse(raw);
					if (body && /^\d{15,22}$/.test(String(body.id ?? ""))) {
						this.active = candidate;
						this.preferredForm = form;
						Journal.info("transport", "genuine RestAPI verified", { candidate: index + 1, form, checked: candidates.length });
						return candidate;
					}
					if (this.samples.length < 4) this.samples.push(`#${index + 1}/${form}: ${describeShape(body)}`);
				} catch (e) {
					if (this.samples.length < 4) this.samples.push(`#${index + 1}/${form}: ${String(e?.message ?? e).slice(0, 100)}`);
				}
			}
		}
		throw new Error(`no genuine Discord RestAPI found: checked ${candidates.length}; ${this.samples.join(" | ") || "no candidates"}`);
	}

	async request(method, arg) {
		for (let attempt = 0; attempt < 2; attempt++) {
			const mod = await this.ensure();
			try {
				return await Reflect.apply(mod[method], mod, [arg]);
			} catch (e) {
				const httpError = e && (typeof e.status === "number" || typeof e.statusCode === "number");
				if (httpError || attempt === 1) throw e;
				Journal.warn("transport", "REST module failed mid-session, re-resolving", e);
				this.active = null;
				this.preferredForm = null;
			}
		}
		throw new Error("REST request failed unexpectedly");
	}

	async get(arg) {
		return this.request("get", arg);
	}

	async post(arg) {
		return this.request("post", arg);
	}

	describe() {
		return this.active
			? `verified: form=${this.preferredForm}, candidates=${this.checked}`
			: `not verified, candidates at last attempt=${this.checked}`;
	}
}

function hasStringKeys(...names) {
	return (m) => !!m && typeof m === "object" && names.every((n) => typeof m[n] === "string");
}

ModuleRegistry.define("user", "UserStore", true, [
	["getStore", () => tryGetStore("UserStore")],
	["byKeys:getCurrentUser/getUser", () => tryGetModule(hasFns("getCurrentUser", "getUser"))],
	["byKeys:getUser", () => tryGetModule(hasFns("getUser", "getCurrentUserId"))]
]);

ModuleRegistry.define("relationship", "RelationshipStore", true, [
	["getStore", () => tryGetStore("RelationshipStore")],
	["byKeys:isFriend/getRelationships", () => tryGetModule(hasFns("isFriend", "getRelationships"))],
	["byKeys:isFriend", () => tryGetModule(hasFns("isFriend", "getFriendIds"))],
	["byKeys:getFriendIDs", () => tryGetModule((m) => !!m && typeof m.getFriendIDs === "function")],
]);

ModuleRegistry.define("guild", "GuildStore", true, [
	["getStore", () => tryGetStore("GuildStore")],
	["byKeys:getGuild/getGuilds", () => tryGetModule(hasFns("getGuild", "getGuilds"))]
]);

ModuleRegistry.define("guildMember", "GuildMemberStore", true, [
	["getStore", () => tryGetStore("GuildMemberStore")],
	["byKeys:getMember/isMember", () => tryGetModule(hasFns("getMember", "isMember"))],
	["byKeys:getMember", () => tryGetModule(hasFns("getMember", "getMembers"))]
]);

ModuleRegistry.define("channel", "ChannelStore", true, [
	["getStore", () => tryGetStore("ChannelStore")],
	["byKeys:getChannel/getDMFromUserId", () => tryGetModule(hasFns("getChannel", "getDMFromUserId"))],
	["byKeys:getChannel", () => tryGetModule(hasFns("getChannel", "getMutablePrivateChannels"))]
]);

ModuleRegistry.define("presence", "PresenceStore", false, [
	["getStore", () => tryGetStore("PresenceStore")],
	["byKeys:getStatus/getActivities", () => tryGetModule(hasFns("getStatus", "getActivities"))],
	["byKeys:getStatus", () => tryGetModule(hasFns("getStatus", "isOnline"))]
]);

ModuleRegistry.define("locale", "LocaleStore", false, [
	["getStore", () => tryGetStore("LocaleStore")],
	["byKeys:locale", () => tryGetModule((m) => m && typeof m.locale === "string" && typeof m.getLocale === "function")]
]);

ModuleRegistry.define("rest", "REST (API, verified)", false, [
	["adaptive:live-/users/@me", () => new VerifiedRestAPI()]
]);

ModuleRegistry.define("navigation", "Navigation (transitionTo)", false, [
	["byKeys:transitionTo/replaceWith", () => tryGetModule(hasFns("transitionTo", "replaceWith"))],
	["byKeys:transitionTo/transitionToGuild", () => tryGetModule(hasFns("transitionTo", "transitionToGuild"))],
	["exports:transitionTo/replaceWith", () => tryGetModule(hasFns("transitionTo", "replaceWith"), { searchExports: true })],
	["exports:transitionTo/transitionToGuild", () => tryGetModule(hasFns("transitionTo", "transitionToGuild"), { searchExports: true })],
	["exports:validated", () => tryGetModule(isNavigationModule, { searchExports: true })],
	["default:validated", () => {
		const m = tryGetModule((x) => !!(x && typeof x === "object" && x.default && isNavigationModule(x.default)));
		return m ? m.default : null;
	}],
	["byKeys:validated", () => tryGetModule(isNavigationModule)]
]);

ModuleRegistry.define("dmActions", "DM actions (openPrivateChannel)", false, [
	["byKeys:openPrivateChannel", () => tryGetModule(hasFns("openPrivateChannel"))],
	["byKeys:openPrivateChannel/ensure", () => tryGetModule(hasFns("openPrivateChannel", "ensurePrivateChannel"))]
]);

ModuleRegistry.define("profileModal", "User profile modal", false, [
	["byKeys:openUserProfileModal", () => tryGetModule(hasFns("openUserProfileModal"))],
	["byKeys:fetchProfile", () => tryGetModule(hasFns("fetchProfile", "openUserProfileModal"))]
]);

ModuleRegistry.define("qsStyles", "QuickSwitcher styles", false, [
	["keys:quickswitcher/result/protip", () => tryGetModule(hasStringKeys("quickswitcher", "result", "protip"))],
	["keys:quickswitcher/result", () => tryGetModule(hasStringKeys("quickswitcher", "result"))],
	["keys:quickswitcher/input", () => tryGetModule(hasStringKeys("quickswitcher", "input"))]
]);

function normalizeRelationships(raw) {
	const out = new Set();
	if (!raw) return out;
	if (Array.isArray(raw) || raw instanceof Set) {
		for (const id of raw) if (id != null) out.add(String(id));
		return out;
	}
	const entries = raw instanceof Map ? raw.entries() : Object.entries(raw);
	for (const [uid, val] of entries) {
		const type = typeof val === "number" || typeof val === "string"
			? Number(val)
			: Number(val?.type ?? val?.relationshipType ?? val?.relationship_type);
		if (type === 1) out.add(String(uid));
	}
	return out;
}

function resolveRecipient(entry) {
	if (entry == null) return null;
	if (typeof entry === "object") {
		if (entry.username) return entry;
		if (entry.id != null) return DataService.getUser(entry.id);
		return null;
	}
	return DataService.getUser(entry);
}

const DataService = {

	currentUser() {
		try {
			return ModuleRegistry.get("user")?.getCurrentUser?.() ?? null;
		} catch (e) {
			Journal.debug("data", "currentUser failed", e);
			return null;
		}
	},

	currentUserId() {
		return this.currentUser()?.id ?? null;
	},

	getUser(id) {
		try {
			return ModuleRegistry.get("user")?.getUser?.(id) ?? null;
		} catch (e) {
			return null;
		}
	},

	cachedUsers() {
		try {
			const store = ModuleRegistry.get("user");
			const raw = store?.getUsers?.() ?? store?.getAllUsers?.() ?? {};
			const values = raw instanceof Map ? [...raw.values()]
				: Array.isArray(raw) ? raw : Object.values(raw ?? {});
			const me = String(this.currentUserId() ?? "");
			return values.filter((u) => u && u.id != null && String(u.id) !== me);
		} catch (e) {
			Journal.debug("data", "cachedUsers failed", e);
			return [];
		}
	},

	friendIds() {
		const store = ModuleRegistry.get("relationship");
		if (!store) return new Set();
		for (const name of ["getFriendIDs", "getFriendIds"]) {
			try {
				if (typeof store[name] === "function") {
					const ids = normalizeRelationships(store[name]());
					if (ids.size) return ids;
				}
			} catch (e) {  }
		}
		for (const name of ["getRelationships", "getMutableRelationships"]) {
			try {
				if (typeof store[name] === "function") {
					const ids = normalizeRelationships(store[name]());
					if (ids.size) return ids;
				}
			} catch (e) { Journal.debug("data", `friendIds:${name} failed`, e); }
		}
		return new Set();
	},

	isFriend(userId) {
		try {
			const store = ModuleRegistry.get("relationship");
			if (typeof store?.isFriend === "function") return !!store.isFriend(userId);
		} catch (e) {  }
		return this.friendIds().has(userId);
	},

	guilds() {
		try {
			const raw = ModuleRegistry.get("guild")?.getGuilds?.();
			const list = Object.values(raw ?? {}).filter((g) => g && g.id);
			return list;
		} catch (e) {
			Journal.debug("data", "guilds failed", e);
			return [];
		}
	},

	getGuild(id) {
		try {
			return ModuleRegistry.get("guild")?.getGuild?.(id) ?? null;
		} catch (e) {
			return null;
		}
	},

	guildMembers(guildId) {
		try {
			const store = ModuleRegistry.get("guildMember");
			const raw = store?.getMembers?.(guildId) ?? store?.getMutableMembers?.(guildId) ?? {};
			const values = raw instanceof Map ? [...raw.values()]
				: Array.isArray(raw) ? raw : Object.values(raw ?? {});
			return values.map((m) => {
				if (!m) return null;
				const userId = m.userId ?? m.user_id ?? m.user?.id ?? m.id;
				return userId == null ? null : { ...m, userId: String(userId) };
			}).filter(Boolean);
		} catch (e) {
			Journal.debug("data", "guildMembers failed", e);
			return [];
		}
	},

	getMember(guildId, userId) {
		try {
			return ModuleRegistry.get("guildMember")?.getMember?.(guildId, userId) ?? null;
		} catch (e) {
			return null;
		}
	},

	isMemberOf(guildId, userId) {
		try {
			const store = ModuleRegistry.get("guildMember");
			if (typeof store?.isMember === "function" && store.isMember(guildId, userId)) return true;
			return !!store?.getMember?.(guildId, userId);
		} catch (e) {
			return false;
		}
	},

	mutualGuildIds(userId) {
		const ids = new Set();
		for (const g of this.guilds()) {
			if (this.isMemberOf(g.id, userId)) ids.add(g.id);
		}
		return ids;
	},

	privateChannels() {
		try {
			const store = ModuleRegistry.get("channel");
			const raw = store?.getMutablePrivateChannels?.()
				?? store?.getPrivateChannels?.()
				?? {};
			const list = Object.values(raw).filter((c) => c && c.id);
			list.sort((a, b) => (snowflakeNewer(a.lastMessageId, b.lastMessageId) ? -1 : 1));
			return list;
		} catch (e) {
			Journal.debug("data", "privateChannels failed", e);
			return [];
		}
	},

	dmChannelId(userId) {
		try {
			return ModuleRegistry.get("channel")?.getDMFromUserId?.(userId) ?? null;
		} catch (e) {
			return null;
		}
	},

	getChannel(id) {
		try {
			return ModuleRegistry.get("channel")?.getChannel?.(id) ?? null;
		} catch (e) {
			return null;
		}
	},

	status(userId) {
		try {
			const s = ModuleRegistry.get("presence")?.getStatus?.(userId);
			return typeof s === "string" && s ? s : "unknown";
		} catch (e) {
			return "unknown";
		}
	},

	stats() {
		const dms = this.privateChannels();
		let dmChannels = 0;
		for (const ch of dms) if (ch?.type === 1) dmChannels++;
		let cachedMembers = 0;
		for (const g of this.guilds().slice(0, 100)) cachedMembers += this.guildMembers(g.id).length;
		return {
			friends: this.friendIds().size,
			guilds: this.guilds().length,
			privateChannels: dms.length,
			dmChannels,
			cachedMembers
		};
	}
};

const SCORE = Object.freeze({
	EXACT: 120,
	PREFIX: 80,
	WORD_PREFIX: 60,
	SUBSTRING: 45,
	ACRONYM: 35,
	SUBSEQUENCE_MAX: 30,
	TRANSLIT_PENALTY: 5,
	BOOST_FRIEND: 25,
	BOOST_DM: 15,
	BOOST_GUILD_EACH: 5,
	BOOST_GUILD_CAP: 15,
	BOOST_NICK: 10
});

function parseAmpQuery(raw) {
	const body = String(raw ?? "").replace(/^&+/, "");
	if (body === "") return { mode: "browse", userQuery: "", messageQuery: "" };
	const norm = body.trimStart();
	const hadTrailingSpace = /\s$/.test(body) && body.trim().length > 0;
	const words = norm.trim().split(/\s+/).filter(Boolean);
	if (words.length === 1 && !hadTrailingSpace) {
		return { mode: "pick", userQuery: words[0], messageQuery: "" };
	}
	return {
		mode: "messages",
		userQuery: words[0] ?? "",
		messageQuery: words.slice(1).join(" "),
		allMessages: words.slice(1).length === 0
	};
}

function subsequenceScore(query, target) {
	if (!query || !target) return -1;
	let qi = 0;
	let firstHit = -1;
	let lastHit = -1;
	for (let ti = 0; ti < target.length && qi < query.length; ti++) {
		if (target[ti] === query[qi]) {
			if (firstHit < 0) firstHit = ti;
			lastHit = ti;
			qi++;
		}
	}
	if (qi < query.length) return -1;
	const span = lastHit - firstHit + 1;
	return query.length / Math.max(span, 1);
}

function scoreField(variants, fieldValue) {
	const field = normalize(fieldValue);
	if (!field) return { score: 0, viaTranslit: false };
	let best = { score: 0, viaTranslit: false };
	variants.forEach((q, idx) => {
		const viaTranslit = idx > 0;
		let s = 0;
		if (field === q) s = SCORE.EXACT;
		else if (field.startsWith(q)) s = SCORE.PREFIX;
		else if (field.split(/[\s\-_.,;:!?]+/).some((w) => w.startsWith(q))) s = SCORE.WORD_PREFIX;
		else if (field.includes(q)) s = SCORE.SUBSTRING;
		else if (acronym(field).startsWith(q)) s = SCORE.ACRONYM;
		if (s > 0 && viaTranslit) s = Math.max(1, s - SCORE.TRANSLIT_PENALTY);
		if (s > best.score) best = { score: s, viaTranslit };
	});
	return best;
}

function scoreCandidate(variants, candidate, opts) {
	const fields = [
		{ value: displayName(candidate.user), kind: "name" },
		{ value: candidate.user?.username, kind: "username" }
	];
	for (const nick of candidate.nicks ?? []) fields.push({ value: nick, kind: "nick" });

	let best = { score: 0, field: null, viaTranslit: false };
	for (const f of fields) {
		const r = scoreField(variants, f.value);
		if (r.score > 0) {
			let s = r.score;
			if (f.kind === "nick") s += SCORE.BOOST_NICK;
			if (s > best.score) best = { score: s, field: f.kind, viaTranslit: r.viaTranslit };
		}
	}

	if (opts.friendsFirst && candidate.isFriend) best.score += SCORE.BOOST_FRIEND;
	if (candidate.hasDm) best.score += SCORE.BOOST_DM;
	best.score += Math.min((candidate.mutualGuilds?.length ?? 0) * SCORE.BOOST_GUILD_EACH, SCORE.BOOST_GUILD_CAP);
	return best;
}

function searchUsers(query, candidates, opts) {
	const translitEnabled = opts.translitEnabled !== false;
	const variants = queryVariants(query, translitEnabled);
	const out = [];
	for (const c of candidates) {
		const r = scoreCandidate(variants, c, opts);
		const hasQuery = variants.length > 0 && variants[0] !== "";
		if (hasQuery && !r.field) continue;
		out.push({ candidate: c, score: r.score, matchedField: r.field, viaTranslit: r.viaTranslit });
	}
	out.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;

		return String(displayName(a.candidate.user)).localeCompare(String(displayName(b.candidate.user)));
	});
	return out.slice(0, opts.limit ?? 10);
}

function computeBadges(candidate) {
	const badges = [];
	if (candidate.isFriend) badges.push({ type: "friend" });
	const g = candidate.mutualGuilds?.length ?? 0;
	if (g > 0) badges.push({ type: "guilds", count: g });
	if (candidate.hasDm) badges.push({ type: "dm" });
	if (candidate.user?.bot) badges.push({ type: "bot" });
	return badges;
}

function contextLine(candidate, locale, opts) {
	const parts = [];
	if (candidate.isFriend) parts.push(translate(locale, "ctxFriend"));
	const guilds = candidate.mutualGuilds ?? [];
	if (guilds.length) {
		const maxShow = opts.maxMutualGuilds ?? 3;
		const names = guilds.slice(0, maxShow).map((g) => truncate(g.name, 24));
		const rest = guilds.length - names.length;
		const label = `${guilds.length} ${plural(locale, guilds.length, translate(locale, "pluralGuilds"))}`;
		parts.push(`${label}: ${names.join(", ")}${rest > 0 ? " " + translate(locale, "ctxMore", { n: rest }) : ""}`);
	}
	if (candidate.hasDm) parts.push(translate(locale, "ctxDm"));
	if (candidate.hasGroupDm) parts.push(translate(locale, "ctxGroup"));
	return parts.join(" · ");
}

function highlightRanges(display, query) {
	const d = String(display ?? "");
	const q = normalize(query);
	if (!d || !q) return [];
	const lower = d.toLowerCase().replace(/ё/g, "е");
	const map = [];
	let collapsed = "";
	let pendingSpace = -1;
	for (let i = 0; i < lower.length; i++) {
		if (/\s/.test(lower[i])) {
			if (collapsed.length > 0 && pendingSpace < 0) pendingSpace = i;
			continue;
		}
		if (pendingSpace >= 0) { collapsed += " "; map.push(pendingSpace); pendingSpace = -1; }
		collapsed += lower[i];
		map.push(i);
	}
	const ranges = [];
	let from = 0;
	while (from <= collapsed.length - q.length) {
		const idx = collapsed.indexOf(q, from);
		if (idx < 0) break;
		ranges.push([map[idx], map[idx + q.length - 1] + 1]);
		from = idx + q.length;
	}
	return ranges;
}

function buildCandidates(sources) {
	const map = new Map();
	const ensure = (user) => {
		if (!user || user.id == null) return null;
		const id = String(user.id);
		if (!map.has(id)) {
			map.set(id, {
				user,
				nicks: [],
				isFriend: false,
				hasDm: false,
				hasGroupDm: false,
				mutualGuilds: []
			});
		}
		return map.get(id);
	};

	for (const user of sources.cachedUsers ?? []) ensure(user);

	for (const user of sources.friends ?? []) {
		const c = ensure(user);
		if (c) c.isFriend = true;
	}

	for (const entry of sources.dmUsers ?? []) {
		const c = ensure(entry.user);
		if (!c) continue;
		if (entry.isGroup) c.hasGroupDm = true;
		else c.hasDm = true;
	}

	const guildIndex = new Map();
	for (const entry of sources.guildMembers ?? []) {
		const c = ensure(entry.user);
		if (!c) continue;
		if (entry.nick) c.nicks.push(entry.nick);
		let per = guildIndex.get(String(entry.user.id));
		if (!per) { per = new Map(); guildIndex.set(String(entry.user.id), per); }
		per.set(String(entry.guildId), { id: entry.guildId, name: entry.guildName });
	}
	for (const [uid, per] of guildIndex) {
		const c = map.get(uid);
		if (c) c.mutualGuilds = [...per.values()];
	}
	return [...map.values()];
}

function parseRestText(value) {
	if (typeof value !== "string") return value;
	const text = value.trim();
	if (!text) return null;
	try { return JSON.parse(text); } catch (e) { return value; }
}

function decodeRestResponse(res) {
	let payload = res;
	if (res && typeof res === "object") {
		if (res.body !== undefined && res.body !== null) payload = res.body;
		else if (typeof res.text === "string" && res.text.trim()) payload = parseRestText(res.text);
		else if (typeof res.xhr?.responseText === "string" && res.xhr.responseText.trim()) payload = parseRestText(res.xhr.responseText);
	}
	payload = parseRestText(payload);
	const status = Number(res?.statusCode ?? res?.status ?? 0);
	if (status >= 400) {
		const err = new Error(`HTTP ${status}`);
		err.status = status;
		err.statusCode = status;
		err.body = payload;
		throw err;
	}
	return payload;
}

function messageSearchTab(body) {
	if (!body || typeof body !== "object") return null;
	if (body.tabs?.messages && typeof body.tabs.messages === "object") return body.tabs.messages;
	if (Array.isArray(body.messages) || body.total_results !== undefined) return body;
	return null;
}

function isSearchPayload(body) {
	const tab = messageSearchTab(body);
	return !!tab && Array.isArray(tab.messages);
}

function pickSearchHit(group, userId) {
	if (!Array.isArray(group)) return group || null;
	const uid = String(userId ?? "");
	return group.find((m) => m?.hit === true && String(m?.author?.id ?? "") === uid)
		?? group.find((m) => String(m?.author?.id ?? "") === uid)
		?? group.find((m) => m?.hit === true)
		?? group[0]
		?? null;
}

function extractSearchResult(body, userId) {
	const tab = messageSearchTab(body);
	if (!tab || !Array.isArray(tab.messages)) return null;
	const messages = tab.messages.map((g) => pickSearchHit(g, userId)).filter(Boolean);
	return {
		total: toInt(tab.total_results ?? tab.total ?? body?.total_results, messages.length),
		messages,
		cursor: tab.cursor ?? null
	};
}

async function restGetCompat(rest, url, query = {}, prefer = "object") {
	const objectCall = () => rest.get({ url, query });
	const stringCall = () => {
		const qs = Object.entries(query)
			.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
			.join("&");
		return rest.get(qs ? `${url}?${qs}` : url);
	};
	const [first, second] = prefer === "string" ? [stringCall, objectCall] : [objectCall, stringCall];
	try {
		const res = await first();
		return decodeRestResponse(res);
	} catch (e) {

		if (Number(e?.status ?? e?.statusCode ?? 0) >= 400) throw e;
		const res = await second();
		return decodeRestResponse(res);
	}
}

async function restPostCompat(rest, url, body) {
	if (!rest || typeof rest.post !== "function") throw new Error("REST.post unavailable");
	const res = await rest.post({ url, body, oldFormErrors: true });
	return decodeRestResponse(res);
}

class MessageSearchTransport {

	constructor(rest, log) {
		this.rest = rest;
		this.log = log ?? (() => {});
		this.token = 0;
		this.form = null;
		this.cooldownUntil = 0;
		this.cache = new Map();
		this.session = null;
	}

	available() {
		return !!(this.rest && typeof this.rest.get === "function");
	}

	cancelAll() {
		this.token++;
	}

	async searchTarget(target, userId, text, perTarget, page = null) {
		const tabUrl = target.kind === "dm-global"
			? "/users/@me/messages/search/tabs"
			: target.kind === "dm"
				? `/channels/${target.id}/messages/search/tabs`
				: `/guilds/${target.id}/messages/search/tabs`;
		const tabLimit = target.kind === "dm-global" ? Math.max(15, Math.min(25, perTarget * 5)) : Math.max(1, perTarget);
		const messageTab = {
			sort_by: "timestamp",
			sort_order: "desc",
			author_id: [String(userId)],
			cursor: page?.cursor ?? null,
			limit: tabLimit
		};
		if (text) messageTab.content = text;
		const requestBody = { tabs: { messages: messageTab }, track_exact_total_hits: false };

		if (typeof this.rest?.post === "function") {
			try {
				const body = await this.requestWithRetry("post", tabUrl, requestBody);
				const result = extractSearchResult(body, userId);
				if (!result) throw new Error(`unexpected tab-search shape: ${describeShape(body)}`);
				this.form = this.rest?.preferredForm ?? "verified";
				return result;
			} catch (e) {

				const status = Number(e?.status ?? e?.statusCode ?? 0);
				if (target.kind === "dm-global" || (status && status !== 404 && status !== 405)) throw e;
				this.log("transport", `guild ${target.id} tab-search unavailable, legacy GET`, e);
			}
		}

		if (target.kind === "dm-global") throw new Error("global DM search requires a genuine REST.post");

		const query = {
			author_id: userId,
			include_nsfw: true,
			sort_by: "timestamp",
			sort_order: "desc",
			limit: perTarget
		};
		if (text) query.content = text;
		if (page?.offset) query.offset = page.offset;
		const url = target.kind === "dm"
			? `/channels/${target.id}/messages/search`
			: `/guilds/${target.id}/messages/search`;
		let body = await this.getWithRetry(url, query);
		if (!isSearchPayload(body) && !this.form) {
			const retry = await this.getWithRetry(url, query, "string");
			if (isSearchPayload(retry)) { this.form = "string"; body = retry; }
		}
		const result = extractSearchResult(body, userId);
		if (!result) throw new Error(`unexpected legacy-search shape: ${describeShape(body)}`);
		return result;
	}

	async getWithRetry(url, query, prefer) {
		return this.requestWithRetry("get", url, query, prefer);
	}

	async requestWithRetry(methodName, url, payload, prefer) {
		const attempt = () => withTimeout(
			methodName === "post"
				? restPostCompat(this.rest, url, payload)
				: restGetCompat(this.rest, url, payload, prefer ?? this.form ?? this.rest?.preferredForm ?? "object"),
			SEARCH_REQUEST_TIMEOUT_MS,
			"search"
		);
		let lastErr = null;
		for (let i = 0; i < 2; i++) {
			try { return await attempt(); }
			catch (e) {
				lastErr = e;
				if (e && e.status === 429 && i < 1) {
					const wait = Math.min(toInt(e?.body?.retry_after, 1), 4) * 1000;
					this.cooldownUntil = Date.now() + wait;
					this.log("transport", `429 rate limit, retrying in ${wait} ms`);
					await sleep(wait);
					continue;
				}
				const status = Number(e?.status ?? e?.statusCode ?? 0);
				if ((!status || status >= 500) && i < 1) {
					this.log("transport", "transient error, retrying request", e);
					await sleep(400);
					continue;
				}
				throw e;
			}
		}
		throw lastErr;
	}

	async run(targets, opts, onBatch, onDone) {
		const token = ++this.token;
		const alive = () => token === this.token;
		const session = {
			token,
			opts,
			states: targets.map((t) => ({ target: t, cursor: null, offset: 0, done: false, searched: false, lastFirstId: "" })),
			collected: [],
			seen: new Set(),
			grand: 0,
			errors: 0,
			denied: 0,
			errorSamples: []
		};
		this.session = session;

		const targetFingerprint = `${targets.length}:${targets[0]?.id ?? ""}:${targets[targets.length - 1]?.id ?? ""}`;
		const cacheKey = `${opts.userId}|${opts.text ?? ""}|${opts.perTarget}|${opts.totalLimit}|${targetFingerprint}`;
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL_MS && cached.items.length) {
			onBatch?.(cached.items.slice(), null);
		}

		await this.runRound(session, Math.max(1, opts.totalLimit), onBatch);
		if (!alive()) return;
		this.cache.set(cacheKey, { ts: Date.now(), items: session.collected.slice(0, opts.totalLimit) });
		if (this.cache.size > 30) this.cache.delete(this.cache.keys().next().value);
		onDone?.({
			total: session.grand,
			found: session.collected.length,
			denied: session.denied,
			errors: session.errors,
			errorSamples: session.errorSamples,
			hasMore: this.hasMore()
		});
	}

	hasMore() {
		const s = this.session;
		return !!(s && s.token === this.token && s.states.some((st) => !st.done));
	}

	async loadMore(onBatch, onDone) {
		const session = this.session;
		if (!session || session.token !== this.token) return false;
		if (!session.states.some((st) => !st.done)) return false;
		await this.runRound(session, Math.max(10, session.opts.totalLimit), onBatch);
		if (session.token !== this.token) return false;
		onDone?.({
			total: session.grand,
			found: session.collected.length,
			denied: session.denied,
			errors: session.errors,
			hasMore: this.hasMore()
		});
		return true;
	}

	async runRound(session, roundLimit, onBatch) {
		const alive = () => session.token === this.token;
		const queue = session.states.filter((st) => !st.done);
		const totalThisRound = queue.length;
		let doneThisRound = 0;
		let addedThisRound = 0;

		const worker = async () => {
			while (queue.length && alive()) {
				if (addedThisRound >= roundLimit) return;
				const cooldown = this.cooldownUntil - Date.now();
				if (cooldown > 0) await sleep(Math.min(cooldown, 5000));
				if (!alive()) return;
				const st = queue.shift();
				if (!st || st.done) continue;
				try {
					const r = await this.searchTarget(st.target, session.opts.userId, session.opts.text, session.opts.perTarget, { cursor: st.cursor, offset: st.offset });
					if (!alive()) return;
					const firstId = r.messages.length ? String(r.messages[0]?.id ?? "") : "";
					const repeatPage = st.searched && firstId !== "" && firstId === st.lastFirstId;
					if (!st.searched) session.grand += r.total;
					st.searched = true;
					st.lastFirstId = firstId;
					st.cursor = r.cursor ?? null;
					st.offset += r.messages.length;
					if (repeatPage) {
						st.done = true;
					} else {
						for (const m of r.messages) {
							const item = this.toItem(m, st.target);
							if (session.seen.has(item.id)) continue;
							session.seen.add(item.id);
							session.collected.push(item);
							addedThisRound++;
						}
						const moreViaCursor = !!st.cursor;
						const moreViaOffset = !st.cursor && r.messages.length >= session.opts.perTarget && st.offset < r.total;
						if (!r.messages.length || (!moreViaCursor && !moreViaOffset)) st.done = true;
						session.collected.sort((a, b) => (snowflakeNewer(a.id, b.id) ? -1 : 1));
					}
				} catch (e) {
					if (!alive()) return;
					st.done = true;
					if (e && (e.status === 403 || e.status === 404)) session.denied++;
					else {
						session.errors++;
						if (session.errorSamples.length < 3) session.errorSamples.push(String(e?.message ?? e).slice(0, 200));
						this.log("transport", `target ${st.target.id} failed`, e);
					}
				}
				doneThisRound++;
				if (alive()) {
					onBatch?.(session.collected.slice(), { done: doneThisRound, total: totalThisRound, found: session.collected.length, errors: session.errors, denied: session.denied });
				}
			}
		};

		const workers = [];
		const n = Math.max(1, Math.min(session.opts.concurrency ?? 6, 8));
		for (let i = 0; i < n; i++) workers.push(worker());
		await Promise.all(workers);
	}
	toItem(message, target) {
		let content = String(message?.content ?? "").replace(/\s+/g, " ").trim();
		if (!content && Array.isArray(message?.attachments) && message.attachments.length) {
			content = message.attachments.map((a) => a?.filename ?? "").filter(Boolean).join(", ");
		}
		if (!content && Array.isArray(message?.embeds) && message.embeds.length) content = "Embed";
		const channelId = String(message?.channel_id ?? "");
		const channel = DataService.getChannel(channelId);
		const privateName = channel?.name || target.name;
		let iconUrl = null;
		if (target.kind === "guild") {
			iconUrl = guildIconUrl(DataService.getGuild(target.id), AVATAR_SIZE);
		} else if (channel) {
			if (channel.type === 3 && channel.icon) {
				iconUrl = `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.webp?size=${AVATAR_SIZE}`;
			} else if (channel.type === 1) {
				const me = String(DataService.currentUserId() ?? "");
				const recs = Array.isArray(channel.recipients) ? channel.recipients : [];
				const other = recs.map((r) => resolveRecipient(r)).find((u) => u && String(u.id) !== me);
				if (other) iconUrl = avatarUrl(other, AVATAR_SIZE);
			}
		}
		return {
			id: String(message?.id ?? "0"),
			channelId,
			guildId: target.kind === "guild" ? target.id : (channel?.guild_id ?? null),
			targetName: target.kind === "guild"
				? (channel?.name ? `#${channel.name} · ${target.name}` : target.name)
				: privateName,
			targetKind: target.kind,
			iconUrl,
			content: truncate(content, 180),
			ts: snowflakeTime(message?.id),
			jump: target.kind === "guild"
				? `/channels/${target.id}/${message?.channel_id}/${message?.id}`
				: `/channels/@me/${message?.channel_id}/${message?.id}`
		};
	}
}

class RowRenderer {

	constructor(opts) {
		this.settings = opts.settings;
		this.locale = opts.locale;
		this.native = opts.nativeClasses ?? {};
	}

	t(key, vars) {
		return translate(this.locale, key, vars);
	}

	appendHighlighted(container, display, query) {
		const text = String(display ?? "");
		const ranges = highlightRanges(text, query);
		if (!ranges.length) {
			container.appendChild(document.createTextNode(text));
			return;
		}
		let pos = 0;
		for (const [start, end] of ranges) {
			if (start > pos) container.appendChild(document.createTextNode(text.slice(pos, start)));
			container.appendChild(el("mark", null, text.slice(start, end)));
			pos = end;
		}
		if (pos < text.length) container.appendChild(document.createTextNode(text.slice(pos)));
	}

	renderAvatar(user, status) {
		const box = el("div", `${NS}-iconbox ${this.native.icon ?? ""}`.trim());
		const img = el("img", `${NS}-avatar`);
		img.src = avatarUrl(user);
		img.alt = "";
		img.setAttribute("aria-hidden", "true");
		img.loading = "lazy";
		box.appendChild(img);
		if (this.settings.showStatusDot && status) {
			box.appendChild(el("span", `${NS}-status ${NS}-status-${status}`));
		}
		return box;
	}

	renderBadge(badge) {
		let text = "";
		let cls = "";
		switch (badge.type) {
			case "friend":
				text = this.t("badgeFriend");
				cls = `${NS}-badge-friend`;
				break;
			case "guilds":
				text = badge.count > 1 ? `${this.t("badgeServer")} ×${badge.count}` : this.t("badgeServer");
				cls = `${NS}-badge-guilds`;
				break;
			case "dm":
				text = this.t("badgeDm");
				cls = `${NS}-badge-dm`;
				break;
			case "bot":
				text = this.t("badgeBot");
				cls = `${NS}-badge-bot`;
				break;
			default:
				return el("span");
		}
		return el("span", `${NS}-badge ${cls}`, text);
	}

	renderUserRow(result, meta) {
		const c = result.candidate;
		const row = el("div", `${NS}-row ${this.native.row ?? ""}`.trim());
		if (this.settings.compactMode) row.classList.add(`${NS}-compact`);
		if (meta.selected) row.classList.add(`${NS}-selected`);
		row.setAttribute("role", "option");
		row.setAttribute("aria-selected", meta.selected ? "true" : "false");
		row.dataset.index = String(meta.index);
		row.dataset.kind = "user";
		row.dataset.userId = String(c.user.id);
		row.id = `${NS}-opt-${meta.index}`;

		row.appendChild(this.renderAvatar(c.user, meta.status));

		const main = el("div", `${NS}-main ${this.native.content ?? ""}`.trim());

		const line1 = el("div", `${NS}-line1 ${this.native.match ?? ""}`.trim());
		const name = el("span", `${NS}-name`);
		this.appendHighlighted(name, displayName(c.user), meta.query);
		line1.appendChild(name);
		if (this.settings.showBadges) {
			for (const b of computeBadges(c)) line1.appendChild(this.renderBadge(b));
		}
		main.appendChild(line1);

		if (this.settings.showContextLine && !this.settings.compactMode) {
			const ctx = contextLine(c, this.locale, this.settings);
			if (ctx) main.appendChild(el("div", `${NS}-line2 ${this.native.note ?? ""}`.trim(), ctx));
		}
		row.appendChild(main);

		if (this.settings.showHandles && c.user?.username) {
			row.appendChild(el("span", `${NS}-handle`, "@" + c.user.username));
		}
		return row;
	}

	renderMessageRow(item, meta) {
		const row = el("div", `${NS}-row ${this.native.row ?? ""}`.trim());
		if (meta.selected) row.classList.add(`${NS}-selected`);
		row.setAttribute("role", "option");
		row.setAttribute("aria-selected", meta.selected ? "true" : "false");
		row.dataset.index = String(meta.index);
		row.dataset.kind = "message";
		row.dataset.jump = item.jump;
		row.id = `${NS}-opt-${meta.index}`;

		row.appendChild(this.renderTargetIcon(item));

		const main = el("div", `${NS}-main ${this.native.content ?? ""}`.trim());
		const line1 = el("div", `${NS}-line1 ${this.native.match ?? ""}`.trim());
		const target = el("span", `${NS}-name`);
		this.appendHighlighted(target, item.targetName, "");
		line1.appendChild(target);
		main.appendChild(line1);

		const line2 = el("div", `${NS}-line2 ${this.native.note ?? ""}`.trim());
		this.appendHighlighted(line2, item.content, meta.query);
		main.appendChild(line2);
		row.appendChild(main);

		if (item.ts) {
			row.appendChild(el("span", `${NS}-handle`, relativeTime(item.ts, this.locale)));
		}
		return row;
	}

	renderTargetIcon(item) {
		const box = el("div", `${NS}-msgicon ${this.native.icon ?? ""}`.trim());
		if (item.iconUrl) {
			const img = el("img", `${NS}-msgicon-img`);
			img.src = item.iconUrl;
			img.alt = "";
			img.setAttribute("aria-hidden", "true");
			img.loading = "lazy";
			box.appendChild(img);
			return box;
		}
		const name = String(item.targetName ?? "").trim();
		box.textContent = item.targetKind === "guild" ? (name.charAt(0) || "#") : "@";
		return box;
	}

	renderHeader(text, progress) {
		const head = el("div", `${NS}-header ${this.native.header ?? ""}`.trim());
		head.appendChild(el("span", `${NS}-grow`, text));
		if (progress) {
			const p = el("span", `${NS}-progress`);
			if (progress.spinning) p.appendChild(el("span", `${NS}-spinner`));
			p.appendChild(el("span", null, progress.text));
			head.appendChild(p);
		}
		return head;
	}

	renderEmpty(title, hint) {
		const box = el("div", `${NS}-empty`);
		box.appendChild(el("div", null, title));
		if (hint) box.appendChild(el("div", null, hint));
		return box;
	}

	renderFooter(text) {
		return el("div", `${NS}-footer`, text);
	}
}

class SwitcherIntegration {

	constructor(plugin) {
		this.plugin = plugin;
		this.root = null;
		this.input = null;
		this.scroller = null;
		this.host = null;
		this.observer = null;
		this.nativeClasses = {};
		this.selected = -1;
		this.itemCount = 0;
		this.active = false;
		this.lastView = null;
		this.lastInputValue = "";
		this.healTimer = null;
		this.nativeHiddenNodes = new Set();

		this.onInputBound = () => {
			try { this.lastInputValue = String(this.input?.value ?? ""); } catch (e) {}
			this.handleInput();
		};
		this.onKeydownBound = (e) => this.handleKeydown(e);
		this.evaluateDebounced = debounce(() => this.evaluate(), 60);
	}

	start() {

		const existing = document.querySelector('div[class*="quickswitcher"]');
		if (existing) this.attach(existing);

		this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
		this.observer.observe(document.body, { childList: true, subtree: true });
		Journal.debug("switcher", "observer started");
	}

	stop() {
		try { this.observer?.disconnect(); } catch (e) {}
		this.observer = null;
		this.detach();
		this.stopHealLoop();
		Journal.debug("switcher", "integration stopped");
	}

	handleMutations(mutations) {
		if (!this.root) {
			let hasAdded = false;
			for (const m of mutations) if (m.addedNodes.length) { hasAdded = true; break; }
			if (!hasAdded) return;
		}
		let needDetachCheck = false;
		for (const m of mutations) {
			for (const node of m.addedNodes) {
				if (!(node instanceof HTMLElement)) continue;
				let qs = null;
				if (node.matches?.('div[class*="quickswitcher"]')) qs = node;
				else qs = node.querySelector?.('div[class*="quickswitcher"]') ?? null;
				if (qs && qs !== this.root) this.attach(qs);
			}
			if (m.removedNodes.length) needDetachCheck = true;
		}
		if (needDetachCheck && this.root && !document.contains(this.root)) {
			this.detach();
		}

		if (this.root && document.contains(this.root)) {
			const inp = this.pickInput(this.root);
			if (inp && inp !== this.input) this.attach(this.root);
		}

		if (this.active && this.root && document.contains(this.root)) {
			if (!this.host || !document.contains(this.host)) {
				this.ensureHost();
				if (this.host && this.host.childNodes.length === 0 && this.lastView) this.render(this.lastView);
				Journal.info("switcher", "host restored after Discord rerender");
			}
			this.hideNativeContent();
			if (!this.root.querySelector(`.${NS}-protip-amp`)) this.patchProtip(this.root);
		}
	}

	pickInput(root) {
		const inputs = [...root.querySelectorAll("input")];
		return inputs.find((inp) => {
			try {
				const r = inp.getBoundingClientRect?.();
				return !r || r.width > 0;
			} catch (e) { return true; }
		}) ?? inputs[0] ?? null;
	}

	attach(root) {
		const input = this.pickInput(root);
		if (!input) return;
		if (this.input === input && this.root === root) return;

		this.unbindInput();

		this.root = root;
		this.input = input;
		this.lastInputValue = String(input.value ?? "");

		this.scroller = root.querySelector('div[class*="scroller"]') ?? null;
		this.harvestNativeClasses(root);

		input.addEventListener("input", this.onInputBound);
		input.addEventListener("keyup", this.onInputBound);
		input.addEventListener("keydown", this.onKeydownBound, true);

		this.patchProtip(root);
		this.evaluate();
		Journal.info("switcher", "attach", { inputs: root.querySelectorAll("input").length, value: this.lastInputValue, v: PLUGIN_VERSION });
	}

	unbindInput() {
		if (this.input) {
			try { this.input.removeEventListener("input", this.onInputBound); } catch (e) {}
			try { this.input.removeEventListener("keyup", this.onInputBound); } catch (e) {}
			try { this.input.removeEventListener("keydown", this.onKeydownBound, true); } catch (e) {}
		}
		this.input = null;
	}

	detach() {
		this.unbindInput();
		this.deactivate();
		this.root = null;
		this.scroller = null;
	}

	harvestNativeClasses(root) {
		const styles = ModuleRegistry.get("qsStyles");
		if (styles) {
			this.nativeClasses = {
				row: styles.result ?? "",
				content: styles.content ?? "",
				icon: styles.icon ?? "",
				match: styles.match ?? "",
				note: styles.note ?? "",
				header: styles.header ?? ""
			};
			return;
		}

		try {
			const rowEl = root.querySelector('[class*="result"]');
			const matchEl = root.querySelector('[class*="match"]');
			const noteEl = root.querySelector('[class*="note"]');
			this.nativeClasses = {
				row: rowEl ? rowEl.className : "",
				content: "",
				icon: "",
				match: matchEl ? matchEl.className : "",
				note: noteEl ? noteEl.className : "",
				header: ""
			};
		} catch (e) {
			this.nativeClasses = {};
		}
	}

	patchProtip(root) {
		try {
			const protip = root.querySelector('div[class*="protip"]');
			if (!protip) return;
			if (protip.querySelector(`.${NS}-protip-amp`)) return;

			const leaves = [...protip.querySelectorAll("*")].filter((el) => {
				const txt = (el.textContent || "").trim();
				return el.children.length === 0 && /^[@#!*\$]$/.test(txt);
			});
			if (!leaves.length) return;
			if (leaves.some((el) => (el.textContent || "").trim() === TRIGGER)) return;

			const anchor = leaves.find((el) => (el.textContent || "").trim() === "$")
				?? leaves[leaves.length - 1];

			const gap = anchor.nextSibling && anchor.nextSibling.nodeType === Node.TEXT_NODE
				? document.createTextNode(" ")
				: document.createTextNode(" ");

			const amp = el("span", `${anchor.className ?? ""} ${NS}-protip-amp`.trim(), TRIGGER);
			amp.title = this.plugin.t("protipTitle");

			anchor.parentNode.insertBefore(gap, anchor.nextSibling);
			anchor.parentNode.insertBefore(amp, gap.nextSibling);
			Journal.debug("switcher", "& added to the hint row");
		} catch (e) {
			Journal.debug("switcher", "patchProtip failed", e);
		}
	}

	handleInput() {
		this.lastInputValue = String(this.input?.value ?? "");
		this.evaluateDebounced();
	}

	evaluate() {
		if (!this.input) return;

		const live = String(this.input.value ?? "");
		const value = live || String(this.lastInputValue ?? "");
		if (!value.startsWith(TRIGGER)) {
			this.deactivate();
			return;
		}
		this.activate();
		const parsed = parseAmpQuery(value);
		Journal.debug("switcher", "query", { value, mode: parsed.mode });
		this.plugin.dispatchQuery(parsed);
	}

	activate() {
		if (!this.root) return;
		if (!this.active) {
			this.root.setAttribute(`data-${NS}-active`, "1");
			this.active = true;
		}
		this.ensureHost();
		this.hideNativeContent();
		this.startHealLoop();
	}

	deactivate() {
		if (this.root) this.root.removeAttribute(`data-${NS}-active`);
		this.active = false;
		this.stopHealLoop();
		this.clearNativeHiding();
		try { this.input?.removeAttribute("aria-activedescendant"); } catch (e) {}
		this.selected = -1;
		this.lastRenderedSelected = -1;
		this.itemCount = 0;
		this.lastView = null;
		if (this.host) {
			try { this.host.remove(); } catch (e) {}
			this.host = null;
		}
	}

	startHealLoop() {
		if (this.healTimer) return;
		this.healTimer = setInterval(() => this.healCheck(), 250);
		try { this.healTimer.unref?.(); } catch (e) {}
	}

	stopHealLoop() {
		if (this.healTimer) {
			clearInterval(this.healTimer);
			this.healTimer = null;
		}
	}

	healCheck() {
		if (!this.active || !this.root || !document.contains(this.root)) return;
		const hostGone = !this.host || !document.contains(this.host);
		const hostEmpty = !!this.lastView && !!this.host && this.host.childNodes.length === 0;
		if (hostGone || hostEmpty) {
			this.ensureHost();
			if (hostEmpty && this.lastView) this.render(this.lastView);
			Journal.info("switcher", "self-heal: view restored", { hostGone, hostEmpty });
		}
		this.hideNativeContent();
		if (!this.root.querySelector(`.${NS}-protip-amp`)) this.patchProtip(this.root);
	}

	containsNode(container, node) {
		let cur = node;
		while (cur) {
			if (cur === container) return true;
			cur = cur.parentNode;
		}
		return false;
	}

	branchUnderRoot(node) {
		const root = this.root;
		let cur = node;
		while (cur && cur.parentNode && cur.parentNode !== root) cur = cur.parentNode;
		return cur && cur.parentNode === root ? cur : null;
	}

	resolveHostParent() {
		const root = this.root;
		if (!root || !document.contains(root)) return null;
		const protip = root.querySelector('div[class*="protip"]');
		const inputBranch = this.branchUnderRoot(this.input);
		const protipBranch = this.branchUnderRoot(protip);
		if (protipBranch && protipBranch !== inputBranch) {
			return { parent: root, before: protipBranch, standalone: true };
		}
		if (protip?.parentNode) {
			return { parent: protip.parentNode, before: protip, standalone: true };
		}
		return { parent: root, before: null, standalone: true };
	}

	clearNativeHiding() {
		for (const node of this.nativeHiddenNodes) {
			try { node.classList?.remove(`${NS}-native-hidden`); } catch (e) {}
		}
		this.nativeHiddenNodes.clear();
	}

	hideNativeContent() {
		const root = this.root;
		const host = this.host;
		const input = this.input;
		const protip = root?.querySelector?.('div[class*="protip"]') ?? null;
		if (!root || !host) return;

		const protectedBy = (node) => {
			for (const keep of [host, input, protip]) {
				if (!keep) continue;
				if (node === keep || this.containsNode(node, keep) || this.containsNode(keep, node)) return true;
			}
			return false;
		};
		const hide = (node) => {
			if (!node || node === root || protectedBy(node)) return;
			try {
				node.classList.add(`${NS}-native-hidden`);
				this.nativeHiddenNodes.add(node);
			} catch (e) {}
		};

		const inputBranch = this.branchUnderRoot(input);
		const protipBranch = this.branchUnderRoot(protip);
		for (const child of [...root.children]) {
			if (child === inputBranch || child === protipBranch || child === host) continue;
			hide(child);
		}

		for (const selector of ['div[class*="scroller"]', '[class*="result"]', '[class*="empty"]', '[class*="header"]']) {
			for (const node of root.querySelectorAll(selector)) hide(node);
		}
	}

	ensureHost() {
		const target = this.resolveHostParent();
		if (!target) return null;
		const flag = `${NS}-host-standalone`;
		if (this.host) {
			target.parent.insertBefore(this.host, target.before);
			this.host.classList.add(flag);
			return this.host;
		}
		const host = el("div", `${NS}-host ${flag}`);
		host.setAttribute("role", "listbox");
		host.addEventListener("click", (e) => {
			const row = e.target?.closest?.(`.${NS}-row`);
			if (!row || !host.contains(row)) return;
			this.plugin.activateItem(Number(row.dataset.index));
		});
		host.addEventListener("scroll", () => {
			try {
				if (host.scrollTop + host.clientHeight >= host.scrollHeight - 90) this.plugin.requestMoreMessages();
			} catch (e) {}
		});
		target.parent.insertBefore(host, target.before);
		this.host = host;
		return host;
	}

	debugState() {
		return {
			active: this.active,
			rootConnected: !!(this.root && document.contains(this.root)),
			inputValue: String(this.input?.value ?? this.lastInputValue ?? ""),
			hostConnected: !!(this.host && document.contains(this.host)),
			hostParentClass: String(this.host?.parentNode?.className ?? ""),
			hostChildren: this.host?.childNodes?.length ?? 0,
			lastViewRows: this.lastView?.rows?.length ?? 0,
			hiddenNativeNodes: this.nativeHiddenNodes.size
		};
	}

	render(view) {
		if (!this.active) return;
		this.lastView = view;
		const host = this.ensureHost();
		if (!host) return;
		this.hideNativeContent();
		Journal.debug("switcher", "render", { rows: (view.rows ?? []).length, empty: !!view.empty, standalone: host.classList.contains(`${NS}-host-standalone`) });
		const keepScroll = this.selected === this.lastRenderedSelected && host.scrollTop > 0;
		const prevScrollTop = host.scrollTop;
		host.textContent = "";
		if (view.header) host.appendChild(view.header);
		for (const row of view.rows ?? []) host.appendChild(row);
		if (view.empty) host.appendChild(view.empty);
		if (view.footer) host.appendChild(view.footer);
		this.itemCount = (view.rows ?? []).length;
		if (keepScroll) host.scrollTop = prevScrollTop;
		this.lastRenderedSelected = this.selected;
		this.updateSelectionDom(!keepScroll);
		try {
			if (host.scrollHeight <= host.clientHeight + 4) this.plugin.requestMoreMessages();
		} catch (e) {}
	}

	updateSelectionDom(allowScroll = true) {
		if (!this.host) return;
		const rows = this.host.querySelectorAll(`.${NS}-row`);
		rows.forEach((r, i) => r.classList.toggle(`${NS}-selected`, i === this.selected));
		const sel = rows[this.selected];
		if (this.input) {
			try {
				if (sel?.id) this.input.setAttribute("aria-activedescendant", sel.id);
				else this.input.removeAttribute("aria-activedescendant");
			} catch (e) {}
		}
		if (!allowScroll) return;
		try { sel?.scrollIntoView?.({ block: "nearest" }); } catch (e) {}
	}

	handleKeydown(e) {
		if (!this.active) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault(); e.stopPropagation();
				this.moveSelection(1);
				break;
			case "ArrowUp":
				e.preventDefault(); e.stopPropagation();
				this.moveSelection(-1);
				break;
			case "Enter":
				e.preventDefault(); e.stopPropagation();
				if (e.ctrlKey || e.metaKey) this.plugin.openDirectly(this.selected >= 0 ? this.selected : 0);
				else this.confirmSelection();
				break;
			case "Tab":
				e.preventDefault(); e.stopPropagation();
				this.plugin.requestMessagesMode();
				break;
			default:
				break;
		}
	}

	moveSelection(delta) {
		if (!this.itemCount) return;
		this.selected = (this.selected + delta + this.itemCount) % this.itemCount;
		this.updateSelectionDom();
	}

	confirmSelection() {
		const idx = this.selected >= 0 ? this.selected : 0;
		this.plugin.activateItem(idx);
	}

	setInputValue(value) {
		if (!this.input) return;

		let applied = false;
		try {
			const proto = Object.getPrototypeOf(this.input);
			const desc = proto ? Object.getOwnPropertyDescriptor(proto, "value") : null;
			if (desc && typeof desc.set === "function") {
				desc.set.call(this.input, value);
				applied = true;
			}
		} catch (e) {  }
		if (!applied) this.input.value = value;
		this.input.dispatchEvent(new Event("input", { bubbles: true }));
		this.input.focus();
		this.evaluate();
	}
}

const PROJECT_LINKS = Object.freeze({
	github: "https://github.com/florzzzbd/UserGlobalSearch",
	issues: "https://github.com/florzzzbd/UserGlobalSearch/issues"
});

function buildSettingsSchema(plugin) {
	const t = (k) => plugin.t(k);
	const S = plugin.settings;
	return [
		{
			type: "category",
			id: "search",
			name: t("catSearch"),
			collapsible: true,
			shown: true,
			settings: [
				{ type: "slider", id: "maxUserResults", name: t("setMaxUserResults"), note: t("setMaxUserResultsDesc"),
					value: S.maxUserResults, min: SETTING_LIMITS.maxUserResults.min, max: SETTING_LIMITS.maxUserResults.max, step: 1 },
				{ type: "slider", id: "debounceMs", name: t("setDebounce"), note: t("setDebounceDesc"),
					value: S.debounceMs, min: SETTING_LIMITS.debounceMs.min, max: SETTING_LIMITS.debounceMs.max, step: 50, units: "ms" },
				{ type: "switch", id: "translitEnabled", name: t("setTranslit"), note: t("setTranslitDesc"), value: S.translitEnabled },
				{ type: "switch", id: "friendsFirst", name: t("setFriendsFirst"), note: t("setFriendsFirstDesc"), value: S.friendsFirst },
				{ type: "switch", id: "includeDMs", name: t("setIncludeDMs"), note: t("setIncludeDMsDesc"), value: S.includeDMs },
				{ type: "switch", id: "includeGuildMembers", name: t("setIncludeMembers"), note: t("setIncludeMembersDesc"), value: S.includeGuildMembers }
			]
		},
		{
			type: "category",
			id: "appearance",
			name: t("catAppearance"),
			collapsible: true,
			shown: false,
			settings: [
				{ type: "switch", id: "showStatusDot", name: t("setStatusDot"), note: t("setStatusDotDesc"), value: S.showStatusDot },
				{ type: "switch", id: "showBadges", name: t("setBadges"), note: t("setBadgesDesc"), value: S.showBadges },
				{ type: "switch", id: "showHandles", name: t("setHandles"), note: t("setHandlesDesc"), value: S.showHandles },
				{ type: "switch", id: "showContextLine", name: t("setContextLine"), note: t("setContextLineDesc"), value: S.showContextLine },
				{ type: "switch", id: "compactMode", name: t("setCompact"), note: t("setCompactDesc"), value: S.compactMode },
				{ type: "slider", id: "maxMutualGuilds", name: t("setMaxMutual"), note: t("setMaxMutualDesc"),
					value: S.maxMutualGuilds, min: SETTING_LIMITS.maxMutualGuilds.min, max: SETTING_LIMITS.maxMutualGuilds.max, step: 1 }
			]
		},
		{
			type: "category",
			id: "messages",
			name: t("catMessages"),
			collapsible: true,
			shown: false,
			settings: [
				{ type: "switch", id: "messageSearchEnabled", name: t("setMsgEnabled"), note: t("setMsgEnabledDesc"), value: S.messageSearchEnabled },
				{ type: "switch", id: "searchOnlyGuilds", name: t("setOnlyGuilds"), note: t("setOnlyGuildsDesc"), value: S.searchOnlyGuilds },
				{ type: "slider", id: "perTargetLimit", name: t("setPerTarget"), note: t("setPerTargetDesc"),
					value: S.perTargetLimit, min: SETTING_LIMITS.perTargetLimit.min, max: SETTING_LIMITS.perTargetLimit.max, step: 1 },
				{ type: "slider", id: "maxTargets", name: t("setMaxTargets"), note: t("setMaxTargetsDesc"),
					value: S.maxTargets, min: SETTING_LIMITS.maxTargets.min, max: SETTING_LIMITS.maxTargets.max, step: 5 },
				{ type: "slider", id: "totalLimit", name: t("setTotalLimit"), note: t("setTotalLimitDesc"),
					value: S.totalLimit, min: SETTING_LIMITS.totalLimit.min, max: SETTING_LIMITS.totalLimit.max, step: 5 },
				{ type: "slider", id: "searchConcurrency", name: t("setConcurrency"), note: t("setConcurrencyDesc"),
					value: S.searchConcurrency, min: SETTING_LIMITS.searchConcurrency.min, max: SETTING_LIMITS.searchConcurrency.max, step: 1 }
			]
		},
		{
			type: "category",
			id: "advanced",
			name: t("catAdvanced"),
			collapsible: true,
			shown: false,
			settings: [
				{ type: "switch", id: "debugLogs", name: t("setDebug"), note: t("setDebugDesc"), value: S.debugLogs }
			]
		}
	];
}

class Diagnostics {
	constructor(plugin) {
		this.plugin = plugin;
		this.lastReport = null;
		this.lastChecks = null;
	}

	runSelfTest() {
		const checks = [];
		const push = (key, label, ok, detail) => checks.push({ key, label, ok: !!ok, detail: detail ?? "" });

		const hasBd = typeof BdApi !== "undefined";
		push("bdapi", "BetterDiscord API", hasBd, hasBd ? `v${BdApi?.version ?? "?"}` : "BdApi unavailable");

		const report = ModuleRegistry.report();
		for (const [key, info] of Object.entries(report)) {
			push(
				`mod:${key}`,
				info.label,
				info.found ? true : !info.required,
				info.found ? `found (${info.strategy})` : (info.required ? "NOT FOUND (required)" : "not found (optional)")
			);
		}

		try {
			const fixtures = buildCandidates({
				friends: [{ id: "1", username: "sonya", globalName: "Соня" }],
				dmUsers: [{ user: { id: "2", username: "whiti", globalName: "Whiti" }, isGroup: false }],
				guildMembers: [{ user: { id: "3", username: "void", globalName: "Void" }, guildId: "9", guildName: "Test", nick: "Voidyy" }]
			});
			const res = searchUsers("соня", fixtures, { translitEnabled: true, friendsFirst: true, limit: 10 });
			const engineOk = res.length >= 1 && String(res[0].candidate.user.id) === "1";
			push("engine", "Search engine (translit + ranking)", engineOk, engineOk ? "translit sonya -> Sonya found" : "engine returned wrong order");
		} catch (e) {
			push("engine", "Search engine", false, String(e?.message ?? e));
		}

		try {
			const renderer = new RowRenderer({ settings: this.plugin.settings, locale: this.plugin.locale, nativeClasses: {} });
			const row = renderer.renderUserRow(
				{ candidate: { user: { id: "1", username: "sonya", globalName: "Соня" }, nicks: [], isFriend: true, hasDm: true, hasGroupDm: false, mutualGuilds: [{ id: "9", name: "Test" }] }, score: 1 },
				{ selected: false, index: 0, query: "сон", status: "online" }
			);
			const renderOk = !!row.querySelector(`.${NS}-avatar`) && !!row.querySelector(`.${NS}-badge`);
			push("render", "Row render (avatar + badge)", renderOk);
		} catch (e) {
			push("render", "Row render", false, String(e?.message ?? e));
		}

		try {
			const stats = DataService.stats();
			push("data", "Data access", stats.guilds > 0 || stats.friends > 0 || stats.dmChannels > 0,
				`friends: ${stats.friends}, guilds: ${stats.guilds}, DMs: ${stats.dmChannels}, cached members: ${stats.cachedMembers}`);
		} catch (e) {
			push("data", "Data access", false, String(e?.message ?? e));
		}

		const qsOpen = !!document.querySelector('div[class*="quickswitcher"]');
		push("switcher", "Quick switcher window", true, qsOpen ? "open, integration active" : "closed - press Ctrl+K for a full check");

		const rest = ModuleRegistry.get("rest");
		push("transport", "Message transport", !!rest, rest ? "REST module found" : "module not found - &name text mode unavailable");

		const okCount = checks.filter((c) => c.ok).length;
		this.lastChecks = checks;
		this.lastReport = this.buildReport(checks);
		return { checks, okCount, failCount: checks.length - okCount };
	}

	async probeTransport() {
		const rest = ModuleRegistry.get("rest");
		if (!rest) return { ok: false, detail: "REST module not found" };
		const started = Date.now();
		try {

			const body = await restGetCompat(rest, "/users/@me", {}, rest?.preferredForm ?? "object");
			const ms = Date.now() - started;
			if (!body || !/^\d{15,22}$/.test(String(body.id ?? ""))) {
				return { ok: false, detail: `HTTP in ${ms}ms but no id - shape: ${describeShape(body)}` };
			}
			let detail = `RestAPI verified in ${ms}ms, id=${body.id}`;
			if (typeof rest.describe === "function") detail += ` · ${rest.describe()}`;
			try {
				const tr = this.plugin.transport;
				if (!tr?.available?.()) return { ok: true, detail: detail + " · global search skipped (transport not ready)" };
				const t2 = Date.now();
				const r = await tr.searchTarget({ kind: "dm-global", id: "@me", name: "probe" }, String(body.id), "", 1);
				detail += ` · global search: OK, total=${r.total} in ${Date.now() - t2}ms`;
				return { ok: true, detail };
			} catch (e2) {
				return { ok: false, detail: `${detail} · global search FAIL: ${e2?.message ?? e2}` };
			}
		} catch (e) {
			return { ok: false, detail: `failed in ${Date.now() - started}ms: ${e?.status ?? ""} ${e?.message ?? e}` };
		}
	}

	buildReport(checks) {
		return {
			plugin: { name: PLUGIN_NAME, version: PLUGIN_VERSION },
			time: new Date().toISOString(),
			locale: this.plugin.locale,
			userAgent: (typeof navigator !== "undefined" ? navigator.userAgent : "n/a"),
			bdVersion: (typeof BdApi !== "undefined" ? BdApi?.version : undefined) ?? "unknown",
			modules: ModuleRegistry.report(),
			stats: safeCall(() => DataService.stats()),
			integration: safeCall(() => this.plugin.integration?.debugState?.() ?? null),
			relationships: safeCall(() => this.relationshipDebug()),
			settings: { ...this.plugin.settings },
			checks,
			log: Journal.dump().slice(-50)
		};
	}

	async copyReport() {
		if (!this.lastReport) this.runSelfTest();
		const text = JSON.stringify(this.lastReport, null, 2);

		try {
			const clip = (typeof DiscordNative !== "undefined") ? DiscordNative?.clipboard : null;
			if (clip && typeof clip.copy === "function") {
				clip.copy(text);
				let verified = false;
				if (typeof clip.read === "function") {
					try { verified = clip.read() === text; } catch (e) { verified = false; }
				}
				if (verified) {
					Journal.info("diag", "report copied via DiscordNative");
					return { ok: true, via: "DiscordNative" };
				}
				Journal.warn("diag", "DiscordNative.clipboard.copy not confirmed by read-back");
			}
		} catch (e) {
			Journal.debug("diag", "DiscordNative.clipboard unavailable", e);
		}

		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				let verified = false;
				try { verified = (await navigator.clipboard.readText()) === text; } catch (e) {  }
				if (verified) {
					Journal.info("diag", "report copied via navigator.clipboard");
					return { ok: true, via: "navigator" };
				}
				Journal.warn("diag", "navigator.clipboard not confirmed by read-back");
			}
		} catch (e) {
			Journal.debug("diag", "navigator.clipboard unavailable", e);
		}

		try {
			const ta = el("textarea");
			ta.value = text;
			ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
			document.body.appendChild(ta);
			ta.focus?.();
			ta.select?.();
			const okCmd = typeof document.execCommand === "function" && document.execCommand("copy");
			ta.remove();
			if (okCmd) {
				Journal.info("diag", "report copied via execCommand");
				return { ok: true, via: "execCommand" };
			}
		} catch (e) {
			Journal.debug("diag", "execCommand unavailable", e);
		}

		Journal.warn("diag", "auto-copy unconfirmed - manual copy window opened");
		this.showManualCopyModal(text);
		return { ok: false, manual: true };
	}

	showManualCopyModal(text) {
		try {
			const overlay = el("div", `${NS}-copy-overlay`);
			const modal = el("div", `${NS}-copy-modal`);
			modal.appendChild(el("div", `${NS}-copy-title`, this.plugin.t("manualCopyTitle")));
			modal.appendChild(el("div", `${NS}-copy-hint`, this.plugin.t("manualCopyHint")));
			const ta = el("textarea", `${NS}-copy-text`);
			ta.value = text;
			ta.readOnly = true;
			modal.appendChild(ta);
			const row = el("div", `${NS}-copy-btnrow`);
			const close = el("button", `${NS}-btn`, this.plugin.t("manualCopyClose"));
			close.addEventListener("click", () => overlay.remove());
			row.appendChild(close);
			modal.appendChild(row);
			overlay.appendChild(modal);
			overlay.addEventListener("click", (e) => { if (e?.target === overlay) overlay.remove(); });
			document.body.appendChild(overlay);
			ta.focus?.();
			ta.select?.();
		} catch (e) {
			Journal.error("diag", "failed to show manual copy window", e);
		}
	}

	relationshipDebug() {
		const store = ModuleRegistry.get("relationship");
		if (!store) return { found: false };
		const out = { found: true };
		try {
			const names = new Set();
			let obj = store;
			for (let depth = 0; obj && depth < 3; depth += 1) {
				for (const n of Object.getOwnPropertyNames(obj)) {
					try { if (typeof store[n] === "function") names.add(n); } catch (e) {}
				}
				obj = Object.getPrototypeOf(obj);
			}
			out.methods = [...names].sort().slice(0, 50);
		} catch (e) {
			out.methodsError = String(e?.message ?? e);
		}
		try {
			const rel = typeof store.getRelationships === "function" ? store.getRelationships() : undefined;
			out.shape = rel instanceof Map ? "Map" : Array.isArray(rel) ? "array" : typeof rel;
			let entries = [];
			let values = [];
			if (rel instanceof Map) {
				out.size = rel.size;
				entries = [...rel.entries()].slice(0, 5);
				values = [...rel.values()];
			} else if (rel && typeof rel === "object") {
				const keys = Object.keys(rel);
				out.size = keys.length;
				entries = keys.slice(0, 5).map((k) => [k, rel[k]]);
				values = Object.values(rel);
			}
			out.sample = entries.map(([k, v]) => [String(k), v && typeof v === "object" ? { ...v } : v]);
			const hist = {};
			for (const v of values) {
				const t = typeof v === "number" ? String(v) : String(v?.type ?? typeof v);
				hist[t] = (hist[t] ?? 0) + 1;
			}
			out.typeHistogram = hist;
			if (typeof store.getFriendIds === "function") {
				const f = store.getFriendIds();
				out.friendIdsLen = f instanceof Set ? f.size : Array.isArray(f) ? f.length : typeof f;
			}
		} catch (e) {
			out.error = String(e?.message ?? e);
		}
		return out;
	}
}

function describeShape(value) {
	if (value === null) return "null";
	if (Array.isArray(value)) return `array(${value.length})`;
	const t = typeof value;
	if (t !== "object") return `${t}: ${String(value).slice(0, 60)}`;
	try {
		return `object{${Object.keys(value).slice(0, 8).join(", ")}}`;
	} catch (e) {
		return t;
	}
}

function safeCall(fn) {
	try {
		return fn();
	} catch (e) {
		return { error: String(e?.message ?? e) };
	}
}

function demoCandidates() {
	const mk = (id, username, globalName, opts = {}) => ({
		user: { id, username, globalName, avatar: null, bot: !!opts.bot },
		nicks: opts.nicks ?? [],
		isFriend: !!opts.friend,
		hasDm: !!opts.dm,
		hasGroupDm: !!opts.group,
		mutualGuilds: (opts.guilds ?? []).map((name, i) => ({ id: `demo-g${id}-${i}`, name }))
	});
	return [
		mk("9001", "soloma_0", "so", { friend: true, dm: true, guilds: ["UNIE Market", "NullZone"] }),
		mk("9002", "soupify008", "I wish I'd been here", { friend: true, guilds: ["Majestic RP"] }),
		mk("9003", "_whiti", "whiti !!", { guilds: ["HoHo Community", "UNIE Market", "Alex Scripts"], dm: true }),
		mk("9004", "soslra", "void", { guilds: ["NullZone"] }),
		mk("9005", "only.keanufans23", "realkeanu_reeves1", { guilds: ["Alex Scripts", "HoHo Community"] }),
		mk("9006", "haha_hello12333", "haha_hello", { guilds: ["UNIE Market"], bot: true }),
		mk("9007", "asperinkaa", "Sona", { friend: true, dm: true, group: true })
	];
}

function demoMessages(user) {
	const name = displayName(user);
	const base = Date.now();
	const mk = (i, content, targetName, kind) => {
		const id = String(BigInt(String(Math.max(0, base - i * 86400000 - 1420070400000))) << 22n);
		return {
			id,
			channelId: `demo-c${i}`,
			guildId: kind === "guild" ? `demo-s${i}` : null,
			targetName,
			targetKind: kind,
			content,
			ts: base - i * 86400000,
			jump: "/channels/@me"
		};
	};
	return [
		mk(0, "залетай в войс, мы тут катку начинаем", "UNIE Market", "guild"),
		mk(1, "скинул тебе в лс тот самый скрипт", "ЛС", "dm"),
		mk(2, "когда вайп? уже надоело формить", "Majestic RP", "guild"),
		mk(3, "gg, было красиво", "NullZone", "guild"),
		mk(4, "завтра расскажу, спать", "ЛС", "dm")
	];
}

class UserGlobalSearch {
	constructor() {
		this.settings = this.loadSettings();
		this.locale = "en-US";
		this.integration = null;
		this.transport = null;
		this.diagnostics = new Diagnostics(this);
		this.styleNode = null;
		this.currentResults = [];
		this.currentParsed = null;
		this.debouncedSearch = null;
		this.debouncedMessages = null;
		this.loadingMore = false;
		this.messageRenderer = null;
		this.messageTargetCount = 0;
		this.updateCheckTimer = null;
		this.updateReloadTimer = null;
		this.updateCheckInFlight = false;
		this.updateOfferedVersion = null;
		this.installingUpdate = false;
		this.stopped = true;
	}

	loadSettings() {
		const out = { ...DEFAULT_SETTINGS };
		try {
			const saved = BdApi.Data.load(PLUGIN_NAME, "settings");
			if (saved && typeof saved === "object") {
				for (const key of Object.keys(DEFAULT_SETTINGS)) {
					if (saved[key] === undefined) continue;
					if (typeof DEFAULT_SETTINGS[key] === "number") out[key] = clampInt(saved[key], key);
					else out[key] = saved[key];
				}
			}
		} catch (e) {
			Journal.warn("settings", "failed to load settings, using defaults", e);
		}

		return out;
	}

	saveSettings() {
		try {
			BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
		} catch (e) {
			Journal.error("settings", "failed to save settings", e);
		}
	}

	t(key, vars) {
		return translate(this.locale, key, vars);
	}

	start() {
		this.stopped = false;
		Journal.info("core", `starting v${PLUGIN_VERSION}`);
		Journal.debugEnabled = !!this.settings.debugLogs;

		this.locale = detectLocale(ModuleRegistry.get("locale"));
		Journal.debug("core", "locale", this.locale);

		ModuleRegistry.report();

		this.injectStyles();

		this.transport = new MessageSearchTransport(ModuleRegistry.get("rest"), (s, m, d) => Journal.debug(s, m, d));

		this.debouncedSearch = debounce((parsed) => this.runUserSearch(parsed), this.settings.debounceMs);
		this.debouncedMessages = debounce((parsed) => this.runMessageFlow(parsed), Math.max(400, this.settings.debounceMs));

		this.integration = new SwitcherIntegration(this);
		this.integration.start();

		this.unwatchLocale = this.watchLocale();

		if (!this.settings.welcomed) {
			this.settings.welcomed = true;
			this.saveSettings();
			try { BdApi.UI.showToast(this.t("toastWelcome"), { type: "success" }); } catch (e) {}
		}

		this.scheduleUpdateCheck();
		Journal.info("core", "started");
	}

	stop() {
		this.stopped = true;
		if (this.updateCheckTimer) clearTimeout(this.updateCheckTimer);
		if (this.updateReloadTimer) clearTimeout(this.updateReloadTimer);
		this.updateCheckTimer = null;
		this.updateReloadTimer = null;
		Journal.info("core", "stopped");
		try { this.unwatchLocale?.(); } catch (e) {}
		this.unwatchLocale = null;
		try { this.integration?.stop(); } catch (e) {}
		this.integration = null;
		try { this.transport?.cancelAll(); } catch (e) {}
		try { this.debouncedSearch?.cancel?.(); } catch (e) {}
		try { this.debouncedMessages?.cancel?.(); } catch (e) {}
		if (this.styleNode) {
			try { this.styleNode.remove(); } catch (e) {}
			this.styleNode = null;
		}
	}

	scheduleUpdateCheck() {
		if (this.updateCheckTimer) clearTimeout(this.updateCheckTimer);
		this.updateCheckTimer = setTimeout(() => {
			this.updateCheckTimer = null;
			this.checkForUpdates();
		}, UPDATE_CHECK_DELAY_MS);
		try { this.updateCheckTimer.unref?.(); } catch (e) {}
	}

	async checkForUpdates() {
		if (this.updateCheckInFlight || this.stopped) return false;
		this.updateCheckInFlight = true;
		try {
			const remoteSource = await fetchPluginUpdateSource();
			if (this.stopped) return false;
			const update = validatePluginUpdateSource(remoteSource);
			if (comparePluginVersions(update.version, PLUGIN_VERSION) <= 0) {
				Journal.debug("updater", `already current: local ${PLUGIN_VERSION}, remote ${update.version}`);
				return false;
			}
			if (this.updateOfferedVersion === update.version) return true;
			this.updateOfferedVersion = update.version;
			this.showUpdateNotification(update);
			return true;
		} catch (e) {
			Journal.warn("updater", "failed to check for updates", e);
			if (!this.stopped) {
				try { BdApi.UI.showToast(`[${PLUGIN_NAME}] Failed to check for updates`, { type: "error" }); } catch (e2) {}
			}
			return false;
		} finally {
			this.updateCheckInFlight = false;
		}
	}

	showUpdateNotification(update) {
		const install = () => this.installUpdate(update);
		Journal.info("updater", `update ${update.version} is available`);
		try {
			if (typeof BdApi?.UI?.showNotification === "function") {
				BdApi.UI.showNotification({
					title: `${PLUGIN_NAME} Update Available!`,
					content: `Update ${update.version} is now available!`,
					actions: [{ label: "Update", onClick: install }]
				});
				return;
			}
		} catch (e) {
			Journal.warn("updater", "notification failed", e);
		}
		try {
			BdApi.UI.showConfirmationModal(
				`${PLUGIN_NAME} Update Available!`,
				`Update ${update.version} is now available!`,
				{ confirmText: "Update", cancelText: "Later", onConfirm: install }
			);
		} catch (e) {
			Journal.error("updater", "could not show update prompt", e);
		}
	}

	async installUpdate(update) {
		if (this.installingUpdate) return;
		this.installingUpdate = true;
		try {
			const checked = validatePluginUpdateSource(update.source);
			if (comparePluginVersions(checked.version, PLUGIN_VERSION) <= 0) {
				throw new Error("The downloaded file is not newer than the installed version");
			}
			const targetPath = resolveInstalledPluginPath();
			await writePluginUpdate(targetPath, checked.source);
			try { BdApi.UI.showToast(`[${PLUGIN_NAME}] Updated to ${checked.version}`, { type: "success" }); } catch (e) {}
			Journal.info("updater", `installed ${checked.version} to ${targetPath}`);
			this.updateReloadTimer = setTimeout(() => {
				this.updateReloadTimer = null;
				try { BdApi.Plugins.reload(PLUGIN_NAME); } catch (e) {}
			}, 500);
		} catch (e) {
			Journal.error("updater", "failed to install update", e);
			try { BdApi.UI.showToast(`[${PLUGIN_NAME}] Failed to install update`, { type: "error", forceShow: true }); } catch (e2) {}
			this.installingUpdate = false;
		}
	}

	watchLocale() {
		const onChange = () => {
			let next = null;
			try { next = detectLocale(ModuleRegistry.get("locale")); } catch (e) {}
			if (!next || next === this.locale) return;
			this.locale = next;
			Journal.info("core", "язык сменился", next);
			if (this.currentParsed) {
				try { this.dispatchQuery(this.currentParsed); } catch (e) {}
			}
		};
		const removers = [];
		try {
			const store = ModuleRegistry.get("locale");
			if (typeof store?.addChangeListener === "function") {
				store.addChangeListener(onChange);
				removers.push(() => { try { store.removeChangeListener?.(onChange); } catch (e) {} });
			}
		} catch (e) {}
		try {
			if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.documentElement) {
				const mo = new MutationObserver(onChange);
				mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
				removers.push(() => mo.disconnect());
			}
		} catch (e) {}
		return () => { for (const r of removers) { try { r(); } catch (e) {} } };
	}

	injectStyles() {
		if (this.styleNode) return;
		const style = el("style");
		style.id = `${NS}-styles`;
		style.textContent = CSS_TEXT;
		document.head.appendChild(style);
		this.styleNode = style;
	}

	dispatchQuery(parsed) {
		this.currentParsed = parsed;

		try {
			switch (parsed.mode) {
				case "browse":
					this.debouncedSearch?.cancel?.();
					this.debouncedMessages?.cancel?.();
					this.runUserSearch(parsed);
					break;
				case "pick":
					this.debouncedMessages?.cancel?.();
					this.debouncedSearch?.(parsed);
					break;
				case "messages":
					if (!this.settings.messageSearchEnabled) {
						this.debouncedMessages?.cancel?.();
						this.debouncedSearch?.({ ...parsed, mode: "pick" });
						break;
					}
					this.debouncedSearch?.cancel?.();
					this.debouncedMessages?.(parsed);
					break;
				default:
					break;
			}
		} catch (e) {
			Journal.error("search", "dispatchQuery failed", e);
		}
	}

	collectSources(userQuery = "") {
		const friends = [];
		for (const id of DataService.friendIds()) {
			const u = DataService.getUser(id);
			if (u) friends.push(u);
		}

		const dmUsers = [];
		if (this.settings.includeDMs) {
			for (const ch of DataService.privateChannels()) {
				try {
					if (ch.type === 1) {

						const u = resolveRecipient(Array.isArray(ch.recipients) ? ch.recipients[0] : null)
							?? (ch.recipient ?? null);
						if (u) dmUsers.push({ user: u, isGroup: false });
					} else if (ch.type === 3) {
						for (const r of ch.recipients ?? []) {
							const u = resolveRecipient(r);
							if (u) dmUsers.push({ user: u, isGroup: true });
						}
					}
				} catch (e) {  }
			}
		}

		const guildMembers = [];
		if (this.settings.includeGuildMembers) {
			for (const g of DataService.guilds()) {
				for (const m of DataService.guildMembers(g.id)) {
					const u = DataService.getUser(m.userId);
					if (!u) continue;
					guildMembers.push({ user: u, guildId: g.id, guildName: g.name ?? "Server", nick: m.nick ?? null });
				}
			}
		}
		const cachedUsers = DataService.cachedUsers();
		Journal.debug("data", "user sources", {
			query: String(userQuery ?? ""), friends: friends.length,
			dmUsers: dmUsers.length, guildMembers: guildMembers.length,
			cachedUsers: cachedUsers.length
		});
		return { friends, dmUsers, guildMembers, cachedUsers };
	}

	runUserSearch(parsed) {
		if (!this.integration?.active) return;
		try {
			this.transport?.cancelAll();
			this.loadingMore = false;
			this.messageRenderer = null;
			const sources = this.collectSources(parsed.userQuery);
			const candidates = buildCandidates(sources);
			const results = searchUsers(parsed.userQuery ?? "", candidates, {
				translitEnabled: this.settings.translitEnabled,
				friendsFirst: this.settings.friendsFirst,
				limit: this.settings.maxUserResults
			});
			this.currentResults = results.map((r) => ({ kind: "user", ...r }));
			this.integration.selected = results.length ? 0 : -1;
			this.renderUserResults(parsed, results);
		} catch (e) {
			Journal.error("search", "runUserSearch failed", e);

			try {
				const renderer = new RowRenderer({ settings: this.settings, locale: this.locale, nativeClasses: this.integration?.nativeClasses ?? {} });
				this.integration?.render({
					header: renderer.renderHeader(this.t("headerPickAll")),
					empty: renderer.renderEmpty(String(e?.message ?? e))
				});
			} catch (e2) {  }
		}
	}

	renderUserResults(parsed, results) {
		const renderer = new RowRenderer({ settings: this.settings, locale: this.locale, nativeClasses: this.integration.nativeClasses });
		const q = parsed.userQuery ?? "";
		const headerText = q ? this.t("headerPickUsers", { q }) : this.t("headerPickAll");
		const view = {
			header: renderer.renderHeader(headerText),
			rows: results.map((r, i) => {
				const row = renderer.renderUserRow(r, {
					selected: i === this.integration.selected,
					index: i,
					query: q,
					status: DataService.status(r.candidate.user.id)
				});
				row.addEventListener("mousemove", () => {
					if (this.integration.selected !== i) {
						this.integration.selected = i;
						this.integration.updateSelectionDom();
					}
				});
				return row;
			}),
			footer: renderer.renderFooter(this.t("hintPick"))
		};
		if (!results.length) {
			view.empty = renderer.renderEmpty(this.t("emptyUsers", { q }), this.t("emptyUsersHint"));
		}
		this.integration.render(view);
	}

	async runMessageFlow(parsed) {
		if (!this.integration?.active) return;
		const renderer = new RowRenderer({ settings: this.settings, locale: this.locale, nativeClasses: this.integration.nativeClasses });

		const candidates = buildCandidates(this.collectSources(parsed.userQuery));
		const words = [parsed.userQuery, parsed.messageQuery].filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
		let best = null;
		let consumed = 0;
		for (let k = Math.min(words.length, 4); k >= 1 && !best; k--) {
			const hit = searchUsers(words.slice(0, k).join(" "), candidates, {
				translitEnabled: this.settings.translitEnabled,
				friendsFirst: true,
				limit: 1
			})[0];
			if (hit) { best = hit; consumed = k; }
		}
		if (best && consumed > 1) {
			parsed = {
				...parsed,
				userQuery: words.slice(0, consumed).join(" "),
				messageQuery: words.slice(consumed).join(" ")
			};
		}

		if (!best) {
			this.currentResults = [];
			this.integration.render({
				header: renderer.renderHeader(this.t("sectionMessages")),
				empty: renderer.renderEmpty(this.t("emptyUsers", { q: parsed.userQuery }), this.t("emptyUsersHint"))
			});
			return;
		}

		const rec = best.candidate;
		const headerText = parsed.messageQuery
			? this.t("headerMessagesFor", { name: displayName(rec.user), q: parsed.messageQuery })
			: this.t("headerAllMessages", { name: displayName(rec.user) });

		if (!this.transport?.available()) {
			this.currentResults = [];
			this.integration.render({
				header: renderer.renderHeader(headerText),
				empty: renderer.renderEmpty(this.t("errNoTransport"))
			});
			return;
		}

		const targets = this.buildTargets(rec);
		if (!targets.length) {
			this.currentResults = [];
			this.integration.render({
				header: renderer.renderHeader(headerText),
				empty: renderer.renderEmpty(this.t("errNoTargets"))
			});
			return;
		}

		const renderRows = (items, progress) => {
			this.currentResults = items.map((it) => ({ kind: "message", item: it }));
			const view = {
				header: renderer.renderHeader(headerText, progress && {
					spinning: progress.done < progress.total,
					text: this.t("loading", { done: progress.done, total: progress.total, found: progress.found })
						+ (progress.errors > 0 ? " " + this.t("loadingErrors", { n: progress.errors }) : "")
				}),
				rows: items.map((it, i) => {
					const row = renderer.renderMessageRow(it, {
						selected: i === this.integration.selected,
						index: i,
						query: parsed.messageQuery
					});
					row.addEventListener("mousemove", () => {
						if (this.integration.selected !== i) {
							this.integration.selected = i;
							this.integration.updateSelectionDom();
						}
					});
					return row;
				}),
				footer: renderer.renderFooter(this.t("hintMessages"))
			};
			if (progress && progress.done >= progress.total && !items.length) {
				view.empty = renderer.renderEmpty(progress.errors > 0
					? this.t("emptyMessagesErrors", { n: progress.errors })
					: this.t("emptyMessages"));
			}
			this.integration.render(view);
		};

		this.integration.selected = 0;
		this.loadingMore = true;
		this.messageRenderer = renderRows;
		this.messageTargetCount = targets.length;
		this.transport?.cancelAll();
		renderRows([], { done: 0, total: targets.length, found: 0 });

		try {
			await this.transport.run(
				targets,
				{
					userId: rec.user.id,
					text: parsed.messageQuery,
					perTarget: this.settings.perTargetLimit,
					totalLimit: this.settings.totalLimit,
					concurrency: this.settings.searchConcurrency
				},
				(items, progress) => renderRows(items, progress),
				(summary) => {
					this.loadingMore = false;
					Journal.info("search", "message search finished", summary);
					renderRows(this.currentResults.map((r) => r.item), {
						done: targets.length,
						total: targets.length,
						found: summary.total > 0 ? summary.total : summary.found,
						errors: summary.errors,
						denied: summary.denied
					});
				}
			);
		} catch (e) {
			this.loadingMore = false;
			Journal.error("search", "message search failed", e);
		}
	}

	buildTargets(candidateOrUserId) {
		const candidate = typeof candidateOrUserId === "string"
			? { user: { id: candidateOrUserId }, mutualGuilds: [] }
			: (candidateOrUserId ?? {});
		const userId = String(candidate.user?.id ?? candidateOrUserId ?? "");
		const targets = [];

		if (this.settings.includeDMs && !this.settings.searchOnlyGuilds) {
			targets.push({ kind: "dm-global", id: "@me", name: `${this.t("ctxDm")} / ${this.t("ctxGroup")}` });
		}

		const guildById = new Map(DataService.guilds().map((g) => [String(g.id), g]));
		const mutual = new Map();
		for (const g of candidate.mutualGuilds ?? []) {
			if (g?.id) mutual.set(String(g.id), { id: String(g.id), name: g.name || guildById.get(String(g.id))?.name || "Server" });
		}
		for (const id of DataService.mutualGuildIds(userId)) {
			const g = guildById.get(String(id));
			mutual.set(String(id), { id: String(id), name: g?.name || mutual.get(String(id))?.name || "Server" });
		}
		for (const g of mutual.values()) targets.push({ kind: "guild", id: g.id, name: g.name });

		return targets.slice(0, Math.max(1, this.settings.maxTargets));
	}

	activateItem(index) {
		const entry = this.currentResults[index];
		if (!entry) return;
		if (entry.kind === "user") {

			const username = entry.candidate.user?.username ?? "";
			if (username && this.integration) {
				this.integration.setInputValue(`${TRIGGER}${username} `);
				return;
			}
			this.openUser(entry.candidate.user.id);
		} else if (entry.kind === "message") {
			this.jumpTo(entry.item.jump);
		}
	}

	openDirectly(index) {
		const entry = this.currentResults[index];
		if (!entry) return;
		if (entry.kind === "user") this.openUser(entry.candidate.user.id);
		else if (entry.kind === "message") this.jumpTo(entry.item.jump);
	}

	openUser(userId) {
		try {
			const dmActions = ModuleRegistry.get("dmActions");
			if (typeof dmActions?.openPrivateChannel === "function") {
				dmActions.openPrivateChannel(userId);
				this.closeSwitcher();
				return;
			}
		} catch (e) {
			Journal.debug("actions", "openPrivateChannel failed", e);
		}
		try {
			const dmId = DataService.dmChannelId(userId);
			const nav = ModuleRegistry.get("navigation");
			if (dmId && typeof nav?.transitionTo === "function") {
				nav.transitionTo(`/channels/@me/${dmId}`);
				this.closeSwitcher();
				return;
			}
		} catch (e) {
			Journal.debug("actions", "transitionTo failed", e);
		}
		try {
			const profile = ModuleRegistry.get("profileModal");
			if (typeof profile?.openUserProfileModal === "function") {
				profile.openUserProfileModal({ userId });
				return;
			}
		} catch (e) {
			Journal.debug("actions", "openUserProfileModal failed", e);
		}
		Journal.warn("actions", "could not open chat: all paths unavailable");
	}

	jumpTo(path) {
		this.closeSwitcher();
		setTimeout(() => {
			try {
				const nav = ModuleRegistry.get("navigation");
				if (isNavigationModule(nav)) {
					nav.transitionTo(path);
					Journal.info("actions", "jump via transitionTo");
					return;
				}
			} catch (e) {
				Journal.error("actions", "message jump failed", e);
			}
			try {
				if (typeof window !== "undefined" && window.history?.pushState) {
					window.history.pushState(null, "", path);
					const evt = typeof PopStateEvent === "function" ? new PopStateEvent("popstate") : new Event("popstate");
					window.dispatchEvent(evt);
					Journal.info("actions", "jump via history");
					return;
				}
			} catch (e) {
				Journal.error("actions", "history navigation failed", e);
			}
			try {
				if (typeof window !== "undefined" && window.location) {
					window.location.assign("https://discord.com" + path);
				}
			} catch (e) {
				Journal.error("actions", "fallback navigation failed", e);
			}
		}, 40);
	}

	closeSwitcher() {
		const opts = { key: "Escape", code: "Escape", keyCode: 27, bubbles: true, cancelable: true };
		try {
			this.integration?.input?.dispatchEvent(new KeyboardEvent("keydown", opts));
		} catch (e) {}
		try {
			document.dispatchEvent(new KeyboardEvent("keydown", opts));
		} catch (e) {}
	}

	requestMoreMessages() {
		if (this.loadingMore) return;
		if (this.currentParsed?.mode !== "messages" || !this.messageRenderer) return;
		if (!this.transport || typeof this.transport.hasMore !== "function" || !this.transport.hasMore()) return;
		const renderRows = this.messageRenderer;
		const targetCount = this.messageTargetCount ?? 0;
		this.loadingMore = true;
		Promise.resolve(
			this.transport.loadMore(
				(items, progress) => renderRows(items, progress),
				(summary) => {
					this.loadingMore = false;
					renderRows(this.currentResults.map((r) => r.item), {
						done: targetCount,
						total: targetCount,
						found: summary.total > 0 ? summary.total : summary.found,
						errors: summary.errors,
						denied: summary.denied
					});
				}
			)
		).then((started) => {
			if (started === false) this.loadingMore = false;
		}).catch((e) => {
			this.loadingMore = false;
			Journal.error("search", "loadMore failed", e);
		});
	}

	requestMessagesMode() {
		if (!this.currentParsed || this.currentParsed.mode === "messages") return;
		const entry = this.currentResults[this.integration?.selected >= 0 ? this.integration.selected : 0];
		if (entry?.kind !== "user") return;
		const username = entry.candidate.user?.username ?? "";
		if (!username) return;
		this.integration?.setInputValue(`${TRIGGER}${username} `);
	}

	getSettingsPanel() {
		const wrap = el("div", `${NS}-settings`);

		const hero = el("div", `${NS}-hero`);
		hero.appendChild(el("div", `${NS}-hero-logo`, TRIGGER));
		const heroMain = el("div", `${NS}-hero-main`);
		const title = el("div", `${NS}-hero-title`);
		title.appendChild(el("span", null, PLUGIN_NAME));
		title.appendChild(el("span", `${NS}-hero-ver`, "v" + PLUGIN_VERSION));
		heroMain.appendChild(title);
		heroMain.appendChild(el("div", `${NS}-hero-sub`, `by ${PLUGIN_AUTHOR}`));
		const links = el("div", `${NS}-hero-links`);
		const mkLink = (label, url) => {
			const a = el("a", `${NS}-linkbtn`, label);
			a.href = url;
			a.target = "_blank";
			a.rel = "noreferrer noopener";
			return a;
		};
		links.appendChild(mkLink(this.t("linkGithub"), PROJECT_LINKS.github));
		links.appendChild(mkLink(this.t("linkIssues"), PROJECT_LINKS.issues));
		heroMain.appendChild(links);
		hero.appendChild(heroMain);
		wrap.appendChild(hero);

		const about = el("div", `${NS}-card`);
		about.appendChild(el("div", `${NS}-card-text`, this.t("about")));
		wrap.appendChild(about);

		wrap.appendChild(this.renderControls());

		wrap.appendChild(this.renderDiagnosticsCard());

		const misc = el("div", `${NS}-card`);
		const miscBtns = el("div", `${NS}-btnrow`);
		const resetBtn = el("button", `${NS}-btn ${NS}-btn-danger`, this.t("btnReset"));
		resetBtn.addEventListener("click", () => {
			this.settings = { ...DEFAULT_SETTINGS, welcomed: true };
			this.saveSettings();
			Journal.debugEnabled = !!this.settings.debugLogs;
			try { BdApi.UI.showToast(this.t("btnResetDone"), { type: "success" }); } catch (e) {}
		});
		miscBtns.appendChild(resetBtn);
		misc.appendChild(miscBtns);
		wrap.appendChild(misc);

		const footer = el("div", `${NS}-settings-footer`);
		footer.appendChild(el("span", null, `${PLUGIN_NAME} v${PLUGIN_VERSION} · ${PLUGIN_AUTHOR} · MIT`));
		footer.appendChild(el("br"));
		footer.appendChild(el("span", null, this.t("footerHotkeys")));
		wrap.appendChild(footer);

		return wrap;
	}

	applySetting(id, value) {
		if (!(id in DEFAULT_SETTINGS)) return;
		this.settings[id] = typeof DEFAULT_SETTINGS[id] === "number" ? clampInt(value, id) : value;
		Journal.debugEnabled = !!this.settings.debugLogs;
		this.saveSettings();

		this.debouncedSearch = debounce((parsed) => this.runUserSearch(parsed), this.settings.debounceMs);
		this.debouncedMessages = debounce((parsed) => this.runMessageFlow(parsed), Math.max(400, this.settings.debounceMs));
	}

	renderControls() {
		const box = el("div", `${NS}-card`);
		for (const cat of buildSettingsSchema(this)) {
			box.appendChild(el("div", `${NS}-card-title`, cat.name));
			for (const item of cat.settings) {
				if (item.type === "switch") box.appendChild(this.switchRow(item));
				else if (item.type === "slider") box.appendChild(this.sliderRow(item));
			}
		}
		return box;
	}

	switchRow(item) {
		const row = el("div", `${NS}-setrow`);
		const txt = el("div", `${NS}-setrow-text`);
		txt.appendChild(el("div", `${NS}-setrow-name`, item.name));
		if (item.note) txt.appendChild(el("div", `${NS}-setrow-note`, item.note));
		row.appendChild(txt);
		const sw = el("button", `${NS}-switch`);
		sw.type = "button";
		sw.setAttribute("role", "switch");
		sw.setAttribute("aria-checked", this.settings[item.id] ? "true" : "false");
		sw.setAttribute("aria-label", item.name);
		sw.appendChild(el("span", `${NS}-switch-knob`));
		sw.addEventListener("click", () => {
			const next = sw.getAttribute("aria-checked") !== "true";
			sw.setAttribute("aria-checked", next ? "true" : "false");
			this.applySetting(item.id, next);
		});
		row.appendChild(sw);
		return row;
	}

	sliderRow(item) {
		const row = el("div", `${NS}-setrow ${NS}-setrow-slider`);
		const head = el("div", `${NS}-slider-head`);
		head.appendChild(el("div", `${NS}-setrow-name`, item.name));
		const units = item.units ? ` ${item.units}` : "";
		const val = el("span", `${NS}-slider-val`, `${this.settings[item.id]}${units}`);
		head.appendChild(val);
		row.appendChild(head);
		if (item.note) row.appendChild(el("div", `${NS}-setrow-note`, item.note));
		const input = el("input", `${NS}-slider`);
		input.type = "range";
		input.min = String(item.min);
		input.max = String(item.max);
		input.step = String(item.step ?? 1);
		input.value = String(this.settings[item.id]);
		input.addEventListener("input", () => { val.textContent = `${input.value}${units}`; });
		input.addEventListener("change", () => this.applySetting(item.id, toInt(input.value, this.settings[item.id])));
		row.appendChild(input);
		return row;
	}

	renderDiagnosticsCard() {
		const card = el("div", `${NS}-card`);
		card.appendChild(el("div", `${NS}-card-title`, this.t("diagTitle")));
		card.appendChild(el("div", `${NS}-card-text`, this.t("diagDesc")));

		const grid = el("div", `${NS}-diaggrid`);
		const status = el("div", `${NS}-card-text`, this.t("diagNever"));
		status.style.marginTop = "8px";

		const btnRow = el("div", `${NS}-btnrow`);

		const runBtn = el("button", `${NS}-btn`, this.t("diagRun"));
		runBtn.addEventListener("click", () => {
			const { checks, failCount } = this.diagnostics.runSelfTest();
			grid.textContent = "";
			for (const c of checks) {
				grid.appendChild(el("span", `${NS}-diag-key`, c.label));
				grid.appendChild(el("span", c.ok ? `${NS}-diag-ok` : `${NS}-diag-bad`, (c.ok ? "OK" : "FAIL") + (c.detail ? ` - ${c.detail}` : "")));
			}
			status.textContent = failCount ? this.t("diagFail", { n: failCount }) : this.t("diagOk");
			status.className = `${NS}-card-text ` + (failCount ? `${NS}-diag-bad` : `${NS}-diag-ok`);
			try { BdApi.UI.showToast(status.textContent, { type: failCount ? "error" : "success" }); } catch (e) {}
		});
		btnRow.appendChild(runBtn);

		const copyBtn = el("button", `${NS}-btn ${NS}-btn-secondary`, this.t("diagCopy"));
		copyBtn.addEventListener("click", async () => {
			const original = this.t("diagCopy");
			copyBtn.disabled = true;
			const res = await this.diagnostics.copyReport();

			copyBtn.textContent = res.ok ? "✓ " + this.t("copied") : "⚠ " + this.t("manualCopyBtn");
			setTimeout(() => { copyBtn.textContent = original; copyBtn.disabled = false; }, 2500);
			try { BdApi.UI.showToast(res.ok ? this.t("copied") : this.t("manualCopyTitle"), { type: res.ok ? "success" : "warning" }); } catch (e) {}
		});
		btnRow.appendChild(copyBtn);

		const probeBtn = el("button", `${NS}-btn ${NS}-btn-secondary`, this.t("diagTransport"));
		probeBtn.addEventListener("click", async () => {
			probeBtn.disabled = true;
			const res = await this.diagnostics.probeTransport();
			grid.appendChild(el("span", `${NS}-diag-key`, "GET /users/@me"));
			grid.appendChild(el("span", res.ok ? `${NS}-diag-ok` : `${NS}-diag-bad`, (res.ok ? "OK" : "FAIL") + ` - ${res.detail}`));
			probeBtn.disabled = false;
		});
		btnRow.appendChild(probeBtn);

		card.appendChild(btnRow);
		card.appendChild(status);
		card.appendChild(grid);
		return card;
	}
}

module.exports = UserGlobalSearch;
module.exports.__internals = {

	PLUGIN_NAME,
	PLUGIN_VERSION,
	PLUGIN_AUTHOR,
	PLUGIN_FILE_NAME,
	UPDATE_URL,
	UPDATE_CHECK_DELAY_MS,
	DEFAULT_SETTINGS,
	SETTING_LIMITS,
	SCORE,
	NS,
	TRIGGER,
	CSS_TEXT,
	I18N,

	plural,
	detectLocale,
	translate,

	normalize,
	hasCyrillic,
	translitRuToEn,
	translitEnToRu,
	queryVariants,
	snowflakeNewer,
	snowflakeTime,
	relativeTime,
	escapeRegExp,
	displayName,
	avatarUrl,
	guildIconUrl,
	acronym,
	truncate,
	debounce,
	clampInt,
	toInt,
	parsePluginMeta,
	parseVersion,
	comparePluginVersions,
	validatePluginUpdateSource,
	resolveInstalledPluginPath,
	fetchPluginUpdateSource,
	writePluginUpdate,
	safeSerialize,
	safeCall,

	normalizeRelationships,
	parseRestText,
	decodeRestResponse,
	messageSearchTab,
	isSearchPayload,
	pickSearchHit,
	extractSearchResult,
	restGetCompat,
	restPostCompat,
	DataService,
	describeShape,
	ModuleRegistry,
	isNavigationModule,
	collectRestCandidates,
	VerifiedRestAPI,

	parseAmpQuery,
	subsequenceScore,
	scoreField,
	scoreCandidate,
	searchUsers,
	computeBadges,
	contextLine,
	highlightRanges,
	buildCandidates,

	MessageSearchTransport,
	RowRenderer,
	SwitcherIntegration,
	Diagnostics,

	demoCandidates,
	demoMessages
};
