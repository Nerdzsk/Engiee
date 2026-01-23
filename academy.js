/**
 * academy.js
 * 
 * Academy systém - sledovanie YouTube videí za Learning Points.
 * Playtime-based tracking: každých 10 sekúnd skutočného sledovania = +1 LP
 */

// Globálne premenné
let currentPlayerId = null;
let currentVideo = null;
let youtubePlayer = null;
let playtimeInterval = null;
let isYouTubeAPILoaded = false;

// Video session state
let videoState = {
    isPlaying: false,
    totalWatchTime: 0,        // celkový čas sledovania v tejto session (sekundy)
    lastPlayTimestamp: 0,
    lpEarned: 0,              // LP zarobené v tejto session
    nextLPThreshold: 10       // ďalší threshold pre LP (každých 10s)
};

// Cache pre video library
let videoLibrary = [];
let playerProgress = {}; // Načítané z player_quests.json

/**
 * Inicializácia Academy UI
 * @param {string} playerId - ID hráča
 */
export async function initAcademyUI(playerId) {
    currentPlayerId = playerId;
    
    // Načítaj video library
    await loadVideoLibrary();
    
    // Načítaj player progress
    await loadPlayerProgress();
    
    console.log('[Academy] Initialized');
}

/**
 * Načíta zoznam videí z academy_videos.json
 */
async function loadVideoLibrary() {
    try {
        const response = await fetch('academy_videos.json?_=' + Date.now());
        videoLibrary = await response.json();
        console.log('[Academy] Loaded video library:', videoLibrary);
    } catch (error) {
        console.error('[Academy] Failed to load video library:', error);
        videoLibrary = [];
    }
}

/**
 * Načíta progres hráča z player_quests.json
 */
async function loadPlayerProgress() {
    try {
        const response = await fetch('player_quests.json?_=' + Date.now());
        const data = await response.json();
        const player = data.find(p => p.playerId === currentPlayerId);
        
        if (player && player.academy) {
            playerProgress = player.academy;
        } else {
            playerProgress = {
                totalWatchTime: 0,
                totalLPFromVideos: 0,
                videos: {}
            };
        }
        
        console.log('[Academy] Loaded player progress:', playerProgress);
    } catch (error) {
        console.error('[Academy] Failed to load player progress:', error);
        playerProgress = { totalWatchTime: 0, totalLPFromVideos: 0, videos: {} };
    }
}

/**
 * Renderuje Academy tab obsah
 * @param {HTMLElement} content - Container element
 */
export function renderAcademyTab(content) {
    content.innerHTML = '';
    
    // === ACADEMY HEADER ===
    const header = document.createElement('div');
    header.className = 'academy-header';
    header.innerHTML = `
        <h2>🎓 ACADEMY - Learn & Earn</h2>
        <div class="academy-stats">
            <div class="academy-stat">
                <span class="stat-label">Total Watch Time:</span>
                <span class="stat-value">${formatTime(playerProgress.totalWatchTime || 0)}</span>
            </div>
            <div class="academy-stat">
                <span class="stat-label">Total LP Earned:</span>
                <span class="stat-value">${playerProgress.totalLPFromVideos || 0} LP</span>
            </div>
        </div>
    `;
    content.appendChild(header);
    
    // === VIDEO LIBRARY ===
    const videoList = document.createElement('div');
    videoList.className = 'academy-video-list';
    
    if (videoLibrary.length === 0) {
        videoList.innerHTML = '<p class="academy-empty">No videos available yet.</p>';
    } else {
        videoLibrary.forEach(video => {
            const videoProgress = playerProgress.videos[video.id] || {
                totalWatchTime: 0,
                lpEarned: 0,
                sessions: 0
            };
            
            const card = document.createElement('div');
            card.className = 'academy-video-card';
            card.innerHTML = `
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg" alt="${video.title}">
                    <div class="video-duration-badge">YouTube</div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-description">${video.description}</p>
                    <div class="video-category">📁 ${video.category}</div>
                    <div class="video-stats">
                        <span>⏱️ ${formatTime(videoProgress.totalWatchTime)}</span>
                        <span>💰 ${videoProgress.lpEarned} LP</span>
                        <span>📊 ${videoProgress.sessions} sessions</span>
                    </div>
                    <div class="video-reward-info">
                        🎁 ${video.lpPerInterval} LP every ${video.intervalSeconds}s
                    </div>
                </div>
                <button class="academy-watch-btn" data-video-id="${video.id}">
                    ▶ WATCH VIDEO
                </button>
            `;
            
            // Event listener pre watch button
            const watchBtn = card.querySelector('.academy-watch-btn');
            watchBtn.addEventListener('click', () => openVideoPlayer(video));
            
            videoList.appendChild(card);
        });
    }
    
    content.appendChild(videoList);
}

/**
 * Otvorí video player modal
 * @param {Object} video - Video objekt
 */
function openVideoPlayer(video) {
    currentVideo = video;
    
    // Reset session state
    videoState = {
        isPlaying: false,
        totalWatchTime: 0,
        lastPlayTimestamp: 0,
        lpEarned: 0,
        nextLPThreshold: video.intervalSeconds || 10
    };
    
    // Vytvor modal overlay
    const modal = document.createElement('div');
    modal.id = 'academy-player-modal';
    modal.className = 'academy-player-modal';
    modal.innerHTML = `
        <div class="academy-player-container">
            <div class="academy-player-header">
                <h3>${video.title}</h3>
                <button class="academy-player-close">✕</button>
            </div>
            <div class="academy-player-wrapper">
                <div id="academy-youtube-player"></div>
            </div>
            <div class="academy-session-stats">
                <div class="session-stat">
                    <span class="session-label">Session Time:</span>
                    <span class="session-value" id="session-time">00:00</span>
                </div>
                <div class="session-stat">
                    <span class="session-label">This Session:</span>
                    <span class="session-value" id="session-lp">+0 LP</span>
                </div>
                <div class="session-stat">
                    <span class="session-label">Next Reward In:</span>
                    <span class="session-value" id="session-countdown">${video.intervalSeconds}s</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button handler
    const closeBtn = modal.querySelector('.academy-player-close');
    closeBtn.addEventListener('click', closeVideoPlayer);
    
    // Load YouTube API a vytvor player
    loadYouTubeAPI(() => {
        createYouTubePlayer(video.youtubeId);
    });
}

/**
 * Zatvorí video player a uloží progres
 */
function closeVideoPlayer() {
    // Pause video ak beží
    if (youtubePlayer && videoState.isPlaying) {
        youtubePlayer.pauseVideo();
    }
    
    // Save progress
    saveVideoProgress();
    
    // Stop tracking
    if (playtimeInterval) {
        clearInterval(playtimeInterval);
        playtimeInterval = null;
    }
    
    // Remove modal
    const modal = document.getElementById('academy-player-modal');
    if (modal) {
        modal.remove();
    }
    
    // Destroy player
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
    
    // Refresh academy tab
    const content = document.getElementById('skills-panel-content');
    if (content) {
        renderAcademyTab(content);
    }
}

/**
 * Načíta YouTube IFrame API
 * @param {Function} callback - Callback po načítaní
 */
function loadYouTubeAPI(callback) {
    if (isYouTubeAPILoaded) {
        callback();
        return;
    }
    
    // Check ak už existuje
    if (window.YT && window.YT.Player) {
        isYouTubeAPILoaded = true;
        callback();
        return;
    }
    
    // Načítaj script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    
    window.onYouTubeIframeAPIReady = () => {
        isYouTubeAPILoaded = true;
        console.log('[Academy] YouTube API loaded');
        callback();
    };
    
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

/**
 * Vytvorí YouTube player instanciu
 * @param {string} videoId - YouTube video ID
 */
function createYouTubePlayer(videoId) {
    youtubePlayer = new YT.Player('academy-youtube-player', {
        height: '480',
        width: '854',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

/**
 * YouTube player ready event
 */
function onPlayerReady(event) {
    console.log('[Academy] Player ready');
    // Player je pripravený, video sa automaticky spustí (autoplay: 1)
}

/**
 * YouTube player state change event
 */
function onPlayerStateChange(event) {
    switch(event.data) {
        case YT.PlayerState.PLAYING:
            console.log('[Academy] Video playing');
            videoState.isPlaying = true;
            videoState.lastPlayTimestamp = Date.now();
            startPlaytimeTracking();
            break;
            
        case YT.PlayerState.PAUSED:
            console.log('[Academy] Video paused');
            videoState.isPlaying = false;
            saveVideoProgress();
            break;
            
        case YT.PlayerState.ENDED:
            console.log('[Academy] Video ended');
            videoState.isPlaying = false;
            saveVideoProgress();
            break;
    }
}

/**
 * Spustí playtime tracking interval
 */
function startPlaytimeTracking() {
    if (playtimeInterval) {
        clearInterval(playtimeInterval);
    }
    
    playtimeInterval = setInterval(() => {
        if (videoState.isPlaying) {
            videoState.totalWatchTime += 1; // +1 sekunda
            
            // Update UI
            updateSessionUI();
            
            // Check threshold pre LP reward
            if (videoState.totalWatchTime >= videoState.nextLPThreshold) {
                awardLPFromVideo();
                videoState.lpEarned += currentVideo.lpPerInterval || 1;
                videoState.nextLPThreshold += currentVideo.intervalSeconds || 10;
            }
            
            // Auto-save každých 5 sekúnd
            if (videoState.totalWatchTime % 5 === 0) {
                saveVideoProgress();
            }
        }
    }, 1000); // každú sekundu
}

/**
 * Aktualizuje session UI (live counter)
 */
function updateSessionUI() {
    const timeEl = document.getElementById('session-time');
    const lpEl = document.getElementById('session-lp');
    const countdownEl = document.getElementById('session-countdown');
    
    if (timeEl) {
        timeEl.textContent = formatTime(videoState.totalWatchTime);
    }
    
    if (lpEl) {
        lpEl.textContent = `+${videoState.lpEarned} LP`;
    }
    
    if (countdownEl) {
        const remaining = videoState.nextLPThreshold - videoState.totalWatchTime;
        countdownEl.textContent = `${remaining}s`;
    }
}

/**
 * Pridá LP reward za sledovanie
 */
function awardLPFromVideo() {
    const lpAmount = currentVideo.lpPerInterval || 1;
    
    // Update robot LP (z app.js)
    if (window.robot) {
        const newLP = Math.min(
            window.robot.learningPoints + lpAmount,
            window.robot.maxLearningPoints
        );
        window.robot.learningPoints = newLP;
        
        // Update HUD
        if (window.updateLearningPointsHUD) {
            window.updateLearningPointsHUD(window.robot.learningPoints, window.robot.maxLearningPoints);
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('learningPointsUpdated', {
            detail: {
                learningPoints: window.robot.learningPoints,
                maxLearningPoints: window.robot.maxLearningPoints
            }
        }));
        
        // Toast notifikácia
        showLPToast(lpAmount);
        
        console.log(`[Academy] +${lpAmount} LP awarded (total watch: ${videoState.totalWatchTime}s)`);
    }
}

/**
 * Zobrazí toast notifikáciu pre LP reward
 */
function showLPToast(lpAmount) {
    const notification = document.createElement('div');
    notification.className = 'academy-lp-toast';
    notification.innerHTML = `
        <div class="toast-icon">🎓</div>
        <div class="toast-content">
            <div class="toast-title">+${lpAmount} LP Earned!</div>
            <div class="toast-text">Total watch time: ${formatTime(videoState.totalWatchTime)}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animácia
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Odstráň po 3 sekundách
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Uloží video progress do player_quests.json
 */
async function saveVideoProgress() {
    if (!currentVideo || videoState.totalWatchTime === 0) {
        return; // Nič na uloženie
    }
    
    try {
        const response = await fetch('player_quests.json?_=' + Date.now());
        const data = await response.json();
        const player = data.find(p => p.playerId === currentPlayerId);
        
        if (!player) {
            console.error('[Academy] Player not found');
            return;
        }
        
        // Inicializuj academy objekt ak neexistuje
        if (!player.academy) {
            player.academy = {
                totalWatchTime: 0,
                totalLPFromVideos: 0,
                videos: {}
            };
        }
        
        // Inicializuj video entry ak neexistuje
        if (!player.academy.videos[currentVideo.id]) {
            player.academy.videos[currentVideo.id] = {
                youtubeId: currentVideo.youtubeId,
                totalWatchTime: 0,
                lpEarned: 0,
                sessions: 0,
                lastWatched: null
            };
        }
        
        const videoEntry = player.academy.videos[currentVideo.id];
        
        // Aktualizuj video stats
        videoEntry.totalWatchTime += videoState.totalWatchTime;
        videoEntry.lpEarned += videoState.lpEarned;
        videoEntry.sessions += 1;
        videoEntry.lastWatched = new Date().toISOString();
        
        // Aktualizuj globálne stats
        player.academy.totalWatchTime += videoState.totalWatchTime;
        player.academy.totalLPFromVideos += videoState.lpEarned;
        
        // Aktualizuj learning points (inicializuj ak neexistuje)
        if (!player.learningPoints) {
            player.learningPoints = 0;
        }
        player.learningPoints = window.robot ? window.robot.learningPoints : player.learningPoints;
        
        // Ensure maxLearningPoints exists
        if (!player.maxLearningPoints) {
            player.maxLearningPoints = 5000;
        }
        
        player.lastUpdate = Date.now();
        
        // Ulož
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log('[Academy] Progress saved:', {
                watchTime: videoState.totalWatchTime,
                lpEarned: videoState.lpEarned
            });
        }
        
        // Update local cache
        playerProgress = player.academy;
        
    } catch (error) {
        console.error('[Academy] Failed to save progress:', error);
    }
}

/**
 * Formátuje sekundy na MM:SS formát
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// === DEBUG COMMANDS ===
window.academyStats = function() {
    console.log('=== ACADEMY STATS ===');
    console.log('Total Watch Time:', formatTime(playerProgress.totalWatchTime || 0));
    console.log('Total LP Earned:', playerProgress.totalLPFromVideos || 0);
    console.log('Videos:', playerProgress.videos);
    console.log('Current Session:', videoState);
};

window.resetAcademyProgress = async function(videoId) {
    if (!videoId) {
        console.error('Usage: resetAcademyProgress("video_id")');
        return;
    }
    
    try {
        const response = await fetch('player_quests.json?_=' + Date.now());
        const data = await response.json();
        const player = data.find(p => p.playerId === currentPlayerId);
        
        if (player && player.academy && player.academy.videos[videoId]) {
            delete player.academy.videos[videoId];
            await window.saveLocalJson('player_quests.json', data);
            console.log(`[Academy] Reset progress for ${videoId}`);
            await loadPlayerProgress();
        }
    } catch (e) {
        console.error('[Academy] Reset failed:', e);
    }
};
