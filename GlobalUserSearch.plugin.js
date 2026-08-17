/**
 * @name UserGlobalSearch
 * @author florzzz
 * @version 1.0.1
 * @description Global user search in the Quick Switcher (Ctrl+K) via the & symbol: pick a person, see their recent messages across all mutual servers, DMs and group chats.
 * @invite quXc4MvKW
 * @donate https://www.donationalerts.com/r/florzzzzzzz
 * @website https://github.com/florzzzbd/UserGlobalSearch
 * @source https://github.com/florzzzbd/UserGlobalSearch/blob/main/GlobalUserSearch.plugin.js
 * @updateUrl https://raw.githubusercontent.com/florzzzbd/UserGlobalSearch/main/GlobalUserSearch.plugin.js
 * @license MIT
 */

"use strict";

const PLUGIN_NAME = "UserGlobalSearch";
const PLUGIN_VERSION = "1.0.1";
const PLUGIN_AUTHOR = "florzzz";

const NS = "ugs2";

const TRIGGER = "&";

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

const SETTING_LIMITS = Object.freeze({
	maxUserResults:     { min: 3,   max: 25,  step: 1   },
	debounceMs:         { min: 0,   max: 800, step: 50  },
	maxMutualGuilds:    { min: 1,   max: 6,   step: 1   },
	perTargetLimit:     { min: 1,   max: 15,  step: 1   },
	maxTargets:         { min: 5,   max: 150, step: 5   },
	totalLimit:         { min: 5,   max: 60,  step: 5   },
	searchConcurrency:  { min: 1,   max: 8,   step: 1   }
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
	},

	"de": {
		headerPickUsers: "Nutzer: „{q}“",
		headerPickAll: "Alle Nutzer durchsuchen",
		headerMessagesFor: "Nachrichten von {name}: „{q}“",
		headerAllMessages: "Alle Nachrichten: {name}",
		emptyUsers: "Niemand für „{q}“ gefunden.",
		emptyUsersHint: "Versuche eine andere Schreibweise oder Transliteration: sonya / соня.",
		emptyMessages: "Keine Nachrichten gefunden. Versuche eine andere Suche.",
		errNoTransport: "Nachrichtensuche ist in diesem Discord-Build nicht verfügbar. Nutzerauswahl funktioniert.",
		errNoTargets: "Keine gemeinsamen Server oder Chats mit diesem Nutzer.",
		errGeneric: "Etwas ist schiefgelaufen. Details im Log in den Einstellungen.",
		loading: "Suche: {done}/{total} · gefunden {found}",
		loadingErrors: "· {n} Fehler",
		emptyMessagesErrors: "Anfragen fehlgeschlagen ({n}). Öffne die Plugin-Einstellungen und starte den Selbsttest, um die Ursache zu sehen.",
		badgeFriend: "FREUND",
		badgeServer: "SERVER",
		badgeDm: "DN",
		badgeBot: "BOT",
		ctxFriend: "Freund",
		ctxDm: "DN",
		ctxGroup: "Gruppe",
		ctxMore: "+{n}",
		hintPick: "Enter - Nachrichten des Nutzers · ↑↓ - auswählen · Esc - schließen",
		hintMessages: "Enter - zur Nachricht springen · Esc - schließen",
		protipTitle: "& - globale Nutzersuche",
		pluralGuilds: ["Server", "Server"],
		pluralDms: ["Chat", "Chats"],
		pluralResults: ["Ergebnis", "Ergebnisse"],
		catSearch: "Suche",
		catAppearance: "Oberfläche",
		catMessages: "Nachrichtensuche",
		catAdvanced: "Erweitert",
		setMaxUserResults: "Nutzer in Vorschlägen",
		setMaxUserResultsDesc: "Zeilen, die bei „&name“ angezeigt werden.",
		setDebounce: "Suchverzögerung",
		setDebounceDesc: "Pause nach der Eingabe, bevor die Suche startet (ms).",
		setTranslit: "Transliteration",
		setTranslitDesc: "„соня“ findet „Sonya“, „sonya“ findet „Соня“.",
		setFriendsFirst: "Freunde zuerst",
		setFriendsFirstDesc: "Freunde ganz oben, dann DNs und Server.",
		setIncludeDMs: "Direkt- und Gruppenchats",
		setIncludeDMsDesc: "Unter deinen DN-Partnern suchen.",
		setIncludeMembers: "Servermitglieder",
		setIncludeMembersDesc: "Unter Mitgliedern aller deiner Server suchen.",
		setStatusDot: "Statuspunkt",
		setStatusDotDesc: "Grüner/gelber/roter Punkt auf dem Avatar.",
		setBadges: "Abzeichen",
		setBadgesDesc: "FREUND, SERVER, DN, BOT neben dem Namen.",
		setHandles: "@username rechts",
		setHandlesDesc: "Handle am rechten Zeilenrand anzeigen.",
		setContextLine: "Kontextzeile",
		setContextLineDesc: "„Freund · 3 Server · DN“ unter dem Namen.",
		setCompact: "Kompaktmodus",
		setCompactDesc: "Einzeilige Ergebnisse, mehr Zeilen auf dem Bildschirm.",
		setMaxMutual: "Server in der Kontextzeile",
		setMaxMutualDesc: "Wie viele gemeinsame Servernamen aufgelistet werden.",
		setMsgEnabled: "Modus „&name Text“",
		setMsgEnabledDesc: "Nachrichten eines Nutzers über Server und Chats suchen.",
		setOnlyGuilds: "Nur auf Servern suchen",
		setOnlyGuildsDesc: "DNs und Gruppenchats bei der Nachrichtensuche überspringen.",
		setPerTarget: "Ergebnisse pro Server",
		setPerTargetDesc: "Nachrichtenlimit pro Server oder Chat.",
		setMaxTargets: "Max. Ziele pro Suche",
		setMaxTargetsDesc: "Mehr ist langsamer, aber gründlicher.",
		setTotalLimit: "Zeilen insgesamt",
		setTotalLimitDesc: "Gesamtlimit für Nachrichtenergebnisse.",
		setConcurrency: "Parallele Anfragen",
		setConcurrencyDesc: "Nicht zu hoch stellen - Discord drosselt Anfragebursts.",
		setDebug: "Ausführliche Logs",
		setDebugDesc: "Debug-Ausgabe in der Konsole (Strg+Umschalt+I).",
		btnReset: "Einstellungen zurücksetzen",
		btnResetDone: "Einstellungen wurden zurückgesetzt",
		diagTitle: "Selbstdiagnose",
		diagDesc: "Ein Klick prüft alles: Discord-Module, Engine, Renderer. Sende den Bericht bei Problemen an den Autor.",
		diagRun: "Selbsttest starten",
		diagCopy: "Bericht kopieren",
		diagTransport: "Nachrichtensuche testen (1 Anfrage)",
		diagOk: "Alle Prüfungen bestanden",
		diagFail: "Probleme gefunden: {n}",
		diagNever: "Selbsttest wurde noch nicht ausgeführt",
		copied: "In die Zwischenablage kopiert",
		manualCopyBtn: "Manuell kopieren",
		manualCopyTitle: "Bericht manuell kopieren",
		manualCopyHint: "Auto-Kopieren konnte nicht bestätigt werden. Der Bericht ist bereits markiert - drücke Strg+C (Cmd+C auf Mac) und füge ihn in den Chat ein.",
		manualCopyClose: "Fertig",
		about: "„&name“ findet eine Person über alle gemeinsamen Server und Chats. „&name Text“ findet ihre Nachrichten. Die Oberfläche ist komplett nativ: dein Discord-Theme gilt automatisch.",
		footerHotkeys: "Strg+K - Schnellsuche · & - Plugin-Modus · Tab - vom Namen zu den Nachrichten",
		toastWelcome: "UserGlobalSearch: Drücke Strg+K und tippe &",
		linkGithub: "GitHub",
		linkIssues: "Problem melden",
		sectionMessages: "Nachrichten"
	},

	"fr": {
		headerPickUsers: "Utilisateurs : « {q} »",
		headerPickAll: "Rechercher tous les utilisateurs",
		headerMessagesFor: "Messages de {name} : « {q} »",
		headerAllMessages: "Tous les messages : {name}",
		emptyUsers: "Personne trouvé pour « {q} ».",
		emptyUsersHint: "Essayez une autre orthographe ou translittération : sonya / соня.",
		emptyMessages: "Aucun message trouvé. Essayez une autre recherche.",
		errNoTransport: "La recherche de messages est indisponible dans cette version de Discord. La sélection d'utilisateurs fonctionne.",
		errNoTargets: "Aucun serveur ou chat en commun avec cet utilisateur.",
		errGeneric: "Une erreur est survenue. Voir le journal dans les paramètres.",
		loading: "Recherche : {done}/{total} · trouvé {found}",
		loadingErrors: "· {n} erreurs",
		emptyMessagesErrors: "Les requêtes ont échoué ({n}). Ouvrez les paramètres du plugin et lancez l'autotest pour voir la cause.",
		badgeFriend: "AMI",
		badgeServer: "SERVEUR",
		badgeDm: "MP",
		badgeBot: "BOT",
		ctxFriend: "Ami",
		ctxDm: "MP",
		ctxGroup: "Groupe",
		ctxMore: "+{n}",
		hintPick: "Entrée - messages de l'utilisateur · ↑↓ - sélection · Échap - fermer",
		hintMessages: "Entrée - aller au message · Échap - fermer",
		protipTitle: "& - recherche globale d'utilisateurs",
		pluralGuilds: ["serveur", "serveurs"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["résultat", "résultats"],
		catSearch: "Recherche",
		catAppearance: "Interface",
		catMessages: "Recherche de messages",
		catAdvanced: "Avancé",
		setMaxUserResults: "Utilisateurs dans les suggestions",
		setMaxUserResultsDesc: "Lignes affichées pour « &nom ».",
		setDebounce: "Délai de recherche",
		setDebounceDesc: "Pause après la frappe avant le lancement (ms).",
		setTranslit: "Translittération",
		setTranslitDesc: "« соня » trouve « Sonya », « sonya » trouve « Соня ».",
		setFriendsFirst: "Amis d'abord",
		setFriendsFirstDesc: "Les amis en haut, puis MP et serveurs.",
		setIncludeDMs: "Chats directs et de groupe",
		setIncludeDMsDesc: "Rechercher parmi vos contacts MP.",
		setIncludeMembers: "Membres des serveurs",
		setIncludeMembersDesc: "Rechercher parmi les membres de tous vos serveurs.",
		setStatusDot: "Point de statut",
		setStatusDotDesc: "Point de présence sur l'avatar.",
		setBadges: "Badges",
		setBadgesDesc: "Étiquettes AMI, SERVEUR, MP, BOT à côté du nom.",
		setHandles: "@username à droite",
		setHandlesDesc: "Afficher le pseudo à droite de la ligne.",
		setContextLine: "Ligne de contexte",
		setContextLineDesc: "« Ami · 3 serveurs · MP » sous le nom.",
		setCompact: "Mode compact",
		setCompactDesc: "Résultats sur une ligne, plus de lignes à l'écran.",
		setMaxMutual: "Serveurs dans la ligne de contexte",
		setMaxMutualDesc: "Nombre de serveurs communs à lister.",
		setMsgEnabled: "Mode « &nom texte »",
		setMsgEnabledDesc: "Rechercher les messages d'un utilisateur partout.",
		setOnlyGuilds: "Rechercher uniquement sur les serveurs",
		setOnlyGuildsDesc: "Ignorer les MP et les groupes lors de la recherche de messages.",
		setPerTarget: "Résultats par serveur",
		setPerTargetDesc: "Limite de messages par serveur ou chat.",
		setMaxTargets: "Cibles max par recherche",
		setMaxTargetsDesc: "Plus c'est haut, plus c'est lent mais complet.",
		setTotalLimit: "Lignes au total",
		setTotalLimitDesc: "Limite globale de résultats.",
		setConcurrency: "Requêtes parallèles",
		setConcurrencyDesc: "Restez modéré - Discord limite les rafales de requêtes.",
		setDebug: "Logs détaillés",
		setDebugDesc: "Sortie de débogage dans la console (Ctrl+Maj+I).",
		btnReset: "Réinitialiser les paramètres",
		btnResetDone: "Paramètres réinitialisés",
		diagTitle: "Autodiagnostic",
		diagDesc: "Un clic vérifie tout : modules Discord, moteur, rendu. Envoyez le rapport à l'auteur en cas de problème.",
		diagRun: "Lancer l'autotest",
		diagCopy: "Copier le rapport",
		diagTransport: "Tester la recherche de messages (1 requête)",
		diagOk: "Tous les tests ont réussi",
		diagFail: "Problèmes détectés : {n}",
		diagNever: "L'autotest n'a pas encore été lancé",
		copied: "Copié dans le presse-papiers",
		manualCopyBtn: "Copie manuelle",
		manualCopyTitle: "Copiez le rapport manuellement",
		manualCopyHint: "La copie automatique n'a pas pu être confirmée. Le texte du rapport est déjà sélectionné - appuyez sur Ctrl+C (Cmd+C sur Mac) et collez-le dans le chat.",
		manualCopyClose: "OK",
		about: "« &nom » trouve une personne sur tous les serveurs et chats communs. « &nom texte » trouve ses messages. L'interface suit automatiquement votre thème Discord.",
		footerHotkeys: "Ctrl+K - recherche rapide · & - mode plugin · Tab - du nom aux messages",
		toastWelcome: "UserGlobalSearch : ouvrez Ctrl+K et tapez &",
		linkGithub: "GitHub",
		linkIssues: "Signaler un problème",
		sectionMessages: "Messages"
	},

	"es-ES": {
		headerPickUsers: "Usuarios: «{q}»",
		headerPickAll: "Buscar entre todos los usuarios",
		headerMessagesFor: "Mensajes de {name}: «{q}»",
		headerAllMessages: "Todos los mensajes: {name}",
		emptyUsers: "No se encontró a nadie para «{q}».",
		emptyUsersHint: "Prueba otra escritura o transliteración: sonya / соня.",
		emptyMessages: "No se encontraron mensajes. Prueba otra búsqueda.",
		errNoTransport: "La búsqueda de mensajes no está disponible en esta versión de Discord. La selección de usuarios funciona.",
		errNoTargets: "No hay servidores ni chats en común con este usuario.",
		errGeneric: "Algo salió mal. Consulta el registro en los ajustes.",
		loading: "Buscando: {done}/{total} · encontrados {found}",
		loadingErrors: "· {n} errores",
		emptyMessagesErrors: "Las solicitudes fallaron ({n}). Abre los ajustes del plugin y ejecuta la autoprueba para ver la causa.",
		badgeFriend: "AMIGO",
		badgeServer: "SERVIDOR",
		badgeDm: "MD",
		badgeBot: "BOT",
		ctxFriend: "Amigo",
		ctxDm: "MD",
		ctxGroup: "Grupo",
		ctxMore: "+{n}",
		hintPick: "Enter - mensajes del usuario · ↑↓ - seleccionar · Esc - cerrar",
		hintMessages: "Enter - ir al mensaje · Esc - cerrar",
		protipTitle: "& - búsqueda global de usuarios",
		pluralGuilds: ["servidor", "servidores"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["resultado", "resultados"],
		catSearch: "Búsqueda",
		catAppearance: "Interfaz",
		catMessages: "Búsqueda de mensajes",
		catAdvanced: "Avanzado",
		setMaxUserResults: "Usuarios en sugerencias",
		setMaxUserResultsDesc: "Filas mostradas al escribir «&nombre».",
		setDebounce: "Retraso de búsqueda",
		setDebounceDesc: "Pausa tras escribir antes de buscar (ms).",
		setTranslit: "Transliteración",
		setTranslitDesc: "«соня» encuentra «Sonya» y «sonya» encuentra «Соня».",
		setFriendsFirst: "Amigos primero",
		setFriendsFirstDesc: "Los amigos arriba, luego MD y servidores.",
		setIncludeDMs: "Chats directos y de grupo",
		setIncludeDMsDesc: "Buscar entre tus contactos de MD.",
		setIncludeMembers: "Miembros de servidores",
		setIncludeMembersDesc: "Buscar entre los miembros de todos tus servidores.",
		setStatusDot: "Punto de estado",
		setStatusDotDesc: "Punto de presencia en el avatar.",
		setBadges: "Insignias",
		setBadgesDesc: "Etiquetas AMIGO, SERVIDOR, MD, BOT junto al nombre.",
		setHandles: "@username a la derecha",
		setHandlesDesc: "Mostrar el handle al final de la fila.",
		setContextLine: "Línea de contexto",
		setContextLineDesc: "«Amigo · 3 servidores · MD» bajo el nombre.",
		setCompact: "Modo compacto",
		setCompactDesc: "Resultados de una línea, más filas en pantalla.",
		setMaxMutual: "Servidores en la línea de contexto",
		setMaxMutualDesc: "Cuántos nombres de servidores comunes listar.",
		setMsgEnabled: "Modo «&nombre texto»",
		setMsgEnabledDesc: "Buscar los mensajes de un usuario por todas partes.",
		setOnlyGuilds: "Buscar solo en servidores",
		setOnlyGuildsDesc: "Omitir MD y grupos al buscar mensajes.",
		setPerTarget: "Resultados por servidor",
		setPerTargetDesc: "Límite de mensajes por servidor o chat.",
		setMaxTargets: "Objetivos máx. por búsqueda",
		setMaxTargetsDesc: "Más alto es más lento pero más completo.",
		setTotalLimit: "Filas totales",
		setTotalLimitDesc: "Límite global de resultados de mensajes.",
		setConcurrency: "Solicitudes en paralelo",
		setConcurrencyDesc: "No lo subas demasiado - Discord limita las ráfagas.",
		setDebug: "Registros detallados",
		setDebugDesc: "Salida de depuración en la consola (Ctrl+Mayús+I).",
		btnReset: "Restablecer ajustes",
		btnResetDone: "Ajustes restablecidos a los valores predeterminados",
		diagTitle: "Autodiagnóstico",
		diagDesc: "Un clic lo comprueba todo: módulos de Discord, motor, renderizado. Envía el informe al autor si algo falla.",
		diagRun: "Ejecutar autoprueba",
		diagCopy: "Copiar informe",
		diagTransport: "Probar búsqueda de mensajes (1 solicitud)",
		diagOk: "Todas las comprobaciones superadas",
		diagFail: "Problemas encontrados: {n}",
		diagNever: "La autoprueba aún no se ha ejecutado",
		copied: "Copiado al portapapeles",
		manualCopyBtn: "Copia manual",
		manualCopyTitle: "Copia el informe manualmente",
		manualCopyHint: "No se pudo confirmar la copia automática. El texto del informe ya está seleccionado - pulsa Ctrl+C (Cmd+C en Mac) y pégalo en el chat.",
		manualCopyClose: "Listo",
		about: "«&nombre» encuentra a una persona en todos los servidores y chats comunes. «&nombre texto» encuentra sus mensajes. La interfaz sigue tu tema de Discord automáticamente.",
		footerHotkeys: "Ctrl+K - búsqueda rápida · & - modo plugin · Tab - del nombre a los mensajes",
		toastWelcome: "UserGlobalSearch: abre Ctrl+K y escribe &",
		linkGithub: "GitHub",
		linkIssues: "Informar de un problema",
		sectionMessages: "Mensajes"
	},

	"es-419": {
		headerPickUsers: "Usuarios: «{q}»",
		headerPickAll: "Buscar entre todos los usuarios",
		headerMessagesFor: "Mensajes de {name}: «{q}»",
		headerAllMessages: "Todos los mensajes: {name}",
		emptyUsers: "No se encontró a nadie para «{q}».",
		emptyUsersHint: "Prueba otra escritura o transliteración: sonya / соня.",
		emptyMessages: "No se encontraron mensajes. Prueba otra búsqueda.",
		errNoTransport: "La búsqueda de mensajes no está disponible en esta versión de Discord. La selección de usuarios funciona.",
		errNoTargets: "No hay servidores ni chats en común con este usuario.",
		errGeneric: "Algo salió mal. Revisa el registro en los ajustes.",
		loading: "Buscando: {done}/{total} · encontrados {found}",
		loadingErrors: "· {n} errores",
		emptyMessagesErrors: "Las solicitudes fallaron ({n}). Abre los ajustes del plugin y ejecuta la autoprueba para ver la causa.",
		badgeFriend: "AMIGO",
		badgeServer: "SERVIDOR",
		badgeDm: "MD",
		badgeBot: "BOT",
		ctxFriend: "Amigo",
		ctxDm: "MD",
		ctxGroup: "Grupo",
		ctxMore: "+{n}",
		hintPick: "Enter - mensajes del usuario · ↑↓ - seleccionar · Esc - cerrar",
		hintMessages: "Enter - ir al mensaje · Esc - cerrar",
		protipTitle: "& - búsqueda global de usuarios",
		pluralGuilds: ["servidor", "servidores"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["resultado", "resultados"],
		catSearch: "Búsqueda",
		catAppearance: "Interfaz",
		catMessages: "Búsqueda de mensajes",
		catAdvanced: "Avanzado",
		setMaxUserResults: "Usuarios en sugerencias",
		setMaxUserResultsDesc: "Filas mostradas al escribir «&nombre».",
		setDebounce: "Retraso de búsqueda",
		setDebounceDesc: "Pausa tras escribir antes de buscar (ms).",
		setTranslit: "Transliteración",
		setTranslitDesc: "«соня» encuentra «Sonya» y «sonya» encuentra «Соня».",
		setFriendsFirst: "Amigos primero",
		setFriendsFirstDesc: "Los amigos arriba, luego MD y servidores.",
		setIncludeDMs: "Chats directos y de grupo",
		setIncludeDMsDesc: "Buscar entre tus contactos de MD.",
		setIncludeMembers: "Miembros de servidores",
		setIncludeMembersDesc: "Buscar entre los miembros de todos tus servidores.",
		setStatusDot: "Punto de estado",
		setStatusDotDesc: "Punto de presencia en el avatar.",
		setBadges: "Insignias",
		setBadgesDesc: "Etiquetas AMIGO, SERVIDOR, MD, BOT junto al nombre.",
		setHandles: "@username a la derecha",
		setHandlesDesc: "Mostrar el handle al final de la fila.",
		setContextLine: "Línea de contexto",
		setContextLineDesc: "«Amigo · 3 servidores · MD» bajo el nombre.",
		setCompact: "Modo compacto",
		setCompactDesc: "Resultados de una línea, más filas en pantalla.",
		setMaxMutual: "Servidores en la línea de contexto",
		setMaxMutualDesc: "Cuántos nombres de servidores comunes listar.",
		setMsgEnabled: "Modo «&nombre texto»",
		setMsgEnabledDesc: "Buscar los mensajes de un usuario en todas partes.",
		setOnlyGuilds: "Buscar solo en servidores",
		setOnlyGuildsDesc: "Omitir MD y grupos al buscar mensajes.",
		setPerTarget: "Resultados por servidor",
		setPerTargetDesc: "Límite de mensajes por servidor o chat.",
		setMaxTargets: "Objetivos máx. por búsqueda",
		setMaxTargetsDesc: "Más alto es más lento pero más completo.",
		setTotalLimit: "Filas totales",
		setTotalLimitDesc: "Límite global de resultados de mensajes.",
		setConcurrency: "Solicitudes en paralelo",
		setConcurrencyDesc: "No lo subas demasiado - Discord limita las ráfagas.",
		setDebug: "Registros detallados",
		setDebugDesc: "Salida de depuración en la consola (Ctrl+Mayús+I).",
		btnReset: "Restablecer ajustes",
		btnResetDone: "Ajustes restablecidos a los valores predeterminados",
		diagTitle: "Autodiagnóstico",
		diagDesc: "Un clic lo comprueba todo: módulos de Discord, motor, renderizado. Envía el informe al autor si algo falla.",
		diagRun: "Ejecutar autoprueba",
		diagCopy: "Copiar informe",
		diagTransport: "Probar búsqueda de mensajes (1 solicitud)",
		diagOk: "Todas las comprobaciones superadas",
		diagFail: "Problemas encontrados: {n}",
		diagNever: "La autoprueba aún no se ha ejecutado",
		copied: "Copiado al portapapeles",
		manualCopyBtn: "Copia manual",
		manualCopyTitle: "Copia el informe manualmente",
		manualCopyHint: "No se pudo confirmar la copia automática. El texto del informe ya está seleccionado - presiona Ctrl+C (Cmd+C en Mac) y pégalo en el chat.",
		manualCopyClose: "Listo",
		about: "«&nombre» encuentra a una persona en todos los servidores y chats comunes. «&nombre texto» encuentra sus mensajes. La interfaz sigue tu tema de Discord automáticamente.",
		footerHotkeys: "Ctrl+K - búsqueda rápida · & - modo plugin · Tab - del nombre a los mensajes",
		toastWelcome: "UserGlobalSearch: abre Ctrl+K y escribe &",
		linkGithub: "GitHub",
		linkIssues: "Reportar un problema",
		sectionMessages: "Mensajes"
	},

	"pt-BR": {
		headerPickUsers: "Usuários: \"{q}\"",
		headerPickAll: "Pesquisar todos os usuários",
		headerMessagesFor: "Mensagens de {name}: \"{q}\"",
		headerAllMessages: "Todas as mensagens: {name}",
		emptyUsers: "Ninguém encontrado para \"{q}\".",
		emptyUsersHint: "Tente outra grafia ou transliteração: sonya / соня.",
		emptyMessages: "Nenhuma mensagem encontrada. Tente outra busca.",
		errNoTransport: "A busca de mensagens está indisponível nesta build do Discord. A seleção de usuários funciona.",
		errNoTargets: "Nenhum servidor ou chat em comum com este usuário.",
		errGeneric: "Algo deu errado. Veja o registro nas configurações.",
		loading: "Buscando: {done}/{total} · encontrados {found}",
		loadingErrors: "· {n} erros",
		emptyMessagesErrors: "As solicitações falharam ({n}). Abra as configurações do plugin e execute o autoteste para ver a causa.",
		badgeFriend: "AMIGO",
		badgeServer: "SERVIDOR",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Amigo",
		ctxDm: "DM",
		ctxGroup: "Grupo",
		ctxMore: "+{n}",
		hintPick: "Enter - mensagens do usuário · ↑↓ - selecionar · Esc - fechar",
		hintMessages: "Enter - ir para a mensagem · Esc - fechar",
		protipTitle: "& - busca global de usuários",
		pluralGuilds: ["servidor", "servidores"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["resultado", "resultados"],
		catSearch: "Busca",
		catAppearance: "Interface",
		catMessages: "Busca de mensagens",
		catAdvanced: "Avançado",
		setMaxUserResults: "Usuários nas sugestões",
		setMaxUserResultsDesc: "Linhas exibidas para \"&nome\".",
		setDebounce: "Atraso da busca",
		setDebounceDesc: "Pausa após digitar antes de buscar (ms).",
		setTranslit: "Transliteração",
		setTranslitDesc: "\"соня\" encontra \"Sonya\" e \"sonya\" encontra \"Соня\".",
		setFriendsFirst: "Amigos primeiro",
		setFriendsFirstDesc: "Amigos no topo, depois DMs e servidores.",
		setIncludeDMs: "Chats diretos e em grupo",
		setIncludeDMsDesc: "Buscar entre seus contatos de DM.",
		setIncludeMembers: "Membros de servidores",
		setIncludeMembersDesc: "Buscar entre membros de todos os seus servidores.",
		setStatusDot: "Ponto de status",
		setStatusDotDesc: "Ponto de presença no avatar.",
		setBadges: "Selos",
		setBadgesDesc: "Rótulos AMIGO, SERVIDOR, DM, BOT ao lado do nome.",
		setHandles: "@username à direita",
		setHandlesDesc: "Mostrar o handle na borda direita da linha.",
		setContextLine: "Linha de contexto",
		setContextLineDesc: "\"Amigo · 3 servidores · DM\" sob o nome.",
		setCompact: "Modo compacto",
		setCompactDesc: "Resultados em uma linha, mais linhas na tela.",
		setMaxMutual: "Servidores na linha de contexto",
		setMaxMutualDesc: "Quantos nomes de servidores em comum listar.",
		setMsgEnabled: "Modo \"&nome texto\"",
		setMsgEnabledDesc: "Buscar as mensagens de um usuário em servidores e chats.",
		setOnlyGuilds: "Buscar apenas em servidores",
		setOnlyGuildsDesc: "Pular DMs e grupos ao buscar mensagens.",
		setPerTarget: "Resultados por servidor",
		setPerTargetDesc: "Limite de mensagens por servidor ou chat.",
		setMaxTargets: "Máx. de alvos por busca",
		setMaxTargetsDesc: "Mais alto é mais lento, mas mais completo.",
		setTotalLimit: "Linhas no total",
		setTotalLimitDesc: "Limite geral de resultados de mensagens.",
		setConcurrency: "Solicitações paralelas",
		setConcurrencyDesc: "Não exagere - Discord limita rajadas de requisições.",
		setDebug: "Logs detalhados",
		setDebugDesc: "Saída de depuração no console (Ctrl+Shift+I).",
		btnReset: "Redefinir configurações",
		btnResetDone: "Configurações redefinidas para o padrão",
		diagTitle: "Autodiagnóstico",
		diagDesc: "Um clique verifica tudo: módulos do Discord, motor, renderização. Envie o relatório ao autor se algo falhar.",
		diagRun: "Executar autoteste",
		diagCopy: "Copiar relatório",
		diagTransport: "Testar busca de mensagens (1 solicitação)",
		diagOk: "Todas as verificações passaram",
		diagFail: "Problemas encontrados: {n}",
		diagNever: "O autoteste ainda não foi executado",
		copied: "Copiado para a área de transferência",
		manualCopyBtn: "Cópia manual",
		manualCopyTitle: "Copie o relatório manualmente",
		manualCopyHint: "A cópia automática não pôde ser confirmada. O texto do relatório já está selecionado - pressione Ctrl+C (Cmd+C no Mac) e cole no chat.",
		manualCopyClose: "Concluído",
		about: "\"&nome\" encontra uma pessoa em todos os servidores e chats em comum. \"&nome texto\" encontra as mensagens dela. A interface segue o tema do seu Discord automaticamente.",
		footerHotkeys: "Ctrl+K - busca rápida · & - modo do plugin · Tab - do nome para as mensagens",
		toastWelcome: "UserGlobalSearch: abra com Ctrl+K e digite &",
		linkGithub: "GitHub",
		linkIssues: "Reportar um problema",
		sectionMessages: "Mensagens"
	},

	"it": {
		headerPickUsers: "Utenti: \"{q}\"",
		headerPickAll: "Cerca tra tutti gli utenti",
		headerMessagesFor: "Messaggi di {name}: \"{q}\"",
		headerAllMessages: "Tutti i messaggi: {name}",
		emptyUsers: "Nessuno trovato per \"{q}\".",
		emptyUsersHint: "Prova un'altra grafia o traslitterazione: sonya / соня.",
		emptyMessages: "Nessun messaggio trovato. Prova un'altra ricerca.",
		errNoTransport: "La ricerca dei messaggi non è disponibile in questa build di Discord. La selezione utenti funziona.",
		errNoTargets: "Nessun server o chat in comune con questo utente.",
		errGeneric: "Qualcosa è andato storto. Vedi il registro nelle impostazioni.",
		loading: "Ricerca: {done}/{total} · trovati {found}",
		loadingErrors: "· {n} errori",
		emptyMessagesErrors: "Richieste fallite ({n}). Apri le impostazioni del plugin ed esegui l'autotest per vedere la causa.",
		badgeFriend: "AMICO",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Amico",
		ctxDm: "DM",
		ctxGroup: "Gruppo",
		ctxMore: "+{n}",
		hintPick: "Invio - messaggi dell'utente · ↑↓ - seleziona · Esc - chiudi",
		hintMessages: "Invio - vai al messaggio · Esc - chiudi",
		protipTitle: "& - ricerca globale utenti",
		pluralGuilds: ["server", "server"],
		pluralDms: ["chat", "chat"],
		pluralResults: ["risultato", "risultati"],
		catSearch: "Ricerca",
		catAppearance: "Interfaccia",
		catMessages: "Ricerca messaggi",
		catAdvanced: "Avanzate",
		setMaxUserResults: "Utenti nei suggerimenti",
		setMaxUserResultsDesc: "Righe mostrate per \"&nome\".",
		setDebounce: "Ritardo di ricerca",
		setDebounceDesc: "Pausa dopo la digitazione prima della ricerca (ms).",
		setTranslit: "Traslitterazione",
		setTranslitDesc: "\"соня\" trova \"Sonya\", \"sonya\" trova \"Соня\".",
		setFriendsFirst: "Prima gli amici",
		setFriendsFirstDesc: "Gli amici in cima, poi DM e server.",
		setIncludeDMs: "Chat dirette e di gruppo",
		setIncludeDMsDesc: "Cerca tra i tuoi contatti DM.",
		setIncludeMembers: "Membri dei server",
		setIncludeMembersDesc: "Cerca tra i membri di tutti i tuoi server.",
		setStatusDot: "Pallino di stato",
		setStatusDotDesc: "Pallino di presenza sull'avatar.",
		setBadges: "Badge",
		setBadgesDesc: "Etichette AMICO, SERVER, DM, BOT accanto al nome.",
		setHandles: "@username a destra",
		setHandlesDesc: "Mostra l'handle sul bordo destro della riga.",
		setContextLine: "Riga di contesto",
		setContextLineDesc: "\"Amico · 3 server · DM\" sotto il nome.",
		setCompact: "Modalità compatta",
		setCompactDesc: "Risultati su una riga, più righe sullo schermo.",
		setMaxMutual: "Server nella riga di contesto",
		setMaxMutualDesc: "Quanti nomi di server in comune elencare.",
		setMsgEnabled: "Modalità \"&nome testo\"",
		setMsgEnabledDesc: "Cerca i messaggi di un utente ovunque.",
		setOnlyGuilds: "Cerca solo nei server",
		setOnlyGuildsDesc: "Salta DM e gruppi durante la ricerca dei messaggi.",
		setPerTarget: "Risultati per server",
		setPerTargetDesc: "Limite di messaggi per server o chat.",
		setMaxTargets: "Destinazioni max per ricerca",
		setMaxTargetsDesc: "Più alto è più lento ma più completo.",
		setTotalLimit: "Righe totali",
		setTotalLimitDesc: "Limite complessivo dei risultati.",
		setConcurrency: "Richieste parallele",
		setConcurrencyDesc: "Non esagerare - Discord limita le raffiche di richieste.",
		setDebug: "Log dettagliati",
		setDebugDesc: "Output di debug nella console (Ctrl+Maiusc+I).",
		btnReset: "Reimposta impostazioni",
		btnResetDone: "Impostazioni ripristinate ai valori predefiniti",
		diagTitle: "Autodiagnosi",
		diagDesc: "Un clic controlla tutto: moduli Discord, motore, rendering. Invia il rapporto all'autore se qualcosa fallisce.",
		diagRun: "Esegui autotest",
		diagCopy: "Copia rapporto",
		diagTransport: "Testa ricerca messaggi (1 richiesta)",
		diagOk: "Tutti i controlli superati",
		diagFail: "Problemi rilevati: {n}",
		diagNever: "L'autotest non è ancora stato eseguito",
		copied: "Copiato negli appunti",
		manualCopyBtn: "Copia manuale",
		manualCopyTitle: "Copia il rapporto manualmente",
		manualCopyHint: "La copia automatica non è stata confermata. Il testo del rapporto è già selezionato - premi Ctrl+C (Cmd+C su Mac) e incollalo nella chat.",
		manualCopyClose: "Fatto",
		about: "\"&nome\" trova una persona in tutti i server e le chat in comune. \"&nome testo\" trova i suoi messaggi. L'interfaccia segue automaticamente il tuo tema di Discord.",
		footerHotkeys: "Ctrl+K - ricerca rapida · & - modalità plugin · Tab - dal nome ai messaggi",
		toastWelcome: "UserGlobalSearch: apri Ctrl+K e digita &",
		linkGithub: "GitHub",
		linkIssues: "Segnala un problema",
		sectionMessages: "Messaggi"
	},

	"nl": {
		headerPickUsers: "Gebruikers: \"{q}\"",
		headerPickAll: "Alle gebruikers doorzoeken",
		headerMessagesFor: "Berichten van {name}: \"{q}\"",
		headerAllMessages: "Alle berichten: {name}",
		emptyUsers: "Niemand gevonden voor \"{q}\".",
		emptyUsersHint: "Probeer een andere spelling of transliteratie: sonya / соня.",
		emptyMessages: "Geen berichten gevonden. Probeer een andere zoekopdracht.",
		errNoTransport: "Berichten zoeken is niet beschikbaar in deze Discord-build. Gebruikers kiezen werkt wel.",
		errNoTargets: "Geen gedeelde servers of chats met deze gebruiker.",
		errGeneric: "Er is iets misgegaan. Zie het logboek in de instellingen.",
		loading: "Zoeken: {done}/{total} · gevonden {found}",
		loadingErrors: "· {n} fouten",
		emptyMessagesErrors: "Verzoeken mislukt ({n}). Open de plugin-instellingen en voer de zelftest uit om de oorzaak te zien.",
		badgeFriend: "VRIEND",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Vriend",
		ctxDm: "DM",
		ctxGroup: "Groep",
		ctxMore: "+{n}",
		hintPick: "Enter - berichten van gebruiker · ↑↓ - kiezen · Esc - sluiten",
		hintMessages: "Enter - naar bericht gaan · Esc - sluiten",
		protipTitle: "& - wereldwijd gebruikers zoeken",
		pluralGuilds: ["server", "servers"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["resultaat", "resultaten"],
		catSearch: "Zoeken",
		catAppearance: "Uiterlijk",
		catMessages: "Berichten zoeken",
		catAdvanced: "Geavanceerd",
		setMaxUserResults: "Gebruikers in suggesties",
		setMaxUserResultsDesc: "Rijen die worden getoond bij \"&naam\".",
		setDebounce: "Zoekvertraging",
		setDebounceDesc: "Pauze na het typen voordat het zoeken start (ms).",
		setTranslit: "Transliteratie",
		setTranslitDesc: "\"соня\" vindt \"Sonya\", \"sonya\" vindt \"Соня\".",
		setFriendsFirst: "Vrienden eerst",
		setFriendsFirstDesc: "Vrienden bovenaan, daarna DM's en servers.",
		setIncludeDMs: "Directe en groepschats",
		setIncludeDMsDesc: "Zoeken tussen je DM-contacten.",
		setIncludeMembers: "Serverleden",
		setIncludeMembersDesc: "Zoeken tussen leden van al je servers.",
		setStatusDot: "Statusstip",
		setStatusDotDesc: "Groene/gele/rode stip op de avatar.",
		setBadges: "Badges",
		setBadgesDesc: "Labels VRIEND, SERVER, DM, BOT naast de naam.",
		setHandles: "@username rechts",
		setHandlesDesc: "Toon de handle aan de rechterkant van de rij.",
		setContextLine: "Contextregel",
		setContextLineDesc: "\"Vriend · 3 servers · DM\" onder de naam.",
		setCompact: "Compacte modus",
		setCompactDesc: "Resultaten op één regel, meer rijen op het scherm.",
		setMaxMutual: "Servers in contextregel",
		setMaxMutualDesc: "Hoeveel gedeelde servernamen worden vermeld.",
		setMsgEnabled: "Modus \"&naam tekst\"",
		setMsgEnabledDesc: "Zoek berichten van een gebruiker overal.",
		setOnlyGuilds: "Alleen op servers zoeken",
		setOnlyGuildsDesc: "DM's en groepschats overslaan bij het zoeken naar berichten.",
		setPerTarget: "Resultaten per server",
		setPerTargetDesc: "Berichtenlimiet per server of chat.",
		setMaxTargets: "Max. doelen per zoekopdracht",
		setMaxTargetsDesc: "Hoger is langzamer maar vollediger.",
		setTotalLimit: "Totaal aantal rijen",
		setTotalLimitDesc: "Algemene limiet voor berichtresultaten.",
		setConcurrency: "Parallelle verzoeken",
		setConcurrencyDesc: "Niet te hoog zetten - Discord begrenst bursts.",
		setDebug: "Uitgebreide logs",
		setDebugDesc: "Debug-uitvoer naar de console (Ctrl+Shift+I).",
		btnReset: "Instellingen resetten",
		btnResetDone: "Instellingen zijn teruggezet naar standaard",
		diagTitle: "Zelfdiagnose",
		diagDesc: "Eén klik controleert alles: Discord-modules, engine, renderer. Stuur het rapport naar de auteur als iets faalt.",
		diagRun: "Zelftest uitvoeren",
		diagCopy: "Rapport kopiëren",
		diagTransport: "Berichten zoeken testen (1 verzoek)",
		diagOk: "Alle controles geslaagd",
		diagFail: "Problemen gevonden: {n}",
		diagNever: "Zelftest is nog niet uitgevoerd",
		copied: "Gekopieerd naar klembord",
		manualCopyBtn: "Handmatig kopiëren",
		manualCopyTitle: "Kopieer het rapport handmatig",
		manualCopyHint: "Automatisch kopiëren kon niet worden bevestigd. De rapporttekst is al geselecteerd - druk op Ctrl+C (Cmd+C op Mac) en plak in de chat.",
		manualCopyClose: "Klaar",
		about: "\"&naam\" vindt een persoon op alle gedeelde servers en chats. \"&naam tekst\" vindt zijn berichten. De interface volgt automatisch je Discord-thema.",
		footerHotkeys: "Ctrl+K - snel zoeken · & - pluginmodus · Tab - van naam naar berichten",
		toastWelcome: "UserGlobalSearch: open Ctrl+K en typ &",
		linkGithub: "GitHub",
		linkIssues: "Een probleem melden",
		sectionMessages: "Berichten"
	},

	"pl": {
		headerPickUsers: "Użytkownicy: „{q}”",
		headerPickAll: "Szukaj wśród wszystkich użytkowników",
		headerMessagesFor: "Wiadomości {name}: „{q}”",
		headerAllMessages: "Wszystkie wiadomości: {name}",
		emptyUsers: "Nikogo nie znaleziono dla „{q}”.",
		emptyUsersHint: "Spróbuj innej pisowni lub transliteracji: sonya / соня.",
		emptyMessages: "Nie znaleziono wiadomości. Spróbuj zmienić zapytanie.",
		errNoTransport: "Wyszukiwanie wiadomości jest niedostępne w tej wersji Discorda. Wybór użytkowników działa.",
		errNoTargets: "Brak wspólnych serwerów i czatów z tym użytkownikiem.",
		errGeneric: "Coś poszło nie tak. Szczegóły w dzienniku w ustawieniach.",
		loading: "Szukam: {done}/{total} · znaleziono {found}",
		loadingErrors: "· błędów {n}",
		emptyMessagesErrors: "Żądania zakończyły się błędami ({n}). Otwórz ustawienia wtyczki i uruchom autotest - raport pokaże przyczynę.",
		badgeFriend: "ZNAMY",
		badgeServer: "SERWER",
		badgeDm: "PW",
		badgeBot: "BOT",
		ctxFriend: "Znajomy",
		ctxDm: "PW",
		ctxGroup: "Grupa",
		ctxMore: "+{n}",
		hintPick: "Enter - wiadomości użytkownika · ↑↓ - wybór · Esc - zamknij",
		hintMessages: "Enter - przejdź do wiadomości · Esc - zamknij",
		protipTitle: "& - globalne wyszukiwanie użytkowników",
		pluralGuilds: ["serwer", "serwery", "serwerów"],
		pluralDms: ["czat", "czaty", "czatów"],
		pluralResults: ["wynik", "wyniki", "wyników"],
		catSearch: "Wyszukiwanie",
		catAppearance: "Interfejs",
		catMessages: "Wyszukiwanie wiadomości",
		catAdvanced: "Zaawansowane",
		setMaxUserResults: "Użytkowników w podpowiedziach",
		setMaxUserResultsDesc: "Ile wierszy pokazywać przy wpisaniu „&nick”.",
		setDebounce: "Opóźnienie wyszukiwania",
		setDebounceDesc: "Pauza po wpisaniu przed startem wyszukiwania (ms).",
		setTranslit: "Transliteracja",
		setTranslitDesc: "„соня” znajduje „Sonya”, a „sonya” znajduje „Соня”.",
		setFriendsFirst: "Znajomi na początku",
		setFriendsFirstDesc: "Znajomi zawsze na górze listy, potem PW i serwery.",
		setIncludeDMs: "Czaty prywatne i grupowe",
		setIncludeDMsDesc: "Szukaj wśród rozmówców z PW.",
		setIncludeMembers: "Członkowie serwerów",
		setIncludeMembersDesc: "Szukaj wśród członków wszystkich swoich serwerów.",
		setStatusDot: "Kropka statusu",
		setStatusDotDesc: "Zielona/żółta/czerwona kropka na avatarze.",
		setBadges: "Odznaki",
		setBadgesDesc: "Etykiety ZNAJOMY, SERWER, PW, BOT obok nazwy.",
		setHandles: "@username po prawej",
		setHandlesDesc: "Pokazuj nick po prawej stronie wiersza.",
		setContextLine: "Wiersz kontekstu",
		setContextLineDesc: "„Znajomy · 3 serwery · PW” pod nazwą.",
		setCompact: "Tryb kompaktowy",
		setCompactDesc: "Jednoliniowe wyniki, więcej wierszy na ekranie.",
		setMaxMutual: "Serwerów w wierszu kontekstu",
		setMaxMutualDesc: "Ile nazw wspólnych serwerów wymieniać.",
		setMsgEnabled: "Tryb „&nick tekst”",
		setMsgEnabledDesc: "Wyszukiwanie wiadomości użytkownika wszędzie.",
		setOnlyGuilds: "Szukaj tylko na serwerach",
		setOnlyGuildsDesc: "Pomiń PW i czaty grupowe przy wyszukiwaniu wiadomości.",
		setPerTarget: "Wyników z serwera",
		setPerTargetDesc: "Limit wiadomości z jednego serwera lub czatu.",
		setMaxTargets: "Maks. celów na wyszukiwanie",
		setMaxTargetsDesc: "Więcej - wolniej, ale pełniejszy zasięg.",
		setTotalLimit: "Wszystkich wierszy na liście",
		setTotalLimitDesc: "Ogólny limit wyników wiadomości.",
		setConcurrency: "Równoległych żądań",
		setConcurrencyDesc: "Nie ustawiaj zbyt wysoko - Discord ogranicza serie żądań.",
		setDebug: "Szczegółowe logi",
		setDebugDesc: "Wyjście debugowania do konsoli (Ctrl+Shift+I).",
		btnReset: "Zresetuj ustawienia",
		btnResetDone: "Ustawienia zresetowane do domyślnych",
		diagTitle: "Autodiagnostyka",
		diagDesc: "Jeden klik sprawdza wszystko: moduły Discorda, silnik, render. Wyślij raport autorowi, jeśli coś nie działa.",
		diagRun: "Uruchom autotest",
		diagCopy: "Kopiuj raport",
		diagTransport: "Przetestuj wyszukiwanie wiadomości (1 żądanie)",
		diagOk: "Wszystkie testy zaliczone",
		diagFail: "Znaleziono problemy: {n}",
		diagNever: "Autotest nie był jeszcze uruchamiany",
		copied: "Skopiowano do schowka",
		manualCopyBtn: "Kopiowanie ręczne",
		manualCopyTitle: "Skopiuj raport ręcznie",
		manualCopyHint: "Automatyczne kopiowanie nie zostało potwierdzone. Tekst raportu jest już zaznaczony - naciśnij Ctrl+C (Cmd+C na Macu) i wklej na czat.",
		manualCopyClose: "Gotowe",
		about: "„&nick” - znajdź osobę na wszystkich wspólnych serwerach i czatach. „&nick tekst” - jej wiadomości wszędzie, gdzie jesteś. Interfejs jest w pełni natywny: motyw Discorda stosuje się automatycznie.",
		footerHotkeys: "Ctrl+K - szybkie wyszukiwanie · & - tryb wtyczki · Tab - od nazwy do wiadomości",
		toastWelcome: "UserGlobalSearch: otwórz Ctrl+K i wpisz &",
		linkGithub: "GitHub",
		linkIssues: "Zgłoś problem",
		sectionMessages: "Wiadomości"
	},

	"cs": {
		headerPickUsers: "Uživatelé: „{q}“",
		headerPickAll: "Hledat mezi všemi uživateli",
		headerMessagesFor: "Zprávy od {name}: „{q}“",
		headerAllMessages: "Všechny zprávy: {name}",
		emptyUsers: "Pro „{q}“ nebyl nikdo nalezen.",
		emptyUsersHint: "Zkuste jiný zápis nebo transliteraci: sonya / соня.",
		emptyMessages: "Nebyly nalezeny žádné zprávy. Zkuste změnit dotaz.",
		errNoTransport: "Vyhledávání zpráv není v této sestavě Discordu dostupné. Výběr uživatelů funguje.",
		errNoTargets: "S tímto uživatelem nemáte žádné společné servery ani chaty.",
		errGeneric: "Něco se pokazilo. Podrobnosti v žurnálu v nastavení.",
		loading: "Hledám: {done}/{total} · nalezeno {found}",
		loadingErrors: "· chyb {n}",
		emptyMessagesErrors: "Požadavky selhaly ({n}). Otevřete nastavení pluginu a spusťte autotest - zpráva ukáže příčinu.",
		badgeFriend: "PŘÍTEL",
		badgeServer: "SERVER",
		badgeDm: "SZ",
		badgeBot: "BOT",
		ctxFriend: "Přítel",
		ctxDm: "SZ",
		ctxGroup: "Skupina",
		ctxMore: "+{n}",
		hintPick: "Enter - zprávy uživatele · ↑↓ - výběr · Esc - zavřít",
		hintMessages: "Enter - přejít na zprávu · Esc - zavřít",
		protipTitle: "& - globální vyhledávání uživatelů",
		pluralGuilds: ["server", "servery", "serverů"],
		pluralDms: ["chat", "chaty", "chatů"],
		pluralResults: ["výsledek", "výsledky", "výsledků"],
		catSearch: "Hledání",
		catAppearance: "Rozhraní",
		catMessages: "Vyhledávání zpráv",
		catAdvanced: "Pokročilé",
		setMaxUserResults: "Uživatelů v návrzích",
		setMaxUserResultsDesc: "Kolik řádků zobrazit při zadání „&jméno“.",
		setDebounce: "Prodleva hledání",
		setDebounceDesc: "Pauza po psaní před spuštěním hledání (ms).",
		setTranslit: "Transliterace",
		setTranslitDesc: "„соня“ najde „Sonya“ a „sonya“ najde „Соня“.",
		setFriendsFirst: "Přátelé první",
		setFriendsFirstDesc: "Přátelé vždy nahoře, pak SZ a servery.",
		setIncludeDMs: "Osobní a skupinové chaty",
		setIncludeDMsDesc: "Hledat mezi kontakty ze SZ.",
		setIncludeMembers: "Členové serverů",
		setIncludeMembersDesc: "Hledat mezi členy všech vašich serverů.",
		setStatusDot: "Tečka stavu",
		setStatusDotDesc: "Zelená/žlutá/červená tečka na avataru.",
		setBadges: "Odznaky",
		setBadgesDesc: "Štítky PŘÍTEL, SERVER, SZ, BOT vedle jména.",
		setHandles: "@username vpravo",
		setHandlesDesc: "Zobrazit přezdívku na pravém okraji řádku.",
		setContextLine: "Řádek kontextu",
		setContextLineDesc: "„Přítel · 3 servery · SZ“ pod jménem.",
		setCompact: "Kompaktní režim",
		setCompactDesc: "Jednořádkové výsledky, více řádků na obrazovce.",
		setMaxMutual: "Serverů v řádku kontextu",
		setMaxMutualDesc: "Kolik názvů společných serverů vypsat.",
		setMsgEnabled: "Režim „&jméno text“",
		setMsgEnabledDesc: "Hledat zprávy uživatele všude.",
		setOnlyGuilds: "Hledat jen na serverech",
		setOnlyGuildsDesc: "Přeskočit SZ a skupinové chaty při hledání zpráv.",
		setPerTarget: "Výsledků ze serveru",
		setPerTargetDesc: "Limit zpráv z jednoho serveru nebo chatu.",
		setMaxTargets: "Max. cílů na hledání",
		setMaxTargetsDesc: "Více je pomalejší, ale úplnější.",
		setTotalLimit: "Celkem řádků v seznamu",
		setTotalLimitDesc: "Celkový limit výsledků zpráv.",
		setConcurrency: "Paralelních požadavků",
		setConcurrencyDesc: "Nenastavujte příliš vysoko - Discord omezuje dávky požadavků.",
		setDebug: "Podrobné logy",
		setDebugDesc: "Ladicí výstup do konzole (Ctrl+Shift+I).",
		btnReset: "Obnovit nastavení",
		btnResetDone: "Nastavení byla obnovena na výchozí",
		diagTitle: "Autodiagnostika",
		diagDesc: "Jedno kliknutí zkontroluje vše: moduly Discordu, engine, vykreslení. Když něco selže, pošlete zprávu autorovi.",
		diagRun: "Spustit autotest",
		diagCopy: "Kopírovat zprávu",
		diagTransport: "Otestovat hledání zpráv (1 požadavek)",
		diagOk: "Všechny kontroly prošly",
		diagFail: "Nalezeny problémy: {n}",
		diagNever: "Autotest ještě nebyl spuštěn",
		copied: "Zkopírováno do schránky",
		manualCopyBtn: "Ruční kopírování",
		manualCopyTitle: "Zkopírujte zprávu ručně",
		manualCopyHint: "Automatické kopírování se nepodařilo potvrdit. Text zprávy je již označen - stiskněte Ctrl+C (Cmd+C na Macu) a vložte do chatu.",
		manualCopyClose: "Hotovo",
		about: "„&jméno“ - najde osobu na všech společných serverech a chatech. „&jméno text“ - její zprávy všude, kde jste. Rozhraní je plně nativní: motiv Discordu se použije automaticky.",
		footerHotkeys: "Ctrl+K - rychlé hledání · & - režim pluginu · Tab - od jména ke zprávám",
		toastWelcome: "UserGlobalSearch: otevřete Ctrl+K a napište &",
		linkGithub: "GitHub",
		linkIssues: "Nahlásit problém",
		sectionMessages: "Zprávy"
	},

	"tr": {
		headerPickUsers: "Kullanıcılar: \"{q}\"",
		headerPickAll: "Tüm kullanıcılarda ara",
		headerMessagesFor: "{name} mesajları: \"{q}\"",
		headerAllMessages: "Tüm mesajlar: {name}",
		emptyUsers: "\"{q}\" için kimse bulunamadı.",
		emptyUsersHint: "Başka bir yazım veya transliterasyon deneyin: sonya / соня.",
		emptyMessages: "Mesaj bulunamadı. Sorguyu değiştirmeyi deneyin.",
		errNoTransport: "Bu Discord sürümünde mesaj araması kullanılamıyor. Kullanıcı seçimi çalışıyor.",
		errNoTargets: "Bu kullanıcıyla ortak sunucu veya sohbet yok.",
		errGeneric: "Bir şeyler ters gitti. Ayrıntılar ayarlardaki günlükte.",
		loading: "Aranıyor: {done}/{total} · bulundu {found}",
		loadingErrors: "· {n} hata",
		emptyMessagesErrors: "İstekler hatalarla bitti ({n}). Nedenini görmek için eklenti ayarlarını açıp otomatik testi çalıştırın.",
		badgeFriend: "ARKADAŞ",
		badgeServer: "SUNUCU",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Arkadaş",
		ctxDm: "DM",
		ctxGroup: "Grup",
		ctxMore: "+{n}",
		hintPick: "Enter - kullanıcının mesajları · ↑↓ - seçim · Esc - kapat",
		hintMessages: "Enter - mesaja git · Esc - kapat",
		protipTitle: "& - genel kullanıcı araması",
		pluralGuilds: ["sunucu", "sunucu"],
		pluralDms: ["sohbet", "sohbet"],
		pluralResults: ["sonuç", "sonuç"],
		catSearch: "Arama",
		catAppearance: "Arayüz",
		catMessages: "Mesaj arama",
		catAdvanced: "Gelişmiş",
		setMaxUserResults: "Önerilerdeki kullanıcı sayısı",
		setMaxUserResultsDesc: "\"&ad\" yazıldığında gösterilen satır sayısı.",
		setDebounce: "Arama gecikmesi",
		setDebounceDesc: "Yazdıktan sonra aramanın başlamasından önceki bekleme (ms).",
		setTranslit: "Transliterasyon",
		setTranslitDesc: "\"соня\", \"Sonya\"yı; \"sonya\", \"Соня\"yı bulur.",
		setFriendsFirst: "Önce arkadaşlar",
		setFriendsFirstDesc: "Arkadaşlar her zaman listenin başında, sonra DM'ler ve sunucular.",
		setIncludeDMs: "Özel ve grup sohbetleri",
		setIncludeDMsDesc: "DM kişileriniz arasında arayın.",
		setIncludeMembers: "Sunucu üyeleri",
		setIncludeMembersDesc: "Tüm sunucularınızın üyeleri arasında arayın.",
		setStatusDot: "Durum noktası",
		setStatusDotDesc: "Avatarda yeşil/sarı/kırmızı nokta.",
		setBadges: "Rozetler",
		setBadgesDesc: "İsmin yanında ARKADAŞ, SUNUCU, DM, BOT etiketleri.",
		setHandles: "Sağda @kullanıcıadı",
		setHandlesDesc: "Satırın sağ tarafında kullanıcı adını göster.",
		setContextLine: "Bağlam satırı",
		setContextLineDesc: "İsmin altında \"Arkadaş · 3 sunucu · DM\".",
		setCompact: "Kompakt mod",
		setCompactDesc: "Tek satırlı sonuçlar, ekranda daha fazla satır.",
		setMaxMutual: "Bağlam satırındaki sunucu sayısı",
		setMaxMutualDesc: "Kaç ortak sunucu adı listelenecek.",
		setMsgEnabled: "\"&ad metin\" modu",
		setMsgEnabledDesc: "Bir kullanıcının mesajlarını her yerde arar.",
		setOnlyGuilds: "Yalnızca sunucularda ara",
		setOnlyGuildsDesc: "Mesaj ararken DM'leri ve grup sohbetlerini atla.",
		setPerTarget: "Sunucu başına sonuç",
		setPerTargetDesc: "Sunucu veya sohbet başına mesaj sınırı.",
		setMaxTargets: "Arama başına maks. hedef",
		setMaxTargetsDesc: "Daha yüksek daha yavaş ama daha kapsamlı.",
		setTotalLimit: "Toplam satır sayısı",
		setTotalLimitDesc: "Genel mesaj sonucu sınırı.",
		setConcurrency: "Paralel istekler",
		setConcurrencyDesc: "Çok yükseltmeyin - Discord sık istekleri kısar.",
		setDebug: "Ayrıntılı günlükler",
		setDebugDesc: "Konsola hata ayıklama çıktısı (Ctrl+Shift+I).",
		btnReset: "Ayarları sıfırla",
		btnResetDone: "Ayarlar varsayılanlara sıfırlandı",
		diagTitle: "Otomatik tanılama",
		diagDesc: "Tek tıkla her şeyi kontrol eder: Discord modülleri, motor, render. Bir şey başarısız olursa raporu yazara gönderin.",
		diagRun: "Otomatik testi çalıştır",
		diagCopy: "Raporu kopyala",
		diagTransport: "Mesaj aramasını test et (1 istek)",
		diagOk: "Tüm kontroller geçti",
		diagFail: "Sorunlar bulundu: {n}",
		diagNever: "Otomatik test henüz çalıştırılmadı",
		copied: "Panoya kopyalandı",
		manualCopyBtn: "Elle kopyalama",
		manualCopyTitle: "Raporu elle kopyalayın",
		manualCopyHint: "Otomatik kopyalama doğrulanamadı. Rapor metni zaten seçili - Ctrl+C (Mac'te Cmd+C) tuşuna basın ve sohbete yapıştırın.",
		manualCopyClose: "Tamam",
		about: "\"&ad\" - kişiyi tüm ortak sunucularda ve sohbetlerde bulur. \"&ad metin\" - mesajlarını her yerde bulur. Arayüz tamamen yerleşiktir: Discord temanız otomatik uygulanır.",
		footerHotkeys: "Ctrl+K - hızlı arama · & - eklenti modu · Tab - isimden mesajlara",
		toastWelcome: "UserGlobalSearch: Ctrl+K açın ve & yazın",
		linkGithub: "GitHub",
		linkIssues: "Sorun bildir",
		sectionMessages: "Mesajlar"
	},

	"sv-SE": {
		headerPickUsers: "Användare: \"{q}\"",
		headerPickAll: "Sök bland alla användare",
		headerMessagesFor: "Meddelanden från {name}: \"{q}\"",
		headerAllMessages: "Alla meddelanden: {name}",
		emptyUsers: "Ingen hittades för \"{q}\".",
		emptyUsersHint: "Prova en annan stavning eller translitterering: sonya / соня.",
		emptyMessages: "Inga meddelanden hittades. Prova att ändra sökningen.",
		errNoTransport: "Meddelandesökning är inte tillgänglig i den här Discord-versionen. Användarval fungerar.",
		errNoTargets: "Inga gemensamma servrar eller chattar med den här användaren.",
		errGeneric: "Något gick fel. Se loggen i inställningarna.",
		loading: "Söker: {done}/{total} · hittade {found}",
		loadingErrors: "· {n} fel",
		emptyMessagesErrors: "Förfrågningarna misslyckades ({n}). Öppna pluginets inställningar och kör självtestet för att se orsaken.",
		badgeFriend: "VÄN",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Vän",
		ctxDm: "DM",
		ctxGroup: "Grupp",
		ctxMore: "+{n}",
		hintPick: "Enter - användarens meddelanden · ↑↓ - välj · Esc - stäng",
		hintMessages: "Enter - gå till meddelande · Esc - stäng",
		protipTitle: "& - global användarsökning",
		pluralGuilds: ["server", "servrar"],
		pluralDms: ["chatt", "chattar"],
		pluralResults: ["resultat", "resultat"],
		catSearch: "Sök",
		catAppearance: "Gränssnitt",
		catMessages: "Meddelandesökning",
		catAdvanced: "Avancerat",
		setMaxUserResults: "Användare i förslag",
		setMaxUserResultsDesc: "Hur många rader som visas vid \"&namn\".",
		setDebounce: "Sökfördröjning",
		setDebounceDesc: "Paus efter skrivning innan sökningen startar (ms).",
		setTranslit: "Translitterering",
		setTranslitDesc: "\"соня\" hittar \"Sonya\", \"sonya\" hittar \"Соня\".",
		setFriendsFirst: "Vänner först",
		setFriendsFirstDesc: "Vänner alltid överst, sedan DM och servrar.",
		setIncludeDMs: "Direkta och gruppchattar",
		setIncludeDMsDesc: "Sök bland dina DM-kontakter.",
		setIncludeMembers: "Servermedlemmar",
		setIncludeMembersDesc: "Sök bland medlemmar i alla dina servrar.",
		setStatusDot: "Statusprick",
		setStatusDotDesc: "Grön/gul/röd prick på avataren.",
		setBadges: "Märken",
		setBadgesDesc: "Etiketterna VÄN, SERVER, DM, BOT bredvid namnet.",
		setHandles: "@username till höger",
		setHandlesDesc: "Visa användarnamnet längst till höger på raden.",
		setContextLine: "Kontextrad",
		setContextLineDesc: "\"Vän · 3 servrar · DM\" under namnet.",
		setCompact: "Kompakt läge",
		setCompactDesc: "Enradiga resultat, fler rader på skärmen.",
		setMaxMutual: "Servrar i kontextraden",
		setMaxMutualDesc: "Hur många gemensamma servernamn som listas.",
		setMsgEnabled: "Läget \"&namn text\"",
		setMsgEnabledDesc: "Sök en användares meddelanden överallt.",
		setOnlyGuilds: "Sök bara på servrar",
		setOnlyGuildsDesc: "Hoppa över DM och gruppchattar vid meddelandesökning.",
		setPerTarget: "Resultat per server",
		setPerTargetDesc: "Meddelandegräns per server eller chatt.",
		setMaxTargets: "Max mål per sökning",
		setMaxTargetsDesc: "Fler är långsammare men mer komplett.",
		setTotalLimit: "Totalt antal rader",
		setTotalLimitDesc: "Övergripande gräns för meddelanderesultat.",
		setConcurrency: "Parallella förfrågningar",
		setConcurrencyDesc: "Sätt inte för högt - Discord begränsar täta förfrågningar.",
		setDebug: "Utförliga loggar",
		setDebugDesc: "Felsökningsutskrift till konsolen (Ctrl+Shift+I).",
		btnReset: "Återställ inställningar",
		btnResetDone: "Inställningarna har återställts till standard",
		diagTitle: "Självdiagnostik",
		diagDesc: "Ett klick kontrollerar allt: Discord-moduler, motor, rendering. Skicka rapporten till författaren om något går fel.",
		diagRun: "Kör självtest",
		diagCopy: "Kopiera rapport",
		diagTransport: "Testa meddelandesökning (1 förfrågan)",
		diagOk: "Alla kontroller godkända",
		diagFail: "Problem hittades: {n}",
		diagNever: "Självtestet har inte körts ännu",
		copied: "Kopierat till urklipp",
		manualCopyBtn: "Manuell kopiering",
		manualCopyTitle: "Kopiera rapporten manuellt",
		manualCopyHint: "Automatisk kopiering kunde inte bekräftas. Rapporttexten är redan markerad - tryck Ctrl+C (Cmd+C på Mac) och klistra in i chatten.",
		manualCopyClose: "Klart",
		about: "\"&namn\" hittar en person på alla gemensamma servrar och chattar. \"&namn text\" hittar personens meddelanden överallt där du är medlem. Gränssnittet är helt nativt: ditt Discord-tema tillämpas automatiskt.",
		footerHotkeys: "Ctrl+K - snabbsökning · & - pluginläge · Tab - från namn till meddelanden",
		toastWelcome: "UserGlobalSearch: öppna Ctrl+K och skriv &",
		linkGithub: "GitHub",
		linkIssues: "Rapportera ett problem",
		sectionMessages: "Meddelanden"
	},

	"da": {
		headerPickUsers: "Brugere: \"{q}\"",
		headerPickAll: "Søg blandt alle brugere",
		headerMessagesFor: "Beskeder fra {name}: \"{q}\"",
		headerAllMessages: "Alle beskeder: {name}",
		emptyUsers: "Ingen fundet for \"{q}\".",
		emptyUsersHint: "Prøv en anden stavning eller translitteration: sonya / соня.",
		emptyMessages: "Ingen beskeder fundet. Prøv at ændre søgningen.",
		errNoTransport: "Beskedsøgning er ikke tilgængelig i denne Discord-version. Brugervalg virker.",
		errNoTargets: "Ingen fælles servere eller chats med denne bruger.",
		errGeneric: "Noget gik galt. Se loggen i indstillingerne.",
		loading: "Søger: {done}/{total} · fundet {found}",
		loadingErrors: "· {n} fejl",
		emptyMessagesErrors: "Forespørgslerne mislykkedes ({n}). Åbn plugin-indstillingerne og kør selvtesten for at se årsagen.",
		badgeFriend: "VEN",
		badgeServer: "SERVER",
		badgeDm: "PB",
		badgeBot: "BOT",
		ctxFriend: "Ven",
		ctxDm: "PB",
		ctxGroup: "Gruppe",
		ctxMore: "+{n}",
		hintPick: "Enter - brugerens beskeder · ↑↓ - vælg · Esc - luk",
		hintMessages: "Enter - gå til besked · Esc - luk",
		protipTitle: "& - global brugersøgning",
		pluralGuilds: ["server", "servere"],
		pluralDms: ["chat", "chats"],
		pluralResults: ["resultat", "resultater"],
		catSearch: "Søgning",
		catAppearance: "Grænseflade",
		catMessages: "Beskedsøgning",
		catAdvanced: "Avanceret",
		setMaxUserResults: "Brugere i forslag",
		setMaxUserResultsDesc: "Hvor mange rækker der vises ved \"&navn\".",
		setDebounce: "Søgeforsinkelse",
		setDebounceDesc: "Pause efter indtastning, før søgningen starter (ms).",
		setTranslit: "Translitteration",
		setTranslitDesc: "\"соня\" finder \"Sonya\", og \"sonya\" finder \"Соня\".",
		setFriendsFirst: "Venner først",
		setFriendsFirstDesc: "Venner altid øverst, derefter PB og servere.",
		setIncludeDMs: "Direkte og gruppechats",
		setIncludeDMsDesc: "Søg blandt dine PB-kontakter.",
		setIncludeMembers: "Servermedlemmer",
		setIncludeMembersDesc: "Søg blandt medlemmer af alle dine servere.",
		setStatusDot: "Statusprik",
		setStatusDotDesc: "Grøn/gul/rød prik på avataren.",
		setBadges: "Badges",
		setBadgesDesc: "Mærkerne VEN, SERVER, PB, BOT ved siden af navnet.",
		setHandles: "@username til højre",
		setHandlesDesc: "Vis brugernavnet i højre side af rækken.",
		setContextLine: "Kontekstlinje",
		setContextLineDesc: "\"Ven · 3 servere · PB\" under navnet.",
		setCompact: "Kompakt tilstand",
		setCompactDesc: "Enkeltlinjede resultater, flere rækker på skærmen.",
		setMaxMutual: "Servere i kontekstlinjen",
		setMaxMutualDesc: "Hvor mange fælles servernavne der vises.",
		setMsgEnabled: "Tilstanden \"&navn tekst\"",
		setMsgEnabledDesc: "Søg en brugers beskeder alle steder.",
		setOnlyGuilds: "Søg kun på servere",
		setOnlyGuildsDesc: "Spring PB og gruppechats over ved beskedsøgning.",
		setPerTarget: "Resultater pr. server",
		setPerTargetDesc: "Beskedgrænse pr. server eller chat.",
		setMaxTargets: "Maks. mål pr. søgning",
		setMaxTargetsDesc: "Flere er langsommere, men mere komplet.",
		setTotalLimit: "Rækker i alt",
		setTotalLimitDesc: "Samlet grænse for beskedresultater.",
		setConcurrency: "Parallelle forespørgsler",
		setConcurrencyDesc: "Sæt den ikke for højt - Discord begrænser hyppige forespørgsler.",
		setDebug: "Detaljerede logs",
		setDebugDesc: "Fejlfindingsoutput til konsollen (Ctrl+Shift+I).",
		btnReset: "Nulstil indstillinger",
		btnResetDone: "Indstillingerne er nulstillet til standard",
		diagTitle: "Selvdiagnostik",
		diagDesc: "Et klik tjekker alt: Discord-moduler, motor, rendering. Send rapporten til forfatteren, hvis noget fejler.",
		diagRun: "Kør selvtest",
		diagCopy: "Kopiér rapport",
		diagTransport: "Test beskedsøgning (1 forespørgsel)",
		diagOk: "Alle tjek bestået",
		diagFail: "Problemer fundet: {n}",
		diagNever: "Selvtesten er ikke kørt endnu",
		copied: "Kopieret til udklipsholder",
		manualCopyBtn: "Manuel kopiering",
		manualCopyTitle: "Kopiér rapporten manuelt",
		manualCopyHint: "Automatisk kopiering kunne ikke bekræftes. Rapportteksten er allerede markeret - tryk Ctrl+C (Cmd+C på Mac) og indsæt i chatten.",
		manualCopyClose: "Færdig",
		about: "\"&navn\" finder en person på alle fælles servere og chats. \"&navn tekst\" finder personens beskeder overalt, hvor du er medlem. Grænsefladen er helt nativ: dit Discord-tema anvendes automatisk.",
		footerHotkeys: "Ctrl+K - hurtigsøgning · & - plugintilstand · Tab - fra navn til beskeder",
		toastWelcome: "UserGlobalSearch: åbn Ctrl+K og skriv &",
		linkGithub: "GitHub",
		linkIssues: "Rapportér et problem",
		sectionMessages: "Beskeder"
	},

	"no": {
		headerPickUsers: "Brukere: \"{q}\"",
		headerPickAll: "Søk blant alle brukere",
		headerMessagesFor: "Meldinger fra {name}: \"{q}\"",
		headerAllMessages: "Alle meldinger: {name}",
		emptyUsers: "Ingen funnet for \"{q}\".",
		emptyUsersHint: "Prøv en annen stavemåte eller translitterasjon: sonya / соня.",
		emptyMessages: "Ingen meldinger funnet. Prøv å endre søket.",
		errNoTransport: "Meldingssøk er ikke tilgjengelig i denne Discord-versjonen. Brukervalg fungerer.",
		errNoTargets: "Ingen felles servere eller chatter med denne brukeren.",
		errGeneric: "Noe gikk galt. Se loggen i innstillingene.",
		loading: "Søker: {done}/{total} · funnet {found}",
		loadingErrors: "· {n} feil",
		emptyMessagesErrors: "Forespørslene mislyktes ({n}). Åpne plugin-innstillingene og kjør selvtesten for å se årsaken.",
		badgeFriend: "VENN",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Venn",
		ctxDm: "DM",
		ctxGroup: "Gruppe",
		ctxMore: "+{n}",
		hintPick: "Enter - brukerens meldinger · ↑↓ - velg · Esc - lukk",
		hintMessages: "Enter - gå til melding · Esc - lukk",
		protipTitle: "& - global brukersøk",
		pluralGuilds: ["server", "servere"],
		pluralDms: ["chat", "chatter"],
		pluralResults: ["resultat", "resultater"],
		catSearch: "Søk",
		catAppearance: "Grensesnitt",
		catMessages: "Meldingssøk",
		catAdvanced: "Avansert",
		setMaxUserResults: "Brukere i forslag",
		setMaxUserResultsDesc: "Hvor mange rader som vises ved \"&navn\".",
		setDebounce: "Søkeforsinkelse",
		setDebounceDesc: "Pause etter skriving før søket starter (ms).",
		setTranslit: "Transliterasjon",
		setTranslitDesc: "\"соня\" finner \"Sonya\", og \"sonya\" finner \"Соня\".",
		setFriendsFirst: "Venner først",
		setFriendsFirstDesc: "Venner alltid øverst, deretter DM og servere.",
		setIncludeDMs: "Direkte- og gruppechatter",
		setIncludeDMsDesc: "Søk blant DM-kontaktene dine.",
		setIncludeMembers: "Servermedlemmer",
		setIncludeMembersDesc: "Søk blant medlemmer av alle serverne dine.",
		setStatusDot: "Statusprikk",
		setStatusDotDesc: "Grønn/gul/rød prikk på avataren.",
		setBadges: "Merker",
		setBadgesDesc: "Etikettene VENN, SERVER, DM, BOT ved siden av navnet.",
		setHandles: "@username til høyre",
		setHandlesDesc: "Vis brukernavnet på høyre side av raden.",
		setContextLine: "Kontekstlinje",
		setContextLineDesc: "\"Venn · 3 servere · DM\" under navnet.",
		setCompact: "Kompakt modus",
		setCompactDesc: "Én linje per resultat, flere rader på skjermen.",
		setMaxMutual: "Servere i kontekstlinjen",
		setMaxMutualDesc: "Hvor mange felles servernavn som vises.",
		setMsgEnabled: "Modusen \"&navn tekst\"",
		setMsgEnabledDesc: "Søk i en brukers meldinger overalt.",
		setOnlyGuilds: "Søk bare på servere",
		setOnlyGuildsDesc: "Hopp over DM-er og gruppechatter ved meldingssøk.",
		setPerTarget: "Resultater per server",
		setPerTargetDesc: "Meldingsgrense per server eller chat.",
		setMaxTargets: "Maks. mål per søk",
		setMaxTargetsDesc: "Flere er tregere, men mer komplett.",
		setTotalLimit: "Rader totalt",
		setTotalLimitDesc: "Samlet grense for meldingsresultater.",
		setConcurrency: "Parallelle forespørsler",
		setConcurrencyDesc: "Ikke sett den for høyt - Discord begrenser raske forespørsler.",
		setDebug: "Detaljerte logger",
		setDebugDesc: "Feilsøkingsutdata til konsollen (Ctrl+Shift+I).",
		btnReset: "Tilbakestill innstillinger",
		btnResetDone: "Innstillingene er tilbakestilt til standard",
		diagTitle: "Selvdiagnostikk",
		diagDesc: "Ett klikk sjekker alt: Discord-moduler, motor, rendering. Send rapporten til forfatteren hvis noe feiler.",
		diagRun: "Kjør selvtest",
		diagCopy: "Kopier rapport",
		diagTransport: "Test meldingssøk (1 forespørsel)",
		diagOk: "Alle sjekker bestått",
		diagFail: "Problemer funnet: {n}",
		diagNever: "Selvtesten er ikke kjørt ennå",
		copied: "Kopiert til utklippstavlen",
		manualCopyBtn: "Manuell kopiering",
		manualCopyTitle: "Kopier rapporten manuelt",
		manualCopyHint: "Automatisk kopiering kunne ikke bekreftes. Rapportteksten er allerede markert - trykk Ctrl+C (Cmd+C på Mac) og lim inn i chatten.",
		manualCopyClose: "Ferdig",
		about: "\"&navn\" finner en person på alle felles servere og chatter. \"&navn tekst\" finner personens meldinger overalt der du er medlem. Grensesnittet er helt naturlig: Discord-temaet ditt brukes automatisk.",
		footerHotkeys: "Ctrl+K - hurtigsøk · & - plugin-modus · Tab - fra navn til meldinger",
		toastWelcome: "UserGlobalSearch: åpne Ctrl+K og skriv &",
		linkGithub: "GitHub",
		linkIssues: "Rapporter et problem",
		sectionMessages: "Meldinger"
	},

	"fi": {
		headerPickUsers: "Käyttäjät: \"{q}\"",
		headerPickAll: "Hae kaikista käyttäjistä",
		headerMessagesFor: "Käyttäjän {name} viestit: \"{q}\"",
		headerAllMessages: "Kaikki viestit: {name}",
		emptyUsers: "Ketään ei löytynyt haulle \"{q}\".",
		emptyUsersHint: "Kokeile toista kirjoitusasua tai translitterausta: sonya / соня.",
		emptyMessages: "Viestejä ei löytynyt. Kokeile muuttaa hakua.",
		errNoTransport: "Viestihaku ei ole käytettävissä tässä Discord-versiossa. Käyttäjien valinta toimii.",
		errNoTargets: "Ei yhteisiä palvelimia tai chattteja tämän käyttäjän kanssa.",
		errGeneric: "Jotain meni pieleen. Katso loki asetuksista.",
		loading: "Haetaan: {done}/{total} · löydetty {found}",
		loadingErrors: "· {n} virhettä",
		emptyMessagesErrors: "Pyynnöt epäonnistuivat ({n}). Avaa lisäosan asetukset ja suorita itsetesti nähdäksesi syyn.",
		badgeFriend: "YSTÄVÄ",
		badgeServer: "PALVELIN",
		badgeDm: "YV",
		badgeBot: "BOTTI",
		ctxFriend: "Ystävä",
		ctxDm: "YV",
		ctxGroup: "Ryhmä",
		ctxMore: "+{n}",
		hintPick: "Enter - käyttäjän viestit · ↑↓ - valitse · Esc - sulje",
		hintMessages: "Enter - siirry viestiin · Esc - sulje",
		protipTitle: "& - käyttäjien globaali haku",
		pluralGuilds: ["palvelin", "palvelinta"],
		pluralDms: ["chatti", "chattia"],
		pluralResults: ["tulos", "tulosta"],
		catSearch: "Haku",
		catAppearance: "Ulkoasu",
		catMessages: "Viestihaku",
		catAdvanced: "Lisäasetukset",
		setMaxUserResults: "Käyttäjiä ehdotuksissa",
		setMaxUserResultsDesc: "Kuinka monta riviä näytetään haulla \"&nimi\".",
		setDebounce: "Hakuviive",
		setDebounceDesc: "Tauko kirjoittamisen jälkeen ennen haun alkua (ms).",
		setTranslit: "Transliterointi",
		setTranslitDesc: "\"соня\" löytää \"Sonya\" ja \"sonya\" löytää \"Соня\".",
		setFriendsFirst: "Ystävät ensin",
		setFriendsFirstDesc: "Ystävät aina listan kärjessä, sitten YV:t ja palvelimet.",
		setIncludeDMs: "Yksityis- ja ryhmächatit",
		setIncludeDMsDesc: "Hae YV-kontaktiesi joukosta.",
		setIncludeMembers: "Palvelinten jäsenet",
		setIncludeMembersDesc: "Hae kaikkien palvelimiesi jäsenten joukosta.",
		setStatusDot: "Tilapiste",
		setStatusDotDesc: "Vihreä/keltainen/punainen piste avatarissa.",
		setBadges: "Merkit",
		setBadgesDesc: "YSTÄVÄ, PALVELIN, YV, BOTTI -tunnisteet nimen vieressä.",
		setHandles: "@username oikealla",
		setHandlesDesc: "Näytä nimimerkki rivin oikeassa reunassa.",
		setContextLine: "Kontekstirivi",
		setContextLineDesc: "\"Ystävä · 3 palvelinta · YV\" nimen alla.",
		setCompact: "Kompakti tila",
		setCompactDesc: "Yksiriviset tulokset, enemmän rivejä ruudulle.",
		setMaxMutual: "Palvelimia kontekstirivillä",
		setMaxMutualDesc: "Kuinka monta yhteisen palvelimen nimeä listataan.",
		setMsgEnabled: "Tila \"&nimi teksti\"",
		setMsgEnabledDesc: "Hae käyttäjän viestejä kaikkialta.",
		setOnlyGuilds: "Hae vain palvelimilta",
		setOnlyGuildsDesc: "Ohita YV:t ja ryhmächatit viestejä haettaessa.",
		setPerTarget: "Tuloksia per palvelin",
		setPerTargetDesc: "Viestiraja per palvelin tai chatti.",
		setMaxTargets: "Maks. kohteet per haku",
		setMaxTargetsDesc: "Enemmän on hitaampaa mutta kattavampaa.",
		setTotalLimit: "Rivejä yhteensä",
		setTotalLimitDesc: "Viestitulosten kokonaisraja.",
		setConcurrency: "Rinnakkaiset pyynnöt",
		setConcurrencyDesc: "Älä aseta liian korkeaksi - Discord rajoittaa tiheitä pyyntöjä.",
		setDebug: "Yksityiskohtaiset lokit",
		setDebugDesc: "Virheenjäljitystuloste konsoliin (Ctrl+Shift+I).",
		btnReset: "Palauta asetukset",
		btnResetDone: "Asetukset palautettu oletuksiin",
		diagTitle: "Itsetestaus",
		diagDesc: "Yksi klikkaus tarkistaa kaiken: Discord-moduulit, moottori, renderöinti. Lähetä raportti tekijälle, jos jokin epäonnistuu.",
		diagRun: "Suorita itsetesti",
		diagCopy: "Kopioi raportti",
		diagTransport: "Testaa viestihaku (1 pyyntö)",
		diagOk: "Kaikki tarkistukset läpäisty",
		diagFail: "Ongelmia löytyi: {n}",
		diagNever: "Itsetestiä ei ole vielä suoritettu",
		copied: "Kopioitu leikepöydälle",
		manualCopyBtn: "Manuaalinen kopiointi",
		manualCopyTitle: "Kopioi raportti manuaalisesti",
		manualCopyHint: "Automaattista kopiointia ei voitu vahvistaa. Raportin teksti on jo valittu - paina Ctrl+C (Cmd+C Macilla) ja liitä chattiin.",
		manualCopyClose: "Valmis",
		about: "\"&nimi\" löytää henkilön kaikilta yhteisiltä palvelimilta ja chateista. \"&nimi teksti\" löytää hänen viestinsä kaikkialta. Käyttöliittymä on täysin natiivi: Discord-teemasi astuu voimaan automaattisesti.",
		footerHotkeys: "Ctrl+K - pikahaku · & - lisäosan tila · Tab - nimestä viesteihin",
		toastWelcome: "UserGlobalSearch: avaa Ctrl+K ja kirjoita &",
		linkGithub: "GitHub",
		linkIssues: "Ilmoita ongelmasta",
		sectionMessages: "Viestit"
	},

	"ro": {
		headerPickUsers: "Utilizatori: „{q}”",
		headerPickAll: "Caută printre toți utilizatorii",
		headerMessagesFor: "Mesajele lui {name}: „{q}”",
		headerAllMessages: "Toate mesajele: {name}",
		emptyUsers: "Nimeni găsit pentru „{q}”.",
		emptyUsersHint: "Încearcă altă scriere sau transliterare: sonya / соня.",
		emptyMessages: "Niciun mesaj găsit. Încearcă să schimbi căutarea.",
		errNoTransport: "Căutarea de mesaje nu este disponibilă în această versiune Discord. Selectarea utilizatorilor funcționează.",
		errNoTargets: "Niciun server sau chat comun cu acest utilizator.",
		errGeneric: "Ceva nu a mers bine. Vezi jurnalul din setări.",
		loading: "Se caută: {done}/{total} · găsite {found}",
		loadingErrors: "· {n} erori",
		emptyMessagesErrors: "Cererile au eșuat ({n}). Deschide setările pluginului și rulează autotestul pentru a vedea cauza.",
		badgeFriend: "PRIETEN",
		badgeServer: "SERVER",
		badgeDm: "MP",
		badgeBot: "BOT",
		ctxFriend: "Prieten",
		ctxDm: "MP",
		ctxGroup: "Grup",
		ctxMore: "+{n}",
		hintPick: "Enter - mesajele utilizatorului · ↑↓ - selectează · Esc - închide",
		hintMessages: "Enter - mergi la mesaj · Esc - închide",
		protipTitle: "& - căutare globală de utilizatori",
		pluralGuilds: ["server", "servere"],
		pluralDms: ["chat", "chat-uri"],
		pluralResults: ["rezultat", "rezultate"],
		catSearch: "Căutare",
		catAppearance: "Interfață",
		catMessages: "Căutare mesaje",
		catAdvanced: "Avansat",
		setMaxUserResults: "Utilizatori în sugestii",
		setMaxUserResultsDesc: "Câte rânduri se afișează la „&nume”.",
		setDebounce: "Întârziere căutare",
		setDebounceDesc: "Pauză după tastare înainte de startul căutării (ms).",
		setTranslit: "Transliterare",
		setTranslitDesc: "„соня” găsește „Sonya”, iar „sonya” găsește „Соня”.",
		setFriendsFirst: "Prietenii primii",
		setFriendsFirstDesc: "Prietenii mereu în capul listei, apoi MP și servere.",
		setIncludeDMs: "Chat-uri directe și de grup",
		setIncludeDMsDesc: "Caută printre contactele tale MP.",
		setIncludeMembers: "Membrii serverelor",
		setIncludeMembersDesc: "Caută printre membrii tuturor serverelor tale.",
		setStatusDot: "Punct de stare",
		setStatusDotDesc: "Punct verde/galben/roșu pe avatar.",
		setBadges: "Insigne",
		setBadgesDesc: "Etichetele PRIETEN, SERVER, MP, BOT lângă nume.",
		setHandles: "@username în dreapta",
		setHandlesDesc: "Arată handle-ul în marginea dreaptă a rândului.",
		setContextLine: "Linie de context",
		setContextLineDesc: "„Prieten · 3 servere · MP” sub nume.",
		setCompact: "Mod compact",
		setCompactDesc: "Rezultate pe o singură linie, mai multe rânduri pe ecran.",
		setMaxMutual: "Servere în linia de context",
		setMaxMutualDesc: "Câte nume de servere comune se afișează.",
		setMsgEnabled: "Modul „&nume text”",
		setMsgEnabledDesc: "Caută mesajele unui utilizator peste tot.",
		setOnlyGuilds: "Caută doar pe servere",
		setOnlyGuildsDesc: "Omite MP-urile și grupurile la căutarea de mesaje.",
		setPerTarget: "Rezultate per server",
		setPerTargetDesc: "Limita de mesaje per server sau chat.",
		setMaxTargets: "Max. ținte per căutare",
		setMaxTargetsDesc: "Mai mult e mai lent, dar mai complet.",
		setTotalLimit: "Rânduri în total",
		setTotalLimitDesc: "Limita globală de rezultate de mesaje.",
		setConcurrency: "Cereri paralele",
		setConcurrencyDesc: "Nu seta prea sus - Discord limitează rafalele de cereri.",
		setDebug: "Jurnale detaliate",
		setDebugDesc: "Ieșire de depanare în consolă (Ctrl+Shift+I).",
		btnReset: "Resetează setările",
		btnResetDone: "Setările au fost resetate la valori implicite",
		diagTitle: "Autodiagnosticare",
		diagDesc: "Un clic verifică totul: module Discord, motor, randare. Trimite raportul autorului dacă ceva eșuează.",
		diagRun: "Rulează autotestul",
		diagCopy: "Copiază raportul",
		diagTransport: "Testează căutarea de mesaje (1 cerere)",
		diagOk: "Toate verificările au trecut",
		diagFail: "Probleme găsite: {n}",
		diagNever: "Autotestul nu a fost rulat încă",
		copied: "Copiat în clipboard",
		manualCopyBtn: "Copiere manuală",
		manualCopyTitle: "Copiază raportul manual",
		manualCopyHint: "Copierea automată nu a putut fi confirmată. Textul raportului este deja selectat - apasă Ctrl+C (Cmd+C pe Mac) și lipește-l în chat.",
		manualCopyClose: "Gata",
		about: "„&nume” găsește o persoană pe toate serverele și chat-urile comune. „&nume text” găsește mesajele ei. Interfața este complet nativă: tema ta Discord se aplică automat.",
		footerHotkeys: "Ctrl+K - căutare rapidă · & - modul plugin · Tab - de la nume la mesaje",
		toastWelcome: "UserGlobalSearch: deschide Ctrl+K și tastează &",
		linkGithub: "GitHub",
		linkIssues: "Raportează o problemă",
		sectionMessages: "Mesaje"
	},

	"hu": {
		headerPickUsers: "Felhasználók: „{q}”",
		headerPickAll: "Keresés az összes felhasználó között",
		headerMessagesFor: "{name} üzenetei: „{q}”",
		headerAllMessages: "Összes üzenet: {name}",
		emptyUsers: "Senki sem található erre: „{q}”.",
		emptyUsersHint: "Próbálj más írásmódot vagy átírást: sonya / соня.",
		emptyMessages: "Nem találhatók üzenetek. Próbáld módosítani a keresést.",
		errNoTransport: "Az üzenetkeresés nem érhető el ebben a Discord-verzióban. A felhasználóválasztás működik.",
		errNoTargets: "Nincs közös szerver vagy chat ezzel a felhasználóval.",
		errGeneric: "Valami elromlott. Részletek a beállítások naplójában.",
		loading: "Keresés: {done}/{total} · találat {found}",
		loadingErrors: "· {n} hiba",
		emptyMessagesErrors: "A kérések hibával zárultak ({n}). Nyisd meg a plugin beállításait és futtasd az öntesztet az ok megtekintéséhez.",
		badgeFriend: "BARÁT",
		badgeServer: "SZERVER",
		badgeDm: "PU",
		badgeBot: "BOT",
		ctxFriend: "Barát",
		ctxDm: "PU",
		ctxGroup: "Csoport",
		ctxMore: "+{n}",
		hintPick: "Enter - a felhasználó üzenetei · ↑↓ - választás · Esc - bezárás",
		hintMessages: "Enter - ugrás az üzenethez · Esc - bezárás",
		protipTitle: "& - globális felhasználókeresés",
		pluralGuilds: ["szerver", "szerver"],
		pluralDms: ["chat", "chat"],
		pluralResults: ["találat", "találat"],
		catSearch: "Keresés",
		catAppearance: "Felület",
		catMessages: "Üzenetkeresés",
		catAdvanced: "Speciális",
		setMaxUserResults: "Felhasználók a javaslatokban",
		setMaxUserResultsDesc: "Hány sor jelenjen meg „&név” beírásakor.",
		setDebounce: "Keresési késleltetés",
		setDebounceDesc: "Szünet gépelés után a keresés indulása előtt (ms).",
		setTranslit: "Átírás",
		setTranslitDesc: "A „соня” megtalálja a „Sonya”-t, a „sonya” pedig a „Соня”-t.",
		setFriendsFirst: "Barátok elöl",
		setFriendsFirstDesc: "A barátok mindig a lista elején, aztán PU-k és szerverek.",
		setIncludeDMs: "Privát és csoportos chatek",
		setIncludeDMsDesc: "Keresés a privát partnereid között.",
		setIncludeMembers: "Szertagok",
		setIncludeMembersDesc: "Keresés az összes szervered tagjai között.",
		setStatusDot: "Státuszpont",
		setStatusDotDesc: "Zöld/sárga/piros pont az avataron.",
		setBadges: "Jelvények",
		setBadgesDesc: "BARÁT, SZERVER, PU, BOT címkék a név mellett.",
		setHandles: "@username jobbra",
		setHandlesDesc: "A felhasználónév megjelenítése a sor jobb szélén.",
		setContextLine: "Kontextussor",
		setContextLineDesc: "„Barát · 3 szerver · PU” a név alatt.",
		setCompact: "Kompakt mód",
		setCompactDesc: "Egysoros találatok, több sor a képernyőn.",
		setMaxMutual: "Szerverek a kontextussorban",
		setMaxMutualDesc: "Hány közös szervernév jelenjen meg.",
		setMsgEnabled: "„&név szöveg” mód",
		setMsgEnabledDesc: "Egy felhasználó üzeneteinek keresése mindenhol.",
		setOnlyGuilds: "Keresés csak szervereken",
		setOnlyGuildsDesc: "PU-k és csoportos chatek kihagyása üzenetkereséskor.",
		setPerTarget: "Találatok szerverenként",
		setPerTargetDesc: "Üzenetlimit szerverenként vagy chatenként.",
		setMaxTargets: "Max. célok keresésenként",
		setMaxTargetsDesc: "Több lassabb, de teljesebb lefedettség.",
		setTotalLimit: "Összes sor a listában",
		setTotalLimitDesc: "Üzenettalálatok globális limitje.",
		setConcurrency: "Párhuzamos kérések",
		setConcurrencyDesc: "Ne állítsd túl magasra - a Discord korlátozza a gyakori kéréseket.",
		setDebug: "Részletes naplók",
		setDebugDesc: "Hibakeresési kimenet a konzolra (Ctrl+Shift+I).",
		btnReset: "Beállítások visszaállítása",
		btnResetDone: "A beállítások visszaálltak az alapértelmezettekre",
		diagTitle: "Öndiagnosztika",
		diagDesc: "Egy kattintás mindent ellenőriz: Discord-modulok, motor, renderelés. Ha valami hibázik, küldd el a jelentést a készítőnek.",
		diagRun: "Önteszt futtatása",
		diagCopy: "Jelentés másolása",
		diagTransport: "Üzenetkeresés tesztelése (1 kérés)",
		diagOk: "Minden ellenőrzés sikeres",
		diagFail: "Problémák találhatók: {n}",
		diagNever: "Az önteszt még nem futott",
		copied: "Vágólapra másolva",
		manualCopyBtn: "Kézi másolás",
		manualCopyTitle: "Másold ki a jelentést kézzel",
		manualCopyHint: "Az automatikus másolás nem igazolódott. A jelentés szövege már ki van jelölve - nyomj Ctrl+C-t (Macen Cmd+C) és illeszd be a chatbe.",
		manualCopyClose: "Kész",
		about: "A „&név” megtalálja az embert az összes közös szerveren és chaten. A „&név szöveg” megtalálja az üzeneteit. A felület teljesen natív: a Discord-témád automatikusan érvényesül.",
		footerHotkeys: "Ctrl+K - gyorskeresés · & - plugin mód · Tab - névtől üzenetekig",
		toastWelcome: "UserGlobalSearch: nyisd meg a Ctrl+K-t és írd be: &",
		linkGithub: "GitHub",
		linkIssues: "Probléma jelentése",
		sectionMessages: "Üzenetek"
	},

	"bg": {
		headerPickUsers: "Потребители: „{q}“",
		headerPickAll: "Търсене сред всички потребители",
		headerMessagesFor: "Съобщения на {name}: „{q}“",
		headerAllMessages: "Всички съобщения: {name}",
		emptyUsers: "Никой не е намерен за „{q}“.",
		emptyUsersHint: "Опитайте друго изписване или транслитерация: sonya / соня.",
		emptyMessages: "Няма намерени съобщения. Опитайте да промените заявката.",
		errNoTransport: "Търсенето на съобщения не е налично в тази версия на Discord. Изборът на потребители работи.",
		errNoTargets: "Няма общи сървъри и чатове с този потребител.",
		errGeneric: "Нещо се обърка. Подробности в журнала на настройките.",
		loading: "Търсим: {done}/{total} · намерени {found}",
		loadingErrors: "· грешки {n}",
		emptyMessagesErrors: "Заявките приключиха с грешки ({n}). Отворете настройките на плъгина и стартирайте самотеста - отчетът ще покаже причината.",
		badgeFriend: "ПРИЯТЕЛ",
		badgeServer: "СЪРВЪР",
		badgeDm: "ЛС",
		badgeBot: "БОТ",
		ctxFriend: "Приятел",
		ctxDm: "ЛС",
		ctxGroup: "Група",
		ctxMore: "+{n}",
		hintPick: "Enter - съобщения на потребителя · ↑↓ - избор · Esc - затвори",
		hintMessages: "Enter - към съобщението · Esc - затвори",
		protipTitle: "& - глобално търсене на потребители",
		pluralGuilds: ["сървър", "сървъра"],
		pluralDms: ["чат", "чата"],
		pluralResults: ["резултат", "резултата"],
		catSearch: "Търсене",
		catAppearance: "Интерфейс",
		catMessages: "Търсене на съобщения",
		catAdvanced: "Служебни",
		setMaxUserResults: "Потребители в подсказката",
		setMaxUserResultsDesc: "Колко реда да се показват при въвеждане на „&ник“.",
		setDebounce: "Забавяне на търсенето",
		setDebounceDesc: "Пауза след въвеждане преди старт на търсенето (ms).",
		setTranslit: "Транслитерация",
		setTranslitDesc: "„соня“ намира „Sonya“, а „sonya“ намира „Соня“.",
		setFriendsFirst: "Приятели първи",
		setFriendsFirstDesc: "Приятелите винаги най-отгоре, после ЛС и сървъри.",
		setIncludeDMs: "Лични и групови чатове",
		setIncludeDMsDesc: "Търси сред събеседниците от личките.",
		setIncludeMembers: "Членове на сървърите",
		setIncludeMembersDesc: "Търси сред членовете на всички ваши сървъри.",
		setStatusDot: "Точка на статуса",
		setStatusDotDesc: "Зелена/жълта/червена точка на аватара.",
		setBadges: "Значки",
		setBadgesDesc: "Етикети ПРИЯТЕЛ, СЪРВЪР, ЛС, БОТ до името.",
		setHandles: "@username вдясно",
		setHandlesDesc: "Показвай ника в дясната част на реда.",
		setContextLine: "Контекстен ред",
		setContextLineDesc: "„Приятел · 3 сървъра · ЛС“ под името.",
		setCompact: "Компактен режим",
		setCompactDesc: "Едноредови резултати, повече редове на екрана.",
		setMaxMutual: "Сървъри в контекстния ред",
		setMaxMutualDesc: "Колко имена на общи сървъри да се изброяват.",
		setMsgEnabled: "Режим „&ник текст“",
		setMsgEnabledDesc: "Търсене на съобщенията на потребителя навсякъде.",
		setOnlyGuilds: "Търси само в сървърите",
		setOnlyGuildsDesc: "Пропускай ЛС и груповите чатове при търсене на съобщения.",
		setPerTarget: "Резултати от сървър",
		setPerTargetDesc: "Лимит съобщения от един сървър или чат.",
		setMaxTargets: "Макс. цели за търсене",
		setMaxTargetsDesc: "Повече - по-бавно, но по-пълно покритие.",
		setTotalLimit: "Общо редове в списъка",
		setTotalLimitDesc: "Общ лимит на резултатите от съобщения.",
		setConcurrency: "Паралелни заявки",
		setConcurrencyDesc: "Не задавайте твърде високо - Discord ограничава честите заявки.",
		setDebug: "Подробни логове",
		setDebugDesc: "Дебъг изход в конзолата (Ctrl+Shift+I).",
		btnReset: "Нулиране на настройките",
		btnResetDone: "Настройките са нулирани до стандартните",
		diagTitle: "Самодиагностика",
		diagDesc: "Едно щракване проверява всичко: модули на Discord, двигател, рендер. Изпратете отчета на автора, ако нещо се провали.",
		diagRun: "Стартирай самотеста",
		diagCopy: "Копирай отчета",
		diagTransport: "Тествай търсенето на съобщения (1 заявка)",
		diagOk: "Всички проверки преминаха",
		diagFail: "Открити проблеми: {n}",
		diagNever: "Самотестът все още не е стартиран",
		copied: "Копирано в клипборда",
		manualCopyBtn: "Ръчно копиране",
		manualCopyTitle: "Копирайте отчета ръчно",
		manualCopyHint: "Автоматичното копиране не беше потвърдено. Текстът на отчета вече е избран - натиснете Ctrl+C (Cmd+C на Mac) и го поставете в чата.",
		manualCopyClose: "Готово",
		about: "„&ник“ намира човек във всички общи сървъри и чатове. „&ник текст“ намира неговите съобщения навсякъде. Интерфейсът е напълно нативен: темата на Discord се прилага автоматично.",
		footerHotkeys: "Ctrl+K - бързо търсене · & - режим на плъгина · Tab - от име към съобщения",
		toastWelcome: "UserGlobalSearch: отворете Ctrl+K и въведете &",
		linkGithub: "GitHub",
		linkIssues: "Докладвай проблем",
		sectionMessages: "Съобщения"
	},

	"el": {
		headerPickUsers: "Χρήστες: «{q}»",
		headerPickAll: "Αναζήτηση σε όλους τους χρήστες",
		headerMessagesFor: "Μηνύματα του {name}: «{q}»",
		headerAllMessages: "Όλα τα μηνύματα: {name}",
		emptyUsers: "Κανένας δεν βρέθηκε για «{q}».",
		emptyUsersHint: "Δοκιμάστε άλλη ορθογραφία ή μεταγραφή: sonya / соня.",
		emptyMessages: "Δεν βρέθηκαν μηνύματα. Δοκιμάστε να αλλάξετε το ερώτημα.",
		errNoTransport: "Η αναζήτηση μηνυμάτων δεν είναι διαθέσιμη σε αυτή την έκδοση του Discord. Η επιλογή χρηστών λειτουργεί.",
		errNoTargets: "Δεν υπάρχουν κοινοί διακομιστές ή συνομιλίες με αυτόν τον χρήστη.",
		errGeneric: "Κάτι πήγε στραβά. Λεπτομέρειες στο αρχείο καταγραφής των ρυθμίσεων.",
		loading: "Αναζήτηση: {done}/{total} · βρέθηκαν {found}",
		loadingErrors: "· {n} σφάλματα",
		emptyMessagesErrors: "Τα αιτήματα απέτυχαν ({n}). Ανοίξτε τις ρυθμίσεις του plugin και εκτελέστε τον αυτοέλεγχο για να δείτε την αιτία.",
		badgeFriend: "ΦΙΛΟΣ",
		badgeServer: "ΔΙΑΚΟΜΙΣΤΗΣ",
		badgeDm: "ΠΜ",
		badgeBot: "ΜΠΟΤ",
		ctxFriend: "Φίλος",
		ctxDm: "ΠΜ",
		ctxGroup: "Ομάδα",
		ctxMore: "+{n}",
		hintPick: "Enter - μηνύματα χρήστη · ↑↓ - επιλογή · Esc - κλείσιμο",
		hintMessages: "Enter - μετάβαση στο μήνυμα · Esc - κλείσιμο",
		protipTitle: "& - καθολική αναζήτηση χρηστών",
		pluralGuilds: ["διακομιστής", "διακομιστές"],
		pluralDms: ["συνομιλία", "συνομιλίες"],
		pluralResults: ["αποτέλεσμα", "αποτελέσματα"],
		catSearch: "Αναζήτηση",
		catAppearance: "Διεπαφή",
		catMessages: "Αναζήτηση μηνυμάτων",
		catAdvanced: "Σύνθετα",
		setMaxUserResults: "Χρήστες στις προτάσεις",
		setMaxUserResultsDesc: "Πόσες γραμμές εμφανίζονται με «&όνομα».",
		setDebounce: "Καθυστέρηση αναζήτησης",
		setDebounceDesc: "Παύση μετά την πληκτρολόγηση πριν ξεκινήσει η αναζήτηση (ms).",
		setTranslit: "Μεταγραφή",
		setTranslitDesc: "Το «соня» βρίσκει το «Sonya», το «sonya» βρίσκει το «Соня».",
		setFriendsFirst: "Πρώτα οι φίλοι",
		setFriendsFirstDesc: "Οι φίλοι πάντα στην κορυφή, μετά ΠΜ και διακομιστές.",
		setIncludeDMs: "Προσωπικές και ομαδικές συνομιλίες",
		setIncludeDMsDesc: "Αναζήτηση στις επαφές ΠΜ σας.",
		setIncludeMembers: "Μέλη διακομιστών",
		setIncludeMembersDesc: "Αναζήτηση στα μέλη όλων των διακομιστών σας.",
		setStatusDot: "Κουκκίδα κατάστασης",
		setStatusDotDesc: "Πράσινη/κίτρινη/κόκκινη κουκκίδα στο avatar.",
		setBadges: "Σήματα",
		setBadgesDesc: "Ετικέτες ΦΙΛΟΣ, ΔΙΑΚΟΜΙΣΤΗΣ, ΠΜ, ΜΠΟΤ δίπλα στο όνομα.",
		setHandles: "@username δεξιά",
		setHandlesDesc: "Εμφάνιση του ψευδωνύμου στη δεξιά πλευρά της γραμμής.",
		setContextLine: "Γραμμή πλαισίου",
		setContextLineDesc: "«Φίλος · 3 διακομιστές · ΠΜ» κάτω από το όνομα.",
		setCompact: "Συμπαγής λειτουργία",
		setCompactDesc: "Μονογραμμικά αποτελέσματα, περισσότερες γραμμές στην οθόνη.",
		setMaxMutual: "Διακομιστές στη γραμμή πλαισίου",
		setMaxMutualDesc: "Πόσα ονόματα κοινών διακομιστών να αναφέρονται.",
		setMsgEnabled: "Λειτουργία «&όνομα κείμενο»",
		setMsgEnabledDesc: "Αναζήτηση μηνυμάτων χρήστη παντού.",
		setOnlyGuilds: "Αναζήτηση μόνο σε διακομιστές",
		setOnlyGuildsDesc: "Παράλειψη ΠΜ και ομαδικών συνομιλιών κατά την αναζήτηση μηνυμάτων.",
		setPerTarget: "Αποτελέσματα ανά διακομιστή",
		setPerTargetDesc: "Όριο μηνυμάτων ανά διακομιστή ή συνομιλία.",
		setMaxTargets: "Μέγ. στόχοι ανά αναζήτηση",
		setMaxTargetsDesc: "Περισσότεροι είναι πιο αργό αλλά πληρέστερο.",
		setTotalLimit: "Σύνολο γραμμών",
		setTotalLimitDesc: "Συνολικό όριο αποτελεσμάτων μηνυμάτων.",
		setConcurrency: "Παράλληλα αιτήματα",
		setConcurrencyDesc: "Μην το ανεβάζετε πολύ - το Discord περιορίζει τις συχνές αιτήσεις.",
		setDebug: "Λεπτομερή αρχεία καταγραφής",
		setDebugDesc: "Έξοδος αποσφαλμάτωσης στην κονσόλα (Ctrl+Shift+I).",
		btnReset: "Επαναφορά ρυθμίσεων",
		btnResetDone: "Οι ρυθμίσεις επαναφέρθηκαν στις προεπιλογές",
		diagTitle: "Αυτοδιάγνωση",
		diagDesc: "Ένα κλικ ελέγχει τα πάντα: μονάδες Discord, μηχανή, απόδοση. Στείλτε την αναφορά στον συγγραφέα αν κάτι αποτύχει.",
		diagRun: "Εκτέλεση αυτοελέγχου",
		diagCopy: "Αντιγραφή αναφοράς",
		diagTransport: "Δοκιμή αναζήτησης μηνυμάτων (1 αίτημα)",
		diagOk: "Όλοι οι έλεγχοι πέρασαν",
		diagFail: "Βρέθηκαν προβλήματα: {n}",
		diagNever: "Ο αυτοέλεγχος δεν έχει εκτελεστεί ακόμη",
		copied: "Αντιγράφηκε στο πρόχειρο",
		manualCopyBtn: "Χειροκίνητη αντιγραφή",
		manualCopyTitle: "Αντιγράψτε την αναφορά χειροκίνητα",
		manualCopyHint: "Η αυτόματη αντιγραφή δεν επιβεβαιώθηκε. Το κείμενο της αναφοράς είναι ήδη επιλεγμένο - πατήστε Ctrl+C (Cmd+C σε Mac) και επικολλήστε το στη συνομιλία.",
		manualCopyClose: "Τέλος",
		about: "Το «&όνομα» βρίσκει ένα άτομο σε όλους τους κοινούς διακομιστές και συνομιλίες. Το «&όνομα κείμενο» βρίσκει τα μηνύματά του. Η διεπαφή είναι πλήρως εγγενής: το θέμα του Discord εφαρμόζεται αυτόματα.",
		footerHotkeys: "Ctrl+K - γρήγορη αναζήτηση · & - λειτουργία plugin · Tab - από όνομα σε μηνύματα",
		toastWelcome: "UserGlobalSearch: ανοίξτε Ctrl+K και πληκτρολογήστε &",
		linkGithub: "GitHub",
		linkIssues: "Αναφορά προβλήματος",
		sectionMessages: "Μηνύματα"
	},

	"hr": {
		headerPickUsers: "Korisnici: „{q}“",
		headerPickAll: "Pretraži sve korisnike",
		headerMessagesFor: "Poruke od {name}: „{q}“",
		headerAllMessages: "Sve poruke: {name}",
		emptyUsers: "Nitko nije pronađen za „{q}“.",
		emptyUsersHint: "Pokušajte drugačiji zapis ili transliteraciju: sonya / соня.",
		emptyMessages: "Nema pronađenih poruka. Pokušajte promijeniti upit.",
		errNoTransport: "Pretraga poruka nije dostupna u ovoj verziji Discorda. Odabir korisnika radi.",
		errNoTargets: "Nema zajedničkih servera ni razgovora s ovim korisnikom.",
		errGeneric: "Nešto je pošlo po zlu. Pojedinosti su u zapisniku postavki.",
		loading: "Pretraga: {done}/{total} · pronađeno {found}",
		loadingErrors: "· {n} grešaka",
		emptyMessagesErrors: "Zahtjevi su završili s greškama ({n}). Otvorite postavke dodatka i pokrenite samotest - izvještaj će pokazati uzrok.",
		badgeFriend: "PRIJATELJ",
		badgeServer: "SERVER",
		badgeDm: "PP",
		badgeBot: "BOT",
		ctxFriend: "Prijatelj",
		ctxDm: "PP",
		ctxGroup: "Grupa",
		ctxMore: "+{n}",
		hintPick: "Enter - poruke korisnika · ↑↓ - odabir · Esc - zatvori",
		hintMessages: "Enter - idi na poruku · Esc - zatvori",
		protipTitle: "& - globalna pretraga korisnika",
		pluralGuilds: ["server", "servera", "servera"],
		pluralDms: ["razgovor", "razgovora", "razgovora"],
		pluralResults: ["rezultat", "rezultata", "rezultata"],
		catSearch: "Pretraga",
		catAppearance: "Sučelje",
		catMessages: "Pretraga poruka",
		catAdvanced: "Napredno",
		setMaxUserResults: "Korisnika u prijedlozima",
		setMaxUserResultsDesc: "Koliko se redaka prikazuje pri upisu „&nadimak“.",
		setDebounce: "Odgoda pretrage",
		setDebounceDesc: "Pauza nakon tipkanja prije početka pretrage (ms).",
		setTranslit: "Transliteracija",
		setTranslitDesc: "„соня“ pronalazi „Sonya“, a „sonya“ pronalazi „Соня“.",
		setFriendsFirst: "Prijatelji prvi",
		setFriendsFirstDesc: "Prijatelji uvijek na vrhu, zatim PP i serveri.",
		setIncludeDMs: "Privatni i grupni razgovori",
		setIncludeDMsDesc: "Pretražuj među sugovornicima iz PP.",
		setIncludeMembers: "Članovi servera",
		setIncludeMembersDesc: "Pretražuj među članovima svih svojih servera.",
		setStatusDot: "Točka statusa",
		setStatusDotDesc: "Zelena/žuta/crvena točka na avataru.",
		setBadges: "Značke",
		setBadgesDesc: "Oznake PRIJATELJ, SERVER, PP, BOT uz ime.",
		setHandles: "@username desno",
		setHandlesDesc: "Prikaži nadimak na desnom rubu retka.",
		setContextLine: "Redak konteksta",
		setContextLineDesc: "„Prijatelj · 3 servera · PP“ ispod imena.",
		setCompact: "Kompaktni način",
		setCompactDesc: "Jednoredni rezultati, više redaka na ekranu.",
		setMaxMutual: "Servera u retku konteksta",
		setMaxMutualDesc: "Koliko naziva zajedničkih servera navesti.",
		setMsgEnabled: "Način „&nadimak tekst“",
		setMsgEnabledDesc: "Pretraga poruka korisnika svugdje.",
		setOnlyGuilds: "Pretražuj samo servere",
		setOnlyGuildsDesc: "Preskoči PP i grupne razgovore pri pretrazi poruka.",
		setPerTarget: "Rezultata po serveru",
		setPerTargetDesc: "Ograničenje poruka po serveru ili razgovoru.",
		setMaxTargets: "Maks. ciljeva po pretrazi",
		setMaxTargetsDesc: "Više je sporije, ali potpunije.",
		setTotalLimit: "Ukupno redaka",
		setTotalLimitDesc: "Ukupno ograničenje rezultata poruka.",
		setConcurrency: "Paralelnih zahtjeva",
		setConcurrencyDesc: "Nemojte previsoko - Discord ograničava učestale zahtjeve.",
		setDebug: "Detaljni zapisnici",
		setDebugDesc: "Izlaz za otklanjanje grešaka u konzolu (Ctrl+Shift+I).",
		btnReset: "Vrati postavke",
		btnResetDone: "Postavke su vraćene na zadane",
		diagTitle: "Samodijagnostika",
		diagDesc: "Jedan klik provjerava sve: Discord module, pogon, prikaz. Ako nešto ne uspije, pošaljite izvještaj autoru.",
		diagRun: "Pokreni samotest",
		diagCopy: "Kopiraj izvještaj",
		diagTransport: "Testiraj pretragu poruka (1 zahtjev)",
		diagOk: "Sve provjere prošle",
		diagFail: "Pronađeni problemi: {n}",
		diagNever: "Samotest još nije pokrenut",
		copied: "Kopirano u međuspremnik",
		manualCopyBtn: "Ručno kopiranje",
		manualCopyTitle: "Kopirajte izvještaj ručno",
		manualCopyHint: "Automatsko kopiranje nije potvrđeno. Tekst izvještaja je već odabran - pritisnite Ctrl+C (Cmd+C na Macu) i zalijepite u razgovor.",
		manualCopyClose: "Gotovo",
		about: "„&nadimak“ pronalazi osobu na svim zajedničkim serverima i razgovorima. „&nadimak tekst“ pronalazi njezine poruke. Sučelje je potpuno nativno: vaša Discord tema primjenjuje se automatski.",
		footerHotkeys: "Ctrl+K - brza pretraga · & - način dodatka · Tab - od imena do poruka",
		toastWelcome: "UserGlobalSearch: otvorite Ctrl+K i upišite &",
		linkGithub: "GitHub",
		linkIssues: "Prijavi problem",
		sectionMessages: "Poruke"
	},

	"lt": {
		headerPickUsers: "Vartotojai: „{q}“",
		headerPickAll: "Ieškoti tarp visų vartotojų",
		headerMessagesFor: "{name} žinutės: „{q}“",
		headerAllMessages: "Visos žinutės: {name}",
		emptyUsers: "Pagal „{q}“ nieko nerasta.",
		emptyUsersHint: "Pabandykite kitą rašybą ar transliteraciją: sonya / соня.",
		emptyMessages: "Žinučių nerasta. Pabandykite pakeisti užklausą.",
		errNoTransport: "Žinučių paieška šioje Discord versijoje nepasiekiama. Vartotojų pasirinkimas veikia.",
		errNoTargets: "Nėra bendrų serverių ar pokalbių su šiuo vartotoju.",
		errGeneric: "Kažkas nepavyko. Išsamiau žurnale nustatymuose.",
		loading: "Ieškoma: {done}/{total} · rasta {found}",
		loadingErrors: "· {n} klaidų",
		emptyMessagesErrors: "Užklausos nepavyko ({n}). Atidarykite priedo nustatymus ir paleiskite savitestą - ataskaita parodys priežastį.",
		badgeFriend: "DRAUGAS",
		badgeServer: "SERVERIS",
		badgeDm: "AŽ",
		badgeBot: "BOTAS",
		ctxFriend: "Draugas",
		ctxDm: "AŽ",
		ctxGroup: "Grupė",
		ctxMore: "+{n}",
		hintPick: "Enter - vartotojo žinutės · ↑↓ - pasirinkti · Esc - uždaryti",
		hintMessages: "Enter - eiti į žinutę · Esc - uždaryti",
		protipTitle: "& - globali vartotojų paieška",
		pluralGuilds: ["serveris", "serveriai", "serverių"],
		pluralDms: ["pokalbis", "pokalbiai", "pokalbių"],
		pluralResults: ["rezultatas", "rezultatai", "rezultatų"],
		catSearch: "Paieška",
		catAppearance: "Sąsaja",
		catMessages: "Žinučių paieška",
		catAdvanced: "Papildoma",
		setMaxUserResults: "Vartotojų pasiūlymuose",
		setMaxUserResultsDesc: "Kiek eilučių rodyti įvedus „&vardas“.",
		setDebounce: "Paieškos delsa",
		setDebounceDesc: "Pauzė po įvedimo prieš paieškos pradžią (ms).",
		setTranslit: "Transliteracija",
		setTranslitDesc: "„соня“ randa „Sonya“, o „sonya“ randa „Соня“.",
		setFriendsFirst: "Draugai pirmiausia",
		setFriendsFirstDesc: "Draugai visada sąrašo viršuje, tada AŽ ir serveriai.",
		setIncludeDMs: "Asmeniniai ir grupiniai pokalbiai",
		setIncludeDMsDesc: "Ieškoti tarp AŽ pašnekovų.",
		setIncludeMembers: "Serverių nariai",
		setIncludeMembersDesc: "Ieškoti tarp visų savo serverių narių.",
		setStatusDot: "Būsenos taškas",
		setStatusDotDesc: "Žalias/geltonas/raudonas taškas ant avataro.",
		setBadges: "Ženkleliai",
		setBadgesDesc: "Žymos DRAUGAS, SERVERIS, AŽ, BOTAS šalia vardo.",
		setHandles: "@username dešinėje",
		setHandlesDesc: "Rodyti slapyvardį eilutės dešinėje.",
		setContextLine: "Konteksto eilutė",
		setContextLineDesc: "„Draugas · 3 serveriai · AŽ“ po vardu.",
		setCompact: "Kompaktiškas režimas",
		setCompactDesc: "Vienos eilutės rezultatai, daugiau eilučių ekrane.",
		setMaxMutual: "Serverių konteksto eilutėje",
		setMaxMutualDesc: "Kiek bendrų serverių pavadinimų išvardyti.",
		setMsgEnabled: "Režimas „&vardas tekstas“",
		setMsgEnabledDesc: "Ieškoti vartotojo žinučių visur.",
		setOnlyGuilds: "Ieškoti tik serveriuose",
		setOnlyGuildsDesc: "Praleisti AŽ ir grupinius pokalbius ieškant žinučių.",
		setPerTarget: "Rezultatų iš serverio",
		setPerTargetDesc: "Žinučių limitas iš vieno serverio ar pokalbio.",
		setMaxTargets: "Maks. taikinių paieškai",
		setMaxTargetsDesc: "Daugiau - lėčiau, bet išsamiau.",
		setTotalLimit: "Iš viso eilučių sąraše",
		setTotalLimitDesc: "Bendras žinučių rezultatų limitas.",
		setConcurrency: "Lygiagrečių užklausų",
		setConcurrencyDesc: "Nenustatykite per aukštai - Discord riboja dažnas užklausas.",
		setDebug: "Išsamūs žurnalai",
		setDebugDesc: "Derinimo išvestis į konsolę (Ctrl+Shift+I).",
		btnReset: "Atstatyti nustatymus",
		btnResetDone: "Nustatymai atstatyti į numatytuosius",
		diagTitle: "Savidiagnostika",
		diagDesc: "Vienas paspaudimas patikrina viską: Discord modulius, variklį, atvaizdavimą. Jei kažkas nepavyko, atsiųskite ataskaitą autoriui.",
		diagRun: "Paleisti savitestą",
		diagCopy: "Kopijuoti ataskaitą",
		diagTransport: "Išbandyti žinučių paiešką (1 užklausa)",
		diagOk: "Visos patikros praėjotos",
		diagFail: "Rasta problemų: {n}",
		diagNever: "Savitestas dar nebuvo paleistas",
		copied: "Nukopijuota į iškarpinę",
		manualCopyBtn: "Rankinis kopijavimas",
		manualCopyTitle: "Nukopijuokite ataskaitą rankiniu būdu",
		manualCopyHint: "Automatinis kopijavimas nepatvirtintas. Ataskaitos tekstas jau pažymėtas - paspauskite Ctrl+C (Cmd+C Mac) ir įklijuokite į pokalbį.",
		manualCopyClose: "Baigta",
		about: "„&vardas“ randa žmogų visuose bendruose serveriuose ir pokalbiuose. „&vardas tekstas“ randa jo žinutes visur. Sąsaja visiškai natyvi: Discord tema pritaikoma automatiškai.",
		footerHotkeys: "Ctrl+K - greita paieška · & - priedo režimas · Tab - nuo vardo prie žinučių",
		toastWelcome: "UserGlobalSearch: atidarykite Ctrl+K ir įveskite &",
		linkGithub: "GitHub",
		linkIssues: "Pranešti apie problemą",
		sectionMessages: "Žinutės"
	},

	"ar": {
		headerPickUsers: "المستخدمون: «{q}»",
		headerPickAll: "البحث في كل المستخدمين",
		headerMessagesFor: "رسائل {name}: «{q}»",
		headerAllMessages: "كل الرسائل: {name}",
		emptyUsers: "لم يتم العثور على أحد لـ «{q}».",
		emptyUsersHint: "جرّب كتابة أخرى أو النقل الصوتي: sonya / соня.",
		emptyMessages: "لم يتم العثور على رسائل. جرّب تغيير الاستعلام.",
		errNoTransport: "البحث في الرسائل غير متاح في إصدار Discord هذا. اختيار المستخدمين يعمل.",
		errNoTargets: "لا توجد خوادم أو محادثات مشتركة مع هذا المستخدم.",
		errGeneric: "حدث خطأ ما. التفاصيل في سجل الإعدادات.",
		loading: "جارٍ البحث: {done}/{total} · تم العثور على {found}",
		loadingErrors: "· {n} أخطاء",
		emptyMessagesErrors: "فشلت الطلبات ({n}). افتح إعدادات الإضافة وشغّل الاختبار الذاتي لمعرفة السبب.",
		badgeFriend: "صديق",
		badgeServer: "خادم",
		badgeDm: "خاص",
		badgeBot: "بوت",
		ctxFriend: "صديق",
		ctxDm: "خاص",
		ctxGroup: "مجموعة",
		ctxMore: "+{n}",
		hintPick: "Enter - رسائل المستخدم · ↑↓ - اختيار · Esc - إغلاق",
		hintMessages: "Enter - الانتقال إلى الرسالة · Esc - إغلاق",
		protipTitle: "& - بحث عام عن المستخدمين",
		pluralGuilds: ["خادم", "خوادم"],
		pluralDms: ["محادثة", "محادثات"],
		pluralResults: ["نتيجة", "نتائج"],
		catSearch: "البحث",
		catAppearance: "الواجهة",
		catMessages: "البحث في الرسائل",
		catAdvanced: "متقدم",
		setMaxUserResults: "المستخدمون في الاقتراحات",
		setMaxUserResultsDesc: "كم صفاً يظهر عند كتابة «&الاسم».",
		setDebounce: "تأخير البحث",
		setDebounceDesc: "وقفة بعد الكتابة قبل بدء البحث (مللي ثانية).",
		setTranslit: "النقل الصوتي",
		setTranslitDesc: "«соня» تجد «Sonya» و«sonya» تجد «Соня».",
		setFriendsFirst: "الأصدقاء أولاً",
		setFriendsFirstDesc: "الأصدقاء دائماً في الأعلى، ثم الخاص والخوادم.",
		setIncludeDMs: "المحادثات الخاصة والجماعية",
		setIncludeDMsDesc: "ابحث بين جهات اتصالك الخاصة.",
		setIncludeMembers: "أعضاء الخوادم",
		setIncludeMembersDesc: "ابحث بين أعضاء كل خوادمك.",
		setStatusDot: "نقطة الحالة",
		setStatusDotDesc: "نقطة خضراء/صفراء/حمراء على الصورة الرمزية.",
		setBadges: "الشارات",
		setBadgesDesc: "وسوم صديق، خادم، خاص، بوت بجانب الاسم.",
		setHandles: "@username على اليمين",
		setHandlesDesc: "إظهار اسم المستخدم على الطرف الآخر من الصف.",
		setContextLine: "سطر السياق",
		setContextLineDesc: "«صديق · 3 خوادم · خاص» تحت الاسم.",
		setCompact: "الوضع المضغوط",
		setCompactDesc: "نتائج من سطر واحد، صفوف أكثر على الشاشة.",
		setMaxMutual: "الخوادم في سطر السياق",
		setMaxMutualDesc: "كم اسماً من الخوادم المشتركة يُذكر.",
		setMsgEnabled: "وضع «&الاسم النص»",
		setMsgEnabledDesc: "البحث في رسائل المستخدم في كل مكان.",
		setOnlyGuilds: "البحث في الخوادم فقط",
		setOnlyGuildsDesc: "تخطّي الرسائل الخاصة والمحادثات الجماعية عند البحث.",
		setPerTarget: "النتائج لكل خادم",
		setPerTargetDesc: "حد الرسائل لكل خادم أو محادثة.",
		setMaxTargets: "أقصى أهداف لكل بحث",
		setMaxTargetsDesc: "أكثر يعني أبطأ لكن أشمل.",
		setTotalLimit: "إجمالي الصفوف",
		setTotalLimitDesc: "الحد الإجمالي لنتائج الرسائل.",
		setConcurrency: "الطلبات المتوازية",
		setConcurrencyDesc: "لا ترفعه كثيراً - Discord يحد من الطلبات المتكررة.",
		setDebug: "سجلات مفصلة",
		setDebugDesc: "مخرجات التصحيح إلى وحدة التحكم (Ctrl+Shift+I).",
		btnReset: "إعادة تعيين الإعدادات",
		btnResetDone: "تمت إعادة الإعدادات إلى الافتراضية",
		diagTitle: "التشخيص الذاتي",
		diagDesc: "نقرة واحدة تفحص كل شيء: وحدات Discord والمحرك والعرض. أرسل التقرير إلى المؤلف عند أي فشل.",
		diagRun: "تشغيل الاختبار الذاتي",
		diagCopy: "نسخ التقرير",
		diagTransport: "اختبار البحث في الرسائل (طلب واحد)",
		diagOk: "اجتازت كل الفحوصات",
		diagFail: "مشاكل موجودة: {n}",
		diagNever: "لم يتم تشغيل الاختبار الذاتي بعد",
		copied: "تم النسخ إلى الحافظة",
		manualCopyBtn: "نسخ يدوي",
		manualCopyTitle: "انسخ التقرير يدوياً",
		manualCopyHint: "تعذر تأكيد النسخ التلقائي. نص التقرير محدد بالفعل - اضغط Ctrl+C (Cmd+C على Mac) والصقه في المحادثة.",
		manualCopyClose: "تم",
		about: "«&الاسم» يجد الشخص في كل الخوادم والمحادثات المشتركة. «&الاسم النص» يجد رسائله في كل مكان. الواجهة أصلية تماماً: يتم تطبيق سمة Discord تلقائياً.",
		footerHotkeys: "Ctrl+K - بحث سريع · & - وضع الإضافة · Tab - من الاسم إلى الرسائل",
		toastWelcome: "UserGlobalSearch: افتح Ctrl+K واكتب &",
		linkGithub: "GitHub",
		linkIssues: "الإبلاغ عن مشكلة",
		sectionMessages: "الرسائل"
	},

	"hi": {
		headerPickUsers: "उपयोगकर्ता: \"{q}\"",
		headerPickAll: "सभी उपयोगकर्ताओं में खोजें",
		headerMessagesFor: "{name} के संदेश: \"{q}\"",
		headerAllMessages: "सभी संदेश: {name}",
		emptyUsers: "\"{q}\" के लिए कोई नहीं मिला।",
		emptyUsersHint: "कोई और वर्तनी या ट्रांस्लिटरेशन आज़माएँ: sonya / соня।",
		emptyMessages: "कोई संदेश नहीं मिला। क्वेरी बदलकर देखें।",
		errNoTransport: "इस Discord बिल्ड में संदेश खोज उपलब्ध नहीं है। उपयोगकर्ता चयन काम करता है।",
		errNoTargets: "इस उपयोगकर्ता के साथ कोई साझा सर्वर या चैट नहीं।",
		errGeneric: "कुछ गलत हो गया। विवरण सेटिंग्स के लॉग में देखें।",
		loading: "खोज जारी: {done}/{total} · मिले {found}",
		loadingErrors: "· {n} त्रुटियाँ",
		emptyMessagesErrors: "अनुरोध विफल हुए ({n})। कारण देखने के लिए प्लगिन सेटिंग्स खोलें और सेल्फ़-टेस्ट चलाएँ।",
		badgeFriend: "दोस्त",
		badgeServer: "सर्वर",
		badgeDm: "DM",
		badgeBot: "बॉट",
		ctxFriend: "दोस्त",
		ctxDm: "DM",
		ctxGroup: "ग्रुप",
		ctxMore: "+{n}",
		hintPick: "Enter - उपयोगकर्ता के संदेश · ↑↓ - चयन · Esc - बंद करें",
		hintMessages: "Enter - संदेश पर जाएँ · Esc - बंद करें",
		protipTitle: "& - ग्लोबल उपयोगकर्ता खोज",
		pluralGuilds: ["सर्वर", "सर्वर"],
		pluralDms: ["चैट", "चैट"],
		pluralResults: ["परिणाम", "परिणाम"],
		catSearch: "खोज",
		catAppearance: "इंटरफ़ेस",
		catMessages: "संदेश खोज",
		catAdvanced: "उन्नत",
		setMaxUserResults: "सुझावों में उपयोगकर्ता",
		setMaxUserResultsDesc: "\"&नाम\" लिखने पर कितनी पंक्तियाँ दिखें।",
		setDebounce: "खोज विलंब",
		setDebounceDesc: "टाइप करने के बाद खोज शुरू होने से पहले का विराम (ms)।",
		setTranslit: "ट्रांस्लिटरेशन",
		setTranslitDesc: "\"соня\" से \"Sonya\" और \"sonya\" से \"Соня\" मिलता है।",
		setFriendsFirst: "दोस्त पहले",
		setFriendsFirstDesc: "दोस्त हमेशा सूची में सबसे ऊपर, फिर DM और सर्वर।",
		setIncludeDMs: "निजी और ग्रुप चैट",
		setIncludeDMsDesc: "अपने DM संपर्कों में खोजें।",
		setIncludeMembers: "सर्वर सदस्य",
		setIncludeMembersDesc: "अपने सभी सर्वरों के सदस्यों में खोजें।",
		setStatusDot: "स्टेटस डॉट",
		setStatusDotDesc: "अवतार पर हरा/पीला/लाल बिंदु।",
		setBadges: "बैज",
		setBadgesDesc: "नाम के बगल में दोस्त, सर्वर, DM, बॉट लेबल।",
		setHandles: "दाईं ओर @username",
		setHandlesDesc: "पंक्ति के दाएँ किनारे हैंडल दिखाएँ।",
		setContextLine: "संदर्भ पंक्ति",
		setContextLineDesc: "नाम के नीचे \"दोस्त · 3 सर्वर · DM\"。",
		setCompact: "कॉम्पैक्ट मोड",
		setCompactDesc: "एक-पंक्ति परिणाम, स्क्रीन पर अधिक पंक्तियाँ।",
		setMaxMutual: "संदर्भ पंक्ति में सर्वर",
		setMaxMutualDesc: "कितने साझा सर्वर नाम सूचीबद्ध करें।",
		setMsgEnabled: "\"&नाम टेक्स्ट\" मोड",
		setMsgEnabledDesc: "किसी उपयोगकर्ता के संदेश हर जगह खोजें।",
		setOnlyGuilds: "केवल सर्वरों में खोजें",
		setOnlyGuildsDesc: "संदेश खोजते समय DM और ग्रुप चैट छोड़ें।",
		setPerTarget: "प्रति सर्वर परिणाम",
		setPerTargetDesc: "प्रति सर्वर या चैट संदेश सीमा।",
		setMaxTargets: "प्रति खोज अधिकतम लक्ष्य",
		setMaxTargetsDesc: "ज़्यादा धीमा लेकिन अधिक पूर्ण।",
		setTotalLimit: "कुल पंक्तियाँ",
		setTotalLimitDesc: "संदेश परिणामों की कुल सीमा।",
		setConcurrency: "समानांतर अनुरोध",
		setConcurrencyDesc: "बहुत ऊँचा न रखें - Discord बार-बार अनुरोधों को सीमित करता है।",
		setDebug: "विस्तृत लॉग",
		setDebugDesc: "कंसोल में डीबग आउटपुट (Ctrl+Shift+I)।",
		btnReset: "सेटिंग्स रीसेट करें",
		btnResetDone: "सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गईं",
		diagTitle: "सेल्फ़ डायग्नोस्टिक्स",
		diagDesc: "एक क्लिक सब कुछ जाँचता है: Discord मॉड्यूल, इंजन, रेंडर। कुछ विफल होने पर रिपोर्ट लेखक को भेजें।",
		diagRun: "सेल्फ़-टेस्ट चलाएँ",
		diagCopy: "रिपोर्ट कॉपी करें",
		diagTransport: "संदेश खोज परखें (1 अनुरोध)",
		diagOk: "सभी जाँचें पास",
		diagFail: "समस्याएँ मिलीं: {n}",
		diagNever: "सेल्फ़-टेस्ट अभी नहीं चला",
		copied: "क्लिपबोर्ड पर कॉपी किया गया",
		manualCopyBtn: "मैन्युअल कॉपी",
		manualCopyTitle: "रिपोर्ट को मैन्युअली कॉपी करें",
		manualCopyHint: "ऑटो-कॉपी की पुष्टि नहीं हो सकी। रिपोर्ट का टेक्स्ट पहले से चुना गया है - Ctrl+C (Mac पर Cmd+C) दबाएँ और चैट में पेस्ट करें।",
		manualCopyClose: "हो गया",
		about: "\"&नाम\" सभी साझा सर्वरों और चैट में व्यक्ति को खोजता है। \"&नाम टेक्स्ट\" उसके संदेश खोजता है। इंटरफ़ेस पूरी तरह नेटिव है: आपकी Discord थीम अपने आप लागू होती है।",
		footerHotkeys: "Ctrl+K - त्वरित खोज · & - प्लगिन मोड · Tab - नाम से संदेशों तक",
		toastWelcome: "UserGlobalSearch: Ctrl+K खोलें और & टाइप करें",
		linkGithub: "GitHub",
		linkIssues: "समस्या बताएँ",
		sectionMessages: "संदेश"
	},

	"th": {
		headerPickUsers: "ผู้ใช้: \"{q}\"",
		headerPickAll: "ค้นหาผู้ใช้ทั้งหมด",
		headerMessagesFor: "ข้อความของ {name}: \"{q}\"",
		headerAllMessages: "ข้อความทั้งหมด: {name}",
		emptyUsers: "ไม่พบใครสำหรับ \"{q}\"",
		emptyUsersHint: "ลองสะกดแบบอื่นหรือทับศัพท์: sonya / соня",
		emptyMessages: "ไม่พบข้อความ ลองเปลี่ยนคำค้นหา",
		errNoTransport: "การค้นหาข้อความใช้ไม่ได้ใน Discord เวอร์ชันนี้ การเลือกผู้ใช้ยังใช้ได้",
		errNoTargets: "ไม่มีเซิร์ฟเวอร์หรือแชทร่วมกับผู้ใช้นี้",
		errGeneric: "เกิดข้อผิดพลาด ดูรายละเอียดในบันทึกของการตั้งค่า",
		loading: "กำลังค้นหา: {done}/{total} · พบ {found}",
		loadingErrors: "· ข้อผิดพลาด {n}",
		emptyMessagesErrors: "คำขอล้มเหลว ({n}) เปิดการตั้งค่าปลั๊กอินและรันการทดสอบตัวเองเพื่อดูสาเหตุ",
		badgeFriend: "เพื่อน",
		badgeServer: "เซิร์ฟเวอร์",
		badgeDm: "DM",
		badgeBot: "บอท",
		ctxFriend: "เพื่อน",
		ctxDm: "DM",
		ctxGroup: "กลุ่ม",
		ctxMore: "+{n}",
		hintPick: "Enter - ข้อความของผู้ใช้ · ↑↓ - เลือก · Esc - ปิด",
		hintMessages: "Enter - ไปที่ข้อความ · Esc - ปิด",
		protipTitle: "& - ค้นหาผู้ใช้ทั่วทั้งแอป",
		pluralGuilds: ["เซิร์ฟเวอร์"],
		pluralDms: ["แชท"],
		pluralResults: ["ผลลัพธ์"],
		catSearch: "ค้นหา",
		catAppearance: "หน้าตา",
		catMessages: "ค้นหาข้อความ",
		catAdvanced: "ขั้นสูง",
		setMaxUserResults: "ผู้ใช้ในคำแนะนำ",
		setMaxUserResultsDesc: "จำนวนแถวที่แสดงเมื่อพิมพ์ \"&ชื่อ\"",
		setDebounce: "ดีเลย์การค้นหา",
		setDebounceDesc: "หน่วงหลังพิมพ์ก่อนเริ่มค้นหา (มิลลิวินาที)",
		setTranslit: "การทับศัพท์",
		setTranslitDesc: "\"соня\" เจอ \"Sonya\" และ \"sonya\" เจอ \"Соня\"",
		setFriendsFirst: "เพื่อนก่อน",
		setFriendsFirstDesc: "เพื่อนอยู่บนสุดเสมอ ตามด้วย DM และเซิร์ฟเวอร์",
		setIncludeDMs: "แชทส่วนตัวและกลุ่ม",
		setIncludeDMsDesc: "ค้นหาในคู่สนทนา DM ของคุณ",
		setIncludeMembers: "สมาชิกเซิร์ฟเวอร์",
		setIncludeMembersDesc: "ค้นหาในสมาชิกของทุกเซิร์ฟเวอร์ของคุณ",
		setStatusDot: "จุดสถานะ",
		setStatusDotDesc: "จุดเขียว/เหลือง/แดงบนอวาตาร์",
		setBadges: "ป้าย",
		setBadgesDesc: "ป้าย เพื่อน, เซิร์ฟเวอร์, DM, บอท ข้างชื่อ",
		setHandles: "@username ทางขวา",
		setHandlesDesc: "แสดงแฮนเดิลที่ขอบขวาของแถว",
		setContextLine: "บรรทัดบริบท",
		setContextLineDesc: "\"เพื่อน · 3 เซิร์ฟเวอร์ · DM\" ใต้ชื่อ",
		setCompact: "โหมดกะทัดรัด",
		setCompactDesc: "ผลลัพธ์บรรทัดเดียว เห็นหลายแถวขึ้น",
		setMaxMutual: "เซิร์ฟเวอร์ในบรรทัดบริบท",
		setMaxMutualDesc: "จำนวนชื่อเซิร์ฟเวอร์ร่วมที่จะแสดง",
		setMsgEnabled: "โหมด \"&ชื่อ ข้อความ\"",
		setMsgEnabledDesc: "ค้นหาข้อความของผู้ใช้ได้ทุกที่",
		setOnlyGuilds: "ค้นหาเฉพาะในเซิร์ฟเวอร์",
		setOnlyGuildsDesc: "ข้าม DM และแชทกลุ่มตอนค้นหาข้อความ",
		setPerTarget: "ผลลัพธ์ต่อเซิร์ฟเวอร์",
		setPerTargetDesc: "จำกัดข้อความต่อเซิร์ฟเวอร์หรือแชท",
		setMaxTargets: "เป้าหมายสูงสุดต่อการค้นหา",
		setMaxTargetsDesc: "มากขึ้นช้าลงแต่ครอบคลุมกว่า",
		setTotalLimit: "จำนวนแถวทั้งหมด",
		setTotalLimitDesc: "ขีดจำกัดผลลัพธ์ข้อความโดยรวม",
		setConcurrency: "คำขอแบบขนาน",
		setConcurrencyDesc: "อย่าตั้งสูงเกินไป - Discord จำกัดคำขอถี่ ๆ",
		setDebug: "บันทึกละเอียด",
		setDebugDesc: "เอาต์พุตดีบักไปที่คอนโซล (Ctrl+Shift+I)",
		btnReset: "รีเซ็ตการตั้งค่า",
		btnResetDone: "รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว",
		diagTitle: "การวินิจฉัยตัวเอง",
		diagDesc: "คลิกเดียวตรวจทุกอย่าง: โมดูล Discord, เอนจิน, การเรนเดอร์ ส่งรายงานให้ผู้พัฒนาหากมีปัญหา",
		diagRun: "รันการทดสอบตัวเอง",
		diagCopy: "คัดลอกรายงาน",
		diagTransport: "ทดสอบค้นหาข้อความ (1 คำขอ)",
		diagOk: "ผ่านทุกการตรวจสอบ",
		diagFail: "พบปัญหา: {n}",
		diagNever: "ยังไม่ได้รันการทดสอบตัวเอง",
		copied: "คัดลอกไปยังคลิปบอร์ดแล้ว",
		manualCopyBtn: "คัดลอกด้วยตนเอง",
		manualCopyTitle: "คัดลอกรายงานด้วยตนเอง",
		manualCopyHint: "ยืนยันการคัดลอกอัตโนมัติไม่ได้ ข้อความรายงานถูกเลือกไว้แล้ว - กด Ctrl+C (Cmd+C บน Mac) แล้ววางในแชท",
		manualCopyClose: "เสร็จ",
		about: "\"&ชื่อ\" หาคนจากทุกเซิร์ฟเวอร์และแชทที่ร่วมกัน \"&ชื่อ ข้อความ\" หาข้อความของเขา อินเทอร์เฟซเป็นเนทีฟแท้: ธีม Discord ของคุณใช้ได้อัตโนมัติ",
		footerHotkeys: "Ctrl+K - ค้นหาเร็ว · & - โหมดปลั๊กอิน · Tab - จากชื่อไปข้อความ",
		toastWelcome: "UserGlobalSearch: เปิด Ctrl+K แล้วพิมพ์ &",
		linkGithub: "GitHub",
		linkIssues: "รายงานปัญหา",
		sectionMessages: "ข้อความ"
	},

	"vi": {
		headerPickUsers: "Người dùng: \"{q}\"",
		headerPickAll: "Tìm trong tất cả người dùng",
		headerMessagesFor: "Tin nhắn của {name}: \"{q}\"",
		headerAllMessages: "Tất cả tin nhắn: {name}",
		emptyUsers: "Không tìm thấy ai cho \"{q}\".",
		emptyUsersHint: "Thử cách viết khác hoặc chuyển tự: sonya / соня.",
		emptyMessages: "Không tìm thấy tin nhắn. Thử thay đổi truy vấn.",
		errNoTransport: "Tìm kiếm tin nhắn không khả dụng trong bản Discord này. Chọn người dùng vẫn hoạt động.",
		errNoTargets: "Không có máy chủ hay cuộc trò chuyện chung với người dùng này.",
		errGeneric: "Đã xảy ra lỗi. Xem nhật ký trong cài đặt.",
		loading: "Đang tìm: {done}/{total} · thấy {found}",
		loadingErrors: "· {n} lỗi",
		emptyMessagesErrors: "Các yêu cầu thất bại ({n}). Mở cài đặt plugin và chạy tự kiểm tra để xem nguyên nhân.",
		badgeFriend: "BẠN",
		badgeServer: "MÁY CHỦ",
		badgeDm: "TN",
		badgeBot: "BOT",
		ctxFriend: "Bạn",
		ctxDm: "TN",
		ctxGroup: "Nhóm",
		ctxMore: "+{n}",
		hintPick: "Enter - tin nhắn của người dùng · ↑↓ - chọn · Esc - đóng",
		hintMessages: "Enter - đến tin nhắn · Esc - đóng",
		protipTitle: "& - tìm kiếm người dùng toàn cục",
		pluralGuilds: ["máy chủ"],
		pluralDms: ["cuộc trò chuyện"],
		pluralResults: ["kết quả"],
		catSearch: "Tìm kiếm",
		catAppearance: "Giao diện",
		catMessages: "Tìm tin nhắn",
		catAdvanced: "Nâng cao",
		setMaxUserResults: "Người dùng trong gợi ý",
		setMaxUserResultsDesc: "Số dòng hiển thị khi gõ \"&tên\".",
		setDebounce: "Độ trễ tìm kiếm",
		setDebounceDesc: "Tạm dừng sau khi gõ trước khi tìm (ms).",
		setTranslit: "Chuyển tự",
		setTranslitDesc: "\"соня\" tìm ra \"Sonya\", \"sonya\" tìm ra \"Соня\".",
		setFriendsFirst: "Bạn bè trước",
		setFriendsFirstDesc: "Bạn bè luôn trên đầu, sau đó là TN và máy chủ.",
		setIncludeDMs: "Trò chuyện riêng và nhóm",
		setIncludeDMsDesc: "Tìm trong các liên hệ TN của bạn.",
		setIncludeMembers: "Thành viên máy chủ",
		setIncludeMembersDesc: "Tìm trong thành viên của mọi máy chủ bạn tham gia.",
		setStatusDot: "Chấm trạng thái",
		setStatusDotDesc: "Chấm xanh/vàng/đỏ trên avatar.",
		setBadges: "Huy hiệu",
		setBadgesDesc: "Nhãn BẠN, MÁY CHỦ, TN, BOT cạnh tên.",
		setHandles: "@username bên phải",
		setHandlesDesc: "Hiện tên người dùng ở mép phải của dòng.",
		setContextLine: "Dòng ngữ cảnh",
		setContextLineDesc: "\"Bạn · 3 máy chủ · TN\" dưới tên.",
		setCompact: "Chế độ gọn",
		setCompactDesc: "Kết quả một dòng, nhiều dòng hơn trên màn hình.",
		setMaxMutual: "Máy chủ trong dòng ngữ cảnh",
		setMaxMutualDesc: "Số tên máy chủ chung được liệt kê.",
		setMsgEnabled: "Chế độ \"&tên văn bản\"",
		setMsgEnabledDesc: "Tìm tin nhắn của một người dùng ở mọi nơi.",
		setOnlyGuilds: "Chỉ tìm trong máy chủ",
		setOnlyGuildsDesc: "Bỏ qua TN và nhóm khi tìm tin nhắn.",
		setPerTarget: "Kết quả mỗi máy chủ",
		setPerTargetDesc: "Giới hạn tin nhắn mỗi máy chủ hoặc cuộc trò chuyện.",
		setMaxTargets: "Tối đa mục tiêu mỗi lần tìm",
		setMaxTargetsDesc: "Nhiều hơn thì chậm hơn nhưng đầy đủ hơn.",
		setTotalLimit: "Tổng số dòng",
		setTotalLimitDesc: "Giới hạn tổng kết quả tin nhắn.",
		setConcurrency: "Yêu cầu song song",
		setConcurrencyDesc: "Đừng đặt quá cao - Discord giới hạn các đợt yêu cầu dày.",
		setDebug: "Nhật ký chi tiết",
		setDebugDesc: "Xuất gỡ lỗi ra console (Ctrl+Shift+I).",
		btnReset: "Đặt lại cài đặt",
		btnResetDone: "Cài đặt đã được đặt về mặc định",
		diagTitle: "Tự chẩn đoán",
		diagDesc: "Một cú nhấp kiểm tra mọi thứ: mô-đun Discord, engine, kết xuất. Gửi báo cáo cho tác giả nếu có lỗi.",
		diagRun: "Chạy tự kiểm tra",
		diagCopy: "Sao chép báo cáo",
		diagTransport: "Kiểm tra tìm tin nhắn (1 yêu cầu)",
		diagOk: "Mọi kiểm tra đã qua",
		diagFail: "Phát hiện vấn đề: {n}",
		diagNever: "Chưa chạy tự kiểm tra",
		copied: "Đã sao chép vào clipboard",
		manualCopyBtn: "Sao chép thủ công",
		manualCopyTitle: "Sao chép báo cáo thủ công",
		manualCopyHint: "Không xác nhận được sao chép tự động. Văn bản báo cáo đã được chọn - nhấn Ctrl+C (Cmd+C trên Mac) và dán vào chat.",
		manualCopyClose: "Xong",
		about: "\"&tên\" tìm một người trên mọi máy chủ và cuộc trò chuyện chung. \"&tên văn bản\" tìm tin nhắn của họ. Giao diện hoàn toàn gốc: chủ đề Discord của bạn tự động áp dụng.",
		footerHotkeys: "Ctrl+K - tìm nhanh · & - chế độ plugin · Tab - từ tên đến tin nhắn",
		toastWelcome: "UserGlobalSearch: mở Ctrl+K và gõ &",
		linkGithub: "GitHub",
		linkIssues: "Báo cáo vấn đề",
		sectionMessages: "Tin nhắn"
	},

	"id": {
		headerPickUsers: "Pengguna: \"{q}\"",
		headerPickAll: "Cari semua pengguna",
		headerMessagesFor: "Pesan dari {name}: \"{q}\"",
		headerAllMessages: "Semua pesan: {name}",
		emptyUsers: "Tidak ada yang ditemukan untuk \"{q}\".",
		emptyUsersHint: "Coba ejaan lain atau transliterasi: sonya / соня.",
		emptyMessages: "Tidak ada pesan ditemukan. Coba ubah pencarian.",
		errNoTransport: "Pencarian pesan tidak tersedia di build Discord ini. Pemilihan pengguna tetap berfungsi.",
		errNoTargets: "Tidak ada server atau chat bersama dengan pengguna ini.",
		errGeneric: "Terjadi kesalahan. Lihat log di pengaturan.",
		loading: "Mencari: {done}/{total} · ditemukan {found}",
		loadingErrors: "· {n} kesalahan",
		emptyMessagesErrors: "Permintaan gagal ({n}). Buka pengaturan plugin dan jalankan uji mandiri untuk melihat penyebabnya.",
		badgeFriend: "TEMAN",
		badgeServer: "SERVER",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "Teman",
		ctxDm: "DM",
		ctxGroup: "Grup",
		ctxMore: "+{n}",
		hintPick: "Enter - pesan pengguna · ↑↓ - pilih · Esc - tutup",
		hintMessages: "Enter - lompat ke pesan · Esc - tutup",
		protipTitle: "& - pencarian pengguna global",
		pluralGuilds: ["server"],
		pluralDms: ["chat"],
		pluralResults: ["hasil"],
		catSearch: "Pencarian",
		catAppearance: "Tampilan",
		catMessages: "Pencarian pesan",
		catAdvanced: "Lanjutan",
		setMaxUserResults: "Pengguna di saran",
		setMaxUserResultsDesc: "Jumlah baris yang ditampilkan untuk \"&nama\".",
		setDebounce: "Jeda pencarian",
		setDebounceDesc: "Jeda setelah mengetik sebelum pencarian dimulai (ms).",
		setTranslit: "Transliterasi",
		setTranslitDesc: "\"соня\" menemukan \"Sonya\", \"sonya\" menemukan \"Соня\".",
		setFriendsFirst: "Teman dulu",
		setFriendsFirstDesc: "Teman selalu di atas, lalu DM dan server.",
		setIncludeDMs: "Chat pribadi dan grup",
		setIncludeDMsDesc: "Cari di antara kontak DM Anda.",
		setIncludeMembers: "Anggota server",
		setIncludeMembersDesc: "Cari di antara anggota semua server Anda.",
		setStatusDot: "Titik status",
		setStatusDotDesc: "Titik hijau/kuning/merah di avatar.",
		setBadges: "Lencana",
		setBadgesDesc: "Label TEMAN, SERVER, DM, BOT di samping nama.",
		setHandles: "@username di kanan",
		setHandlesDesc: "Tampilkan handle di tepi kanan baris.",
		setContextLine: "Baris konteks",
		setContextLineDesc: "\"Teman · 3 server · DM\" di bawah nama.",
		setCompact: "Mode ringkas",
		setCompactDesc: "Hasil satu baris, lebih banyak baris di layar.",
		setMaxMutual: "Server di baris konteks",
		setMaxMutualDesc: "Berapa banyak nama server bersama yang dicantumkan.",
		setMsgEnabled: "Mode \"&nama teks\"",
		setMsgEnabledDesc: "Cari pesan pengguna di mana saja.",
		setOnlyGuilds: "Cari hanya di server",
		setOnlyGuildsDesc: "Lewati DM dan grup saat mencari pesan.",
		setPerTarget: "Hasil per server",
		setPerTargetDesc: "Batas pesan per server atau chat.",
		setMaxTargets: "Maks. target per pencarian",
		setMaxTargetsDesc: "Lebih tinggi lebih lambat tapi lebih lengkap.",
		setTotalLimit: "Total baris",
		setTotalLimitDesc: "Batas keseluruhan hasil pesan.",
		setConcurrency: "Permintaan paralel",
		setConcurrencyDesc: "Jangan terlalu tinggi - Discord membatasi rentetan permintaan.",
		setDebug: "Log detail",
		setDebugDesc: "Output debug ke konsol (Ctrl+Shift+I).",
		btnReset: "Atur ulang pengaturan",
		btnResetDone: "Pengaturan dikembalikan ke default",
		diagTitle: "Diagnostik mandiri",
		diagDesc: "Satu klik memeriksa semuanya: modul Discord, mesin, render. Kirim laporan ke pengembang jika ada yang gagal.",
		diagRun: "Jalankan uji mandiri",
		diagCopy: "Salin laporan",
		diagTransport: "Uji pencarian pesan (1 permintaan)",
		diagOk: "Semua pemeriksaan lulus",
		diagFail: "Ditemukan masalah: {n}",
		diagNever: "Uji mandiri belum dijalankan",
		copied: "Disalin ke clipboard",
		manualCopyBtn: "Salin manual",
		manualCopyTitle: "Salin laporan secara manual",
		manualCopyHint: "Salin otomatis tidak dapat dikonfirmasi. Teks laporan sudah dipilih - tekan Ctrl+C (Cmd+C di Mac) lalu tempel ke chat.",
		manualCopyClose: "Selesai",
		about: "\"&nama\" menemukan seseorang di semua server dan chat bersama. \"&nama teks\" menemukan pesannya. Antarmuka sepenuhnya native: tema Discord Anda diterapkan otomatis.",
		footerHotkeys: "Ctrl+K - pencarian cepat · & - mode plugin · Tab - dari nama ke pesan",
		toastWelcome: "UserGlobalSearch: buka Ctrl+K dan ketik &",
		linkGithub: "GitHub",
		linkIssues: "Laporkan masalah",
		sectionMessages: "Pesan"
	},

	"ja": {
		headerPickUsers: "ユーザー: \"{q}\"",
		headerPickAll: "すべてのユーザーを検索",
		headerMessagesFor: "{name} のメッセージ: \"{q}\"",
		headerAllMessages: "すべてのメッセージ: {name}",
		emptyUsers: "\"{q}\" に一致するユーザーはいません。",
		emptyUsersHint: "別の綴りかローマ字を試してください: sonya / соня。",
		emptyMessages: "メッセージが見つかりません。検索条件を変えてみてください。",
		errNoTransport: "この Discord ビルドではメッセージ検索を利用できません。ユーザー選択は動作します。",
		errNoTargets: "このユーザーとの共通サーバーやチャットがありません。",
		errGeneric: "問題が発生しました。設定のログを確認してください。",
		loading: "検索中: {done}/{total} · ヒット {found}",
		loadingErrors: "· エラー {n}",
		emptyMessagesErrors: "リクエストが失敗しました ({n})。プラグイン設定でセルフテストを実行すると原因がわかります。",
		badgeFriend: "フレンド",
		badgeServer: "サーバー",
		badgeDm: "DM",
		badgeBot: "BOT",
		ctxFriend: "フレンド",
		ctxDm: "DM",
		ctxGroup: "グループ",
		ctxMore: "+{n}",
		hintPick: "Enter - ユーザーのメッセージ · ↑↓ - 選択 · Esc - 閉じる",
		hintMessages: "Enter - メッセージへ移動 · Esc - 閉じる",
		protipTitle: "& - グローバルユーザー検索",
		pluralGuilds: ["サーバー"],
		pluralDms: ["チャット"],
		pluralResults: ["件"],
		catSearch: "検索",
		catAppearance: "外観",
		catMessages: "メッセージ検索",
		catAdvanced: "詳細設定",
		setMaxUserResults: "候補に表示するユーザー数",
		setMaxUserResultsDesc: "「&名前」入力時に表示する行数。",
		setDebounce: "検索ディレイ",
		setDebounceDesc: "入力後、検索開始までの待機時間 (ms)。",
		setTranslit: "ローマ字変換",
		setTranslitDesc: "「соня」で「Sonya」、「sonya」で「Соня」が見つかります。",
		setFriendsFirst: "フレンド優先",
		setFriendsFirstDesc: "フレンドを常に上位に、次に DM とサーバー。",
		setIncludeDMs: "個人・グループチャット",
		setIncludeDMsDesc: "DM の相手を検索対象に含めます。",
		setIncludeMembers: "サーバーメンバー",
		setIncludeMembersDesc: "全サーバーのメンバーを検索対象に含めます。",
		setStatusDot: "ステータスドット",
		setStatusDotDesc: "アバター上の緑/黄/赤のドット。",
		setBadges: "バッジ",
		setBadgesDesc: "名前の横に フレンド, サーバー, DM, BOT のラベル。",
		setHandles: "右側に @username",
		setHandlesDesc: "行の右端にハンドルを表示します。",
		setContextLine: "コンテキスト行",
		setContextLineDesc: "名前の下に「フレンド · 3 サーバー · DM」。",
		setCompact: "コンパクトモード",
		setCompactDesc: "1 行表示でより多くの結果を画面に。",
		setMaxMutual: "コンテキスト行のサーバー数",
		setMaxMutualDesc: "共通サーバー名をいくつ表示するか。",
		setMsgEnabled: "「&名前 テキスト」モード",
		setMsgEnabledDesc: "ユーザーのメッセージをすべての場所から検索。",
		setOnlyGuilds: "サーバーのみ検索",
		setOnlyGuildsDesc: "メッセージ検索で DM とグループを除外します。",
		setPerTarget: "サーバーごとの結果数",
		setPerTargetDesc: "サーバー/チャットごとのメッセージ上限。",
		setMaxTargets: "検索あたりの最大対象数",
		setMaxTargetsDesc: "多いほど遅くなりますが網羅的です。",
		setTotalLimit: "合計行数",
		setTotalLimitDesc: "メッセージ結果の全体上限。",
		setConcurrency: "並列リクエスト数",
		setConcurrencyDesc: "上げすぎないでください - Discord が頻繁なリクエストを制限します。",
		setDebug: "詳細ログ",
		setDebugDesc: "コンソールへのデバッグ出力 (Ctrl+Shift+I)。",
		btnReset: "設定をリセット",
		btnResetDone: "設定をデフォルトに戻しました",
		diagTitle: "セルフ診断",
		diagDesc: "ワンクリックで Discord モジュール・エンジン・描画をすべて確認。失敗時はレポートを作者へ送れます。",
		diagRun: "セルフテストを実行",
		diagCopy: "レポートをコピー",
		diagTransport: "メッセージ検索をテスト (1 リクエスト)",
		diagOk: "すべてのチェックに合格",
		diagFail: "問題が見つかりました: {n}",
		diagNever: "セルフテストはまだ実行されていません",
		copied: "クリップボードにコピーしました",
		manualCopyBtn: "手動でコピー",
		manualCopyTitle: "レポートを手動でコピー",
		manualCopyHint: "自動コピーを確認できませんでした。レポート本文は選択済みです - Ctrl+C (Mac は Cmd+C) を押してチャットに貼り付けてください。",
		manualCopyClose: "完了",
		about: "「&名前」で共通のサーバーとチャットすべてから人物を検索。「&名前 テキスト」でその人のメッセージを検索。UI は完全にネイティブで、Discord のテーマが自動で適用されます。",
		footerHotkeys: "Ctrl+K - クイック検索 · & - プラグインモード · Tab - 名前からメッセージへ",
		toastWelcome: "UserGlobalSearch: Ctrl+K を開いて & と入力",
		linkGithub: "GitHub",
		linkIssues: "問題を報告",
		sectionMessages: "メッセージ"
	},

	"ko": {
		headerPickUsers: "사용자: \"{q}\"",
		headerPickAll: "모든 사용자 검색",
		headerMessagesFor: "{name}의 메시지: \"{q}\"",
		headerAllMessages: "모든 메시지: {name}",
		emptyUsers: "\"{q}\"에 해당하는 사용자가 없습니다.",
		emptyUsersHint: "다른 철자나 로마자 표기를 시도해 보세요: sonya / соня.",
		emptyMessages: "메시지를 찾을 수 없습니다. 검색어를 바꿔 보세요.",
		errNoTransport: "이 Discord 빌드에서는 메시지 검색을 사용할 수 없습니다. 사용자 선택은 작동합니다.",
		errNoTargets: "이 사용자와 공통된 서버나 채팅이 없습니다.",
		errGeneric: "문제가 발생했습니다. 설정의 로그를 확인하세요.",
		loading: "검색 중: {done}/{total} · 발견 {found}",
		loadingErrors: "· 오류 {n}",
		emptyMessagesErrors: "요청이 실패했습니다 ({n}). 플러그인 설정을 열고 자가 테스트를 실행해 원인을 확인하세요.",
		badgeFriend: "친구",
		badgeServer: "서버",
		badgeDm: "DM",
		badgeBot: "봇",
		ctxFriend: "친구",
		ctxDm: "DM",
		ctxGroup: "그룹",
		ctxMore: "+{n}",
		hintPick: "Enter - 사용자의 메시지 · ↑↓ - 선택 · Esc - 닫기",
		hintMessages: "Enter - 메시지로 이동 · Esc - 닫기",
		protipTitle: "& - 전역 사용자 검색",
		pluralGuilds: ["서버"],
		pluralDms: ["채팅"],
		pluralResults: ["결과"],
		catSearch: "검색",
		catAppearance: "인터페이스",
		catMessages: "메시지 검색",
		catAdvanced: "고급",
		setMaxUserResults: "추천에 표시할 사용자 수",
		setMaxUserResultsDesc: "\"&이름\" 입력 시 표시되는 행 수입니다.",
		setDebounce: "검색 지연",
		setDebounceDesc: "입력 후 검색 시작 전 대기 시간 (ms).",
		setTranslit: "로마자 변환",
		setTranslitDesc: "\"соня\"는 \"Sonya\"를, \"sonya\"는 \"Соня\"를 찾습니다.",
		setFriendsFirst: "친구 우선",
		setFriendsFirstDesc: "친구가 항상 목록 맨 위에, 그 다음 DM과 서버입니다.",
		setIncludeDMs: "개인 및 그룹 채팅",
		setIncludeDMsDesc: "DM 상대를 검색합니다.",
		setIncludeMembers: "서버 멤버",
		setIncludeMembersDesc: "모든 서버의 멤버를 검색합니다.",
		setStatusDot: "상태 점",
		setStatusDotDesc: "아바타의 초록/노랑/빨강 점입니다.",
		setBadges: "배지",
		setBadgesDesc: "이름 옆에 친구, 서버, DM, 봇 라벨을 표시합니다.",
		setHandles: "오른쪽에 @username",
		setHandlesDesc: "행 오른쪽 끝에 핸들을 표시합니다.",
		setContextLine: "컨텍스트 줄",
		setContextLineDesc: "이름 아래에 \"친구 · 서버 3개 · DM\"을 표시합니다.",
		setCompact: "컴팩트 모드",
		setCompactDesc: "한 줄 결과로 화면에 더 많은 행을 표시합니다.",
		setMaxMutual: "컨텍스트 줄의 서버 수",
		setMaxMutualDesc: "공통 서버 이름을 몇 개까지 나열할지 설정합니다.",
		setMsgEnabled: "\"&이름 텍스트\" 모드",
		setMsgEnabledDesc: "사용자의 메시지를 모든 곳에서 검색합니다.",
		setOnlyGuilds: "서버에서만 검색",
		setOnlyGuildsDesc: "메시지 검색 시 DM과 그룹 채팅을 건너뜁니다.",
		setPerTarget: "서버당 결과 수",
		setPerTargetDesc: "서버 또는 채팅당 메시지 제한입니다.",
		setMaxTargets: "검색당 최대 대상 수",
		setMaxTargetsDesc: "높을수록 느리지만 더 완전합니다.",
		setTotalLimit: "총 행 수",
		setTotalLimitDesc: "메시지 결과의 전체 제한입니다.",
		setConcurrency: "병렬 요청 수",
		setConcurrencyDesc: "너무 높게 설정하지 마세요 - Discord가 빈번한 요청을 제한합니다.",
		setDebug: "상세 로그",
		setDebugDesc: "콘솔에 디버그 출력 (Ctrl+Shift+I).",
		btnReset: "설정 초기화",
		btnResetDone: "설정이 기본값으로 초기화되었습니다",
		diagTitle: "자가 진단",
		diagDesc: "한 번의 클릭으로 Discord 모듈, 엔진, 렌더링을 모두 점검합니다. 실패 시 개발자에게 보고서를 보내주세요.",
		diagRun: "자가 테스트 실행",
		diagCopy: "보고서 복사",
		diagTransport: "메시지 검색 테스트 (요청 1개)",
		diagOk: "모든 검사 통과",
		diagFail: "발견된 문제: {n}",
		diagNever: "자가 테스트가 아직 실행되지 않았습니다",
		copied: "클립보드에 복사됨",
		manualCopyBtn: "수동 복사",
		manualCopyTitle: "보고서를 수동으로 복사하세요",
		manualCopyHint: "자동 복사를 확인할 수 없습니다. 보고서 텍스트가 이미 선택되어 있습니다 - Ctrl+C (Mac은 Cmd+C)를 눌러 채팅에 붙여넣으세요.",
		manualCopyClose: "완료",
		about: "\"&이름\"은 모든 공통 서버와 채팅에서 사람을 찾습니다. \"&이름 텍스트\"는 그 사람의 메시지를 찾습니다. 인터페이스는 완전히 네이티브이며 Discord 테마가 자동으로 적용됩니다.",
		footerHotkeys: "Ctrl+K - 빠른 검색 · & - 플러그인 모드 · Tab - 이름에서 메시지로",
		toastWelcome: "UserGlobalSearch: Ctrl+K를 열고 &를 입력하세요",
		linkGithub: "GitHub",
		linkIssues: "문제 신고",
		sectionMessages: "메시지"
	},

	"zh-CN": {
		headerPickUsers: "用户: \"{q}\"",
		headerPickAll: "搜索所有用户",
		headerMessagesFor: "{name} 的消息: \"{q}\"",
		headerAllMessages: "全部消息: {name}",
		emptyUsers: "没有找到与 \"{q}\" 匹配的用户。",
		emptyUsersHint: "试试其他拼写或转写: sonya / соня。",
		emptyMessages: "未找到消息。请尝试更改查询。",
		errNoTransport: "此 Discord 版本不支持消息搜索。用户选择功能正常。",
		errNoTargets: "与该用户没有共同的服务器或聊天。",
		errGeneric: "出错了。详见设置中的日志。",
		loading: "搜索中: {done}/{total} · 已找到 {found}",
		loadingErrors: "· {n} 个错误",
		emptyMessagesErrors: "请求失败 ({n})。打开插件设置并运行自检以查看原因。",
		badgeFriend: "好友",
		badgeServer: "服务器",
		badgeDm: "私信",
		badgeBot: "机器人",
		ctxFriend: "好友",
		ctxDm: "私信",
		ctxGroup: "群组",
		ctxMore: "+{n}",
		hintPick: "Enter - 该用户的消息 · ↑↓ - 选择 · Esc - 关闭",
		hintMessages: "Enter - 跳转到消息 · Esc - 关闭",
		protipTitle: "& - 全局用户搜索",
		pluralGuilds: ["服务器"],
		pluralDms: ["聊天"],
		pluralResults: ["结果"],
		catSearch: "搜索",
		catAppearance: "界面",
		catMessages: "消息搜索",
		catAdvanced: "高级",
		setMaxUserResults: "建议中的用户数",
		setMaxUserResultsDesc: "输入 \"&名字\" 时显示的行数。",
		setDebounce: "搜索延迟",
		setDebounceDesc: "输入后到开始搜索的间隔 (毫秒)。",
		setTranslit: "转写",
		setTranslitDesc: "\"соня\" 可找到 \"Sonya\", \"sonya\" 可找到 \"Соня\"。",
		setFriendsFirst: "好友优先",
		setFriendsFirstDesc: "好友始终排在最前, 然后是私信和服务器。",
		setIncludeDMs: "私聊和群聊",
		setIncludeDMsDesc: "在私信联系人中搜索。",
		setIncludeMembers: "服务器成员",
		setIncludeMembersDesc: "在你所有服务器的成员中搜索。",
		setStatusDot: "状态圆点",
		setStatusDotDesc: "头像上的绿/黄/红圆点。",
		setBadges: "徽章",
		setBadgesDesc: "名字旁显示 好友, 服务器, 私信, 机器人 标签。",
		setHandles: "右侧显示 @username",
		setHandlesDesc: "在行的右边缘显示用户名。",
		setContextLine: "上下文行",
		setContextLineDesc: "名字下方显示 \"好友 · 3 个服务器 · 私信\"。",
		setCompact: "紧凑模式",
		setCompactDesc: "单行结果, 屏幕上显示更多行。",
		setMaxMutual: "上下文行中的服务器数",
		setMaxMutualDesc: "列出多少个共同服务器名称。",
		setMsgEnabled: "\"&名字 文本\" 模式",
		setMsgEnabledDesc: "在所有地方搜索某用户的消息。",
		setOnlyGuilds: "仅在服务器中搜索",
		setOnlyGuildsDesc: "搜索消息时跳过私信和群聊。",
		setPerTarget: "每个服务器的结果数",
		setPerTargetDesc: "每个服务器或聊天的消息上限。",
		setMaxTargets: "每次搜索的最大目标数",
		setMaxTargetsDesc: "越多越慢, 但覆盖更全。",
		setTotalLimit: "列表总行数",
		setTotalLimitDesc: "消息结果的总上限。",
		setConcurrency: "并行请求数",
		setConcurrencyDesc: "不要设得太高 - Discord 会限制频繁请求。",
		setDebug: "详细日志",
		setDebugDesc: "向控制台输出调试信息 (Ctrl+Shift+I)。",
		btnReset: "重置设置",
		btnResetDone: "设置已重置为默认值",
		diagTitle: "自我诊断",
		diagDesc: "一键检查所有内容: Discord 模块, 引擎, 渲染。如有失败可将报告发给作者。",
		diagRun: "运行自检",
		diagCopy: "复制报告",
		diagTransport: "测试消息搜索 (1 次请求)",
		diagOk: "所有检查通过",
		diagFail: "发现问题: {n}",
		diagNever: "自检尚未运行",
		copied: "已复制到剪贴板",
		manualCopyBtn: "手动复制",
		manualCopyTitle: "请手动复制报告",
		manualCopyHint: "无法确认自动复制。报告文本已选中 - 按 Ctrl+C (Mac 为 Cmd+C) 并粘贴到聊天中。",
		manualCopyClose: "完成",
		about: "\"&名字\" 在所有共同服务器和聊天中找到这个人。\"&名字 文本\" 找到他的消息。界面完全原生: 自动应用你的 Discord 主题。",
		footerHotkeys: "Ctrl+K - 快速搜索 · & - 插件模式 · Tab - 从名字到消息",
		toastWelcome: "UserGlobalSearch: 打开 Ctrl+K 并输入 &",
		linkGithub: "GitHub",
		linkIssues: "报告问题",
		sectionMessages: "消息"
	},

	"zh-TW": {
		headerPickUsers: "使用者: 「{q}」",
		headerPickAll: "搜尋所有使用者",
		headerMessagesFor: "{name} 的訊息: 「{q}」",
		headerAllMessages: "所有訊息: {name}",
		emptyUsers: "找不到符合「{q}」的使用者。",
		emptyUsersHint: "試試其他拼法或轉寫: sonya / соня。",
		emptyMessages: "找不到訊息。請嘗試更改查詢。",
		errNoTransport: "此 Discord 版本不支援訊息搜尋。使用者選擇功能正常。",
		errNoTargets: "與該使用者沒有共同的伺服器或聊天。",
		errGeneric: "發生錯誤。詳情請見設定中的日誌。",
		loading: "搜尋中: {done}/{total} · 找到 {found}",
		loadingErrors: "· {n} 個錯誤",
		emptyMessagesErrors: "請求失敗 ({n})。開啟外掛設定並執行自我檢測以查看原因。",
		badgeFriend: "好友",
		badgeServer: "伺服器",
		badgeDm: "私訊",
		badgeBot: "機器人",
		ctxFriend: "好友",
		ctxDm: "私訊",
		ctxGroup: "群組",
		ctxMore: "+{n}",
		hintPick: "Enter - 該使用者的訊息 · ↑↓ - 選擇 · Esc - 關閉",
		hintMessages: "Enter - 跳轉到訊息 · Esc - 關閉",
		protipTitle: "& - 全域使用者搜尋",
		pluralGuilds: ["伺服器"],
		pluralDms: ["聊天"],
		pluralResults: ["結果"],
		catSearch: "搜尋",
		catAppearance: "介面",
		catMessages: "訊息搜尋",
		catAdvanced: "進階",
		setMaxUserResults: "建議中的使用者數",
		setMaxUserResultsDesc: "輸入「&名字」時顯示的列數。",
		setDebounce: "搜尋延遲",
		setDebounceDesc: "輸入後到開始搜尋的間隔 (毫秒)。",
		setTranslit: "轉寫",
		setTranslitDesc: "「соня」可找到「Sonya」, 「sonya」可找到「Соня」。",
		setFriendsFirst: "好友優先",
		setFriendsFirstDesc: "好友永遠排在最前, 然後是私訊和伺服器。",
		setIncludeDMs: "私訊和群組聊天",
		setIncludeDMsDesc: "在私訊聯絡人中搜尋。",
		setIncludeMembers: "伺服器成員",
		setIncludeMembersDesc: "在你所有伺服器的成員中搜尋。",
		setStatusDot: "狀態圓點",
		setStatusDotDesc: "頭像上的綠/黃/紅圓點。",
		setBadges: "徽章",
		setBadgesDesc: "名字旁顯示 好友, 伺服器, 私訊, 機器人 標籤。",
		setHandles: "右側顯示 @username",
		setHandlesDesc: "在列的右緣顯示使用者名稱。",
		setContextLine: "上下文列",
		setContextLineDesc: "名字下方顯示「好友 · 3 個伺服器 · 私訊」。",
		setCompact: "精簡模式",
		setCompactDesc: "單列結果, 畫面上顯示更多列。",
		setMaxMutual: "上下文列中的伺服器數",
		setMaxMutualDesc: "列出多少個共同伺服器名稱。",
		setMsgEnabled: "「&名字 文字」模式",
		setMsgEnabledDesc: "在所有地方搜尋某使用者的訊息。",
		setOnlyGuilds: "僅在伺服器中搜尋",
		setOnlyGuildsDesc: "搜尋訊息時略過私訊和群組聊天。",
		setPerTarget: "每個伺服器的結果數",
		setPerTargetDesc: "每個伺服器或聊天的訊息上限。",
		setMaxTargets: "每次搜尋的最大目標數",
		setMaxTargetsDesc: "越多越慢, 但覆蓋更完整。",
		setTotalLimit: "清單總列數",
		setTotalLimitDesc: "訊息結果的總上限。",
		setConcurrency: "並行請求數",
		setConcurrencyDesc: "不要設得太高 - Discord 會限制頻繁請求。",
		setDebug: "詳細日誌",
		setDebugDesc: "向主控台輸出除錯資訊 (Ctrl+Shift+I)。",
		btnReset: "重設設定",
		btnResetDone: "設定已重設為預設值",
		diagTitle: "自我診斷",
		diagDesc: "一鍵檢查所有內容: Discord 模組, 引擎, 渲染。如有失敗可將報告傳給作者。",
		diagRun: "執行自我檢測",
		diagCopy: "複製報告",
		diagTransport: "測試訊息搜尋 (1 次請求)",
		diagOk: "所有檢查通過",
		diagFail: "發現問題: {n}",
		diagNever: "自我檢測尚未執行",
		copied: "已複製到剪貼簿",
		manualCopyBtn: "手動複製",
		manualCopyTitle: "請手動複製報告",
		manualCopyHint: "無法確認自動複製。報告文字已選取 - 按 Ctrl+C (Mac 為 Cmd+C) 並貼到聊天中。",
		manualCopyClose: "完成",
		about: "「&名字」在所有共同伺服器和聊天中找到這個人。「&名字 文字」找到他的訊息。介面完全原生: 自動套用你的 Discord 主題。",
		footerHotkeys: "Ctrl+K - 快速搜尋 · & - 外掛模式 · Tab - 從名字到訊息",
		toastWelcome: "UserGlobalSearch: 開啟 Ctrl+K 並輸入 &",
		linkGithub: "GitHub",
		linkIssues: "回報問題",
		sectionMessages: "訊息"
	}
};

const PLURAL_TRIPLE = new Set(["ru", "uk", "pl", "cs", "hr"]);

const PLURAL_SINGLE = new Set(["ja", "zh-CN", "zh-TW", "ko", "th", "vi", "id"]);

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
	scrollbar-width: thin;
	scrollbar-color: var(--background-tertiary) transparent;
}
.${NS}-host::-webkit-scrollbar {
	width: 8px;
}
.${NS}-host::-webkit-scrollbar-thumb {
	background: var(--background-tertiary);
	border-radius: 4px;
}
.${NS}-host::-webkit-scrollbar-track {
	background: transparent;
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
	const dl = d.toLowerCase().replace(/ё/g, "е");
	const idx = dl.indexOf(q);
	if (idx >= 0) return [[idx, idx + q.length]];
	return [];
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
	}

	available() {
		return !!(this.rest && typeof this.rest.get === "function");
	}

	cancelAll() {
		this.token++;
	}

	async searchTarget(target, userId, text, perTarget) {
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
			cursor: null,
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
					this.log("transport", `429 rate limit, повтор через ${wait} мс`);
					await sleep(wait);
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
		const queue = targets.slice();
		const collected = [];

		const cacheKey = `${opts.userId}|${opts.text ?? ""}`;
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL_MS && cached.items.length) {
			onBatch?.(cached.items.slice(), { done: 0, total: targets.length, found: cached.items.length, errors: 0, denied: 0 });
		}
		const errorSamples = [];
		let done = 0;
		let denied = 0;
		let errors = 0;
		let grand = 0;

		const worker = async () => {
			while (queue.length && alive()) {

				if (collected.length >= opts.totalLimit) return;

				const cooldown = this.cooldownUntil - Date.now();
				if (cooldown > 0) await sleep(Math.min(cooldown, 5000));
				if (!alive()) return;
				const t = queue.shift();
				try {
					const r = await this.searchTarget(t, opts.userId, opts.text, opts.perTarget);
					if (!alive()) return;
					grand += r.total;
					for (const m of r.messages) collected.push(this.toItem(m, t));

					collected.sort((a, b) => (snowflakeNewer(a.id, b.id) ? -1 : 1));
					if (collected.length > opts.totalLimit) collected.length = opts.totalLimit;
				} catch (e) {
					if (!alive()) return;
					if (e && (e.status === 403 || e.status === 404)) denied++;
					else {
						errors++;
						if (errorSamples.length < 3) errorSamples.push(String(e?.message ?? e).slice(0, 200));
						this.log("transport", `target ${t.id} failed`, e);
					}
				}
				done++;
				if (alive()) {
					onBatch?.(collected.slice(), { done, total: targets.length, found: collected.length, errors, denied });
				}
			}
		};

		const workers = [];
		const n = Math.max(1, Math.min(opts.concurrency ?? 6, 8));
		for (let i = 0; i < n; i++) workers.push(worker());
		await Promise.all(workers);
		if (alive()) {
			this.cache.set(cacheKey, { ts: Date.now(), items: collected.slice() });
			if (this.cache.size > 30) this.cache.delete(this.cache.keys().next().value);
			onDone?.({ total: grand, found: collected.length, denied, errors, errorSamples });
		}
	}

	toItem(message, target) {
		const content = String(message?.content ?? "");
		const channelId = String(message?.channel_id ?? "");
		const channel = (target.kind === "dm-global" || target.kind === "dm") ? DataService.getChannel(channelId) : null;
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
			targetName: target.kind === "guild" ? target.name : privateName,
			targetKind: target.kind,
			iconUrl,
			content: truncate(content.replace(/\s+/g, " "), 180),
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
		Journal.info("switcher", "query", { value, mode: parsed.mode });
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
		Journal.info("switcher", "render", { rows: (view.rows ?? []).length, empty: !!view.empty, standalone: host.classList.contains(`${NS}-host-standalone`) });
		host.textContent = "";
		if (view.header) host.appendChild(view.header);
		for (const row of view.rows ?? []) host.appendChild(row);
		if (view.empty) host.appendChild(view.empty);
		if (view.footer) host.appendChild(view.footer);
		this.itemCount = (view.rows ?? []).length;
		this.updateSelectionDom();
	}

	updateSelectionDom() {
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
		Journal.info("core", `starting v${PLUGIN_VERSION}`);
		Journal.debugEnabled = !!this.settings.debugLogs;

		this.locale = detectLocale(ModuleRegistry.get("locale"));
		Journal.debug("core", "locale", this.locale);

		ModuleRegistry.report();

		this.injectStyles();

		this.transport = new MessageSearchTransport(ModuleRegistry.get("rest"), (s, m, d) => Journal.debug(s, m, d));

		this.debouncedSearch = debounce((parsed) => this.runUserSearch(parsed), this.settings.debounceMs);

		this.integration = new SwitcherIntegration(this);
		this.integration.start();

		this.unwatchLocale = this.watchLocale();

		if (!this.settings.welcomed) {
			this.settings.welcomed = true;
			this.saveSettings();
			try { BdApi.UI.showToast(this.t("toastWelcome"), { type: "success" }); } catch (e) {}
		}
		Journal.info("core", "started");
	}

	stop() {
		Journal.info("core", "stopped");
		try { this.unwatchLocale?.(); } catch (e) {}
		this.unwatchLocale = null;
		try { this.integration?.stop(); } catch (e) {}
		this.integration = null;
		try { this.transport?.cancelAll(); } catch (e) {}
		try { this.debouncedSearch?.cancel?.(); } catch (e) {}
		if (this.styleNode) {
			try { this.styleNode.remove(); } catch (e) {}
			this.styleNode = null;
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
					this.runUserSearch(parsed);
					break;
				case "pick":
					this.debouncedSearch?.(parsed);
					break;
				case "messages":
					if (!this.settings.messageSearchEnabled) {
						this.debouncedSearch?.({ ...parsed, mode: "pick" });
						break;
					}
					this.runMessageFlow(parsed);
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
		Journal.info("data", "user sources", {
			query: String(userQuery ?? ""), friends: friends.length,
			dmUsers: dmUsers.length, guildMembers: guildMembers.length,
			cachedUsers: cachedUsers.length
		});
		return { friends, dmUsers, guildMembers, cachedUsers };
	}

	runUserSearch(parsed) {
		if (!this.integration?.active) return;
		try {
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
				(summary) => Journal.info("search", "message search finished", summary)
			);
		} catch (e) {
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
