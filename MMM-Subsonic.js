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

    // Text Info (Green line, Title, Artist)
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

    // Favorites Icon (Heart on the right)
    if (this.trackData.isStarred) {
      const heartIcon = document.createElement("i");
      heartIcon.className = "fas fa-heart favorite-icon"; 
      headerWrapper.appendChild(heartIcon);
    }

    wrapper.appendChild(headerWrapper);

    // --- Bottom Section: Cover Art ---
    const coverWrapper = document.createElement("div");
    coverWrapper.className = "cover-wrapper";
    
    const coverImg = document.createElement("img");
    coverImg.src = this.trackData.coverArt;
    coverImg.className = "cover-img";
    
    coverWrapper.appendChild(coverImg);
    wrapper.appendChild(coverWrapper);

    return wrapper;
  }
});