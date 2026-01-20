
 
    const playBtn = document.getElementById("playBtn");
    const audio = document.getElementById("audio");
    const progressBar = document.getElementById("progressBar");

    playBtn.addEventListener("click", () => {
      if (audio.paused) {
        audio.play();
        playBtn.textContent = "⏸";
      } else {
        audio.pause();
        playBtn.textContent = "▶";
      }
    });

    audio.addEventListener("timeupdate", () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBar.value = progress || 0;
    });

    progressBar.addEventListener("input", () => {
      const seekTime = (progressBar.value / 100) * audio.duration;
      audio.currentTime = seekTime;
    });

    audio.addEventListener("ended", () => {
      playBtn.textContent = "▶";
      progressBar.value = 0;
    });
 