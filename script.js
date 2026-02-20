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
    const gradientContainer = document.getElementById('gradient-container');
    const backgroundBlur = document.getElementById('background-blur');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const gradientToggle = document.getElementById('gradient-toggle');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const trackNumberOverlay = document.getElementById('track-number-overlay');

    let isPlaying = false;
    let currentTrackIndex = 0;
    let tracks = [];
    let filteredTracks = [];
    let isShuffle = false;
    let repeatMode = 'all'; // 'all', 'one', 'off'
    let playHistory = [];

    // Load gradient preference from cache or default to false
    const GRADIENT_PREF_KEY = 'ambient_gradient_preference';
    let cachedGradientPref = localStorage.getItem(GRADIENT_PREF_KEY);
    let isGradientEnabled = cachedGradientPref === null ? false : cachedGradientPref === 'true';

    // Set initial UI state for gradient toggle switch
    gradientToggle.checked = isGradientEnabled;

    // Set initial repeat state
    repeatBtn.classList.add('active');

    const API_URL = './songs.json';
    const REMOTE_API_URL = 'https://www.ambient-music.online/songs.json';
    const CACHE_KEY = 'ambient_songs_cache';

    async function fetchTracks() {
        try {
            // Try fetching from remote first
            constresponse = await fetch(REMOTE_API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            // Update cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));

            initPlayer(data);
            console.log('Loaded from Remote');
        } catch (error) {
            console.warn('Remote fetch failed, checking cache...', error);

            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                initPlayer(JSON.parse(cachedData));
                console.log('Loaded from Cache');
                // Optional: Notify user they are offline/using cache?
            } else {
                console.warn('No cache found, falling back to local file...');
                try {
                    const response = await fetch(API_URL);
                    const data = await response.json();
                    initPlayer(data);
                    console.log('Loaded from Local File');
                } catch (localError) {
                    console.error('Critical: Failed to load tracks from any source', localError);
                    trackTitle.textContent = 'Error loading tracks';
                }
            }
        }
    }

    function initPlayer(data) {
        tracks = data;
        filteredTracks = tracks; // Initially all tracks
        populateGenres();
        loadTrack(currentTrackIndex);
    }

    // Start initialization
    fetchTracks();

    const customSelect = document.getElementById('custom-genre-select');
    const customOptions = document.querySelector('.custom-options');
    const triggerText = document.getElementById('trigger-text');

    function populateGenres() {
        const genres = new Set(tracks.map(track => track.genre).filter(g => g));

        // Clear existing options
        customOptions.innerHTML = '';

        // Add "All Genres" option
        addCustomOption('All Genres', 'all', true);

        // Add other genres
        genres.forEach(genre => {
            const displayGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
            addCustomOption(displayGenre, genre, false);
        });
    }

    function addCustomOption(text, value, isSelected) {
        const option = document.createElement('div');
        option.classList.add('custom-option');
        if (isSelected) option.classList.add('selected');
        option.textContent = text;
        option.dataset.value = value;

        option.addEventListener('click', () => {
            selectGenre(value, text);
        });

        customOptions.appendChild(option);
    }

    function selectGenre(value, text) {
        // Update UI
        triggerText.textContent = text;

        // Update styling of selected option
        const options = document.querySelectorAll('.custom-option');
        options.forEach(opt => {
            if (opt.dataset.value === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });

        // Close dropdown
        customSelect.classList.remove('open');

        // Reset history when changing list context
        playHistory = [];

        // Filter tracks
        if (value === 'all') {
            filteredTracks = tracks;
        } else {
            filteredTracks = tracks.filter(track => track.genre === value);
        }

        currentTrackIndex = 0;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play().catch(e => console.error("Playback failed:", e));
        }
    }

    // Toggle dropdown open/close
    customSelect.addEventListener('click', (e) => {
        if (e.target.closest('.custom-select-trigger')) {
            customSelect.classList.toggle('open');
        }
    });

    // Open settings modal
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('open');
    });

    // Close settings modal
    closeSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('open');
    });

    // Close settings modal on backdrop click
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('open');
        }
    });

    // Toggle background state
    gradientToggle.addEventListener('change', (e) => {
        isGradientEnabled = e.target.checked;
        localStorage.setItem(GRADIENT_PREF_KEY, isGradientEnabled);
        updateBackgroundState();
    });

    function updateBackgroundState() {
        if (isGradientEnabled) {
            backgroundBlur.classList.remove('active');
            gradientContainer.classList.add('active');
        } else {
            backgroundBlur.classList.add('active');
            gradientContainer.classList.remove('active');
        }
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
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

        // Update blur background (even if hidden, keep it synced)
        backgroundBlur.style.backgroundImage = `url('${track.albumArtUrl}')`;

        // Update flowing gradient background
        const palettes = [
            ['#ff9a9e', '#fecfef', '#a1c4fd', '#c2e9fb'],
            ['#a18cd1', '#fbc2eb', '#fad0c4', '#ffd1ff'],
            ['#84fab0', '#8fd3f4', '#a6c0fe', '#f68084'],
            ['#e0c3fc', '#8ec5fc', '#9face6', '#74ebd5'],
            ['#fccb90', '#d57eeb', '#e0c3fc', '#8ec5fc'],
            ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
            ['#fa709a', '#fee140', '#f6d365', '#fda085']
        ];
        const palette = palettes[index % palettes.length];
        const newGradient = `linear-gradient(-45deg, ${palette[0]}, ${palette[1]}, ${palette[2]}, ${palette[3]})`;

        const newBg = document.createElement('div');
        newBg.className = 'background-gradient';
        newBg.style.backgroundImage = newGradient;
        newBg.style.backgroundSize = '400% 400%';
        gradientContainer.appendChild(newBg);

        // Force reflow to ensure the initial state is rendered before adding the transition class
        newBg.offsetWidth;
        newBg.classList.add('active');

        // Remove older gradients after the fade transition completes (3s)
        setTimeout(() => {
            while (newBg.previousElementSibling) {
                newBg.previousElementSibling.remove();
            }
        }, 3000);

        // Apply container active classes based on user settings
        updateBackgroundState();

        // Update hover overlay
        trackNumberOverlay.textContent = `Track ${index + 1}`;

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

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }

    function toggleRepeat() {
        if (repeatMode === 'all') {
            repeatMode = 'one';
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i> 1'; // Indicate repeat one
            repeatBtn.classList.add('active');
        } else if (repeatMode === 'one') {
            repeatMode = 'off';
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            repeatBtn.classList.remove('active');
        } else {
            repeatMode = 'all';
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            repeatBtn.classList.add('active');
        }
    }

    function playNext() {
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(e => console.error(e));
            return;
        }

        // Add current track to history before moving on
        playHistory.push(currentTrackIndex);
        // Limit history size to avoid memory issues (though unlikely with simple ints)
        if (playHistory.length > 50) playHistory.shift();

        if (isShuffle) {
            let randomIndex = Math.floor(Math.random() * filteredTracks.length);
            // Optional: avoid repeating same track immediately if list > 1
            while (randomIndex === currentTrackIndex && filteredTracks.length > 1) {
                randomIndex = Math.floor(Math.random() * filteredTracks.length);
            }
            currentTrackIndex = randomIndex;
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % filteredTracks.length;
        }

        loadTrack(currentTrackIndex);
        if (!isPlaying) {
            togglePlay();
        }
    }

    function playPrev() {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        if (isShuffle) {
            // In shuffle, prev usually goes to history, but for simple implementation random or just basic prev is fine.
            // Let's stick to random for consistency or sequential? Standard behavior is History.
            // For this simpler app, let's just do random or basic prev. 
            // Let's do Standard Prev: (index - 1).
            // Actually, if we are in shuffle mode, "Previous" usually just restarts track or goes to previous played.
            // Let's keep it simple: just go to previous index in the filtered list.
            currentTrackIndex = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length;
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length;
        }

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
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);

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

    audio.addEventListener('ended', () => {
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(e => console.error(e));
        } else if (repeatMode === 'off') {
            // Check if we are at the end
            if (currentTrackIndex < filteredTracks.length - 1) {
                // Not end, go next
                currentTrackIndex++;
                loadTrack(currentTrackIndex);
                audio.play();
            } else {
                // End of playlist, stop
                isPlaying = false;
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        } else {
            // Repeat All (default)
            playNext();
        }
    });

    seekBar.addEventListener('input', () => {
        audio.currentTime = seekBar.value;
    });

    volumeBar.addEventListener('input', (e) => {
        audio.volume = e.target.value;
    });

    // Set dynamic year for copyright
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // Make album art rotate or some visual effect if playing?
    // Let's keep it simple for now as requested.
});
