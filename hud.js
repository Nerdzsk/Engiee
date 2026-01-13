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
    
    if (energyFill && energyText) {
        const percent = (currentEng / maxEng) * 100;
        energyFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
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
    }
}

// 3. Logika pre akumulátor krokov
export function updateAccumulatorHUD(units, mAcc) {
    const accFill = document.getElementById('acc-fill');
    const accText = document.getElementById('acc-text');
    if (accFill && accText) {
        accFill.style.width = Math.min(100, (units / mAcc * 100)) + "%";
        accText.innerText = `${Math.round(units)} / ${mAcc} UNITS (READY TO TRANSFER)`;
        
        // Vylepšená grafika: azúrový gradient a žiara
        accFill.style.background = "linear-gradient(90deg, #00ffff, #80ffff)";
        accFill.style.boxShadow = "0 0 10px #00ffff";
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