# Hyra Activity Bot

Tracks Roblox playtime (via the Hyra API) and Discord messages (in your general-lounge
channel), checks them against per-rank weekly requirements, and provides leaderboards.
All times/dates are calculated in **US Eastern Time** (auto-adjusts EST/EDT).

## Commands

- **`/activity roblox_username [member]`** — current week snapshot: minutes, messages,
  pass/fail vs rank requirement, and recent Hyra sessions.
- **`/activityweek roblox_username [member]`** — per-day breakdown of the current week
  (Mon–Sun): messages and minutes for each day, plus the weekly total and pass/fail.
- **`/activityoverall roblox_username [member]`** — the past 12 weeks in one table
  (messages + minutes per week). **Note:** weeks before you started running this bot will
  show "no data" for minutes — Hyra's API only exposes the current week's total plus your
  last 25 sessions, not historical weekly totals, so the bot builds this history itself
  going forward, one week at a time.
- **`/leaderboard`** — top 10 staff (any of your 4 ranks) by Discord messages sent in
  general-lounge this week.
- **`/robloxleaderboard`** — top 10 by Roblox minutes this week. **Note:** Hyra doesn't
  expose a full staff roster via API, only a verified top 6 (via the dashboard endpoint).
  This command combines that top 6 with anyone who's ever been looked up via `/activity`,
  `/activityweek`, or `/activityoverall`. It will become a true top 10 once most of your
  staff have used one of those commands at least once — encourage staff to run `/activity`
  on themselves early on so they show up here.

## Config already filled in for you

- Guild ID: `822819367070597131`
- General lounge channel ID: `825046860409995284`
- Hyra workspace ID: `65942a0c733a251d468d6b53`
- Rank requirements (edit in `config.js` if these ever change):
  - Airport Manager — 75 min / 75 msgs
  - Airport Assistant — 75 min / 75 msgs
  - Airport Coordinator — 60 min / 50 msgs
  - Airport Director — 30 min / 30 msgs

## PART 1 — Create your Discord bot

1. https://discord.com/developers/applications → **New Application** → name it.
2. Left sidebar → **Bot** → **Reset Token** → copy it (this is `DISCORD_TOKEN`). On this
   same page, enable **Message Content Intent** and **Server Members Intent** under
   Privileged Gateway Intents — required for message counting and role checks.
3. Left sidebar → **OAuth2 → URL Generator** → check `bot` and `applications.commands` →
   under Bot Permissions check `Send Messages`, `Embed Links`, `Read Message History`,
   `View Channels` → open the generated URL and invite the bot to your server.
4. Copy the **Client ID** from **General Information** (this is `CLIENT_ID`).

## PART 2 — Fill in your config

1. Rename `.env.example` to `.env`
2. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and `HYRA_API_KEY`. Everything else
   (`GUILD_ID`, `HYRA_WORKSPACE_ID`, `GENERAL_LOUNGE_CHANNEL_ID`) is already filled in.
3. Double-check the role names in `config.js` under `RANK_REQUIREMENTS` match your exact
   Discord role names (capitalization matters).

## PART 3 — Deploy on Oracle Cloud Free Tier (always-free VM)

1. Sign up at https://www.oracle.com/cloud/free/ (card needed for identity verification
   only — the Always Free tier itself is not billed).
2. In the console: **Compute → Instances → Create Instance**.
   - Name it anything (e.g. `hyra-bot`)
   - Under **Image and shape** → **Edit** → choose **Ampere (ARM) → VM.Standard.A1.Flex**,
     1 OCPU / 6GB RAM — or an AMD/Intel "Always Free eligible" Ubuntu shape if A1 isn't
     available in your region.
   - Under **Add SSH keys**, choose "Generate a key pair for me" and **download the
     private key** — you need it to log in.
   - Click **Create**, wait for it to show "Running", then copy its **Public IP**.
3. From your own computer's terminal (Mac/Linux) or PowerShell/PuTTY (Windows):
   ```
   chmod 400 path/to/downloaded-key.key
   ssh -i path/to/downloaded-key.key ubuntu@YOUR_PUBLIC_IP
   ```
4. On the server, install Node.js and git:
   ```
   sudo apt update
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   node -v
   ```
5. Upload this bot folder — from your **own computer**, in a terminal in this project
   folder:
   ```
   scp -i path/to/downloaded-key.key -r ./hyra-bot ubuntu@YOUR_PUBLIC_IP:~/hyra-bot
   ```
6. Back in your SSH session:
   ```
   cd ~/hyra-bot
   npm install
   nano .env
   ```
   Paste in your filled-out `.env` contents, then Ctrl+O, Enter, Ctrl+X to save and exit.
7. Test it runs:
   ```
   node index.js
   ```
   You should see "Logged in as ...", "Registered 5 slash commands.", and the weekly
   maintenance schedule line. Test all 5 commands in Discord. Ctrl+C to stop the test.
8. Keep it running permanently with `pm2`:
   ```
   sudo npm install -g pm2
   pm2 start index.js --name hyra-bot
   pm2 save
   pm2 startup
   ```
   `pm2 startup` prints a command starting with `sudo env PATH=...` — copy and run that
   exact line. This makes the bot auto-restart if the server ever reboots.

## Maintenance

- Logs: `pm2 logs hyra-bot`
- Restart after editing files: `pm2 restart hyra-bot`
- Data lives in the `data/` folder as plain JSON files:
  - `dailyMessages.json` — per-user, per-day Discord message counts (kept ~100 days,
    auto-pruned weekly)
  - `trackedUsers.json` — remembers which Discord users have been linked to which Roblox
    username, so leaderboards and history know who to check
  - `weeklyMinutesHistory.json` — the bot's own record of past weekly Hyra minute totals,
    since Hyra's API doesn't provide this
  - **Back these up occasionally** — they're the only copy of this bot's history.

## Notes / things to double check once it's running

- **`duration` units** — the code assumes Hyra's session `duration` field is in seconds
  and divides by 60 for minutes. Run `/activityweek` once and compare its day-by-day
  minutes to Hyra's own dashboard. If everything looks 60x too big or too small, edit
  `durationToMinutes()` in `lib/hyra.js`.
- **Reset day** — `RESET_CRON` in `.env` defaults to Monday 00:00 Eastern. Check the
  `week_starts_on` value shown in `/activity`'s footer against this; adjust the day number
  in `RESET_CRON` if Hyra's week doesn't start on Monday for your workspace.
- **`/robloxleaderboard` accuracy** — see the note in the Commands section above; it
  improves in accuracy the more staff have used any activity command at least once.
- **Rank precedence** — if a member holds more than one of the 4 rank roles, whichever is
  listed **first** in `RANK_REQUIREMENTS` (in `config.js`) is the one used.
