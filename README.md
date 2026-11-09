# Herdr Core Discord Presence

Counts-only port of [revanp/herdr-discord-presence](https://github.com/revanp/herdr-discord-presence), MIT.

Displays only `2/3 agents working`. No project names, paths, prompts, labels or remote agents. Only local live terminals with core-reported status count. Zero agents or unavailable core clears presence. Elapsed timer keeps one timestamp across count changes and Discord reconnects; restarting presence resets it.

Requires Node >=20, herdr-core (`hc`) and Discord desktop. Local Discord RPC, no bot token. Create a Discord application and use its public Application ID; its name controls the `Playing …` heading.

## Setup and checks

```sh
npm ci
npm run typecheck
npm test
npm run dry-run
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID npm start
```

Optional `HC_BIN` selects hc executable. Ctrl-C clears presence and closes RPC. Start only one instance; stop foreground trials before enabling service.

## macOS login service

Requires Python 3 for plist generation. Run from project directory after building. Choose stable Node installation on PATH; regenerating plist is necessary if node, hc or project moves.

```sh
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/herdr-core-discord-presence"
chmod 700 "$HOME/Library/Logs/herdr-core-discord-presence"
plist="$HOME/Library/LaunchAgents/io.github.caesariodito.herdr-core-discord-presence.plist"
(umask 077; DISCORD_CLIENT_ID=YOUR_APPLICATION_ID python3 macos/launchagent.py > "$plist")
chmod 600 "$plist"
plutil -lint "$plist"
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl print "gui/$(id -u)/io.github.caesariodito.herdr-core-discord-presence" | grep -E '^[[:space:]]*(state|pid|last exit code|runs) ='
```

LaunchAgent survives terminal/app closure, starts after login and restarts on exit. It does not run before login. Logs: `~/Library/Logs/herdr-core-discord-presence/`. No automatic log rotation.

Stop before updating/rebuilding; bootstrap again afterward:

```sh
launchctl bootout "gui/$(id -u)/io.github.caesariodito.herdr-core-discord-presence"
```

Remove installed plist after stopping to disable future login startup. LaunchAgent manages one instance; manual foreground duplicates are not prevented.

Polls every 5 seconds. Sets throttled to 15 seconds; clears immediate. RPC activity/teardown timeout 2 seconds, login timeout 10 seconds; failures reconnect after 10 seconds. No legacy plugins, hooks or config writes.
