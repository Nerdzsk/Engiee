// ============================================================
// FIREBASE INICIALIZÁCIA (PRE PEDOMETER)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Inicializuj Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("[Firebase] Initialized for pedometer sync");

// ============================================================
// HELPER: CACHE-FREE FETCH
// ============================================================

/**
 * Fetch s automatickým cache bustingom
 * @param {string} url - URL súboru
 * @returns {Promise<Response>}
 */
function fetchNoCacheHelper(url) {
    const cacheBuster = url.includes('?') ? '&_=' : '?_=';
    return fetch(url + cacheBuster + Date.now(), { cache: 'no-store' });
}

// ============================================================
// PEDOMETER SYNC - Sledovanie krokov z Firebase
// ============================================================

/**
 * Sleduje zmeny v akumulátore z Firebase (kroky z mobilu)
 * @param {string} playerId - ID hráča
 * @param {object} robotObj - Referencia na robot objekt
 * @param {function} callback - Funkcia volaná pri zmene
 */
export function watchPedometerSteps(playerId, robotObj, callback) {
    const playerRef = doc(db, "players", playerId);
    
    return onSnapshot(playerRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const firebaseAccumulator = data.accumulator || 0;
            
            // Aktualizuj LEN ak Firebase hodnota je VYŠŠIA (nové kroky pridané)
            // Toto zabezpečí že NEW GAME (ACC=0) nebude prepísaný starou Firebase hodnotou
            if (robotObj && firebaseAccumulator > robotObj.accumulator) {
                console.log(`[Pedometer] Nové kroky z Firebase: ${robotObj.accumulator} → ${firebaseAccumulator}`);
                robotObj.accumulator = Math.min(firebaseAccumulator, robotObj.maxAccumulator || 10000);
                
                // Zavolaj callback pre aktualizáciu HUD
                if (callback) callback(robotObj.accumulator);
            }
        }
    }, (error) => {
        console.error("[Firebase] Error watching pedometer:", error);
    });
}

/**
 * Presunie energiu z akumulátora do hlavnej batérie
 * @param {string} playerId - ID hráča
 * @param {object} robotObj - Referencia na robot objekt (voliteľné pre backward compatibility)
 * @returns {boolean} true ak sa prenos podaril, false ak nie
 */
export async function transferEnergy(playerId, robotObj = null) {
    console.log("[transferEnergy] Presúvam energiu z akumulátora do batérie");
    
    if (!robotObj) {
        console.warn("[transferEnergy] Robot object not provided, cannot transfer energy");
        return false;
    }
    
    // Kontrola, či má robot akumulátor s energiou
    if (!robotObj.accumulator || robotObj.accumulator <= 0) {
        console.log("[transferEnergy] Akumulátor je prázdny!");
        return false;
    }
    
    // Kontrola, či nie je batéria už plná
    const maxEnergy = robotObj.maxEnergy || 200;
    if (robotObj.energy >= maxEnergy) {
        console.log("[transferEnergy] Batéria je už plná!");
        return false;
    }
    
    // Vypočítame, koľko energie môžeme presunúť
    const availableInAcc = robotObj.accumulator;
    const spaceInBattery = maxEnergy - robotObj.energy;
    const transferAmount = Math.min(availableInAcc, spaceInBattery);
    
    // Presun energie
    robotObj.accumulator -= transferAmount;
    robotObj.energy += transferAmount;
    
    console.log(`[transferEnergy] Prenesené: ${transferAmount} EP | Batéria: ${robotObj.energy}/${maxEnergy} | ACC: ${robotObj.accumulator}`);
    
    // Aktualizácia v databáze (lokálne)
    await updatePlayerStatus(playerId, robotObj.position.x, robotObj.position.z, robotObj.energy);
    
    return true;
}
// Stub for setupChargerInDB (no-op, Firestore removed)
export async function setupChargerInDB(roomId) {
    console.log("[STUB] setupChargerInDB called (no Firestore logic)");
    // Implement local logic if needed
    return true;
}
// Stub for performRepairInDB (no-op, Firestore removed)
export async function performRepairInDB(robotId, roomId, doorId, newAccumulator) {
    console.log("[STUB] performRepairInDB called (no Firestore logic)");
    // Implement local logic if needed
    return true;
}
// Stub for performChargerRepairInDB (no-op, Firestore removed)
export async function performChargerRepairInDB(robotId, roomId, chargerId, newAccumulator) {
    console.log("[STUB] performChargerRepairInDB called (no Firestore logic)");
    // Implement local logic if needed
    return true;
}
// 1. JEDNOTNÉ IMPORTY

// All Firestore/Firebase code removed. Only local file logic should remain.

// Stub for fixObjectPositions (no-op)
export function fixObjectPositions() {
    console.log("[STUB] fixObjectPositions called (no Firestore logic)");
}

// ============================================================
// SECTION: Room Management
// Functions: watchRoom
// ============================================================
// [REMOVED] watchRoom: Firestore logic deleted. Use local file loading in app.js instead.


// ============================================================
// SECTION: Item Management
// Functions: watchItems, pickUpItem
// ============================================================
// [REMOVED] watchItems: Firestore logic deleted. Use local file loading in app.js instead.


// [REMOVED] pickUpItem: Firestore logic deleted. Use local file logic instead.


// ============================================================
// SECTION: Player Core Functions
// Functions: watchPlayer, updatePlayerStatus, watchInventory, useBattery, transferEnergy
// ============================================================
/**
 * @purpose Real-time player data listener
 * @updates Triggers callback on any player field change
 * @called-from app.js, hud.js
 */
// [REMOVED] watchPlayer: Firestore logic deleted. Use local file logic instead.

// Stub for updatePlayerStatus (no-op, Firestore removed)
export async function updatePlayerStatus(playerId, x, z, energy) {
    // Implement local persistence if needed
    return true;
}




// ============================================================
// SECTION: Save/Load/Reset System
// Functions: saveGame, loadGame, resetGame
// ============================================================

/**
 * Uloží celý herný stav do save slotu
 */
export async function saveGame(playerId, slotName = 'autosave') {
    try {
        // Lokálna verzia: načítaj všetko z player_quests.json
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) throw new Error('Player data not found');
        // Ulož snapshot do save slotu (napr. player_saves_autosave.json)
        if (window.saveLocalJson) {
            await window.saveLocalJson(`player_saves_${slotName}.json`, player);
            console.log(`Game saved to slot: ${slotName}`);
            return true;
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error('Error saving game:', error);
        return false;
    }
}

/**
 * Načíta uložený herný stav zo save slotu
 */
export async function loadGame(playerId, slotName = 'autosave') {
    try {
        // Lokálna verzia: načítaj snapshot z player_saves_autosave.json
        const res = await fetch(`player_saves_${slotName}.json`);
        if (!res.ok) throw new Error('Save file not found');
        const saveData = await res.json();
        // Obnov hráča do player_quests.json
        const resAll = await fetch('player_quests.json');
        const allPlayers = await resAll.json();
        const idx = allPlayers.findIndex(q => q.playerId === playerId);
        if (idx === -1) throw new Error('Player data not found');
        allPlayers[idx] = saveData;
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', allPlayers);
            console.log(`Game loaded from slot: ${slotName}`);
            return true;
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error('Error loading game:', error);
        return false;
    }
}

/**
 * Resetuje hru na začiatok (nová hra)
 */
export async function resetGame(playerId) {
    try {
        // 1. Resetuj lokálny JSON
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) throw new Error('Player data not found');
        
        // Resetuj základné hodnoty
        player.positionX = 0;
        player.positionZ = 0;
        player.energy = 200;
        player.maxEnergy = 200;
        player.accumulator = 0;
        player.maxAccumulator = 10000;  // Správna kapacita ACC
        player.level = 1;
        player.xp = 0;
        player.skillPoints = 0;
        player.storyStep = 0;
        player.seenDialogues = [];
        player.hasSeenIntro = false;
        player.lastUpdate = Date.now();
        player.skills = {
            strength: { base: 5, bonus: 0 },
            perception: { base: 5, bonus: 0 },
            endurance: { base: 5, bonus: 0 },
            charisma: { base: 5, bonus: 0 },
            intelligence: { base: 5, bonus: 0 },
            agility: { base: 5, bonus: 0 },
            luck: { base: 5, bonus: 0 }
        };
        player.inventory = {};
        player.kodex = {};
        player.quests = { active: [], completed: [] };
        
        // Ulož lokálny JSON
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log('[resetGame] Local JSON reset complete');
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
        
        // 2. Resetuj Firebase accumulator (pedometer)
        try {
            const playerRef = doc(db, "players", playerId);
            await updateDoc(playerRef, {
                accumulator: 0
            });
            console.log('[resetGame] Firebase accumulator reset to 0');
        } catch (firebaseError) {
            console.warn('[resetGame] Firebase reset failed (non-critical):', firebaseError);
        }
        
        return true;
    } catch (error) {
        console.error('Error resetting game:', error);
        return false;
    }
}

// JEDINÁ A SPRÁVNA FUNKCIA PRE BATÉRIU
// [REMOVED] useBattery: Firestore logic deleted. Implement local logic if needed.

// [REMOVED] transferEnergy: Firestore logic deleted. Implement local logic if needed.



// --- FUNKCIA PRE DVERE (Firestore verzia) ---
// [REMOVED] updateRoomDoors: Firestore logic deleted. Implement local logic if needed.
// Táto funkcia uloží do databázy, na ktorom čísle príbehu sa hráč nachádza
// [REMOVED] updateStoryStep: Firestore logic deleted. Implement local logic if needed.

// Funkcia pridá konkrétny rozhovor do zoznamu "videných"
export async function markDialogueAsSeen(playerId, dialogueId) {
    // Lokálna verzia: zapíš do player_quests.json
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (player) {
            if (!player.seenDialogues) player.seenDialogues = [];
            if (!player.seenDialogues.includes(dialogueId)) player.seenDialogues.push(dialogueId);
            // Uložiť späť (vyžaduje saveLocalJson helper)
            if (window.saveLocalJson) {
                await window.saveLocalJson('player_quests.json', data);
            } else {
                console.warn('saveLocalJson helper nie je dostupný!');
            }
        }
    } catch (e) {
        console.error('Chyba pri označovaní dialógu (lokálne):', e);
    }
}

// Funkcia nastaví hasSeenIntro na true (volá sa po prvom zobrazení intro dialógu)
export async function markIntroAsSeen(playerId) {
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (player) {
            player.hasSeenIntro = true;
            // Uložiť späť (vyžaduje saveLocalJson helper)
            if (window.saveLocalJson) {
                await window.saveLocalJson('player_quests.json', data);
                console.log(`[Database] hasSeenIntro nastavené na true pre ${playerId}`);
            } else {
                console.warn('saveLocalJson helper nie je dostupný!');
            }
        }
    } catch (e) {
        console.error('Chyba pri nastavovaní hasSeenIntro (lokálne):', e);
    }
}
// --- FUNKCIE NA OPRAVU DVERÍ/NABÍJAČKY ---
// Firestore-dependent functions removed. Implement local logic if needed.

// --- FUNKCIE PRE SKILLS (SPECIAL) ---

// getSkills — prečíta aktuálne skills hráča (lokálna verzia)
export async function getSkills(playerId) {
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) return null;
        return player.skills || {};
    } catch (error) {
        console.error("Error: Failed to get skills:", error);
        return null;
    }
}

// allocateSkillPoint — pridelí bod do konkrétneho stattu (lokálna verzia)
export async function allocateSkillPoint(playerId, statKey) {
    const validStats = ['strength', 'perception', 'endurance', 'charisma', 'intelligence', 'agility', 'luck'];
    if (!validStats.includes(statKey)) {
        console.error("Invalid stat key:", statKey);
        return false;
    }
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) throw new Error("Player does not exist");
        if (!player.skillPoints || player.skillPoints <= 0) {
            throw new Error("No skill points available");
        }
        if (!player.skills) player.skills = {};
        const current = player.skills[statKey] || { base: 3, bonus: 0 };
        current.base = Math.min(current.base + 1, 10);
        player.skills[statKey] = current;
        player.skillPoints = player.skillPoints - 1;
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log(`Skill ${statKey} allocated successfully`);
            return true;
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error("Error: Failed to allocate skill point:", error);
        return false;
    }
}

// updateSkill — aktualizuje konkrétny stat (base alebo bonus) (lokálna verzia)
export async function updateSkill(playerId, statKey, updates) {
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) throw new Error("Player does not exist");
        if (!player.skills) player.skills = {};
        const current = player.skills[statKey] || { base: 3, bonus: 0 };
        Object.assign(current, updates);
        current.base = Math.max(0, Math.min(10, current.base));
        current.bonus = Math.max(0, Math.min(10, current.bonus));
        player.skills[statKey] = current;
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log(`Skill ${statKey} updated:`, current);
            return true;
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error("Error: Failed to update skill:", error);
        return false;
    }
}

/**
 * watchPlayerSkills — sleduje zmeny v skills hráča (realtime)
 * @param {string} playerId — ID hráča
 * @param {Function} callback — zavolaná pri zmene dát
 * @returns {Function} unsubscribe funkcia
 */
export function watchPlayerSkills(playerId, callback) {
    // Lokálna verzia: načítaj skills z JSON súboru (napr. player_quests.json alebo player_skills.json)
    fetch('player_quests.json')
        .then(res => res.json())
        .then(dataArr => {
            // Predpoklad: skills sú v objekte s playerId
            const player = dataArr.find(q => q.playerId === playerId);
            if (player && player.skills) {
                callback({
                    skills: player.skills || {},
                    skillPointsAvailable: player.skillPointsAvailable || 0,
                    perks: player.perks || []
                });
            } else {
                callback({ skills: {}, skillPointsAvailable: 0, perks: [] });
            }
        });
    // V lokálnej verzii nie je realtime, takže nevraciame unsubscribe
    return () => {};
}

// --- INVENTORY SYSTEM ---

/**
 * watchPlayerInventory — sleduje inventár hráča (realtime)
 * @param {string} playerId — ID hráča
 * @param {Function} callback — zavolaná pri zmene dát (dostane object s itemTypes)
 * @returns {Function} unsubscribe funkcia
 */
export function watchPlayerInventory(playerId, callback) {
    // Lokálna verzia: načítaj inventár z JSON súboru (napr. player_quests.json alebo player_inventory.json)
    fetch('player_quests.json')
        .then(res => res.json())
        .then(dataArr => {
            // Predpoklad: inventory je v objekte s playerId
            const player = dataArr.find(q => q.playerId === playerId);
            if (player && player.inventory) {
                callback(player.inventory);
            } else {
                callback({});
            }
        });
    // V lokálnej verzii nie je realtime, takže nevraciame unsubscribe
    return () => {};
}

/**
 * addToInventory — pridá item do inventára hráča
 * @param {string} playerId — ID hráča
 * @param {string} itemType — typ itemu (napr. 'keycard', 'health_pack')
 * @param {number} count — počet (default 1)
 */
export async function addToInventory(playerId, itemType, count = 1) {
    const playerRef = doc(db, "players", playerId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) {
                console.error("Hráč neexistuje");
                return;
            }

            const inventory = playerDoc.data().inventory || {};
            const currentCount = inventory[itemType]?.count || 0;
            const maxCount = inventory[itemType]?.maxCount || 99;

            // Neprekročíme maximálny počet
            const newCount = Math.min(currentCount + count, maxCount);

            transaction.update(playerRef, {
                [`inventory.${itemType}`]: {
                    count: newCount,
                    maxCount: maxCount,
                    addedAt: new Date()
                }
            });
        });

        console.log(`Pridané: ${count}x ${itemType}`);
    } catch (e) {
        console.error("Chyba pri pridaní do inventára:", e);
    }
}

/**
 * removeFromInventory — odstráni item z inventára
 * @param {string} playerId — ID hráča
 * @param {string} itemType — typ itemu
 * @param {number} count — počet na odstránenie (default 1)
 */
export async function removeFromInventory(playerId, itemType, count = 1) {
    const playerRef = doc(db, "players", playerId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) return;

            const inventory = playerDoc.data().inventory || {};
            const currentCount = inventory[itemType]?.count || 0;
            const newCount = Math.max(0, currentCount - count);

            if (newCount <= 0) {
                // Odstránime item úplne
                const updatedInventory = { ...inventory };
                delete updatedInventory[itemType];
                transaction.update(playerRef, { inventory: updatedInventory });
            } else {
                transaction.update(playerRef, {
                    [`inventory.${itemType}.count`]: newCount
                });
            }
        });

        console.log(`Odstránené: ${count}x ${itemType}`);
    } catch (e) {
        console.error("Chyba pri odstránení z inventára:", e);
    }
}

/**
 * useInventoryItem — použije item z inventára (odstráni ho a spustí efekt)
 * @param {string} playerId — ID hráča
 * @param {string} itemType — typ itemu
 */
export async function useInventoryItem(playerId, itemType) {
    const playerRef = doc(db, "players", playerId);
    
    try {
        // Efekty jednotlivých itemov
        if (itemType === 'battery_pack') {
            // Battery pack pridá 100 do akumulátora
            await runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                if (!playerDoc.exists()) return;

                const currentAccumulator = playerDoc.data()?.accumulator || 0;
                const maxAccumulator = playerDoc.data()?.accumulatorMax || 10000;
                const newAccumulator = Math.min(currentAccumulator + 100, maxAccumulator);

                transaction.update(playerRef, {
                    accumulator: newAccumulator
                });
            });
            console.log(`✓ Battery Pack použitý: +100 energie do akumulátora`);
        } else if (itemType === 'energy_cell') {
            // Energy cell pridá 50 do akumulátora
            await runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                if (!playerDoc.exists()) return;

                const currentAccumulator = playerDoc.data()?.accumulator || 0;
                const maxAccumulator = playerDoc.data()?.accumulatorMax || 10000;
                const newAccumulator = Math.min(currentAccumulator + 50, maxAccumulator);

                transaction.update(playerRef, {
                    accumulator: newAccumulator
                });
            });
            console.log(`✓ Energy Cell použitá: +50 energie do akumulátora`);
        } else {
            console.log(`Použitý item: ${itemType} (bez efektu)`);
        }

        // Odstráň item z inventára
        await removeFromInventory(playerId, itemType, 1);
    } catch (e) {
        console.error("Chyba pri použití itemu:", e);
    }
}

// --- KODEX SYSTEM ---

/**
 * watchPlayerKodex — sleduje kodex hráča (realtime)
 * @param {string} playerId — ID hráča
 * @param {Function} callback — zavolaná pri zmene dát
 * @returns {Function} unsubscribe funkcia
 */
export function watchPlayerKodex(playerId, callback) {
    // Lokálna verzia: načítaj kodex z JSON súboru (napr. player_quests.json alebo player_kodex.json)
    fetch('player_quests.json')
        .then(res => res.json())
        .then(dataArr => {
            // Predpoklad: kodex je v objekte s playerId
            const player = dataArr.find(q => q.playerId === playerId);
            if (player && player.kodex) {
                callback(player.kodex);
            } else {
                callback({});
            }
        });
    // V lokálnej verzii nie je realtime, takže nevraciame unsubscribe
    return () => {};
}

/**
 * addKodexEntry — odomkne/pridá entry do kodexu
 * @param {string} playerId — ID hráča
 * @param {string} entryId — ID entry-u (napr. 'postavy_engee')
 * @param {Object} entryData — dáta entry-u (unlocked, unlockedAt, title, atď.)
 */
export async function addKodexEntry(playerId, entryId, entryData) {
    // Lokálna verzia: zapíš do player_quests.json
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (player) {
            if (!player.kodex) player.kodex = {};
            if (player.kodex[entryId]?.unlocked) return;
            player.kodex[entryId] = {
                ...entryData,
                unlocked: true,
                unlockedAt: Date.now()
            };
            if (window.saveLocalJson) {
                await window.saveLocalJson('player_quests.json', data);
            } else {
                console.warn('saveLocalJson helper nie je dostupný!');
            }
        }
    } catch (e) {
        console.error('Chyba pri pridávaní kodex entry (lokálne):', e);
    }
}

// --- QUEST SYSTEM ---

/**
 * watchPlayerQuests — sleduje questy hráča (realtime)
 * @param {string} playerId — ID hráča
 * @param {Function} callback — zavolaná pri zmene dát (dostane pole player_quests dokumentov)
 * @returns {Function} unsubscribe funkcia
 */
export function watchPlayerQuests(playerId, callback) {
    // LOCAL: Read player_quests.json and get player's active quests
    fetch('player_quests.json')
        .then(res => res.json())
        .then(players => {
            const player = players.find(p => p.playerId === playerId);
            if (player && player.quests && player.quests.active) {
                callback(player.quests.active);
            } else {
                callback([]);
            }
        })
        .catch(() => callback([]));
    return () => {}; // No real-time in local version
}

/**
 * startQuest — hráč zahájí quest
 * @param {string} playerId — ID hráča
 * @param {string} questId — ID questu
 * @param {Object} questData — dáta questu z quests kolekcie
 * @returns {Promise<boolean>}
 */
export async function startQuest(playerId, questId, questData) {
    // LOCAL: Add new quest to player.quests.active in player_quests.json
    try {
        const res = await fetch('player_quests.json');
        const players = await res.json();
        const player = players.find(p => p.playerId === playerId);
        
        if (!player) throw new Error("Player not found");
        if (!player.quests) player.quests = { active: [], completed: [] };
        
        // Check if quest already active
        if (player.quests.active.some(q => q.questId === questId)) {
            console.log("Quest už je zahájený");
            return false;
        }
        
        const objectivesProgress = {};
        if (questData.objectives && Array.isArray(questData.objectives)) {
            questData.objectives.forEach((obj, idx) => {
                objectivesProgress[idx] = {
                    completed: false,
                    progress: 0,
                    target: obj.target || 1
                };
            });
        }
        
        player.quests.active.push({
            questId,
            questTitle: questData.title || "Unnamed Quest",
            questType: questData.type || "side",
            status: "active",
            startedAt: new Date().toISOString(),
            objectivesProgress,
            completedAt: null
        });
        
        await window.saveLocalJson('player_quests.json', players);
        console.log(`✓ Quest started: ${questId}`);
        
        // Trigger quest UI update event s aktuálnymi dátami z pamäte
        window.dispatchEvent(new CustomEvent('questsUpdated', { 
            detail: { activeQuests: player.quests.active } 
        }));
        
        return true;
    } catch (e) {
        console.error("Chyba pri zahájení questu:", e);
        return false;
    }
}

/**
 * updateQuestProgress — aktualizuje progress konkrétneho objektívu
 * @param {string} playerId — ID hráča
 * @param {string} questId — ID questu
 * @param {number} objectiveIndex — index objektívu (0-based)
 * @param {number} progressAmount — koľko pridať k progressu
 * @returns {Promise<boolean>}
 */
export async function updateQuestProgress(playerId, questId, objectiveIndex, progressAmount = 1) {
    // LOCAL: Update quest progress in player.quests.active
    try {
        const res = await fetch('player_quests.json');
        const players = await res.json();
        const player = players.find(p => p.playerId === playerId);
        
        if (!player || !player.quests || !player.quests.active) throw new Error("Player or quests not found");
        
        const quest = player.quests.active.find(q => q.questId === questId);
        if (!quest) throw new Error("Quest neexistuje");
        if (!quest.objectivesProgress[objectiveIndex]) throw new Error("Objektív neexistuje");
        
        quest.objectivesProgress[objectiveIndex].progress += progressAmount;
        if (quest.objectivesProgress[objectiveIndex].progress >= quest.objectivesProgress[objectiveIndex].target) {
            quest.objectivesProgress[objectiveIndex].completed = true;
        }
        
        await window.saveLocalJson('player_quests.json', players);
        console.log(`✓ Quest ${questId} progress updated: obj ${objectiveIndex}`);
        return true;
    } catch (e) {
        console.error("Chyba pri aktualizácii progressu:", e);
        return false;
    }
}

/**
 * completeQuest — dokončí quest a vypláti rewards
 * @param {string} playerId — ID hráča
 * @param {string} questId — ID questu
 * @param {Object} questData — dáta questu (rewards {xp, items, skillPoints})
 * @returns {Promise<boolean>}
 */
export async function completeQuest(playerId, questId, questData) {
    // LOCAL: Move quest from active to completed and give rewards
    try {
        const res = await fetch('player_quests.json');
        const players = await res.json();
        const player = players.find(p => p.playerId === playerId);
        
        if (!player || !player.quests) throw new Error("Player not found");
        
        const questIndex = player.quests.active.findIndex(q => q.questId === questId);
        if (questIndex === -1) throw new Error("Quest neexistuje");
        
        // Remove from active and add to completed
        const completedQuest = player.quests.active.splice(questIndex, 1)[0];
        completedQuest.status = "completed";
        completedQuest.completedAt = new Date().toISOString();
        player.quests.completed.push(completedQuest);
        
        // Give rewards
        if (questData.rewards) {
            if (questData.rewards.xp) {
                player.xp = (player.xp || 0) + questData.rewards.xp;
            }
            if (questData.rewards.skillPoints) {
                player.skillPoints = (player.skillPoints || 0) + questData.rewards.skillPoints;
            }
            // TODO: Add items to inventory if needed
        }
        
        await window.saveLocalJson('player_quests.json', players);
        console.log(`✓ Quest ${questId} completed with full rewards!`);
        return true;
    } catch (e) {
        console.error("Chyba pri dokončení questu:", e);
        return false;
    }
}

// --- LEVEL SYSTEM ---

/**
 * calculateXPForLevel — vypočíta potrebné XP pre konkrétny level
 * @param {number} level — cieľový level
 * @returns {number} potrebné XP
 */
export function calculateXPForLevel(level) {
    // Exponenciálny rast: level² × 100
    // Level 1→2: 100 XP
    // Level 2→3: 400 XP
    // Level 3→4: 900 XP
    // Level 4→5: 1600 XP
    return Math.floor(Math.pow(level, 2) * 100);
}

/**
 * giveXP — pridá XP hráčovi a automaticky spraví level up ak treba (lokálna verzia)
 * @param {string} playerId — ID hráča
 * @param {number} amount — množstvo XP
 * @param {string} source — zdroj XP (pre log)
 * @returns {Promise<{leveled: boolean, newLevel?: number}>}
 */
export async function giveXP(playerId, amount, source = "unknown") {
    try {
        const res = await fetch('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        if (!player) throw new Error("Hráč neexistuje");
        const currentLevel = player.level || 1;
        const currentXP = player.currentXP || 0;
        const skillPoints = player.skillPoints || 0;
        let newXP = currentXP + amount;
        let newLevel = currentLevel;
        let leveledUp = false;
        let skillPointsGained = 0;
        // Check pre level up (môže byť viacero levelov naraz)
        while (newXP >= calculateXPForLevel(newLevel)) {
            newXP -= calculateXPForLevel(newLevel);
            newLevel++;
            leveledUp = true;
            // Za každý level: 2 skill body (môžeš upraviť)
            skillPointsGained += 2;
        }
        const xpToNext = calculateXPForLevel(newLevel);
        // Update player data
        player.currentXP = newXP;
        player.level = newLevel;
        player.xpToNextLevel = xpToNext;
        player.skillPoints = skillPoints + skillPointsGained;
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log(`✓ XP Gained: +${amount} from ${source} | Level: ${newLevel} | XP: ${newXP}/${xpToNext}`);
            if (leveledUp) {
                console.log(`🎉 LEVEL UP! ${currentLevel} → ${newLevel} (+${skillPointsGained} skill points)`);
            }
            return {
                leveled: leveledUp,
                newLevel: leveledUp ? newLevel : undefined,
                skillPointsGained: skillPointsGained
            };
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (e) {
        console.error("Chyba pri pridávaní XP:", e);
        return { leveled: false };
    }
}

    /**
     * watchPlayerLevel — sleduje level/XP hráča (realtime)
     * @param {string} playerId — ID hráča
     * @param {Function} callback — zavolaná pri zmene (level, currentXP, xpToNextLevel)
     * @returns {Function} unsubscribe funkcia
     */
    // [REMOVED] watchPlayerLevel: Firestore logic deleted. Use local file logic instead.


/**
 * getQuestData — fetchne quest data z quests kolekcie
 * @param {string} questId — ID questu
 * @returns {Promise<Object|null>} quest dokument alebo null ak neexistuje
 */
export async function getQuestData(questId) {
    // LOCAL: Read quest data from quests.json
    try {
        const res = await fetch('quests.json');
        const allQuests = await res.json();
        const quest = allQuests.find(q => q.id === questId);
        return quest || null;
    } catch (e) {
        console.error("Chyba pri fetchnutí quest dát:", e);
        return null;
    }
}

/**
 * createMainQuest — vytvorí quest "Kde to som" ak neexistuje
 */
// [REMOVED] createMainQuest: Firestore logic deleted. Use local file logic instead.


/**
 * resetPlayerQuest — vymaže player quest (pre reset/debug)
 */
// [REMOVED] resetPlayerQuest: Firestore logic deleted. Use local file logic instead.
