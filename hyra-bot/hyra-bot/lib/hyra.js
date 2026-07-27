const { HYRA_API_KEY, HYRA_WORKSPACE_ID } = require('../config');

async function hyraGetUserByRobloxUsername(username) {
  const url = `https://api.hyra.io/users/roblox?username=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// Returns { totals: { minutes, messages, period }, last_25: [...], week_starts_on } or null
async function hyraGetActivity(hyraUserId) {
  const url = `https://api.hyra.io/activity/${HYRA_WORKSPACE_ID}/user/${hyraUserId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HYRA_API_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Returns the workspace staff dashboard, including a verified "top_six" by minutes.
async function hyraGetStaffDashboard() {
  const url = `https://api.hyra.io/staff/dashboard/${HYRA_WORKSPACE_ID}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HYRA_API_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Converts a session's `duration` field to minutes.
// NOTE: assumes Hyra returns `duration` in seconds. If your /activity command shows minutes
// that don't match Hyra's dashboard, remove the "/ 60" both here and anywhere else it's used.
function durationToMinutes(duration) {
  return Math.round((duration || 0) / 60);
}

module.exports = {
  hyraGetUserByRobloxUsername,
  hyraGetActivity,
  hyraGetStaffDashboard,
  durationToMinutes,
};
