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
    const salt = crypto.randomBytes(6).toString("hex");
    const hash = crypto.createHash("md5").update(config.password + salt).digest("hex");
    const baseUrl = config.url.replace(/\/$/, "");
    
    // 1. Initial poll to see what is actively playing
    const nowPlayingUrl = new URL(`${baseUrl}/rest/getNowPlaying`);
    nowPlayingUrl.searchParams.append("u", config.username);
    nowPlayingUrl.searchParams.append("t", hash);
    nowPlayingUrl.searchParams.append("s", salt);
    nowPlayingUrl.searchParams.append("v", config.apiVersion);
    nowPlayingUrl.searchParams.append("c", "MagicMirror");
    nowPlayingUrl.searchParams.append("f", "json");

    try {
      const response = await fetch(nowPlayingUrl.toString());
      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      const data = await response.json();
      this.log("debug", "Raw Subsonic Response Data:", JSON.stringify(data));
      
      if (data["subsonic-response"] && data["subsonic-response"].status === "ok") {
        const nowPlaying = data["subsonic-response"].nowPlaying;
        let track = null;
        
        if (nowPlaying && nowPlaying.entry) {
          const entries = [].concat(nowPlaying.entry);
          const entry = entries[0]; 
          
          if (entry && entry.id) {
             // 2. SECONDARY FETCH: Query ground-truth song details to get live 'starred' status
             const songUrl = new URL(`${baseUrl}/rest/getSong`);
             songUrl.searchParams.append("u", config.username);
             songUrl.searchParams.append("t", hash);
             songUrl.searchParams.append("s", salt);
             songUrl.searchParams.append("v", config.apiVersion);
             songUrl.searchParams.append("c", "MagicMirror");
             songUrl.searchParams.append("f", "json");
             songUrl.searchParams.append("id", entry.id); // Query this specific song ID

             let isStarredLive = !!entry.starred; // Fallback to cache
             
             try {
               const songResponse = await fetch(songUrl.toString());
               if (songResponse.ok) {
                 const songData = await songResponse.json();
                 const actualSong = songData["subsonic-response"]?.song;
                 if (actualSong) {
                   // Pull live starred state directly from the DB record
                   isStarredLive = !!actualSong.starred; 
                   this.log("debug", `Live DB Starred Sync for ${entry.title}: ${isStarredLive}`);
                 }
               }
             } catch (e) {
               this.log("warn", "Failed to pull live starred status via getSong, using cache fallback.");
             }

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
               isStarred: isStarredLive, // Uses our verified live state
               duration: entry.duration,
               user: entry.username || null,
               playerName: entry.playerName || null
             };
          }
        }
        
        this.sendSocketNotification("NOW_PLAYING_DATA", track);
      } else {
         const errorMsg = data["subsonic-response"]?.error?.message || "Unknown API Error";
         this.log("warn", `Subsonic API returned a non-OK status: ${errorMsg}`);
         this.sendSocketNotification("NOW_PLAYING_ERROR", errorMsg);
      }
    } catch (error) {
      this.log("error", "Fetch process critically failed:", error.message);
      this.sendSocketNotification("NOW_PLAYING_ERROR", error.message);
    }
  }
});