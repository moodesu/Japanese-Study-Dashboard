// Public browser configuration only. Never place a WaniKani token in this file.
// The private token is read by the authenticated Netlify Function from the
// WANIKANI_API_TOKEN environment variable.
window.WANIKANI_CONFIG = {
  endpoint: '/.netlify/functions/wanikani'
};
