/**
 * skills.js
 * 
 * Modul na UI zobrazenie a prideľovanie SPECIAL skill tree.
 * Modal obrazovka s klávesou C na otvorenie/zatvorenie.
 */

import { allocateSkillPoint, watchPlayerSkills } from './database.js';

const SKILL_NAMES = {
    S: 'Strength',
    P: 'Perception',
    E: 'Endurance',
    C: 'Charisma',
    I: 'Intelligence',
    A: 'Agility',
    L: 'Luck'
};

const SKILL_DESCRIPTIONS = {
    S: 'Fyzická sila a nosnosť',
    P: 'Vnímavosť a presnosť',
    E: 'Vytrvalosť a zdravie',
    C: 'Charizmatickosť a jednanie',
    I: 'Intelekt a schopnosti',
    A: 'Obratnosť a rýchlosť',
    L: 'Šťastie a náhoda'
};

let currentPlayerId = null;
let skillsUnsubscribe = null;
let currentSkillsData = null;
let isSkillsModalOpen = false;

/**
 * initSkillsUI — inicializuje skill modal
 * @param {string} playerId — ID aktuálneho hráča
 */
export function initSkillsUI(playerId) {
    currentPlayerId = playerId;

    const modal = document.getElementById('skills-modal');
    const closeBtn = document.getElementById('skills-close-btn');
    const skillsBtn = document.getElementById('skills-btn');

    if (!modal || !closeBtn || !skillsBtn) {
        console.warn('Skills modal elements not found');
        return;
    }

    // Event listeners
    closeBtn.addEventListener('click', toggleSkillsModal);
    skillsBtn.addEventListener('click', toggleSkillsModal);

    // Klávesa C na otvorenie/zatvorenie
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'č') {
            e.preventDefault();
            toggleSkillsModal();
        }
    });

    // Sleduj zmeny v skills
    if (skillsUnsubscribe) {
        skillsUnsubscribe();
    }

    skillsUnsubscribe = watchPlayerSkills(playerId, (data) => {
        currentSkillsData = data;
        updateSkillsDisplay(data);
    });
}

/**
 * toggleSkillsModal — otvor/zavri modal
 */
export function toggleSkillsModal() {
    const modal = document.getElementById('skills-modal');
    const hud = document.getElementById('hud');
    if (!modal) return;

    isSkillsModalOpen = !isSkillsModalOpen;
    modal.classList.toggle('hidden', !isSkillsModalOpen);
    
    // Skry/ukáž HUD
    if (hud) {
        if (isSkillsModalOpen) {
            hud.style.display = 'none';
        } else {
            hud.style.display = 'block';
        }
    }
}

/**
 * updateSkillsDisplay — aktualizuje UI podľa aktuálnych dát
 * @param {Object} data — { skills, skillPointsAvailable, perks }
 */
export function updateSkillsDisplay(data) {
    const { skills, skillPointsAvailable, perks } = data;

    const content = document.getElementById('skills-panel-content');
    if (!content) return;

    // Vyčisti starý obsah
    content.innerHTML = '';

    // --- LEFT SECTION: Skills Grid ---
    const skillsSection = document.createElement('div');
    skillsSection.className = 'skills-section-left';

    // Skill points info (always visible at top)
    const pointsDiv = document.createElement('div');
    pointsDiv.className = 'skill-points-info';
    pointsDiv.innerHTML = `
        <h3>Available Points: <span class="${skillPointsAvailable > 0 ? 'has-points' : ''}">${skillPointsAvailable}</span></h3>
    `;
    
    // Skills grid (4 columns)
    const grid = document.createElement('div');
    grid.className = 'skills-grid-modal';

    // Vložíme info o bodoch pred grid
    skillsSection.appendChild(pointsDiv);
    
    Object.keys(SKILL_NAMES).forEach(statKey => {
        const statData = skills[statKey] || { base: 3, bonus: 0 };
        const totalValue = (statData.base || 3) + (statData.bonus || 0);

        const card = document.createElement('div');
        card.className = 'skill-card-modal';
        card.innerHTML = `
            <div class="skill-key">${statKey}</div>
            <div class="skill-name">${SKILL_NAMES[statKey]}</div>
            <div class="skill-desc">${SKILL_DESCRIPTIONS[statKey]}</div>
            <div class="skill-value">${totalValue}</div>
            <div class="skill-breakdown">
                <span class="base">Base: ${statData.base}</span>
                <span class="bonus">${statData.bonus > 0 ? `Bonus: +${statData.bonus}` : 'Bonus: 0'}</span>
            </div>
            <button class="skill-btn" data-stat="${statKey}" ${skillPointsAvailable <= 0 ? 'disabled' : ''}>
                ${skillPointsAvailable > 0 ? '+ ALLOCATE' : 'NO POINTS'}
            </button>
        `;

        // Event listener na gombík
        const btn = card.querySelector('.skill-btn');
        if (btn && !btn.disabled) {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const success = await allocateSkillPoint(currentPlayerId, statKey);
                if (!success) {
                    alert('Chyba pri pridelení bodu.');
                    btn.disabled = false;
                }
            });
        }

        grid.appendChild(card);
    });

    skillsSection.appendChild(grid);

    // --- RIGHT SECTION: Perks ---
    const perksSection = document.createElement('div');
    perksSection.className = 'perks-section-modal';
    
    if (perks && perks.length > 0) {
        perksSection.innerHTML = `<h3>Perks (${perks.length})</h3>`;
        
        const perksList = document.createElement('div');
        perksList.className = 'perks-list-modal';
        
        perks.forEach(perk => {
            const perkEl = document.createElement('div');
            perkEl.className = `perk-item-modal ${perk.active ? 'active' : 'inactive'}`;
            perkEl.innerHTML = `
                <div class="perk-name">${perk.name}</div>
                <div class="perk-desc">${perk.description}</div>
                <div class="perk-status">${perk.active ? '✓ ACTIVE' : 'INACTIVE'}</div>
            `;
            perksList.appendChild(perkEl);
        });
        
        perksSection.appendChild(perksList);
    } else {
        perksSection.innerHTML = `<h3>Perks</h3><p style="color: #888; font-size: 12px;">No perks available yet.</p>`;
    }

    // Append do contentu
    content.appendChild(skillsSection);
    content.appendChild(perksSection);
}

/**
 * Cleanup
 */
export function cleanupSkillsUI() {
    if (skillsUnsubscribe) {
        skillsUnsubscribe();
        skillsUnsubscribe = null;
    }
}
