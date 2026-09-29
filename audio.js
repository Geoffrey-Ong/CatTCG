// Loaded on every page; builds its own volume control under the header.
// Browsers stop audio on navigation, so instead of one unbroken track,
// each page saves the song's position/settings to localStorage as you
// leave, and the next page resumes from that spot (a brief blip, not a
// restart, during navigation).

const AUDIO_CONFIG = {
    musicSrc: "sfx/bg_music.mp3",
    battleMusicSrc: "sfx/battle_music.mp3",
    defaultMusicVolume: 0.3,
    sfxVolume: 1,

    pullSfx: {
        common: "sfx/common_rare.mp3",
        uncommon: "sfx/common_rare.mp3",
        rare: "sfx/common_rare.mp3",
        epic: "sfx/epic_legendary.mp3",
        legendary: "sfx/epic_legendary.mp3",
    },

    battleSfx: {
        click: "sfx/click_sound.mp3",
        heal: "sfx/heal.mp3",
        attackUtility: "sfx/attackutility_sound.mp3",
        victory: "sfx/victory.mp3",
    },

    // If the previous page saved its position less than this long ago (ms),
    // assume we just navigated and skip ahead to cover the page load.
    resumeWindowMs: 10000,
};

const AUDIO_STORAGE_KEY = "catTCG_audio";

function readAudioSettings() {
    const defaults = {
        volume: AUDIO_CONFIG.defaultMusicVolume,
        muted: false,
        playing: false,
        musicTime: 0,
        savedAt: 0,
    };

    try {
        const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (error) {
        console.error("Could not read audio settings from localStorage:", error);
        return defaults;
    }
}

function writeAudioSettings() {
    try {
        localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({
            volume: audioSettings.volume,
            muted: audioSettings.muted,
            playing: musicStarted && !bgMusic.paused,
            musicTime: bgMusic.readyState >= 1 ? bgMusic.currentTime : initialResumeTime,
            savedAt: Date.now(),
        }));
    } catch (error) {
        console.error("Could not save audio settings to localStorage:", error);
    }
}

function getResumeTime() {
    const saved = readAudioSettings();
    const elapsedMs = Date.now() - saved.savedAt;
    const skipAhead = saved.playing && elapsedMs >= 0 && elapsedMs < AUDIO_CONFIG.resumeWindowMs
        ? elapsedMs / 1000
        : 0;
    return (Number(saved.musicTime) || 0) + skipAhead;
}

const audioSettings = readAudioSettings();
const initialResumeTime = getResumeTime();

const bgMusic = new Audio(AUDIO_CONFIG.musicSrc);
bgMusic.loop = true;
bgMusic.preload = "auto";
bgMusic.currentTime = initialResumeTime;

// Safety net for browsers that ignore the pre-load start position, and for
// positions past the end of the track.
bgMusic.addEventListener("loadedmetadata", () => {
    if (!isFinite(bgMusic.duration) || bgMusic.duration <= 0) return;
    const target = initialResumeTime % bgMusic.duration;
    if (Math.abs(bgMusic.currentTime - target) > 0.5) {
        bgMusic.currentTime = target;
    }
});

let musicStarted = false;

// Browsers block sound until the visitor interacts with the page, so a
// fresh visit's first attempt usually fails; when it does, show a hint and
// start on the first click/tap/key press instead.
async function startMusic() {
    try {
        await bgMusic.play();
        musicStarted = true;
        setMusicHint(false);
        removeGestureListeners();
    } catch (error) {
        if (error.name === "NotAllowedError") {
            setMusicHint(true);
            addGestureListeners();
        } else {
            console.error("Could not play background music:", error);
        }
    }
}

const GESTURE_EVENTS = ["pointerdown", "pointerup", "keydown", "touchend"];

function onFirstGesture(event) {
    if (event.target.closest && event.target.closest("#musicToggle")) return;
    startMusic();
}

function addGestureListeners() {
    GESTURE_EVENTS.forEach((type) => document.addEventListener(type, onFirstGesture));
}

function removeGestureListeners() {
    GESTURE_EVENTS.forEach((type) => document.removeEventListener(type, onFirstGesture));
}

setInterval(() => writeAudioSettings(), 1000);
window.addEventListener("pagehide", () => writeAudioSettings());
document.addEventListener("visibilitychange", () => {
    if (document.hidden) writeAudioSettings();
});

// Coming back with the Back button can restore the page from cache with
// the music stopped — re-sync and start it again.
window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    bgMusic.currentTime = getResumeTime();
    startMusic();
});

// Separate, ephemeral track that swaps in for the ambient music during a
// fight. Doesn't persist its position across page loads — it restarts
// fresh each battle — but shares volume/mute state via applyAudioSettings().
const battleMusic = new Audio(AUDIO_CONFIG.battleMusicSrc);
battleMusic.loop = true;
battleMusic.preload = "auto";

function startBattleMusic() {
    bgMusic.pause();
    battleMusic.currentTime = 0;
    battleMusic.volume = audioSettings.volume;
    battleMusic.muted = audioSettings.muted;
    battleMusic.play().catch((error) => console.error("Could not play battle music:", error));
}

function stopBattleMusic() {
    battleMusic.pause();
    battleMusic.currentTime = 0;
    if (musicStarted) {
        bgMusic.play().catch((error) => console.error("Could not resume background music:", error));
    }
}

const sfxCache = {};

function getSfx(src) {
    if (!sfxCache[src]) {
        sfxCache[src] = new Audio(src);
        sfxCache[src].preload = "auto";
    }
    return sfxCache[src];
}

[...new Set([...Object.values(AUDIO_CONFIG.pullSfx), ...Object.values(AUDIO_CONFIG.battleSfx)])].forEach(getSfx);

function playRarityStinger(rarity) {
    if (audioSettings.muted || audioSettings.volume === 0) return;

    const src = AUDIO_CONFIG.pullSfx[rarity];
    if (!src) return;

    const sfx = getSfx(src);
    sfx.volume = AUDIO_CONFIG.sfxVolume;
    sfx.currentTime = 0;
    sfx.play().catch((error) => console.error("Could not play sound effect:", error));
}

function playBattleSfx(key) {
    if (audioSettings.muted || audioSettings.volume === 0) return;

    const src = AUDIO_CONFIG.battleSfx[key];
    if (!src) return;

    const sfx = getSfx(src);
    sfx.volume = AUDIO_CONFIG.sfxVolume;
    sfx.currentTime = 0;
    sfx.play().catch((error) => console.error("Could not play sound effect:", error));
}

const ICON_VOLUME_ON = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;

const ICON_VOLUME_OFF = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

let musicToggle = null;
let musicSlider = null;
let musicHint = null;

function buildMusicControl() {
    const header = document.querySelector("header");
    if (!header) return;

    const row = document.createElement("div");
    row.id = "musicControl";
    row.className = "max-w-[1100px] mx-auto px-6 pb-3 -mt-1 flex flex-wrap items-center gap-2.5";
    row.innerHTML = `
        <button id="musicToggle" type="button" class="p-1 -ml-1 text-inkSoft hover:text-beige transition" aria-label="Mute"></button>
        <input id="musicVolume" type="range" min="0" max="100" step="1" class="w-28 accent-orange cursor-pointer" aria-label="Music volume" title="Music volume">
        <span id="musicHint" class="hidden text-[11px] text-inkSoft">Click anywhere to start the music</span>
    `;
    header.appendChild(row);

    musicToggle = row.querySelector("#musicToggle");
    musicSlider = row.querySelector("#musicVolume");
    musicHint = row.querySelector("#musicHint");

    musicToggle.addEventListener("click", () => {
        if (!musicStarted) {
            startMusic();
            return;
        }
        audioSettings.muted = !audioSettings.muted;
        applyAudioSettings();
        writeAudioSettings();
    });

    musicSlider.addEventListener("input", () => {
        audioSettings.volume = Number(musicSlider.value) / 100;
        if (audioSettings.volume > 0) audioSettings.muted = false;
        applyAudioSettings();
        writeAudioSettings();
        if (!musicStarted) startMusic();
    });
}

function applyAudioSettings() {
    bgMusic.volume = audioSettings.volume;
    bgMusic.muted = audioSettings.muted;
    battleMusic.volume = audioSettings.volume;
    battleMusic.muted = audioSettings.muted;

    if (!musicToggle || !musicSlider) return;

    const silent = audioSettings.muted || audioSettings.volume === 0;
    musicSlider.value = Math.round(audioSettings.volume * 100);
    musicToggle.innerHTML = silent ? ICON_VOLUME_OFF : ICON_VOLUME_ON;
    musicToggle.setAttribute("aria-label", audioSettings.muted ? "Unmute" : "Mute");
}

function setMusicHint(visible) {
    if (musicHint) musicHint.classList.toggle("hidden", !visible);
}

buildMusicControl();
applyAudioSettings();
startMusic();