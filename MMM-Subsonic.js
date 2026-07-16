Module.register("MMM-Subsonic", {
  defaults: {
    url: "",          // e.g., "http://192.168.1.100:4533"
    username: "",
    password: "",
    updateInterval: 10000, // Check every 10 seconds
    apiVersion: "1.16.1",
  },

  start: function() {
    this.trackData = null;
    this.error = null;
    
    // Kick off the initial data fetch
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
      this.trackData = payload;
      this.error = null;
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
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  getDom: function() {
    const wrapper = document.createElement("div");

    if (this.error) {
      wrapper.className = "subsonic-wrapper nothing-playing dimmed small";
      wrapper.innerHTML = "Subsonic Error: " + this.error;
      return wrapper;
    }

    if (!this.trackData) {
      wrapper.className = "subsonic-wrapper nothing-playing dimmed small";
      wrapper.innerHTML = "Nothing playing";
      return wrapper;
    }

    wrapper.className = "subsonic-wrapper";

    // Cover Art
    const coverWrapper = document.createElement("div");
    coverWrapper.className = "cover-wrapper";
    const coverImg = document.createElement("img");
    coverImg.src = this.trackData.coverArt;
    coverImg.className = "cover-img";
    coverWrapper.appendChild(coverImg);
    wrapper.appendChild(coverWrapper);

    // Track Details
    const detailsWrapper = document.createElement("div");
    detailsWrapper.className = "details-wrapper";

    const title = document.createElement("div");
    title.className = "track-title bright medium";
    // Inject a star if the track is favorited
    if (this.trackData.isStarred) {
      const starIcon = document.createElement("i");
      starIcon.className = "fas fa-heart"; // You can change this to "fas fa-heart" if you prefer
      starIcon.style.marginRight = "8px";
      starIcon.style.color = "pink"; // Optional: gives it a golden color
      title.appendChild(starIcon);
    }

    // Append the actual track title
    const titleText = document.createTextNode(this.trackData.title);
    title.appendChild(titleText);
    detailsWrapper.appendChild(title);

    const artist = document.createElement("div");
    artist.className = "track-artist normal small";
    artist.innerHTML = this.trackData.artist;
    detailsWrapper.appendChild(artist);

    if (this.trackData.duration) {
      const durationDiv = document.createElement("div");
      durationDiv.className = "track-duration dimmed xsmall";
      durationDiv.style.marginTop = "4px";
      
      // Adds a small FontAwesome clock icon next to the time
      const clockIcon = document.createElement("i");
      clockIcon.className = "far fa-clock";
      clockIcon.style.marginRight = "6px";
      
      const timeText = document.createTextNode(this.formatTime(this.trackData.duration));
      
      durationDiv.appendChild(clockIcon);
      durationDiv.appendChild(timeText);
      detailsWrapper.appendChild(durationDiv);
    }
    
    wrapper.appendChild(detailsWrapper);

    return wrapper;
  }
});