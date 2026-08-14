# Herdr Discord Presence

Show your [Herdr](https://herdr.dev) session as **Discord Rich Presence**.
While your Herdr server is alive, your Discord profile shows what your agents
are doing — the focused project, the agent name, and a live working count.

```
Playing Herdr Presence
my-project
opencode · working · 2/3 working
```

No bot, no token, no server. It talks to your local Discord desktop app over
RPC, so it works only on your own machine and only while Discord is open.

---

## How it works

- A Herdr `[[startup]]` hook launches a small detached daemon whenever the
  Herdr server starts.
- The daemon polls `herdr api snapshot` every few seconds and mirrors the
  session to Discord: focused project, agent name and status, and a
  working/total count.
- When the Herdr server goes away, the presence is cleared. When Discord is
  closed, the daemon keeps retrying in the background until it comes back.

## Requirements

- [Herdr](https://herdr.dev/docs/install/) `>= 0.7.5`
- [Node.js](https://nodejs.org) `>= 20` on your `PATH`
- The **Discord desktop app** running (RPC is local IPC — the web app won't work)
- macOS or Linux

## Installation

Install straight from GitHub (Herdr runs the build for you):

```bash
herdr plugin install revanp/herdr-discord-presence
```

Or clone and link it yourself:

```bash
git clone https://github.com/revanp/herdr-discord-presence.git
cd herdr-discord-presence
npm install
npm run build
herdr plugin link .
```

## Set up your Discord application

Rich Presence needs a Discord *application* to display under. You create one
per Discord account (takes ~1 minute):

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   and click **New Application**.
2. Name it whatever you want to show as `Playing <name>` (e.g. `Herdr`).
3. On **General Information**, copy the **Application ID**.
4. Paste it into the plugin config (next section).

> You only need the **Application ID**. Ignore the public key / secret — this
> plugin never authenticates against Discord's API.

## Configure

Find the plugin's config directory:

```bash
herdr plugin config-dir herdr-discord-presence
```

Edit the `.env` file in that directory and set your Application ID:

```dotenv
DISCORD_CLIENT_ID=123456789012345678
```

## Start it

```bash
herdr plugin action invoke herdr-discord-presence.start
```

That's it — check your Discord profile. From now on the presence also starts
automatically every time the Herdr server boots.

## Actions

| Action | What it does |
| --- | --- |
| `herdr-discord-presence.start` | Launch the presence daemon (no-op if already running) |
| `herdr-discord-presence.stop` | Stop the daemon and clear the presence |
| `herdr-discord-presence.status` | Show daemon/config state and the last log lines |

Invoke them with:

```bash
herdr plugin action invoke herdr-discord-presence.<action>
```

## Configuration reference

All keys live in `<config-dir>/.env`. Only `DISCORD_CLIENT_ID` is required.

| Key | Default | Notes |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | — | **Required.** Your Discord Application ID |
| `POLL_SECONDS` | `5` | How often to poll Herdr (2–60) |
| `LARGE_IMAGE_KEY` | — | Asset key uploaded to the app (wins over `LARGE_IMAGE_URL`) |
| `LARGE_IMAGE_URL` | Herdr GitHub avatar | Any `https` image URL |
| `LARGE_IMAGE_TEXT` | `Herdr` | Hover text for the image |
| `BUTTON_LABEL` | `Herdr` | Leave label or url empty to hide the button |
| `BUTTON_URL` | `https://herdr.dev` | Where the button links to |

### Using a custom logo

By default the presence shows the Herdr GitHub avatar. To use your own image:

1. In the Developer Portal open your app → **Rich Presence** → **Art Assets** →
   **Add Image(s)**. Upload a square PNG (512×512 or larger) and give it a key,
   e.g. `herdr`.
2. In `.env`, set `LARGE_IMAGE_KEY=herdr`.
3. Restart: run the `stop` action, then `start` again.

## Uninstall

```bash
herdr plugin action invoke herdr-discord-presence.stop
herdr plugin uninstall herdr-discord-presence
```

## Troubleshooting

Run the `status` action first — it prints daemon state, config, and recent logs:

```bash
herdr plugin action invoke herdr-discord-presence.status
```

- **No presence shows up** — make sure the Discord *desktop* app is open and
  that `DISCORD_CLIENT_ID` is set. Check
  `herdr plugin log list --plugin herdr-discord-presence`.
- **"Discord RPC not reachable" in logs** — Discord isn't running, or RPC is
  disabled. Enable *Settings → Activity Privacy → Share detected activities*.
- **Logo missing** — the image URL returned a non-image or 404. Use
  `LARGE_IMAGE_KEY` with an uploaded asset instead (see above).
- **Presence is stale** — lower `POLL_SECONDS`. Discord rate-limits presence
  updates, so changes can take up to ~15s to appear.

## Development

```bash
npm install
npm run build       # compile to dist/
npm run status      # run the status helper directly
herdr plugin link .
```

Logs are written to `<state-dir>/daemon.log` (printed by the `status` action).

## License

MIT
