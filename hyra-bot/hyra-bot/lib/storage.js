const fs = require('fs');
const path = require('path');
const { DAILY_HISTORY_RETENTION_DAYS, WEEKLY_HISTORY_LIMIT } = require('../config');
const { toZonedDateString, addDays } = require('./dates');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DAILY_MESSAGES_FILE = path.join(DATA_DIR, 'dailyMessages.json');
const TRACKED_USERS_FILE = path.join(DATA_DIR, 'trackedUsers.json');
const WEEKLY_MINUTES_FILE = path.join(DATA_DIR, 'weeklyMinutesHistory.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Daily Discord message counts ----------
// Shape: { "<discordUserId>": { "YYYY-MM-DD": count, ... } }

function recordMessage(discordUserId, date = new Date()) {
  const all = readJson(DAILY_MESSAGES_FILE);
  const dateStr = toZonedDateString(date);
  if (!all[discordUserId]) all[discordUserId] = {};
  all[discordUserId][dateStr] = (all[discordUserId][dateStr] || 0) + 1;
  writeJson(DAILY_MESSAGES_FILE, all);
}

function getDailyMessages(discordUserId) {
  const all = readJson(DAILY_MESSAGES_FILE);
  return all[discordUserId] || {};
}

function getAllDailyMessages() {
  return readJson(DAILY_MESSAGES_FILE);
}

// Sums a user's message counts across an array of "YYYY-MM-DD" date strings.
function sumMessagesForDates(discordUserId, dateStrings) {
  const daily = getDailyMessages(discordUserId);
  return dateStrings.reduce((sum, d) => sum + (daily[d] || 0), 0);
}

// Deletes daily message entries older than the retention window, to keep the file small.
function pruneOldDailyMessages() {
  const all = readJson(DAILY_MESSAGES_FILE);
  const cutoff = addDays(toZonedDateString(new Date()), -DAILY_HISTORY_RETENTION_DAYS);
  for (const userId of Object.keys(all)) {
    for (const dateStr of Object.keys(all[userId])) {
      if (dateStr < cutoff) delete all[userId][dateStr];
    }
    if (Object.keys(all[userId]).length === 0) delete all[userId];
  }
  writeJson(DAILY_MESSAGES_FILE, all);
}

// ---------- Tracked users (discordUserId -> roblox username / hyra id) ----------
// Populated automatically whenever someone is looked up via a command.

function trackUser(discordUserId, robloxUsername, hyraUserId) {
  const all = readJson(TRACKED_USERS_FILE);
  all[discordUserId] = { robloxUsername, hyraUserId };
  writeJson(TRACKED_USERS_FILE, all);
}

function getAllTrackedUsers() {
  return readJson(TRACKED_USERS_FILE); // { discordUserId: { robloxUsername, hyraUserId } }
}

// ---------- Weekly Roblox minutes history (snapshotted going forward) ----------
// Shape: { "<robloxUsernameLower>": [ { weekStart: "YYYY-MM-DD", minutes: N }, ... ] }

function recordWeeklyMinutesSnapshot(robloxUsername, weekStart, minutes) {
  const all = readJson(WEEKLY_MINUTES_FILE);
  const key = robloxUsername.toLowerCase();
  if (!all[key]) all[key] = [];
  // Avoid duplicate entries for the same week
  all[key] = all[key].filter((entry) => entry.weekStart !== weekStart);
  all[key].push({ weekStart, minutes });
  all[key].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  if (all[key].length > WEEKLY_HISTORY_LIMIT) {
    all[key] = all[key].slice(all[key].length - WEEKLY_HISTORY_LIMIT);
  }
  writeJson(WEEKLY_MINUTES_FILE, all);
}

function getWeeklyMinutesHistory(robloxUsername) {
  const all = readJson(WEEKLY_MINUTES_FILE);
  return all[robloxUsername.toLowerCase()] || [];
}

module.exports = {
  recordMessage,
  getDailyMessages,
  getAllDailyMessages,
  sumMessagesForDates,
  pruneOldDailyMessages,
  trackUser,
  getAllTrackedUsers,
  recordWeeklyMinutesSnapshot,
  getWeeklyMinutesHistory,
};
