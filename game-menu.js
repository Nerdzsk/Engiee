// game-menu.js - Game Menu System
// Handle otvorenia/zatvorenia menu a základné funkcie

import { saveGame, loadGame, resetGame } from './database.js';

let isMenuOpen = false;
const PLAYER_ID = 'robot1'; // Hlavný hráč

function initGameMenu() {
    const menuModal = document.getElementById('game-menu-modal');
    const menuNewGame = document.getElementById('menu-new-game');
    const menuSaveGame = document.getElementById('menu-save-game');
    const menuLoadGame = document.getElementById('menu-load-game');
    const menuSettings = document.getElementById('menu-settings');
    const menuQuitGame = document.getElementById('menu-quit-game');
    const menuResume = document.getElementById('menu-resume');

    // ESC klávesa pre otvorenie/zatvorenie menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleGameMenu();
        }
    });

    // Resume - zatvoriť menu
    menuResume.addEventListener('click', () => {
        closeGameMenu();
    });

    // Nová hra
    menuNewGame.addEventListener('click', async () => {
        if (confirm('Naozaj chceš začať novú hru? Neuložený progres bude stratený.')) {
            console.log('[NEW GAME] Starting new game...');
            closeGameMenu();
            
            // CLEANUP PRED resetom (aby sa určite vykonal)
            console.log('[NEW GAME] 1/5 - Cleaning up video...');
            const introVideo = document.getElementById('intro-video');
            if (introVideo) {
                introVideo.pause();
                introVideo.currentTime = 0;
                introVideo.src = '';
                console.log('[NEW GAME] Video cleaned');
            }
            const introOverlay = document.getElementById('intro-video-overlay');
            if (introOverlay) {
                introOverlay.classList.add('hidden');
            }
            
            // Vyčisti storage
            console.log('[NEW GAME] 2/5 - Cleaning storage...');
            const firebaseConfig = localStorage.getItem('firebaseConfig');
            localStorage.clear();
            sessionStorage.clear();
            if (firebaseConfig) {
                localStorage.setItem('firebaseConfig', firebaseConfig);
            }
            console.log('[NEW GAME] Storage cleaned');
            
            // Vyčisti Service Worker cache
            console.log('[NEW GAME] 3/5 - Cleaning service worker cache...');
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('[NEW GAME] Service worker cache deleted:', cacheNames.length);
                } catch (err) {
                    console.warn('[NEW GAME] Cache cleanup failed:', err);
                }
            } else {
                console.log('[NEW GAME] No service worker cache found');
            }
            
            // Ulož backup
            console.log('[NEW GAME] 4/5 - Saving backup...');
            await saveGame(PLAYER_ID, 'before_reset');
            
            // Resetuj hru
            console.log('[NEW GAME] 5/5 - Resetting game data...');
            const success = await resetGame(PLAYER_ID);
            
            if (success) {
                console.log('[NEW GAME] ✅ Game reset successful');
                
                // Počkaj 500ms na disk write
                console.log('[NEW GAME] Waiting for disk write...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // HARD RELOAD
                console.log('[NEW GAME] 🔄 Executing hard reload...');
                const reloadUrl = window.location.origin + window.location.pathname + '?_=' + Date.now();
                console.log('[NEW GAME] Reload URL:', reloadUrl);
                window.location.href = reloadUrl;
            } else {
                console.error('[NEW GAME] ❌ Reset failed!');
                alert('❌ Chyba pri resetovaní hry!');
            }
        }
    });

    // Uložiť hru
    menuSaveGame.addEventListener('click', async () => {
        console.log('Saving game...');
        const success = await saveGame(PLAYER_ID, 'manual_save');
        
        if (success) {
            alert('✅ Hra úspešne uložená!');
        } else {
            alert('❌ Chyba pri ukladaní hry!');
        }
    });

    // Načítať hru
    menuLoadGame.addEventListener('click', async () => {
        if (confirm('Načítať uložený stav hry? Neuložený progres bude stratený.')) {
            console.log('Loading game...');
            const success = await loadGame(PLAYER_ID, 'manual_save');
            
            if (success) {
                closeGameMenu();
                alert('✅ Hra načítaná! Stránka sa reloadne...');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert('❌ Nenašiel sa žiadny uložený stav!');
            }
        }
    });

    // Nastavenia
    menuSettings.addEventListener('click', () => {
        console.log('Opening settings...');
        // TODO: Implementovať nastavenia (zvuk, grafika, ovládanie)
        alert('Nastavenia (zatiaľ nedostupné)');
    });

    // Ukončiť hru
    menuQuitGame.addEventListener('click', () => {
        if (confirm('Naozaj chceš ukončiť hru?')) {
            console.log('Quitting game...');
            // Pre webovú verziu zatvoríme okno alebo presmerujeme
            window.close();
            // Ak to nefunguje (moderné prehliadače), ukážeme správu
            setTimeout(() => {
                alert('Hra ukončená. Môžeš zavrieť toto okno.');
            }, 100);
        }
    });
}

function toggleGameMenu() {
    if (isMenuOpen) {
        closeGameMenu();
    } else {
        openGameMenu();
    }
}

function openGameMenu() {
    const menuModal = document.getElementById('game-menu-modal');
    menuModal.classList.remove('hidden');
    isMenuOpen = true;
    console.log('Game menu opened');
}

function closeGameMenu() {
    const menuModal = document.getElementById('game-menu-modal');
    menuModal.classList.add('hidden');
    isMenuOpen = false;
    console.log('Game menu closed');
}

export { initGameMenu, openGameMenu, closeGameMenu, toggleGameMenu };
