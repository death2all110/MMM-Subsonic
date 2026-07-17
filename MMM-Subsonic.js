Module.register("MMM-Subsonic", {
  defaults: {
    url: "",
    username: "",
    password: "",
    updateInterval: 10000,
    apiVersion: "1.16.1",
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

    // Local loop to update the timer every 1 second
    setInterval(() => {
      if (this.trackData && this.songStartTime) {
        this.elapsedSeconds = Math.floor((Date.now() - this.songStartTime) / 1000);
        // Cap the timer so it doesn't exceed the track duration
        if (this.elapsedSeconds > this.trackData.duration) {
            this.elapsedSeconds = this.trackData.duration;
        }
        this.updateDom();
      }
    }, 1000);
  },

  getData: function() {
    if (this.config.url && this.config.username && this.config.password) {
       this.sendSocketNotification("GET_NOW_PLAYING", this.config);
    } else {
       this.error = "Missing config parameters";
       this.updateDom();
    }
  },

  ssocketNotificationReceived: function(notification, payload) {
    if (notification === "NOW_PLAYING_DATA") {
      this.trackData = payload;
      this.error = null;
      
      // Sync the local UI timer with the server's reported position.
      // We push the "songStartTime" backwards in time by the elapsed seconds
      // so the 1-second interval loop ticks smoothly from the correct spot.
      this.elapsedSeconds = payload.position || 0;
      this.songStartTime = Date.now() - (this.elapsedSeconds * 1000);

      this.updateDom();
    } else if (notification === "NOW_PLAYING_ERROR") {
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

   // --- Bottom Section: Timers ---
    if (this.trackData.duration) {
      const remainingSeconds = this.trackData.duration - this.elapsedSeconds;

      const timeWrapper = document.createElement("div");
      timeWrapper.className = "time-wrapper";

      const totalDuration = document.createElement("div");
      totalDuration.className = "time-text";
      totalDuration.innerHTML = this.formatTime(this.trackData.duration);
      timeWrapper.appendChild(totalDuration);

      const timeRemaining = document.createElement("div");
      timeRemaining.className = "time-text";
      timeRemaining.innerHTML = `-${this.formatTime(remainingSeconds)}`;
      timeWrapper.appendChild(timeRemaining);

      wrapper.appendChild(timeWrapper);
    }

    return wrapper;
  }
});
