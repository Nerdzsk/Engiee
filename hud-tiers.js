/**
 * HUD Tier Management System
 * Umožňuje prepínanie medzi rôznymi HUD tier grafickými framami
 */

// Dostupné HUD tiery
export const HUD_TIERS = {
    RUSTED: 'rusted',
    ADVANCED: 'advanced',
    TACTICAL: 'tactical',
    MILITARY: 'military',
    PROTOTYPE: 'prototype',
    CYBER: 'cyber',
    QUANTUM: 'quantum',
    NEXUS: 'nexus',
    APEX: 'apex',
    LEGENDARY: 'legendary'
};

// Aktuálny tier (default)
let currentTier = HUD_TIERS.RUSTED;

/**
 * Prepne HUD na nový tier
 * @param {string} tierName - Názov tieru z HUD_TIERS
 */
export function setHudTier(tierName) {
    const hudFrame = document.querySelector('.hud-frame');
    if (!hudFrame) {
        console.error('HUD frame element not found');
        return;
    }

    // Odstráň všetky tier triedy
    Object.values(HUD_TIERS).forEach(tier => {
        hudFrame.classList.remove(`hud-frame--tier-${tier}`);
    });

    // Pridaj novú tier triedu
    hudFrame.classList.add(`hud-frame--tier-${tierName}`);
    
    // Aktualizuj obrázok frame (ak existuje)
    const frameImg = hudFrame.querySelector('.hud-frame-img');
    if (frameImg) {
        const assetPath = getHudTierAssetPath(tierName);
        frameImg.src = assetPath;
        frameImg.alt = `HUD Frame Tier ${tierName}`;
    }

    currentTier = tierName;
    console.log(`HUD tier changed to: ${tierName}`);
    
    // Trigger custom event pre možné ďalšie reakcie
    window.dispatchEvent(new CustomEvent('hudTierChanged', { 
        detail: { tier: tierName } 
    }));
}

/**
 * Vráti cestu k assetu pre daný tier
 * @param {string} tierName 
 * @returns {string}
 */
function getHudTierAssetPath(tierName) {
    const tierCapitalized = tierName.charAt(0).toUpperCase() + tierName.slice(1);
    return `./assets/${tierCapitalized}/HUD_Frame_Tier_${tierCapitalized}.png`;
}

/**
 * Získaj aktuálny tier
 * @returns {string}
 */
export function getCurrentHudTier() {
    return currentTier;
}

/**
 * Upgrade HUD na ďalší tier (v poradí)
 * @returns {string|null} - nový tier alebo null ak si už na max
 */
export function upgradeHudTier() {
    const tiers = Object.values(HUD_TIERS);
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex < tiers.length - 1) {
        const newTier = tiers[currentIndex + 1];
        setHudTier(newTier);
        return newTier;
    }
    
    console.log('Already at maximum HUD tier');
    return null;
}

/**
 * Inicializuj HUD tier systém
 * Volaj pri načítaní hry
 */
export function initHudTierSystem() {
    console.log('HUD Tier System initialized');
    console.log('Current tier:', currentTier);
    console.log('Available tiers:', Object.values(HUD_TIERS));
}

// Príklad použitia v konzole pre testovanie:
// import { setHudTier, HUD_TIERS } from './hud-tiers.js';
// setHudTier(HUD_TIERS.ADVANCED);
