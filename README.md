# AmpSearch

![Version](https://img.shields.io/badge/version-1.0.22-5865F2) ![License](https://img.shields.io/badge/license-MIT-green)

AmpSearch adds the **&** trigger to Discord's Quick Switcher. Find people across mutual servers, DMs and group chats, then search their recent messages without leaving the native Quick Switcher UI.

### Download

Raw file: [AmpSearch.plugin.js](https://raw.githubusercontent.com/florzzzbd/AmpSearch/refs/heads/main/AmpSearch.plugin.js)

*"Discord" is a trademark of Discord Inc. This project is not affiliated with Discord Inc. See the full [trademark notice](#trademark-notice).*

## Features

### The & trigger

The ampersand appears beside Discord's built-in Quick Switcher filters. Open the switcher with Ctrl+K and type `&` to activate AmpSearch.

### People search

- Friends are ranked first, followed by DM partners and mutual server members.
- Matches display names, usernames and server nicknames.
- Prefix, word-start, substring and acronym matching.
- RU ↔ EN transliteration: `&соня` can find "Sonya", and `&sonya` can find "Соня".
- Optional status dots, badges, context lines and compact mode.

### Message search

Press Enter or Tab on a selected user to search that person's messages:

- DMs and group chats use Discord's global private-message search.
- Server searches are limited to servers you share with that person.
- Requests are debounced, cancellable, rate-limit aware and briefly cached.
- Results load in batches and continue automatically when you reach the bottom.
- Press Enter on a message to jump directly to it.

### Native interface

AmpSearch renders inside Discord's Quick Switcher and follows Discord theme variables. The settings panel controls user limits, message limits, target count, request concurrency and display options.

### Languages

The interface supports English, Russian and Ukrainian.

## Installation

1. Install [BetterDiscord](https://betterdiscord.app/) if needed.
2. Download `AmpSearch.plugin.js` from the link above.
3. Move it to the BetterDiscord plugins folder:
   - Windows: `%AppData%/BetterDiscord/plugins`
   - macOS: `~/Library/Application Support/BetterDiscord/plugins`
   - Linux: `~/.config/BetterDiscord/plugins`
4. Remove any old `GlobalUserSearch.plugin.js` or `UserGlobalSearch.plugin.js` copy.
5. Enable AmpSearch in Settings → Plugins.
6. Press Ctrl+K and type `&`.

## Usage

| Input / key | Action |
|---|---|
| Ctrl+K | Open Quick Switcher |
| `&` | Browse people |
| `&name` | Filter people |
| Enter / Tab on a user | Show that user's messages |
| `&name text` | Search that user's messages by text |
| ↑ / ↓ | Move through results |
| Enter on a message | Jump to the message |
| Ctrl+Enter / Cmd+Enter | Open the selected user's DM or profile |
| Esc | Close Quick Switcher |

## FAQ

**Can AmpSearch find messages from servers I am not in?**

No. Discord only returns messages you already have permission to access.

**Why does the target counter differ between users?**

AmpSearch searches one private-message target plus each mutual server. The target count therefore depends on what you share with the selected user.

**Why can message search take a moment on large servers?**

Discord performs the search on its servers. AmpSearch runs allowed requests in parallel and renders results as they arrive.

## Running tests

```bash
npm test
npm run check
```

## Reporting issues

Open an issue on the [Issues page](https://github.com/florzzzbd/AmpSearch/issues) with reproduction steps, your Discord build and any relevant English console error.

## Contributing

Bug reports, feature requests and pull requests are welcome.

## License

MIT. See [LICENSE](LICENSE).

## Trademark notice

"Discord" is a trademark of Discord Inc. AmpSearch is an unofficial third-party project and is not affiliated with, sponsored by or endorsed by Discord Inc. BetterDiscord is a third-party client modification and is also not affiliated with Discord Inc.
