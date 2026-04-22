/**
 * Wolfdragon Audio Player
 * Loads tracks from /api/tracks, falls back to demo tracks if DB is empty.
 */

(function () {
  const audio       = document.getElementById('audio-player');
  const trackList   = document.getElementById('track-list');
  const btnPlay     = document.getElementById('btn-play');
  const btnPrev     = document.getElementById('btn-prev');
  const btnNext     = document.getElementById('btn-next');
  const progressBar = document.getElementById('progress-bar');
  const volumeBar   = document.getElementById('volume-bar');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal   = document.getElementById('time-total');
  const nowPlaying  = document.getElementById('now-playing-title');

  let tracks       = [];
  let currentIndex = 0;

  // Demo tracks shown when DB has no entries yet
  const DEMO_TRACKS = [
    { id: 1, title: 'Track 01 — TBA', filename: '' },
    { id: 2, title: 'Track 02 — TBA', filename: '' },
    { id: 3, title: 'Track 03 — TBA', filename: '' },
  ];

  // ── Load tracks from API ──────────────────────────────────────────────────
  async function loadTracks() {
    try {
      const res  = await fetch('/api/tracks');
      const data = await res.json();
      tracks = data.length ? data : DEMO_TRACKS;
    } catch (_) {
      tracks = DEMO_TRACKS;
    }
    renderTrackList();
    if (tracks[0] && tracks[0].filename) loadTrack(0);
  }

  // ── Render track list ─────────────────────────────────────────────────────
  function renderTrackList() {
    trackList.innerHTML = '';
    if (!tracks.length) {
      trackList.innerHTML = '<div class="track-loading">No tracks yet — check back soon.</div>';
      return;
    }
    tracks.forEach((track, i) => {
      const item = document.createElement('div');
      item.className = 'track-item' + (i === currentIndex ? ' active' : '');
      item.innerHTML = `
        <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="track-title-text">${track.title}</span>
      `;
      item.addEventListener('click', () => selectTrack(i));
      trackList.appendChild(item);
    });
  }

  // ── Load a track by index ─────────────────────────────────────────────────
  function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;
    currentIndex = index;

    if (track.filename) {
      audio.src = '/audio/' + track.filename;
      audio.load();
    } else {
      audio.src = '';
    }

    nowPlaying.textContent = track.title;
    updateActiveClass();
  }

  function selectTrack(index) {
    loadTrack(index);
    if (tracks[index] && tracks[index].filename) {
      audio.play().catch(() => {});
    }
  }

  // ── Update active highlight ───────────────────────────────────────────────
  function updateActiveClass() {
    document.querySelectorAll('.track-item').forEach((el, i) => {
      el.classList.toggle('active', i === currentIndex);
    });
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  btnPlay.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      const prev = (currentIndex - 1 + tracks.length) % tracks.length;
      selectTrack(prev);
    }
  });

  btnNext.addEventListener('click', () => {
    const next = (currentIndex + 1) % tracks.length;
    selectTrack(next);
  });

  // Auto-advance
  audio.addEventListener('ended', () => {
    const next = (currentIndex + 1) % tracks.length;
    selectTrack(next);
  });

  // Play/pause icon
  audio.addEventListener('play',  () => {
    btnPlay.innerHTML = '&#10074;&#10074;';
    btnPlay.classList.add('playing');
  });
  audio.addEventListener('pause', () => {
    btnPlay.innerHTML = '&#9654;';
    btnPlay.classList.remove('playing');
  });

  // ── Progress bar ──────────────────────────────────────────────────────────
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    timeCurrent.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration);
  });

  progressBar.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  // ── Volume ────────────────────────────────────────────────────────────────
  audio.volume = 0.8;
  volumeBar.addEventListener('input', () => {
    audio.volume = volumeBar.value / 100;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  loadTracks();
})();
