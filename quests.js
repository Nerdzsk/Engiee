/**
 * quests.js
 * 
 * Modul na UI a logiku quest systému.
 * Quest log modal - klávesa J na otvorenie/zatvorenie.
 */

import { watchPlayerQuests, startQuest, completeQuest, getQuestData } from './database.js';
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

    console.log("🎨 Updating quest display, currentTab:", currentTab, "quests:", quests);

    // Vyčisti starý obsah
    content.innerHTML = '';

    // Filtruj podľa tabu
    let filteredQuests = [];
    
    if (currentTab === 'main') {
        filteredQuests = quests.filter(q => q.status === 'active' && q.questType === 'main');
    } else if (currentTab === 'side') {
        filteredQuests = quests.filter(q => q.status === 'active' && q.questType === 'side');
    } else if (currentTab === 'completed') {
        filteredQuests = quests.filter(q => q.status === 'completed');
    }

    console.log("✅ Filtered quests:", filteredQuests);

    if (filteredQuests.length === 0) {
        content.innerHTML = `<div style="color: #888; text-align: center; padding: 40px; font-family: 'Courier New', monospace;">
            No ${currentTab} quests
        </div>`;
        return;
    }

    // Vykresli questy
    filteredQuests.forEach((playerQuest) => {
        const questEl = document.createElement('div');
        questEl.className = 'quest-item';

        const title = document.createElement('div');
        title.className = 'quest-item-title';
        const questBadge = playerQuest.questType === 'main' ? '⭐' : '◇';
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
                        
                        // Zatvri modal a updatuj display (quest zmizne z active)
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
    });
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
