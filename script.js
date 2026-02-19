document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio();
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const seekBar = document.getElementById('seek-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    const volumeBar = document.getElementById('volume-bar');
    const albumArt = document.getElementById('album-art');
    const trackTitle = document.getElementById('track-title');
    const artistName = document.getElementById('artist-name');
    const backgroundBlur = document.getElementById('background-blur');
    const genreSelect = document.getElementById('genre-select');

    let isPlaying = false;
    let currentTrackIndex = 0;
    let tracks = [];
    let filteredTracks = [];

    const API_URL = './songs.json';

    // Fetch tracks
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            tracks = data;
            filteredTracks = tracks; // Initially all tracks
            populateGenres();
            loadTrack(currentTrackIndex);
        })
        .catch(error => {
            console.error('Error fetching tracks:', error);
            trackTitle.textContent = 'Error loading tracks';
        });

    function populateGenres() {
        const genres = new Set(tracks.map(track => track.genre).filter(g => g));
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
            genreSelect.appendChild(option);
        });
    }

    // Genre filter event listener
    genreSelect.addEventListener('change', () => {
        const selectedGenre = genreSelect.value;
        if (selectedGenre === 'all') {
            filteredTracks = tracks;
        } else {
            filteredTracks = tracks.filter(track => track.genre === selectedGenre);
        }

        currentTrackIndex = 0; // Reset to first track of new filter
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play().catch(e => console.error("Playback failed:", e));
        }
    });

    function loadTrack(index) {
        if (filteredTracks.length === 0) return;

        // Ensure index is within bounds (safety check)
        if (index >= filteredTracks.length) index = 0;

        const track = filteredTracks[index];
        audio.src = track.url;
        trackTitle.textContent = track.title;
        artistName.textContent = track.artist;
        albumArt.src = track.albumArtUrl;

        // Update background
        backgroundBlur.style.backgroundImage = `url('${track.albumArtUrl}')`;

        // Reset player state
        seekBar.value = 0;
        currentTimeEl.textContent = '0:00';
        totalDurationEl.textContent = '0:00'; // Will update on metadata load

        if (isPlaying) {
            audio.play().catch(e => console.error("Playback failed:", e));
        }
    }

    function togglePlay() {
        if (isPlaying) {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audio.play().catch(e => console.error("Playback failed:", e));
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    }

    function playNext() {
        currentTrackIndex = (currentTrackIndex + 1) % filteredTracks.length;
        loadTrack(currentTrackIndex);
        if (!isPlaying) {
            togglePlay();
        }
    }

    function playPrev() {
        currentTrackIndex = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length;
        loadTrack(currentTrackIndex);
        if (!isPlaying) {
            togglePlay();
        }
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // Event Listeners
    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    audio.addEventListener('timeupdate', () => {
        if (!isNaN(audio.duration)) {
            const progress = (audio.currentTime / audio.duration) * 100;
            seekBar.value = audio.currentTime;
            seekBar.max = audio.duration;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        totalDurationEl.textContent = formatTime(audio.duration);
        seekBar.max = audio.duration;
    });

    audio.addEventListener('ended', playNext);

    seekBar.addEventListener('input', () => {
        audio.currentTime = seekBar.value;
    });

    volumeBar.addEventListener('input', (e) => {
        audio.volume = e.target.value;
    });

    // Make album art rotate or some visual effect if playing?
    // Let's keep it simple for now as requested.
});
