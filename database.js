// 1. JEDNOTNÉ IMPORTY
import { firebaseConfig } from './config.js'; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    enableIndexedDbPersistence,
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    onSnapshot,
    collection,
    query,
    where,
    deleteDoc,
    increment,
    arrayUnion,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. INICIALIZÁCIA
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Viacero otvorených tabov naraz (persistence funguje len v jednom)
        console.warn("Persistence failed: Multiple tabs open");
    } else if (err.code == 'unimplemented') {
        // Prehliadač nepodporuje túto funkciu
        console.warn("Persistence is not supported by this browser");
    }
});

// ============================================================
// SECTION: Room Management
// Functions: watchRoom
// ============================================================
export function watchRoom(roomId, callback) {
    const docRef = doc(db, "rooms", roomId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            setDoc(docRef, { width: 5, depth: 5, name: "Nová miestnosť" });
        }
    });
}

// ============================================================
// SECTION: Item Management
// Functions: watchItems, pickUpItem
// ============================================================
export function watchItems(roomId, callback) {
    const itemsRef = collection(db, "items");
    const q = query(itemsRef, where("location", "==", roomId), where("status", "==", "on_ground"));
    return onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() }); });
        callback(items);
    });
}

export async function pickUpItem(playerId, itemId) {
    const itemRef = doc(db, "items", itemId);
    try {
        await updateDoc(itemRef, { status: "in_inventory", owner: playerId, location: "none" });
    } catch (e) { console.error("Chyba pri dvíhaní: ", e); }
}

// ============================================================
// SECTION: Player Core Functions
// Functions: watchPlayer, updatePlayerStatus, watchInventory, useBattery, transferEnergy
// ============================================================
/**
 * @purpose Real-time player data listener
 * @updates Triggers callback on any player field change
 * @called-from app.js, hud.js
 */
export function watchPlayer(playerId, callback) {
    const docRef = doc(db, "players", playerId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) callback(docSnap.data());
    });
}

export async function updatePlayerStatus(playerId, x, z, energy) {
    const docRef = doc(db, "players", playerId);
    try {
        await updateDoc(docRef, {
            positionX: x,
            positionZ: z,
            energy: energy,
            lastUpdate: new Date()
        });
    } catch (e) {
        // Ak hráč neexistuje, vytvoríme ho so správnym MAX 200
        await setDoc(docRef, { 
            positionX: x, 
            positionZ: z,
            energy: energy,
            maxEnergy: 200, 
            accumulator: 0,
            lastUpdate: new Date()
        }, { merge: true });
    }
}
// ============================================================
// SECTION: Kodex System
// Functions: watchPlayerKodex, addKodexEntry
// ============================================================
/**
 * @purpose Real-time kodex entries listener
 * @updates Triggers callback when new entries unlocked
 * @called-from kodex.js
 */export function watchInventory(playerId, callback) {
    const itemsRef = collection(db, "items");
    const q = query(itemsRef, where("owner", "==", playerId), where("status", "==", "in_inventory"));
    return onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() }); });
        callback(items);
    });
}

// JEDINÁ A SPRÁVNA FUNKCIA PRE BATÉRIU
export async function useBattery(playerId, itemId, energyAmount) {
    const playerRef = doc(db, "players", playerId);
    const itemRef = doc(db, "items", itemId);
    try {
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
            const data = playerSnap.data();
            const maxEng = data.maxEnergy || 200; 
            const newEnergy = Math.min(maxEng, (data.energy || 0) + energyAmount);
            await updateDoc(playerRef, { energy: newEnergy });
            await deleteDoc(itemRef);
        }
    } catch (e) { console.error("Chyba batérie:", e); }
}

// JEDINÁ A SPRÁVNA FUNKCIA PRE PRENOS
export async function transferEnergy(playerId) {
    const playerRef = doc(db, "players", playerId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) return;
            
            const data = playerDoc.data();
            const maxEng = data.maxEnergy || 200; 
            const available = data.accumulator || 0;
            const current = data.energy || 0;

            if (available > 0 && current < maxEng) {
                const transferAmount = Math.min(available, maxEng - current);
                const newEnergy = current + transferAmount;
                const newAccumulator = available - transferAmount;
                
                transaction.update(playerRef, {
                    energy: newEnergy,
                    accumulator: newAccumulator
                });
            }
        });
    } catch (e) {
        console.error("Chyba pri prenose energie:", e);
    }
}


// --- FUNKCIA PRE DVERE (Firestore verzia) ---
export async function updateRoomDoors(roomId, doorIndex, isBrokenStatus) {
    const roomRef = doc(db, "rooms", roomId);
    
    try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
            const data = roomSnap.data();
            const doors = data.doors || [];
            
            // 1. Zmeníme stav konkrétnych dverí v poli
            if (doors[doorIndex]) {
                doors[doorIndex].isBroken = isBrokenStatus;
                
                // 2. Zapíšeme celé aktualizované pole dverí späť do dokumentu miestnosti
                await updateDoc(roomRef, { doors: doors });
                console.log(`Dvere na indexe ${doorIndex} boli v DB aktualizované.`);
            }
        }
    } catch (e) {
        console.error("Chyba pri aktualizácii dverí v DB:", e);
    }
}
// Táto funkcia uloží do databázy, na ktorom čísle príbehu sa hráč nachádza
export async function updateStoryStep(playerId, step) {
    const docRef = doc(db, "players", playerId);
    try {
        await updateDoc(docRef, {
            storyStep: step
        });
    } catch (e) {
        console.error("Chyba pri ukladaní kroku príbehu:", e);
    }
}

// Funkcia pridá konkrétny rozhovor do zoznamu "videných"
export async function markDialogueAsSeen(playerId, dialogueId) {
    const docRef = doc(db, "players", playerId);
    try {
        await updateDoc(docRef, {
            seenDialogues: arrayUnion(dialogueId)
        });
    } catch (e) {
        console.error("Chyba pri označovaní dialógu:", e);
    }
}
// --- FUNKCIA NA OPRAVU DVERÍ V DATABÁZE ---
// --- FUNKCIA NA OPRAVU DVERÍ (FIRESTORE VERZIA) ---
// --- FUNKCIA NA OPRAVU DVERÍ (FIRESTORE VERZIA) ---
export async function performRepairInDB(robotId, roomId, doorId, newAccumulator) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        const doors = roomData.doors || [];

        const updatedDoors = doors.map(door => {
            if (door.id === doorId) {
                return { ...door, isBroken: false };
            }
            return door;
        });

        // 1. Aktualizácia dverí v miestnosti
        await updateDoc(roomRef, { doors: updatedDoors });

        // 2. Aktualizácia akumulátora a dialógov v kolekcii "players"
        const robotRef = doc(db, "players", robotId); 
        await updateDoc(robotRef, {
            accumulator: newAccumulator,
            seenDialogues: arrayUnion("DOOR_FIXED")
        });

        console.log("Firestore: Oprava úspešne dokončená! (použitý akumulátor)");
        return true;
    } catch (error) {
        console.error("Firestore Error: Chyba pri oprave:", error);
        return false;
    }
}
// Táto funkcia pridá nabíjačku do tvojej miestnosti vo Firebase
export async function setupChargerInDB(roomId) {
    const roomRef = doc(db, "rooms", roomId);
    
    try {
        await updateDoc(roomRef, {
            // Vytvoríme pole chargers v dokumente room1
            chargers: [
                {
                    id: "charger_1",
                    x: -3,           // Pozícia vľavo
                    z: -3,           // Pozícia "vzadu"
                    isBroken: true,  // Začíname v stave "zničená"
                    repairCost: 50   // Cena opravy z akumulátora
                }
            ]
        });
        console.log("Firebase: Nabíjačka charger_1 bola úspešne pridaná do " + roomId);
    } catch (e) {
        console.error("Chyba pri pridávaní nabíjačky: ", e);
    }
}
// --- FUNKCIA NA OPRAVU NABÍJAČKY V DATABÁZE ---
export async function performChargerRepairInDB(robotId, roomId, chargerId, newAccumulator) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return false;

        const roomData = roomSnap.data();
        const chargers = roomData.chargers || [];

        // 1. Aktualizujeme stav nabíjačky v poli
        const updatedChargers = chargers.map(ch => {
            if (ch.id === chargerId) {
                return { ...ch, isBroken: false };
            }
            return ch;
        });

        // Zapíšeme opravené nabíjačky späť do miestnosti
        await updateDoc(roomRef, { chargers: updatedChargers });

        // 2. Aktualizujeme akumulátor hráča a pridáme značku, že je opravené
        const robotRef = doc(db, "players", robotId); 
        await updateDoc(robotRef, {
            accumulator: newAccumulator,
            seenDialogues: arrayUnion("CHARGER_FIXED")
        });

        console.log("Firestore: Nabíjacia stanica bola úspešne opravená!");
        return true;
    } catch (error) {
        console.error("Firestore Error: Chyba pri oprave nabíjačky:", error);
        return false;
    }
}

// --- FUNKCIE PRE SKILLS (SPECIAL) ---

/**
 * getSkills — prečíta aktuálne skills hráča
 * @param {string} playerId — ID hráča
 * @returns {Promise<Object>} skills object alebo null
 */
export async function getSkills(playerId) {
    try {
        const docRef = doc(db, "players", playerId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;
        return snap.data().skills || {};
    } catch (error) {
        console.error("Firestore Error: Failed to get skills:", error);
        return null;
    }
}

/**
 * allocateSkillPoint — transakčne pridelí bod do konkrétneho stattu
 * Skontroluje dostupnosť bodov a bezpečne zvýši base value (max 10)
 * @param {string} playerId — ID hráča
 * @param {string} statKey — stat key (S, P, E, C, I, A, L)
 * @returns {Promise<boolean>} true ak úspešne, false ak zlyhanie
 */
export async function allocateSkillPoint(playerId, statKey) {
    const validStats = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];
    if (!validStats.includes(statKey)) {
        console.error("Invalid stat key:", statKey);
        return false;
    }

    try {
        const result = await runTransaction(db, async (transaction) => {
            const playerRef = doc(db, "players", playerId);
            const snap = await transaction.get(playerRef);

            if (!snap.exists()) {
                throw new Error("Player does not exist");
            }

            const data = snap.data();
            const skillPointsAvailable = data.skillPointsAvailable || 0;

            if (skillPointsAvailable <= 0) {
                throw new Error("No skill points available");
            }

            const skills = data.skills || {};
            const current = skills[statKey] || { base: 3, bonus: 0 };

            // Zvýš base value, max 10
            current.base = Math.min(current.base + 1, 10);
            skills[statKey] = current;

            // Zapíš zmeny
            transaction.update(playerRef, {
                skills: skills,
                skillPointsAvailable: skillPointsAvailable - 1
            });

            return true;
        });

        console.log(`Skill ${statKey} allocated successfully`);
        return result;
    } catch (error) {
        console.error("Firestore Error: Failed to allocate skill point:", error);
        return false;
    }
}

/**
 * updateSkill — aktualizuje konkrétny stat (base alebo bonus)
 * Používa sa len z trusted backend alebo admin operácií
 * @param {string} playerId — ID hráča
 * @param {string} statKey — stat key
 * @param {Object} updates — { base?: number, bonus?: number }
 * @returns {Promise<boolean>}
 */
export async function updateSkill(playerId, statKey, updates) {
    try {
        const playerRef = doc(db, "players", playerId);
        const snap = await getDoc(playerRef);

        if (!snap.exists()) {
            console.error("Player does not exist");
            return false;
        }

        const data = snap.data();
        const skills = data.skills || {};
        const current = skills[statKey] || { base: 3, bonus: 0 };

        // Merge aktualizácie
        Object.assign(current, updates);

        // Clamp hodnoty (0-10)
        current.base = Math.max(0, Math.min(10, current.base));
        current.bonus = Math.max(0, Math.min(10, current.bonus));

        skills[statKey] = current;

        await updateDoc(playerRef, { skills });
        console.log(`Skill ${statKey} updated:`, current);
        return true;
    } catch (error) {
        console.error("Firestore Error: Failed to update skill:", error);
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
    const playerRef = doc(db, "players", playerId);
    return onSnapshot(playerRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback({
                skills: data.skills || {},
                skillPointsAvailable: data.skillPointsAvailable || 0,
                perks: data.perks || []
            });
        }
    });
}

// --- INVENTORY SYSTEM ---

/**
 * watchPlayerInventory — sleduje inventár hráča (realtime)
 * @param {string} playerId — ID hráča
 * @param {Function} callback — zavolaná pri zmene dát (dostane object s itemTypes)
 * @returns {Function} unsubscribe funkcia
 */
export function watchPlayerInventory(playerId, callback) {
    const playerRef = doc(db, "players", playerId);
    return onSnapshot(playerRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback(data.inventory || {});
        }
    });
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
    const playerRef = doc(db, "players", playerId);
    return onSnapshot(playerRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback(data.kodex || {});
        }
    });
}

/**
 * addKodexEntry — odomkne/pridá entry do kodexu
 * @param {string} playerId — ID hráča
 * @param {string} entryId — ID entry-u (napr. 'postavy_engee')
 * @param {Object} entryData — dáta entry-u (unlocked, unlockedAt, title, atď.)
 */
export async function addKodexEntry(playerId, entryId, entryData) {
    const playerRef = doc(db, "players", playerId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) {
                console.error("Hráč neexistuje");
                return;
            }

            const kodex = playerDoc.data().kodex || {};
            
            // Ak je already odomknuté, neskáčeme
            if (kodex[entryId]?.unlocked) {
                return;
            }

            // Pridáme/updatujeme entry
            transaction.update(playerRef, {
                [`kodex.${entryId}`]: {
                    ...entryData,
                    unlockedAt: new Date()
                }
            });
        });

        console.log(`Kodex entry odomknutý: ${entryId}`);
    } catch (e) {
        console.error("Chyba pri odomknutí kodexu:", e);
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
    const questsRef = collection(db, "player_quests");
    const q = query(questsRef, where("playerId", "==", playerId));
    return onSnapshot(q, (snapshot) => {
        const quests = [];
        snapshot.forEach((doc) => {
            quests.push({ id: doc.id, ...doc.data() });
        });
        callback(quests);
    });
}

/**
 * startQuest — hráč zahájí quest
 * @param {string} playerId — ID hráča
 * @param {string} questId — ID questu
 * @param {Object} questData — dáta questu z quests kolekcie
 * @returns {Promise<boolean>}
 */
export async function startQuest(playerId, questId, questData) {
    const playerQuestRef = doc(db, "player_quests", `${playerId}_${questId}`);
    
    try {
        const playerQuestSnap = await getDoc(playerQuestRef);
        if (playerQuestSnap.exists()) {
            console.log("Quest už je zahájený");
            return false;
        }

        // Inicializuj objectives progress
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

        await setDoc(playerQuestRef, {
            playerId: playerId,
            questId: questId,
            questTitle: questData.title || "Unnamed Quest",
            questType: questData.type || "side", // main alebo side
            status: "active", // active, completed, abandoned
            startedAt: new Date(),
            objectivesProgress: objectivesProgress,
            completedAt: null
        });

        console.log(`✓ Quest started: ${questId}`);
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
    const playerQuestRef = doc(db, "player_quests", `${playerId}_${questId}`);
    
    try {
        await runTransaction(db, async (transaction) => {
            const questSnap = await transaction.get(playerQuestRef);
            if (!questSnap.exists()) {
                throw new Error("Quest neexistuje");
            }

            const data = questSnap.data();
            const progress = data.objectivesProgress || {};
            
            if (!progress[objectiveIndex]) {
                throw new Error("Objektív neexistuje");
            }

            progress[objectiveIndex].progress += progressAmount;
            
            // Check ak je objektív splnený
            if (progress[objectiveIndex].progress >= progress[objectiveIndex].target) {
                progress[objectiveIndex].completed = true;
            }

            transaction.update(playerQuestRef, {
                objectivesProgress: progress
            });
        });

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
    const playerRef = doc(db, "players", playerId);
    const playerQuestRef = doc(db, "player_quests", `${playerId}_${questId}`);
    
    try {
        await runTransaction(db, async (transaction) => {
            const playerSnap = await transaction.get(playerRef);
            const questSnap = await transaction.get(playerQuestRef);

            if (!playerSnap.exists() || !questSnap.exists()) {
                throw new Error("Hráč alebo quest neexistuje");
            }

            // 1. Vyplatiť XP (ak sú rewards)
            if (questData.rewards?.xp) {
                const currentXP = playerSnap.data().currentXP || 0;
                const currentLevel = playerSnap.data().level || 1;
                let newXP = currentXP + questData.rewards.xp;
                let newLevel = currentLevel;
                let skillPointsGained = 0;

                // Check pre level up
                while (newXP >= calculateXPForLevel(newLevel)) {
                    newXP -= calculateXPForLevel(newLevel);
                    newLevel++;
                    skillPointsGained += 2;
                }

                transaction.update(playerRef, {
                    currentXP: newXP,
                    level: newLevel,
                    xpToNextLevel: calculateXPForLevel(newLevel),
                    skillPointsAvailable: (playerSnap.data().skillPointsAvailable || 0) + skillPointsGained
                });

                console.log(`✓ Quest rewards: +${questData.rewards.xp} XP`);
            }

            // 2. Vyplatiť items (ak sú)
            if (questData.rewards?.items && Array.isArray(questData.rewards.items)) {
                const inventory = playerSnap.data().inventory || {};
                questData.rewards.items.forEach(item => {
                    const itemType = item.type || item;
                    const count = item.count || 1;
                    inventory[itemType] = {
                        count: (inventory[itemType]?.count || 0) + count,
                        maxCount: inventory[itemType]?.maxCount || 99,
                        addedAt: new Date()
                    };
                });
                transaction.update(playerRef, { inventory });
                console.log(`✓ Quest items awarded`);
            }

            // 3. Update quest status
            transaction.update(playerQuestRef, {
                status: "completed",
                completedAt: new Date()
            });
        });

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
     * giveXP — pridá XP hráčovi a automaticky spraví level up ak treba
     * @param {string} playerId — ID hráča
     * @param {number} amount — množstvo XP
     * @param {string} source — zdroj XP (pre log)
     * @returns {Promise<{leveled: boolean, newLevel?: number}>}
     */
    export async function giveXP(playerId, amount, source = "unknown") {
        const playerRef = doc(db, "players", playerId);
    
        try {
            const result = await runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                if (!playerDoc.exists()) {
                    throw new Error("Hráč neexistuje");
                }

                const data = playerDoc.data();
                const currentLevel = data.level || 1;
                const currentXP = data.currentXP || 0;
                const skillPointsAvailable = data.skillPointsAvailable || 0;

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
                transaction.update(playerRef, {
                    currentXP: newXP,
                    level: newLevel,
                    xpToNextLevel: xpToNext,
                    skillPointsAvailable: skillPointsAvailable + skillPointsGained
                });

                console.log(`✓ XP Gained: +${amount} from ${source} | Level: ${newLevel} | XP: ${newXP}/${xpToNext}`);
            
                if (leveledUp) {
                    console.log(`🎉 LEVEL UP! ${currentLevel} → ${newLevel} (+${skillPointsGained} skill points)`);
                }

                return {
                    leveled: leveledUp,
                    newLevel: leveledUp ? newLevel : undefined,
                    skillPointsGained: skillPointsGained
                };
            });

            return result;
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
    export function watchPlayerLevel(playerId, callback) {
        const playerRef = doc(db, "players", playerId);
        return onSnapshot(playerRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                callback({
                    level: data.level || 1,
                    currentXP: data.currentXP || 0,
                    xpToNextLevel: data.xpToNextLevel || calculateXPForLevel(1)
                });
            }
        });
    }

/**
 * getQuestData — fetchne quest data z quests kolekcie
 * @param {string} questId — ID questu
 * @returns {Promise<Object|null>} quest dokument alebo null ak neexistuje
 */
export async function getQuestData(questId) {
    try {
        const questRef = doc(db, "quests", questId);
        const questSnap = await getDoc(questRef);
        if (questSnap.exists()) {
            return { id: questSnap.id, ...questSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Chyba pri fetchnutí quest dát:", e);
        return null;
    }
}