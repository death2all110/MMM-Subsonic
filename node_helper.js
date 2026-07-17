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

  // Helper function to manage logging levels cleanly
  log: function(level, message, detail = "") {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = this.configLogLevel || "warn";
    
    // Fallback if an unknown string is provided
    const targetPriority = levels[level] !== undefined ? levels[level] : 2;
    const currentPriority = levels[configLevel] !== undefined ? levels[configLevel] : 2;

    if (targetPriority >= currentPriority) {
      const prefix = `[MMM-Subsonic] [${level.toUpperCase()}]`;
      if (level === "error") {
        console.error(prefix, message, detail);
      } else if (level === "warn") {
        console.warn(prefix, message, detail);
      } else {
        console.log(prefix, message, detail);
      }
    }
  },

  getNowPlaying: async function(config) {
    // Cache the log level onto the module instance for the log helper function
    this.configLogLevel = config.logLevel;

    const salt = crypto.randomBytes(6).toString("hex");
    const hash = crypto.createHash("md5").update(config.password + salt).digest("hex");
    const baseUrl = config.url.replace(/\/$/, "");
    
    const url = new URL(`${baseUrl}/rest/getNowPlaying`);
    url.searchParams.append("u", config.username);
    url.searchParams.append("t", hash);
    url.searchParams.append("s", salt);
    url.searchParams.append("v", config.apiVersion);
    url.searchParams.append("c", "MagicMirror");
    url.searchParams.append("f", "json");

    this.log("debug", `Polling API endpoint: ${baseUrl}/rest/getNowPlaying`);

    try {
      const response = await fetch(url.toString());
      this.log("debug", `HTTP Status received: ${response.status} ${response.statusText}`);
      
      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      const data = await response.json();
      this.log("debug", "Raw Subsonic Response Data:", JSON.stringify(data));
      
      if (data["subsonic-response"] && data["subsonic-response"].status === "ok") {
        const nowPlaying = data["subsonic-response"].nowPlaying;
        let track = null;
        
        if (nowPlaying && nowPlaying.entry) {
          const entries = [].concat(nowPlaying.entry);
          const entry = entries[0]; 
          
          if (entry) {
             this.log("info", `Active track confirmed: "${entry.title}" by ${entry.artist}`);
             
             const coverUrl = new URL(`${baseUrl}/rest/getCoverArt`);
             coverUrl.searchParams.append("u", config.username);
             coverUrl.searchParams.append("t", hash);
             coverUrl.searchParams.append("s", salt);
             coverUrl.searchParams.append("v", config.apiVersion);
             coverUrl.searchParams.append("c", "MagicMirror");
             coverUrl.searchParams.append("id", entry.coverArt);
             coverUrl.searchParams.append("size", "300");
             
             track = {
               id: entry.id,
               title: entry.title,
               artist: entry.artist,
               album: entry.album,
               coverArt: coverUrl.toString(),
               isStarred: !!entry.starred,
               duration: entry.duration,
             };
          }
        } else {
          this.log("debug", "API connection healthy, but no active streams are reporting data.");
        }
        
        this.sendSocketNotification("NOW_PLAYING_DATA", track);
      } else {
         const errorMsg = data["subsonic-response"]?.error?.message || "Unknown API Error";
         this.log("warn", `Subsonic API returned error status: ${errorMsg}`);
         this.sendSocketNotification("NOW_PLAYING_ERROR", errorMsg);
      }
    } catch (error) {
      this.log("error", "Fetch execution critically failed:", error.message);
      this.sendSocketNotification("NOW_PLAYING_ERROR", error.message);
    }
  }
});