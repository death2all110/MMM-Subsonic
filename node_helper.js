const NodeHelper = require("node_helper");
const crypto = require("crypto");

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting node_helper for: " + this.name);
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_NOW_PLAYING") {
      this.getNowPlaying(payload);
    }
  },

  getNowPlaying: async function(config) {
    // Generate secure Subsonic token: md5(password + salt)
    const salt = crypto.randomBytes(6).toString("hex");
    const hash = crypto.createHash("md5").update(config.password + salt).digest("hex");
    
    // Clean up URL to prevent double slashes
    const baseUrl = config.url.replace(/\/$/, "");
    
    const url = new URL(`${baseUrl}/rest/getNowPlaying`);
    url.searchParams.append("u", config.username);
    url.searchParams.append("t", hash);
    url.searchParams.append("s", salt);
    url.searchParams.append("v", config.apiVersion);
    url.searchParams.append("c", "MagicMirror");
    url.searchParams.append("f", "json");

    try {
      // MagicMirror's modern Node environment supports native fetch
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      const data = await response.json();
      
      if (data["subsonic-response"] && data["subsonic-response"].status === "ok") {
        const nowPlaying = data["subsonic-response"].nowPlaying;
        let track = null;
        
        if (nowPlaying && nowPlaying.entry) {
          // Normalize to an array in case multiple clients are actively streaming
          const entries = [].concat(nowPlaying.entry);
          const entry = entries[0]; 
          
          if (entry) {
             // Construct the cover art URL using the same auth parameters
             const coverUrl = new URL(`${baseUrl}/rest/getCoverArt`);
             coverUrl.searchParams.append("u", config.username);
             coverUrl.searchParams.append("t", hash);
             coverUrl.searchParams.append("s", salt);
             coverUrl.searchParams.append("v", config.apiVersion);
             coverUrl.searchParams.append("c", "MagicMirror");
             coverUrl.searchParams.append("id", entry.coverArt);
             coverUrl.searchParams.append("size", "300");
             
             track = {
               title: entry.title,
               artist: entry.artist,
               album: entry.album,
               coverArt: coverUrl.toString(),
               isStarred: !!entry.starred, // Converts the timestamp string to a boolean true/false
               duration: entry.duration
             };
          }
        }
        this.sendSocketNotification("NOW_PLAYING_DATA", track);
      } else {
         const errorMsg = data["subsonic-response"]?.error?.message || "Unknown API Error";
         this.sendSocketNotification("NOW_PLAYING_ERROR", errorMsg);
      }
    } catch (error) {
      console.error("[MMM-Subsonic] Fetch error:", error);
      this.sendSocketNotification("NOW_PLAYING_ERROR", error.message);
    }
  }
});