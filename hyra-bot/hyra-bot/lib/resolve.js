const { hyraGetUserByRobloxUsername, hyraGetActivity } = require('./hyra');
const { trackUser } = require('./storage');

// Resolves a Roblox username to { hyraUser, activity } and records the mapping
// (discordUserId -> robloxUsername/hyraUserId) so future leaderboard commands know about them.
// Returns { error: string } on failure, or { hyraUser, activity }.
async function resolvePersonActivity(robloxUsername, discordUserId) {
  const hyraUser = await hyraGetUserByRobloxUsername(robloxUsername);
  if (!hyraUser || !hyraUser.id) {
    return { error: `No Hyra profile found for Roblox user **${robloxUsername}**.` };
  }

  const activity = await hyraGetActivity(hyraUser.id);
  if (!activity) {
    return { error: 'Could not retrieve activity data from Hyra. Check the API key and workspace ID.' };
  }

  trackUser(discordUserId, robloxUsername, hyraUser.id);

  return { hyraUser, activity };
}

module.exports = { resolvePersonActivity };
