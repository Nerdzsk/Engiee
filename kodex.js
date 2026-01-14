import { watchPlayerKodex, addKodexEntry } from './database.js';

let currentKodex = {};
let currentPlayerId = null;

// Definícia všetkých kodex entry-ov
export const KODEX_ENTRIES = {
    // POSTAVY
    'postavy_engee': {
        category: 'postavy',
        id: 'postavy_engee',
        title: 'ENGEE // Palubná AI',
        icon: '🤖',
        description: 'Umela inteligencia lode. Komunikuje cez dialógy a pomáha s riadením systémov.',
        details: 'ENGEE je primárny ovládací systém vesmírnej lode. Poskytuje pokyny, interakcie a spravuje údaje hráča.'
    },

    // MIESTA
    'miesta_kabina': {
        category: 'miesta',
        id: 'miesta_kabina',
        title: 'Kabína Lode',
        icon: '🚀',
        description: 'Hlavná priestornosť lode kde sa hráč nachádza.',
        details: 'Počiatočná miestnosť. Slúži ako hub pre pohyb a interakcie.'
    },

    'miesta_vstup_dvere': {
        category: 'miesta',
        id: 'miesta_vstup_dvere',
        title: 'Vrátnice - Poškodené Dvere',
        icon: '🚪',
        description: 'Zvláštne dvere na vstupe. Sú poškodené a vyžadujú opravy.',
        details: 'Dvere vedú do ďalšieho modulu. Ich oprava je možná len s dostatočnými zručnosťami a energiou.'
    },

    'miesta_nabijacia_stanica': {
        category: 'miesta',
        id: 'miesta_nabijacia_stanica',
        title: 'Nabíjacia Stanica',
        icon: '🔌',
        description: 'Centrálna nabíjacia stanica pre robotické systémy.',
        details: 'Stanica je v pokoji. Skladuje batérie a energetické články.'
    },

    // TECHNOLOGIE
    'tech_nabijacia_energia': {
        category: 'technologie',
        id: 'tech_nabijacia_energia',
        title: 'Systém Prenosu Energie',
        icon: '⚡',
        description: 'Technológia na prenos energie z akumulátora do hlavného systému.',
        details: 'Umožňuje efektívny prenos energie zo zbieraných krokov do batérie. Vyžaduje aktiváciu tlačidlom "TRANSFER".'
    },

    'tech_oprava_dveri': {
        category: 'technologie',
        id: 'tech_oprava_dveri',
        title: 'Mechanizmus Opravy Dverí',
        icon: '🔧',
        description: 'Technológia potrebná na opravu poškodených dverí.',
        details: 'Požaduje inteligencia úroveň 5+ a 30 jednotiek energie z akumulátora. Použitie energetických prostriedkov je kľúčové.'
    },

    'tech_special_system': {
        category: 'technologie',
        id: 'tech_special_system',
        title: 'SPECIAL Atribútový Systém',
        icon: '⭐',
        description: 'Pokročilý systém na sledovanie fyzických a mentálnych schopností.',
        details: 'Sedem atribútov: Sila, Percepcia, Vytrvalosť, Charizmu, Inteligencia, Agilita, Šťastie. Každý atribút ovplyvňuje schopnosti robota.'
    }
};

// Štruktúra kategorií
const KODEX_CATEGORIES = {
    'miesta': {
        label: 'MIESTA',
        icon: '🗺️',
        entries: Object.values(KODEX_ENTRIES).filter(e => e.category === 'miesta')
    },
    'technologie': {
        label: 'TECHNOLOGIE',
        icon: '⚙️',
        entries: Object.values(KODEX_ENTRIES).filter(e => e.category === 'technologie')
    },
    'postavy': {
        label: 'POSTAVY',
        icon: '👥',
        entries: Object.values(KODEX_ENTRIES).filter(e => e.category === 'postavy')
    }
};

export function initKodexUI() {
    const modal = document.getElementById('kodex-modal');
    if (!modal) {
        console.warn("Kodex modal element not found!");
        return;
    }

    // Klávesa K na otvorenie/zatvorenie kodexu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'k' || e.key === 'K') {
            if (!e.target.matches('input, textarea')) {
                toggleKodexModal();
            }
        }
    });

    // Event listener pre X tlačidlo
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('kodex-modal-close')) {
            toggleKodexModal();
        }
    });

    // Klik mimo modal - zatvorí modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            toggleKodexModal();
        }
    });
}

export function toggleKodexModal() {
    const modal = document.getElementById('kodex-modal');
    const hud = document.getElementById('hud');
    const isHidden = modal.classList.contains('hidden');

    if (isHidden) {
        modal.classList.remove('hidden');
        if (hud) hud.style.display = 'none';
        // Pri otvorení updatni display
        updateKodexDisplay();
    } else {
        modal.classList.add('hidden');
        if (hud) hud.style.display = 'block';
    }
}

export function watchPlayerKodexUI(playerId) {
    currentPlayerId = playerId;
    watchPlayerKodex(playerId, (kodex) => {
        currentKodex = kodex || {};
        updateKodexDisplay();
    });
}

function updateKodexDisplay() {
    const contentDiv = document.getElementById('kodex-modal-content');
    if (!contentDiv) {
        console.warn("Kodex content div not found!");
        return;
    }

    console.log("Updating kodex display. Current kodex:", currentKodex);

    const activeCategory = window._activeKodexCategory || 'miesta';
    const activeCategoryData = KODEX_CATEGORIES[activeCategory];

    // Záložky (karty)
    let html = '<div class="kodex-tabs">';

    for (const [catKey, catData] of Object.entries(KODEX_CATEGORIES)) {
        const unlockedCount = catData.entries.filter(entry => 
            currentKodex[entry.id]?.unlocked
        ).length;
        const totalCount = catData.entries.length;
        const isActive = catKey === activeCategory ? 'active' : '';

        html += `
            <div class="kodex-tab ${isActive}" data-category="${catKey}">
                <span class="tab-icon">${catData.icon}</span>
                <span class="tab-label">${catData.label}</span>
                <span class="tab-count">${unlockedCount}/${totalCount}</span>
            </div>
        `;
    }

    html += '</div>';

    // Obsah kategorií
    html += '<div class="kodex-content">';
    html += '<div class="kodex-entries">';

    activeCategoryData.entries.forEach(entry => {
        const isUnlocked = currentKodex[entry.id]?.unlocked || false;
        const unlockedClass = isUnlocked ? 'unlocked' : 'locked';

        if (isUnlocked) {
            html += `
                <div class="kodex-entry ${unlockedClass}">
                    <div class="entry-header">
                        <span class="entry-icon">${entry.icon}</span>
                        <h3 class="entry-title">${entry.title}</h3>
                    </div>
                    <p class="entry-description">${entry.description}</p>
                    <p class="entry-details">${entry.details}</p>
                </div>
            `;
        } else {
            html += `
                <div class="kodex-entry ${unlockedClass}">
                    <div class="entry-header">
                        <span class="entry-icon">❓</span>
                        <h3 class="entry-title">??? [UZAMKNUTÉ]</h3>
                    </div>
                    <p class="entry-description">Informácia ešte nebola odomknutá.</p>
                </div>
            `;
        }
    });

    html += '</div></div>';
    contentDiv.innerHTML = html;

    // Event listenery na záložky
    contentDiv.querySelectorAll('.kodex-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const categoryKey = e.currentTarget.dataset.category;
            window._activeKodexCategory = categoryKey;
            updateKodexDisplay();
        });
    });
}

/**
 * Odomkne kodex entry a uloží do DB
 * @param {string} entryId - ID entry-u (napr. 'postavy_engee')
 */
export async function unlockKodexEntry(entryId) {
    if (!currentPlayerId) {
        console.warn("Žiadny hráč nie je aktívny");
        return;
    }

    if (!currentKodex[entryId]) {
        currentKodex[entryId] = {};
    }

    // Ak je už odomknuté, neskáčeme
    if (currentKodex[entryId].unlocked) {
        return;
    }

    // Zavolajte DB funkciu na uloženie
    await addKodexEntry(currentPlayerId, entryId, {
        unlocked: true,
        unlockedAt: new Date(),
        entry: KODEX_ENTRIES[entryId]
    });

    console.log(`✓ Kodex odomknutý: ${entryId}`);
}
