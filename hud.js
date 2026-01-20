// hud.js - Modul pre vizuálnu aktualizáciu tvojho HUD-u

// 1. Logika pre blikanie indikátora synchronizácie
export function triggerSyncFlash() {
    const syncEl = document.getElementById('sync-indicator');
    if (syncEl) {
        const now = new Date();
        syncEl.innerText = `LAST SYNC: ${now.toLocaleTimeString()}`;
        syncEl.style.color = "#ffffff";
        syncEl.style.opacity = "1";
        
        setTimeout(() => { 
            syncEl.style.color = "#44ff41"; 
            syncEl.style.opacity = "0.5";
        }, 500);
    }
}

// 2. Logika pre hlavnú batériu (Power Bar)
export function updateEnergyHUD(currentEng, maxEng) {
    const energyFill = document.getElementById('energy-fill');
    const energyText = document.getElementById('energy-text');
    const energyHpText = document.getElementById('energy-hp-text');
    const energyOrbHpDisplay = document.getElementById('energy-orb-hp-display');
    const energyOrb = document.getElementById('energy-orb');
    const safeMax = Math.max(1, maxEng || 1);
    const percent = (currentEng / safeMax) * 100;
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const fraction = Math.max(0, Math.min(1, currentEng / safeMax));
    
    if (energyFill && energyText) {
        energyFill.style.width = clampedPercent + "%";
        energyText.innerText = `${Math.round(currentEng)} / ${maxEng} EP`;
        
        // Vylepšená grafika: pridávame gradient a box-shadow (žiaru)
        if (percent > 50) {
            energyFill.style.background = "linear-gradient(90deg, #44ff41, #a2ff9b)";
            energyFill.style.boxShadow = "0 0 10px #44ff41";
        } else if (percent > 20) {
            energyFill.style.background = "linear-gradient(90deg, #ffff00, #ffff80)";
            energyFill.style.boxShadow = "0 0 10px #ffff00";
        } else {
            energyFill.style.background = "linear-gradient(90deg, #ff4444, #ff8080)";
            energyFill.style.boxShadow = "0 0 10px #ff4444";
        }

        // Aktualizácia Energy Orbu (PNG asset): dynamické maskovanie podľa percent
        if (energyOrb) {
            energyOrb.style.setProperty('--fill-percent', clampedPercent + '%');
            energyOrb.style.setProperty('--fill-fraction', fraction);
            if (percent >= 80) {
                energyOrb.classList.add('high-energy');
            } else {
                energyOrb.classList.remove('high-energy');
            }
        }
        // Aktualizácia HP textu (ako HP: 194/200)
        if (energyHpText) {
            energyHpText.innerText = `HP: ${Math.round(currentEng)} / ${maxEng}`;
        }
        // Aktualizácia HP textu pod orbom
        if (energyOrbHpDisplay) {
            energyOrbHpDisplay.innerText = `HP: ${Math.round(currentEng)} / ${maxEng}`;
        }
    }
}

// 3. Logika pre akumulátor krokov
export function updateAccumulatorHUD(units, mAcc) {
    const accFill = document.getElementById('acc-fill');
    const accText = document.getElementById('acc-text');
    const accOrbDisplay = document.getElementById('accumulator-orb-display');
    const accOrb = document.getElementById('accumulator-orb');
    const safeMax = Math.max(1, mAcc || 1);
    const percent = (units / safeMax) * 100;
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const fraction = Math.max(0, Math.min(1, units / safeMax));
    
    if (accFill && accText) {
        accFill.style.width = clampedPercent + "%";
        accText.innerText = `${Math.round(units)} / ${mAcc} UNITS (READY TO TRANSFER)`;
        
        // Vylepšená grafika: azúrový gradient a žiara
        accFill.style.background = "linear-gradient(90deg, #00ffff, #80ffff)";
        accFill.style.boxShadow = "0 0 10px #00ffff";
    }
    
    // Aktualizácia Accumulator Orbu: dynamické maskovanie podľa percent
    if (accOrb) {
        accOrb.style.setProperty('--fill-percent', clampedPercent + '%');
        accOrb.style.setProperty('--fill-fraction', fraction);
        if (percent >= 80) {
            accOrb.classList.add('high-energy');
        } else {
            accOrb.classList.remove('high-energy');
        }
    }
    
    // Aktualizácia ACC textu pod orbom
    if (accOrbDisplay) {
        accOrbDisplay.innerText = `ACC: ${Math.round(units)} / ${mAcc}`;
    }
}

// 4. Logika pre stav mobilného systému
export function updateMobileStatusHUD(isActive) {
    const statusEl = document.getElementById('mobile-service-status');
    if (statusEl) {
        statusEl.innerText = isActive ? "MOBILE_SYSTEM: ACTIVE" : "MOBILE_SYSTEM: OFFLINE";
        statusEl.style.color = isActive ? "#44ff41" : "#ff4444";
        statusEl.style.borderColor = isActive ? "#44ff41" : "#ff4444";
        statusEl.style.boxShadow = isActive ? "0 0 10px rgba(68, 255, 65, 0.3)" : "none";
    }
}

    // 5. Logika pre level a XP
    export function updateLevelHUD(level, currentXP, xpToNext) {
        const levelInfo = document.getElementById('level-info');
        const xpFill = document.getElementById('xp-fill');
    
        if (levelInfo && xpFill) {
            levelInfo.innerText = `Level ${level}`;
        
            const percent = (currentXP / xpToNext) * 100;
            xpFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
        }
    }
// 6. Logika pre quest notifikácie (toast messages)
/**
 * showQuestNotification - Zobrazí toast notifikáciu pre quest event
 * @param {string} questTitle - Názov questu
 * @param {string} message - Text notifikácie (voliteľný, default: "bol pridaný do denníka")
 */
export function showQuestNotification(questTitle, message = "bol pridaný do denníka") {
    const notification = document.getElementById('quest-notification');
    const textEl = document.getElementById('quest-notification-text');
    
    if (!notification || !textEl) {
        console.warn('Quest notification elements not found');
        return;
    }
    
    // Nastaví text
    textEl.innerText = `Quest: ${questTitle} ${message}`;
    
    // Zobraz notifikáciu
    notification.classList.remove('hidden', 'slide-out');
    
    // Po 4 sekundách ju skry
    setTimeout(() => {
        notification.classList.add('slide-out');
        
        // Po dokončení animácie ju úplne skry
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 500);
    }, 4000);
}
