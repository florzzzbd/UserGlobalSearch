# UserGlobalSearch

![Version](https://img.shields.io/badge/version-1.0.0-5865F2) ![License](https://img.shields.io/badge/license-MIT-green)

Adds the **&** symbol to Discord's Quick Switcher: search everyone you share a server or DM with, then jump straight into their recent messages. All inside the native search UI, no overlays, no popups.

UserGlobalSearch is a BetterDiscord plugin that turns the Quick Switcher (Ctrl+K) into a proper people search. Type `&`, pick a person, see what they said lately across your mutual servers, DMs and group chats.

### Download

Raw file link: [UserGlobalSearch.plugin.js](https://github.com/florzzzbd/UserGlobalSearch/blob/main/GlobalUserSearch.plugin.js)

*"Discord" is a trademark of Discord Inc. This project is not affiliated with Discord Inc. See the full [trademark notice](#trademark-notice).*

## Table of Contents

- [About](#about)
- [Features](#features)
  * [The & trigger](#the--trigger)
  * [Smart people search](#smart-people-search)
  * [Message search across everything you share](#message-search-across-everything-you-share)
  * [Native settings panel](#native-settings-panel)
  * [Speaks your language](#speaks-your-language)
  * [Self-diagnostics](#self-diagnostics)
- [Installation](#installation)
- [How to use](#how-to-use)
- [FAQ](#faq)
- [Running the tests](#running-the-tests)
- [Reporting Issues](#reporting-issues)
- [Contributing](#contributing)
- [License](#license)
- [Trademark Notice](#trademark-notice)

## About

Discord's Quick Switcher is great for channels and servers, but it can't answer a simple question: "where do I actually know this person from, and what did they say last?" Discord's own message search can, but only one server at a time and buried under filters.

UserGlobalSearch adds a new trigger symbol to the Quick Switcher, right next to the native `@ # ! * $`:

| You type | What happens |
|---|---|
| `&` | List of everyone you share something with, friends first |
| `&name` | That user's recent messages across all your mutual servers, DMs and groups |
| `&name text` | Search that user's messages by text, same scope |

Everything renders inside the native Quick Switcher window. Same fonts, same colors, same hover states. It follows your theme (dark, light or custom) through Discord's own CSS variables, so it reads like a Discord update rather than a plugin.

## Features

_____________________________________________________________________________

### The & trigger

The ampersand joins the native hint row under the search input with its own tooltip, exactly like the built-in `@`, `#`, `!`, `*` and `$`.

Newer Discord builds started using `&` themselves for their global message search screen. The plugin detects that screen and takes the symbol over, so there's no conflict.

_____________________________________________________________________________

### Smart people search

Ranking that matches how you actually look for people:

- Friends first, then DM partners, then mutual server members.
- Prefix, word start, substring and acronym matching (`&smd` finds "Some Mega Dude").
- Full RU<->EN transliteration: `&соня` finds "Sonya", `&dima` finds "Дима".
- No lazy fuzzy matching: typing random letters gives you zero results instead of garbage.

User rows show an avatar with a status dot, badges (FRIEND, SERVER xN, DM, BOT), a context line like "Friend · 3 servers · DM", the @username on the right and highlighted matching letters.

_____________________________________________________________________________

### Message search across everything you share

Press Enter (or Tab) on a user and the plugin switches into message mode:

- DMs and group chats are covered by one global search request.
- Server messages come only from servers you actually share with that person, not a blind sweep of your whole server list.
- The progress counter shows real, personal targets (like "3/4"), not a fixed cap.
- Requests go through Discord's own internal REST module with a queue, limited parallelism, cancel-on-typing, rate limit handling with retries, and short-lived caching so repeating the same search feels instant.

Press Enter on a message to jump to it in place, without reloading the client.

_____________________________________________________________________________

### Native settings panel

Sections: Search, Interface, Message Search, Service. Includes a servers-only mode, result limits, parallelism tuning, reset to defaults and a live log.

_____________________________________________________________________________

### Speaks your language

All 33 Discord locales are supported, and the plugin switches language live when you change Discord's language. No restart needed.

_____________________________________________________________________________

### Self-diagnostics

Settings -> Self-diagnostics runs a full offline check: BetterDiscord API, every Discord module the plugin depends on (and which strategy found it), the search engine, the renderer, and data access (how many friends, servers and chats it can see).

**Copy report** puts a full JSON report in your clipboard. If something breaks on your machine, that report is the fastest way to get it fixed.

## Installation

1. Install [BetterDiscord](https://betterdiscord.app/) if you haven't yet.
2. Download `UserGlobalSearch.plugin.js` (link above).
3. Move it into your plugins folder:
   - Windows: `%AppData%/BetterDiscord/plugins`
   - macOS: `~/Library/Application Support/BetterDiscord/plugins`
   - Linux: `~/.config/BetterDiscord/plugins`

   Or from Discord: Settings -> Plugins -> Open Plugins Folder.
4. Enable UserGlobalSearch in Settings -> Plugins.
5. Press Ctrl+K and type `&`.

If you have an older copy lying around (including one named `GlobalUserSearch.plugin.js`), delete it first. Two copies of the same plugin will fight each other.

## How to use

| Key | Action |
|---|---|
| Ctrl+K | Open Quick Switcher |
| `&` | Enter UserGlobalSearch mode |
| ↑ / ↓ | Move through results |
| Enter | On a user: show their messages. On a message: jump to it |
| Tab | Jump from a user straight into message search |
| Esc | Close (native Discord behavior) |

## FAQ

**Can it find messages from servers I'm not in?**
No. Discord's API simply doesn't return those, and no plugin can change that. DMs and groups are searched globally; servers are searched only where you're both members.

**Why does the target counter show different numbers for different people?**
Because it's real. It's one global DM/group target plus one target per mutual server. Someone you only DM has 1 target. Someone from three of your servers has 4.

**Message search on a huge server takes a while. Is that normal?**
The actual searching is done by Discord's servers, and on very large servers their backend sometimes just takes a couple of seconds. The plugin adds no artificial delays on top: requests run in parallel, repeated searches are cached briefly, and results render as they arrive.

## Running the tests

The engine, renderer and Quick Switcher integration are covered by plain Node tests, no Discord or jsdom required:

```bash
node --test tests/*.test.js
```

## Reporting Issues

Open an issue on the [Issues page](https://github.com/florzzzbd/UserGlobalSearch/issues) with a clear description and steps to reproduce.

The best thing you can attach is the self-diagnostics report: Settings -> UserGlobalSearch -> Self-diagnostics -> Copy report. It contains module statuses and the recent log, which usually pinpoints the problem without any back and forth.

## Contributing

Bug reports, feature requests and pull requests are all welcome. To contribute code: fork the repo, do your thing, open a PR.

## License

MIT. Do whatever you want, just keep the copyright notice. See [LICENSE](LICENSE).

## Trademark Notice

"Discord" is a trademark of Discord Inc. UserGlobalSearch is an unofficial third-party project and is not affiliated with, sponsored or endorsed by Discord Inc. BetterDiscord is a third-party client modification and is also not affiliated with Discord Inc.
