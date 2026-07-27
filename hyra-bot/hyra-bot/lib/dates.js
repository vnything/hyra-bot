const { TIMEZONE } = require('../config');

// Returns "YYYY-MM-DD" for a given Date, in the configured timezone.
function toZonedDateString(date) {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA format = YYYY-MM-DD
}

// Returns the weekday number (0=Sun..6=Sat) for a given Date, in the configured timezone.
function zonedWeekday(date) {
  const str = date.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'short' });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[str];
}

// Given a "YYYY-MM-DD" string, returns a Date object representing that calendar day at noon UTC
// (noon avoids any DST edge issues when just doing date arithmetic).
function parseDateString(str) {
  return new Date(`${str}T12:00:00Z`);
}

function addDays(dateStr, days) {
  const d = parseDateString(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toZonedDateString(d);
}

// Returns the "YYYY-MM-DD" of the Monday of the week containing `date`, in the configured timezone.
function getWeekStart(date = new Date()) {
  const todayStr = toZonedDateString(date);
  const weekday = zonedWeekday(date); // 0=Sun..6=Sat
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addDays(todayStr, -daysSinceMonday);
}

// Returns an array of the last `count` week-start ("Monday") date strings, oldest first,
// ending with the current week.
function getLastNWeekStarts(count, date = new Date()) {
  const currentWeekStart = getWeekStart(date);
  const weeks = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(addDays(currentWeekStart, -7 * i));
  }
  return weeks;
}

// Returns all "YYYY-MM-DD" date strings from weekStart (Monday) through weekStart+6 (Sunday).
function getWeekDates(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

module.exports = {
  toZonedDateString,
  zonedWeekday,
  parseDateString,
  addDays,
  getWeekStart,
  getLastNWeekStarts,
  getWeekDates,
};
