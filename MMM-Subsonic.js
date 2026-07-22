Module.register("MMM-Subsonic", {
  defaults: {
    url: "",
    username: "",
    password: "",
    updateInterval: 10000,
    apiVersion: "1.16.1",
    logLevel: "warn",
  },

  start: function() {
    this.trackData = null;
    this.error = null;
    this.songStartTime = null;
    this.elapsedSeconds = 0;

    // Fetch data from API every 10 seconds
    this.getData();
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

  },

  getData: function() {
    if (this.config.url && this.config.username && this.config.password) {
       this.sendSocketNotification("GET_NOW_PLAYING", this.config);
    } else {
       this.error = "Missing config parameters";
       this.updateDom();
    }
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "NOW_PLAYING_DATA") {
      // DEBUG LOG: This will let you expand the raw track data in your browser dev tools
      console.debug("[MMM-Subsonic] Received payload:", payload);

      if (payload) {
        this.trackData = payload;
        this.error = null;
      } else {
        // If payload is null, it means the backend connected successfully but nothing is playing
        this.trackData = null;
      }
      this.updateDom();
    } else if (notification === "NOW_PLAYING_ERROR") {
      console.error("[MMM-Subsonic] Backend error:", payload);
      this.error = payload;
      this.updateDom();
    }
  },

  getStyles: function() {
    return ["MMM-Subsonic.css"];
  },

  formatTime: function(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  getDom: function() {
    const wrapper = document.createElement("div");

    if (this.error) {
      wrapper.className = "subsonic-card nothing-playing dimmed small";
      wrapper.innerHTML = "Subsonic Error: " + this.error;
      return wrapper;
    }

    if (!this.trackData) {
      wrapper.className = "subsonic-card nothing-playing dimmed small";
      wrapper.innerHTML = "Nothing playing";
      return wrapper;
    }

    wrapper.className = "subsonic-card";

    // --- Top Section: Header ---
    const headerWrapper = document.createElement("div");
    headerWrapper.className = "header-wrapper";

    const infoWrapper = document.createElement("div");
    infoWrapper.className = "info-wrapper";

    const title = document.createElement("div");
    title.className = "track-title bright";
    title.innerHTML = this.trackData.title;
    infoWrapper.appendChild(title);

    const artist = document.createElement("div");
    artist.className = "track-artist normal small";
    artist.innerHTML = this.trackData.artist;
    infoWrapper.appendChild(artist);

    headerWrapper.appendChild(infoWrapper);

    if (this.trackData.isStarred) {
      const heartIcon = document.createElement("i");
      heartIcon.className = "fas fa-heart favorite-icon";
      headerWrapper.appendChild(heartIcon);
    }

    wrapper.appendChild(headerWrapper);

    // --- Middle Section: Cover Art ---
    const coverWrapper = document.createElement("div");
    coverWrapper.className = "cover-wrapper";
    const coverImg = document.createElement("img");
    coverImg.src = this.trackData.coverArt;
    coverImg.className = "cover-img";
    coverWrapper.appendChild(coverImg);
    wrapper.appendChild(coverWrapper);

   // --- Bottom Section: Footer (Duration, User, & Player) ---
    if (this.trackData.duration || this.trackData.user || this.trackData.playerName) {
      const footerWrapper = document.createElement("div");
      footerWrapper.className = "footer-wrapper";

      // Left side: Duration
      if (this.trackData.duration) {
        const totalDuration = document.createElement("div");
        totalDuration.className = "time-text";

        const clockIcon = document.createElement("i");
        clockIcon.className = "far fa-clock";
        clockIcon.style.marginRight = "6px";

        const timeText = document.createTextNode(this.formatTime(this.trackData.duration));

        totalDuration.appendChild(clockIcon);
        totalDuration.appendChild(timeText);
        footerWrapper.appendChild(totalDuration);
      }

      // Right side container: User + Player Name
      if (this.trackData.user || this.trackData.playerName) {
        const clientWrapper = document.createElement("div");
        clientWrapper.className = "client-wrapper";

        if (this.trackData.user) {
          const userText = document.createElement("span");
          userText.className = "user-text";

          const userIcon = document.createElement("i");
          userIcon.className = "fas fa-user";
          userIcon.style.marginRight = "5px";

          userText.appendChild(userIcon);
          userText.appendChild(document.createTextNode(this.trackData.user));
          clientWrapper.appendChild(userText);
        }

        // Add player name (with a separator dot if user is also present)
        if (this.trackData.playerName) {
          if (this.trackData.user) {
            const separator = document.createElement("span");
            separator.className = "client-separator";
            separator.innerHTML = "•";
            clientWrapper.appendChild(separator);
          }

          const playerText = document.createElement("span");
          playerText.className = "player-text";
          playerText.appendChild(document.createTextNode(this.trackData.playerName));
          clientWrapper.appendChild(playerText);
        }

        footerWrapper.appendChild(clientWrapper);
      }

      wrapper.appendChild(footerWrapper);
    }

    return wrapper;
  }
});
