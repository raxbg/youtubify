document.addEventListener("DOMContentLoaded", function() {
  var bg = chrome.extension.getBackgroundPage();
  var player = bg ? bg.player : null

  if (player) {
    var YT = bg.YT;
    var durationSlider = document.getElementById("durationSlider");
    var previousButton = document.getElementById("previousBtn");
    var playPauseButton = document.getElementById("playPauseBtn");
    var nextButton = document.getElementById("nextBtn");
    var searchBar = document.getElementById("searchBar");
    var searchResults = document.getElementById("searchResults");

    var playlistRaw = null;
    var playlist = localStorage.getItem("playlist") ? JSON.parse(localStorage.getItem("playlist")) : [];
    var lastVideoId = localStorage.getItem("lastVideoId") ? localStorage.getItem("lastVideoId") : "";

    var setPlayPauseBtnText = function () {
      switch (player.getPlayerState()) {
        case YT.PlayerState.PLAYING:
        case YT.PlayerState.BUFFERING:
          playPauseButton.innerText = "Pause";
          break;
        default:
          playPauseButton.innerText = "Play";
          break;
      }
    }

    var fetchJSON = function (path, callback) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
          if (httpRequest.status === 200) {
            var data = JSON.parse(httpRequest.responseText);
            if (callback) callback(data);
          }
        }
      };
      httpRequest.open('GET', path);
      httpRequest.send();
    }

    var loadVideoIdInfo = function (videoId, callback) {
      var dataUrl = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + videoId;
      fetchJSON(dataUrl, function(json) {
        json.videoId = videoId;
        callback(json);
      });
    }

    var clearPlaylist = function() {
      var items = searchResults.querySelectorAll("li");
      var item;
      for (var x = 0; x < items.length; x++) {
        item = items[x];
        item.remove();
      }
    }

    var reloadPlaylist = function() {
      clearPlaylist();
      var item;
      for (var x = 0; x < playlist.length; x++) {
        item = playlist[x];
        var li = document.createElement("li");
        li.innerText = item.title;
        li.videoId = item.videoId;

        if (item.videoId == lastVideoId) {
          li.className = "active";
        }

        searchResults.appendChild(li);
      }
    }

    var refreshPlaylist = function() {
      playlistRaw = player.getPlaylist();

      clearPlaylist();

      if (playlistRaw) {
        //display loader probably
        for (var x = 0; x < playlistRaw.length; x++) {
          var videoId = playlistRaw[x];
          loadVideoIdInfo(videoId, function(info) {
            playlist.push(info)
            localStorage.setItem("playlist", JSON.stringify(playlist));
            reloadPlaylist();
          });
        }
      }
    }

    var updatePlayerControls = function() {
      durationSlider.min = 0;
      durationSlider.max = player.getDuration();
      durationSlider.value = player.getCurrentTime();

      durationSlider.addEventListener("change", function(e) {
        player.seekTo(durationSlider.value, true);
      });

      setPlayPauseBtnText();

      if (player.getPlayerState() == YT.PlayerState.CUED && !playlistRaw) {
        refreshPlaylist();
      }
    }

    updatePlayerControls();
    setInterval(updatePlayerControls, 1000);

    if (playlist.length) {
      reloadPlaylist();
    }

    previousButton.addEventListener("click", function(e) {
      player.previousVideo();
    });

    playPauseButton.addEventListener("click", function(e) {
      var state = player.getPlayerState();

      switch (player.getPlayerState()) {
        case YT.PlayerState.PLAYING:
        case YT.PlayerState.BUFFERING:
          player.pauseVideo();
          break;
        default:
          player.playVideo();
          break;
      }
    });

    nextButton.addEventListener("click", function(e) {
      player.nextVideo();
    });

    searchBar.addEventListener("keyup", function(e) {
      if (e.keyCode == 13) {
        playlistRaw = null;
        playlist = [];
        localStorage.setItem('playlist', JSON.stringify(playlist));

        player.cuePlaylist({
          listType: "search",
          list: searchBar.value
        });
      }
    });

    searchResults.addEventListener("click", function(e) {
      var activeElement = searchResults.querySelector(".active");
      if (activeElement) {
        activeElement.className = "";
      }

      e.target.className = "active";
      player.loadVideoById(e.target.videoId);
      localStorage.setItem("lastVideoId", e.target.videoId);
    });
  }
});
