/**
 * quests.js
 * 
 * Modul na UI a logiku quest systému.
 * Quest log modal - klávesa J na otvorenie/zatvorenie.
 */

import { watchPlayerQuests, startQuest, completeQuest, getQuestData } from './database.js';
// Fallback for saveLocalJson if not present
if (!window.saveLocalJson) {
    window.saveLocalJson = async (filename, data) => {
        try {
            const response = await fetch(`/save-json?file=${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Chyba pri ukladaní ${filename}: ${response.statusText}`);
            }
        } catch (e) {
            alert(`Nepodarilo sa uložiť ${filename}: ${e.message}`);
            console.error(e);
        }
    };
}
import { speak } from './angie.js';

let currentPlayerId = null;
let questsUnsubscribe = null;
let currentQuestsData = [];
let isQuestModalOpen = false;
let currentTab = 'main'; // main, side, completed

/**
 * initQuestsUI — inicializuje quest modal
 * @param {string} playerId — ID aktuálneho hráča
 */
export function initQuestsUI(playerId) {
    currentPlayerId = playerId;

    const modal = document.getElementById('quest-modal');
    const closeBtn = document.querySelector('.quest-modal-close');
    const questBtn = document.getElementById('quest-btn');
    const tabs = document.querySelectorAll('.quest-tab');

    if (!modal || !closeBtn || !questBtn) {
        console.warn('Quest modal elements not found');
        return;
    }

    // Event listeners
    closeBtn.addEventListener('click', toggleQuestModal);
    questBtn.addEventListener('click', toggleQuestModal);

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-tab');
            updateQuestDisplay(currentQuestsData);
        });
    });

    // Klávesa J na otvorenie/zatvorenie
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'j') {
            e.preventDefault();
            toggleQuestModal();
        }
    });
    
    // Počúvaj na questsUpdated event - update UI s dátami z pamäte
    window.addEventListener('questsUpdated', (e) => {
        console.log('[questsUpdated event] Prijal som nové quest data:', e.detail.activeQuests);
        currentQuestsData = e.detail.activeQuests;
        updateQuestDisplay(e.detail.activeQuests);
    });

    // Sleduj zmeny v questoch
    if (questsUnsubscribe) {
        questsUnsubscribe();
    }

    questsUnsubscribe = watchPlayerQuests(playerId, (data) => {
        console.log("📊 Quest data received:", data);
        currentQuestsData = data;
        updateQuestDisplay(data);
    });
}

/**
 * refreshQuestUI — manuálne obnovenie quest UI (volá sa po pridaní/dokončení questu)
 */
export async function refreshQuestUI() {
    if (!currentPlayerId) {
        console.warn('Cannot refresh quest UI: No player ID set');
        return;
    }
    
    try {
        const res = await fetch('player_quests.json');
        const players = await res.json();
        const player = players.find(p => p.playerId === currentPlayerId);
        
        console.log('[refreshQuestUI] Player data:', player);
        console.log('[refreshQuestUI] Player quests:', player?.quests);
        console.log('[refreshQuestUI] Active quests:', player?.quests?.active);
        
        if (player && player.quests && player.quests.active) {
            currentQuestsData = player.quests.active;
            console.log('[refreshQuestUI] Updating display with quests:', currentQuestsData);
            updateQuestDisplay(player.quests.active);
            console.log('✓ Quest UI refreshed');
        } else {
            console.warn('[refreshQuestUI] No player or quests found');
        }
    } catch (e) {
        console.error('Failed to refresh quest UI:', e);
    }
}

/**
 * toggleQuestModal — otvor/zavri modal
 */
export function toggleQuestModal() {
    const modal = document.getElementById('quest-modal');
    const hud = document.getElementById('hud');
    if (!modal) return;

    isQuestModalOpen = !isQuestModalOpen;
    modal.classList.toggle('hidden', !isQuestModalOpen);
    
    // Skry/ukáž HUD
    if (hud) {
        if (isQuestModalOpen) {
            hud.style.display = 'none';
        } else {
            hud.style.display = 'block';
        }
    }
}

/**
 * updateQuestDisplay — aktualizuje UI podľa aktuálnych dát
 * @param {Array} quests — pole player_quests dokumentov
 */
export function updateQuestDisplay(quests) {
    const content = document.getElementById('quest-modal-content');
    if (!content) return;

    console.log('[updateQuestDisplay] Dostané questy:', quests);
    console.log('[updateQuestDisplay] Aktuálna záložka:', currentTab);

    // Vyčisti starý obsah
    content.innerHTML = '';

    // Filtruj questy podľa aktuálnej záložky
    let questsToDisplay = [];
    
    if (currentTab === 'main') {
        questsToDisplay = quests.filter(q => q.questType === 'main' && q.status !== 'completed');
    } else if (currentTab === 'side') {
        questsToDisplay = quests.filter(q => q.questType === 'subquest' && q.status !== 'completed');
    } else if (currentTab === 'completed') {
        questsToDisplay = quests.filter(q => q.status === 'completed');
    }

    console.log('[updateQuestDisplay] Zobrazujem questy pre tab "' + currentTab + '":', questsToDisplay);

    // Ak nie sú žiadne questy, zobraz prázdnu správu
    if (questsToDisplay.length === 0) {
        let emptyMessage = '';
        if (currentTab === 'main') {
            emptyMessage = 'Žiadne hlavné questy';
        } else if (currentTab === 'side') {
            emptyMessage = 'Žiadne vedľajšie questy';
        } else {
            emptyMessage = 'Žiadne dokončené questy';
        }
        content.innerHTML = `<div style="color: #888; text-align: center; padding: 40px; font-family: 'Courier New', monospace;">${emptyMessage}</div>`;
        return;
    }

    // Pomocná funkcia na vykreslenie questov (aj subquestov)
    function renderQuest(playerQuest, indent = 0) {
        const questEl = document.createElement('div');
        questEl.className = 'quest-item';
        questEl.style.marginLeft = `${indent * 32}px`;

        const title = document.createElement('div');
        title.className = 'quest-item-title';
        const questBadge = playerQuest.questType === 'main' ? '⭐' : '→';
        title.innerHTML = `${playerQuest.status === 'completed' ? '✓' : '➤'} ${questBadge} ${playerQuest.questTitle}`;
        questEl.appendChild(title);

        const desc = document.createElement('div');
        desc.className = 'quest-item-desc';
        desc.innerHTML = playerQuest.questDescription || 'No description';
        questEl.appendChild(desc);

        // Objectives progress
        if (playerQuest.objectivesProgress && Object.keys(playerQuest.objectivesProgress).length > 0) {
            const objsDiv = document.createElement('div');
            objsDiv.className = 'quest-item-objectives';
            objsDiv.innerHTML = '<strong>OBJECTIVES:</strong>';

            Object.keys(playerQuest.objectivesProgress).forEach((idx) => {
                const objProgress = playerQuest.objectivesProgress[idx];
                const isComplete = objProgress.completed ? 'completed' : 'incomplete';
                const objEl = document.createElement('div');
                objEl.className = `quest-objective ${isComplete}`;
                objEl.innerHTML = `
                    ${objProgress.completed ? '✓' : '○'} 
                    Objective ${parseInt(idx) + 1}: 
                    ${objProgress.progress} / ${objProgress.target}
                `;
                objsDiv.appendChild(objEl);
            });

            questEl.appendChild(objsDiv);
        }

        // Rewards info
        if (playerQuest.status === 'active') {
            const rewardsDiv = document.createElement('div');
            rewardsDiv.className = 'quest-rewards';
            rewardsDiv.innerHTML = '🎯 REWARDS: XP + Items (Complete to claim)';
            questEl.appendChild(rewardsDiv);
        }

        // Complete button (iba ak je aktívny a všetky objectives splnené)
        if (playerQuest.status === 'active' && isAllObjectivesComplete(playerQuest.objectivesProgress)) {
            const completeBtn = document.createElement('button');
            completeBtn.style.cssText = `
                width: 100%;
                padding: 10px;
                margin-top: 10px;
                background: linear-gradient(45deg, #44ff41, #00ff00);
                color: #000;
                border: none;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
                font-family: 'Courier New', monospace;
                transition: all 0.3s ease;
            `;
            completeBtn.innerText = 'COMPLETE QUEST';
            completeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                completeBtn.disabled = true;
                completeBtn.innerText = 'CLAIMING REWARDS...';
                // Fetchni quest data a completuj quest
                const questData = await getQuestData(playerQuest.questId);
                if (questData) {
                    const success = await completeQuest(currentPlayerId, playerQuest.questId, questData);
                    if (success) {
                        // Gratulačný dialóg
                        const questTitle = playerQuest.questTitle;
                        const xpReward = questData.rewards?.xp || 0;
                        const itemsCount = questData.rewards?.items?.length || 0;
                        const celebrationMsg = {
                            text: `🎉 QUEST COMPLETE: ${questTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ +${xpReward} XP GAINED
✓ ${itemsCount} ITEMS AWARDED

Fantastic work, unit!`,
                            options: [{ text: "Continue", action: () => document.getElementById('angie-ui').classList.add('hidden') }]
                        };
                        speak(celebrationMsg);
                        setTimeout(() => {
                            toggleQuestModal();
                        }, 2000);
                    } else {
                        alert('Chyba pri dokončení questu.');
                        completeBtn.disabled = false;
                        completeBtn.innerText = 'COMPLETE QUEST';
                    }
                } else {
                    alert('Quest data not found.');
                    completeBtn.disabled = false;
                    completeBtn.innerText = 'COMPLETE QUEST';
                }
            });
            questEl.appendChild(completeBtn);
        }

        content.appendChild(questEl);

        // Ak má quest subquesty, vykresli ich pod ním
        const questData = window.allQuestDefs?.find(q => q.id === playerQuest.questId);
        if (questData && Array.isArray(questData.subquests)) {
            questData.subquests.forEach(subId => {
                const subQ = quests.find(q => q.questId === subId);
                if (subQ) renderQuest(subQ, indent + 1);
            });
        }
    }

    // Získaj všetky definície questov (pre subquesty)
    (async () => {
        if (!window.allQuestDefs) {
            try {
                const res = await fetch('quests.json');
                window.allQuestDefs = await res.json();
            } catch {}
        }
        questsToDisplay.forEach(q => renderQuest(q, 0));
    })();
}

/**
 * isAllObjectivesComplete — skontroluje či sú všetky objektívy splnené
 * @param {Object} objectivesProgress — objekt s progress dátami
 * @returns {boolean}
 */
function isAllObjectivesComplete(objectivesProgress) {
    if (!objectivesProgress || Object.keys(objectivesProgress).length === 0) return false;
    
    return Object.values(objectivesProgress).every(obj => obj.completed === true);
}

/**
 * Cleanup
 */
export function cleanupQuestsUI() {
    if (questsUnsubscribe) {
        questsUnsubscribe();
        questsUnsubscribe = null;
    }
}
