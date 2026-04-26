/**
 * Wolfdragon Audio Player
 * Loads albums from /api/albums, falls back to /api/tracks then DEMO_TRACKS.
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

  // Album header elements
  const albumHeader    = document.getElementById('player-album-header');
  const albumArt       = document.getElementById('player-album-art');
  const albumTitleEl   = document.getElementById('player-album-title');
  const albumYearEl    = document.getElementById('player-album-year');
  const otherSection   = document.getElementById('other-albums-section');
  const otherGrid      = document.getElementById('other-albums-grid');

  let tracks       = [];
  let currentIndex = 0;
  let albums       = [];
  let activeAlbum  = null;

  // Demo tracks shown when DB has no entries yet
  const DEMO_TRACKS = [
    { id: 1, title: 'Track 01 — TBA', filename: '' },
    { id: 2, title: 'Track 02 — TBA', filename: '' },
    { id: 3, title: 'Track 03 — TBA', filename: '' },
  ];

  // ── URL resolution ────────────────────────────────────────────────────────
  function trackUrl(t) {
    if (t.audio_file_id) return '/api/audio/' + t.audio_file_id;
    if (t.filename)      return '/audio/' + t.filename;
    return '';
  }

  // ── Load from API ─────────────────────────────────────────────────────────
  async function init() {
    try {
      const res  = await fetch('/api/albums');
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        albums = data;
        const featured = albums.find(a => a.is_featured) || albums[0];
        setActiveAlbum(featured);
        return;
      }
    } catch (_) {}

    // Fallback: flat track list
    if (albumHeader)  albumHeader.style.display  = 'none';
    if (otherSection) otherSection.style.display = 'none';
    try {
      const res  = await fetch('/api/tracks');
      const data = await res.json();
      tracks = data.length ? data : DEMO_TRACKS;
    } catch (_) {
      tracks = DEMO_TRACKS;
    }
    renderTrackList();
    if (tracks[0] && trackUrl(tracks[0])) loadTrack(0);
  }

  // ── Set active album ──────────────────────────────────────────────────────
  function setActiveAlbum(album) {
    activeAlbum = album;
    tracks = album.tracks || [];

    if (albumTitleEl) albumTitleEl.textContent = album.title || '';
    if (albumYearEl)  albumYearEl.textContent  = album.year  || '';
    if (albumArt)     albumArt.src = album.cover_data || 'images/album-placeholder.jpg';
    if (albumHeader)  albumHeader.style.display = '';

    currentIndex = 0;
    renderTrackList();
    renderOtherAlbums();
    if (tracks[0] && trackUrl(tracks[0])) {
      loadTrack(0);
    } else if (tracks[0]) {
      // Track exists but has no audio — still display it
      loadTrack(0);
    }
  }

  // ── Render other albums grid ───────────────────────────────────────────────
  function renderOtherAlbums() {
    if (!otherSection || !otherGrid) return;
    const others = albums
      .filter(a => a.id !== (activeAlbum && activeAlbum.id))
      .sort((a, b) => {
        if (b.is_featured !== a.is_featured) return b.is_featured ? 1 : -1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

    if (!others.length) {
      otherSection.style.display = 'none';
      return;
    }

    otherSection.style.display = 'block';
    otherGrid.innerHTML = '';
    others.forEach(function(album) {
      const card = document.createElement('div');
      card.className = 'other-album-card';

      const img = document.createElement('img');
      img.src = album.cover_data || 'images/album-placeholder.jpg';
      img.alt = album.title;

      const name = document.createElement('div');
      name.className = 'other-album-name';
      name.textContent = album.title;

      const year = document.createElement('div');
      year.className = 'other-album-year';
      year.textContent = album.year || '';

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(year);

      card.addEventListener('click', function() {
        audio.pause();
        setActiveAlbum(album);
      });

      otherGrid.appendChild(card);
    });
  }

  // ── Render track list ──────────────────────────────────────────────────────
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

  // ── Load a track by index ──────────────────────────────────────────────────
  function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;
    currentIndex = index;

    const url = trackUrl(track);
    if (url) {
      audio.src = url;
      audio.load();
    } else {
      audio.src = '';
    }

    nowPlaying.textContent = track.title;
    updateActiveClass();
  }

  function selectTrack(index) {
    loadTrack(index);
    const url = trackUrl(tracks[index]);
    if (url) {
      audio.play().catch(() => {});
    }
  }

  // ── Update active highlight ────────────────────────────────────────────────
  function updateActiveClass() {
    document.querySelectorAll('.track-item').forEach((el, i) => {
      el.classList.toggle('active', i === currentIndex);
    });
  }

  // ── Controls ───────────────────────────────────────────────────────────────
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
  audio.addEventListener('play', () => {
    btnPlay.innerHTML = '&#10074;&#10074;';
    btnPlay.classList.add('playing');
  });
  audio.addEventListener('pause', () => {
    btnPlay.innerHTML = '&#9654;';
    btnPlay.classList.remove('playing');
  });

  // ── Progress bar ───────────────────────────────────────────────────────────
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

  // ── Volume ─────────────────────────────────────────────────────────────────
  audio.volume = 0.8;
  volumeBar.addEventListener('input', () => {
    audio.volume = volumeBar.value / 100;
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  init();
})();
