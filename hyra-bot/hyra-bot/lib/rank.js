const { RANK_REQUIREMENTS } = require('../config');

// Returns { role, minutes, messages } for the first matching role a member has, or null.
function getRequirementForMember(member) {
  for (const entry of RANK_REQUIREMENTS) {
    if (member.roles.cache.some((r) => r.name === entry.role)) {
      return entry;
    }
  }
  return null;
}

// Returns true if a member holds ANY of the configured rank roles.
function hasAnyRankRole(member) {
  return RANK_REQUIREMENTS.some((entry) => member.roles.cache.some((r) => r.name === entry.role));
}

module.exports = { getRequirementForMember, hasAnyRankRole, RANK_REQUIREMENTS };
