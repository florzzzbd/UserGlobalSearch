# UserGlobalSearch

Global user search for BetterDiscord. Type `&` in the Quick Switcher (Ctrl+K) to find people across all your mutual servers, DMs and group chats - then jump straight into their recent messages without leaving the native UI.

## Install

1. Download [GlobalUserSearch.plugin.js](https://raw.githubusercontent.com/florzzzbd/UserGlobalSearch/main/GlobalUserSearch.plugin.js)
2. Drop it into your BetterDiscord plugins folder (Settings -> Plugins -> Open Plugin Folder)
3. Enable it in the plugins list

## Usage

Type `&` followed by a name in the Quick Switcher:

- `&name` - pick a person, see friends first, then DMs and server members
- `&name text` - search that person's messages containing `text` across all servers and chats

Transliteration is built in, so `соня` finds `Sonya` and `sonya` finds `Соня`. Results render natively - your Discord theme applies automatically.

If someone reports the message search not working on their build, there is a self-test button in the plugin settings that checks the Discord modules and prints a report you can paste into an issue.

## Issues

Found a bug or the plugin stopped working after a Discord update? Open an issue: https://github.com/florzzzbd/UserGlobalSearch/issues

## License

MIT
