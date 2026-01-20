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
            closeGameMenu();
            
            // CLEANUP: Video
            const introVideo = document.getElementById('intro-video');
            if (introVideo) {
                introVideo.pause();
                introVideo.currentTime = 0;
                introVideo.src = '';
            }
            const introOverlay = document.getElementById('intro-video-overlay');
            if (introOverlay) {
                introOverlay.classList.add('hidden');
            }
            
            // Vyčisti storage (zachovaj Firebase config)
            const firebaseConfig = localStorage.getItem('firebaseConfig');
            localStorage.clear();
            sessionStorage.clear();
            if (firebaseConfig) {
                localStorage.setItem('firebaseConfig', firebaseConfig);
            }
            
            // Vyčisti Service Worker cache
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                } catch (err) {
                    console.warn('[NEW GAME] Cache cleanup failed:', err);
                }
            }
            
            // Ulož backup a resetuj
            await saveGame(PLAYER_ID, 'before_reset');
            const success = await resetGame(PLAYER_ID);
            
            if (success) {
                // Počkaj na disk write a reload
                await new Promise(resolve => setTimeout(resolve, 500));
                window.location.href = window.location.origin + window.location.pathname + '?_=' + Date.now();
            } else {
                console.error('[NEW GAME] Reset failed!');
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
