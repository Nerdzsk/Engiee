// levelup.js - Level-up modal a efekty

/**
 * showLevelUpModal — zobrazí modal s level-up animáciou
 * @param {number} newLevel — nový level
 * @param {number} skillPointsGained — získané skill body
 */
export function showLevelUpModal(newLevel, skillPointsGained) {
    const modal = document.getElementById('levelup-modal');
    const levelInfo = document.getElementById('levelup-info');
    const rewards = document.getElementById('levelup-rewards');
    const closeBtn = document.getElementById('levelup-close');

    if (!modal || !levelInfo || !rewards || !closeBtn) {
        console.error("Level-up modal elements not found!");
        return;
    }

    // Nastav obsah
    levelInfo.innerText = `LEVEL ${newLevel} ACHIEVED`;
    rewards.innerHTML = `
        <div>🎯 +${skillPointsGained} SKILL POINTS</div>
        <div style="margin-top: 10px; font-size: 14px; color: #aaa;">Open Skills Panel [C] to allocate</div>
    `;

    // Zobraz modal
    modal.classList.remove('hidden');

    // Play sound effect (ak existuje)
    playLevelUpSound();

    // Close handler
    const closeHandler = () => {
        modal.classList.add('hidden');
        closeBtn.removeEventListener('click', closeHandler);
    };

    closeBtn.addEventListener('click', closeHandler);
}

/**
 * playLevelUpSound — prehráva level-up sound effect (placeholder)
 */
function playLevelUpSound() {
    // TODO: Implementuj Web Audio API sound
    console.log("🎵 Level-up sound effect!");
}

/**
 * initLevelUpSystem — inicializuj level-up event listener
 * Volá sa z app.js aby sledoval level zmeny
 */
export function initLevelUpSystem() {
    // Event listener pre level-up z databázy
    window.addEventListener('player-leveled-up', (e) => {
        const { newLevel, skillPointsGained } = e.detail;
        showLevelUpModal(newLevel, skillPointsGained);
    });
}
