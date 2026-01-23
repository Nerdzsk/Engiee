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
    
    // Inicializuj poslednú známu Firebase hodnotu z Total (nie z Current ACC!)
    // Total = celková Firebase hodnota, Current = lokálna hodnota po investovaní
    let lastKnownFirebaseValue = robotObj.totalPedometerEnergy || 0;
    
    return onSnapshot(playerRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const firebaseAccumulator = data.accumulator || 0;
            
            // Porovnaj s POSLEDNOU Firebase hodnotou, nie s current ACC
            // Toto zabezpečí že investovanie neovplyvní prírastok krokov
            if (robotObj && firebaseAccumulator > lastKnownFirebaseValue) {
                const energyGained = firebaseAccumulator - lastKnownFirebaseValue;
                const newAcc = Math.min(robotObj.accumulator + energyGained, robotObj.maxAccumulator || 1000);
                
                console.log(`[Pedometer] Nové kroky z Firebase: ${robotObj.accumulator} + ${energyGained} = ${newAcc}`);
                console.log(`[Pedometer] Firebase value: ${lastKnownFirebaseValue} → ${firebaseAccumulator}`);
                
                robotObj.accumulator = newAcc;
                lastKnownFirebaseValue = firebaseAccumulator; // Aktualizuj poslednú známu hodnotu
                
                // Total Pedometer Energy = Firebase hodnota (celkové kroky od NEW GAME)
                robotObj.totalPedometerEnergy = firebaseAccumulator;
                console.log(`[Pedometer] Total energy from start: ${robotObj.totalPedometerEnergy}`);
                // Daily Steps: reset pri novom dni alebo novej hre, potom pripočítaj prírastok
                const today = new Date();
                const todayStr = today.toISOString().substring(0, 10);
                if (!robotObj.dailyStepsDate || robotObj.dailyStepsDate !== todayStr) {
                    robotObj.dailySteps = 0;
                    robotObj.dailyStepsDate = todayStr;
                }
                robotObj.dailySteps = (robotObj.dailySteps || 0) + energyGained;
                
                // Aktualizuj player dáta + achievementy v JSON (vrátane dailySteps)
                await updateAchievementsForPedometer(
                    playerId,
                    robotObj.totalPedometerEnergy,
                    robotObj.accumulator,
                    robotObj.dailySteps,
                    robotObj.dailyStepsDate
                );
                
                // Dispatch event pre real-time update UI
                window.dispatchEvent(new CustomEvent('accumulatorUpdated', {
                    detail: {
                        accumulator: robotObj.accumulator,
                        totalPedometerEnergy: robotObj.totalPedometerEnergy,
                        dailySteps: robotObj.dailySteps,
                        dailyStepsDate: robotObj.dailyStepsDate
                    }
                }));
                
                // Zavolaj callback pre aktualizáciu HUD
                if (callback) callback(robotObj.accumulator);
            }
        }
    }, (error) => {
        console.error("[Firebase] Error watching pedometer:", error);
    });
}

/**
 * Zaistí existenciu achievements a aktualizuje progres pre pedometer ciele.
 * Aktuálne: 'first_steps' – urob 100 krokov od začiatku hry
 */
async function updateAchievementsForPedometer(playerId, totalPedometerEnergy, currentAccumulator, dailySteps, dailyStepsDate) {
    try {
        const res = await fetch('player_quests.json?_=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        const player = data.find(p => p.playerId === playerId);
        if (!player) return false;

        // Inicializácia achievements ak chýbajú
        if (!Array.isArray(player.achievements)) {
            player.achievements = [];
        }

        // Nájdime alebo pridajme 'first_steps'
        let first = player.achievements.find(a => a.id === 'first_steps');
        if (!first) {
            first = {
                id: 'first_steps',
                title: 'Prvé kroky',
                description: 'Urob prvých 100 krokov od začiatku hry',
                category: 'fitness',
                target: 100,
                current: 0,
                completed: false,
                completedAt: null,
                rewards: { perkUnlocked: 'endurance_boost_1' }
            };
            player.achievements.push(first);
        }

        // Aktualizuj current = min(totalPedometerEnergy, target) (nepresahuje cieľ)
        const prevCompleted = !!first.completed;
        const targetSteps = first.target || 100;
        const mirroredTotal = totalPedometerEnergy || 0;
        const clampedTotal = Math.min(mirroredTotal, targetSteps);
        first.current = Math.max(first.current || 0, clampedTotal);
        if (!first.completed && first.current >= targetSteps) {
            first.completed = true;
            first.completedAt = new Date().toISOString();
            console.log('[Achievement] Completed: Prvé kroky');
        }

        // Nový cieľ: 'first_thousand' – dosiahni 1000 krokov (TOTAL)
        let thousand = player.achievements.find(a => a.id === 'first_thousand');
        if (!thousand) {
            thousand = {
                id: 'first_thousand',
                title: 'Dosiahnu prvú tisícku',
                description: 'Dosiahni 1000 krokov od začiatku hry (TOTAL)',
                category: 'fitness',
                target: 1000,
                current: 0,
                completed: false,
                completedAt: null
            };
            player.achievements.push(thousand);
        }
        const prevThousandCompleted = !!thousand.completed;
        const thousandTarget = thousand.target || 1000;
        const thousandClamped = Math.min(mirroredTotal, thousandTarget);
        thousand.current = Math.max(thousand.current || 0, thousandClamped);
        if (!thousand.completed && thousand.current >= thousandTarget) {
            thousand.completed = true;
            thousand.completedAt = new Date().toISOString();
            console.log('[Achievement] Completed: Prvá tisícka');
        }
        const thousandJustCompleted = !prevThousandCompleted && !!thousand.completed;

        // Ulož aktuálne čísla ACC, Total a Daily Steps, aby UI bolo konzistentné
        player.accumulator = currentAccumulator;
        player.totalPedometerEnergy = totalPedometerEnergy;
        player.dailySteps = dailySteps || 0;
        player.dailyStepsDate = dailyStepsDate || new Date().toISOString().substring(0, 10);
        // Ak sa achievement práve splnil, odomkni perk "Jeden krok pre robota"
        if (!prevCompleted && first.completed) {
            if (!Array.isArray(player.perks)) player.perks = [];
            const perkId = 'one_step_for_robot';
            const already = player.perks.find(p => p.id === perkId);
            if (!already) {
                player.perks.push({
                    id: perkId,
                    title: 'Jeden krok pre robota',
                    description: '+50 k max kapacite batérie',
                    acquiredAt: new Date().toISOString(),
                    applied: true
                });
                // Aplikuj efekt perku: trvalé +50 k maxEnergy
                const before = player.maxEnergy || 200;
                player.maxEnergy = before + 50;
                // Necháme current energy bez zmeny, ale zaručíme limit
                player.energy = Math.min(player.energy || 0, player.maxEnergy);

                // Runtime update ak je dostupný globálny robot a HUD
                try {
                    if (window && window.robot) {
                        window.robot.maxEnergy = player.maxEnergy;
                        if (typeof window.updateEnergyHUD === 'function') {
                            window.updateEnergyHUD(window.robot.energy, window.robot.maxEnergy);
                        }
                    }
                } catch (_) { /* ignore cross-module issues */ }

                // Notifikuj UI
                window.dispatchEvent(new CustomEvent('perksUpdated', {
                    detail: { perkId, perks: player.perks }
                }));
                window.dispatchEvent(new CustomEvent('energyMaxChanged', {
                    detail: { maxEnergy: player.maxEnergy }
                }));
                console.log('[Perk] Unlocked: Jeden krok pre robota (+50 maxEnergy)');
            }
        }

        // Skontroluj a prípadne odomkni nový perk: Zvýšenie kapacity akumulátora — TIER 1
        // Požiadavky: achievement 'first_thousand' splnený a Strength (S) level >= 1
        try {
            const thousandAch = player.achievements.find(a => a.id === 'first_thousand');
            const strengthLevel = (player.skills && player.skills.S && (player.skills.S.level || 0)) || 0;
            if (thousandAch && thousandAch.completed && strengthLevel >= 1) {
                if (!Array.isArray(player.perks)) player.perks = [];
                const perkId2 = 'acc_capacity_tier1';
                const already2 = player.perks.find(p => p.id === perkId2);
                if (!already2) {
                    player.perks.push({
                        id: perkId2,
                        title: 'Zvýšenie kapacity akumulátora — TIER 1',
                        description: '+250 k max kapacite akumulátora',
                        acquiredAt: new Date().toISOString(),
                        applied: true
                    });
                    const beforeAcc = player.maxAccumulator || 1000;
                    player.maxAccumulator = beforeAcc + 250;
                    // Udrž aktuálny accumulator v limite
                    player.accumulator = Math.min(player.accumulator || 0, player.maxAccumulator);

                    try {
                        if (window && window.robot) {
                            window.robot.maxAccumulator = player.maxAccumulator;
                            if (typeof window.updateAccumulatorHUD === 'function') {
                                window.updateAccumulatorHUD(window.robot.accumulator, window.robot.maxAccumulator);
                            }
                        }
                    } catch (_) { /* ignore */ }

                    // Notifikuj UI o novom perku
                    window.dispatchEvent(new CustomEvent('perksUpdated', {
                        detail: { perkId: perkId2, perks: player.perks }
                    }));
                    console.log('[Perk] Unlocked: Zvýšenie kapacity akumulátora — TIER 1 (+250 maxAccumulator)');
                }
            }
        } catch (e2) { /* no-op */ }

        player.lastUpdate = Date.now();

        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
        }
        
        // Informuj UI o zmene achievements
        window.dispatchEvent(new CustomEvent('achievementsUpdated', {
            detail: { achievements: player.achievements }
        }));
        // Ak práve prešiel cieľ "Prvá tisícka", pošli špecifický event pre toast
        if (thousandJustCompleted) {
            window.dispatchEvent(new CustomEvent('achievementCompleted', {
                detail: {
                    id: 'first_thousand',
                    title: 'Cieľ splnený: Prvá tisícka',
                    description: 'Dosiahol si 1000 krokov (TOTAL)'
                }
            }));
        }
        return true;
    } catch (e) {
        console.error('[updateAchievementsForPedometer] Error:', e);
        return false;
    }
}

/**
 * ensureDailyStepsForToday — zabezpečí, že denný counter je vždy za dnešný dátum.
 * Ak je v player JSONe iný deň, resetne na 0 a nastaví dnešný dátum.
 * Použité pre prípady, keď sa stránka otvorí nasledujúci deň ešte pred príchodom nových krokov z Firebase.
 */
export async function ensureDailyStepsForToday(playerId, robotObj) {
    try {
        const todayStr = new Date().toISOString().substring(0, 10);

        if (robotObj) {
            if (robotObj.dailyStepsDate !== todayStr) {
                robotObj.dailySteps = 0;
                robotObj.dailyStepsDate = todayStr;
            }
        }

        const res = await fetch('player_quests.json?_=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        const player = data.find(p => p.playerId === playerId);
        if (!player) return false;

        let changed = false;
        if (player.dailyStepsDate !== todayStr) {
            player.dailyStepsDate = todayStr;
            player.dailySteps = 0;
            changed = true;
        }

        // Sync s runtime robotom (ak existuje) — nikdy neznižuj runtime hodnotu
        if (typeof player.dailySteps === 'number' && robotObj) {
            // Ak JSON má vyššiu hodnotu (napr. po reload), povýš ju
            if (player.dailySteps > (robotObj.dailySteps || 0)) {
                robotObj.dailySteps = player.dailySteps;
                changed = true;
            }
        }

        if (changed) {
            player.lastUpdate = Date.now();
            if (window.saveLocalJson) {
                await window.saveLocalJson('player_quests.json', data);
            }
            window.dispatchEvent(new CustomEvent('accumulatorUpdated', {
                detail: {
                    accumulator: robotObj ? robotObj.accumulator : 0,
                    totalPedometerEnergy: robotObj ? robotObj.totalPedometerEnergy : 0,
                    dailySteps: player.dailySteps || 0,
                    dailyStepsDate: todayStr
                }
            }));
        }
        return true;
    } catch (e) {
        console.error('[ensureDailyStepsForToday] Error:', e);
        return false;
    }
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

/**
 * Aktualizuje špecifické polia v player dátach a uloží do JSON
 */
async function updatePlayerData(playerId, updates) {
    try {
        const res = await fetch('player_quests.json?_=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        const player = data.find(p => p.playerId === playerId);
        
        if (!player) {
            console.error('[updatePlayerData] Player not found:', playerId);
            return false;
        }
        
        // Aplikuj všetky updaty
        Object.assign(player, updates);
        player.lastUpdate = Date.now();
        
        // Ulož späť do JSON
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            console.log('[updatePlayerData] Saved:', updates);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('[updatePlayerData] Error:', error);
        return false;
    }
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
        player.maxAccumulator = 1000;  // Správna kapacita ACC
        player.totalPedometerEnergy = 0;  // Reset celkovej energie z pedometra
        player.dailySteps = 0;            // Reset daily steps
        player.dailyStepsDate = new Date().toISOString().substring(0, 10);
        player.level = 1;
        player.xp = 0;
        player.skillPoints = 0;
        player.storyStep = 0;
        player.seenDialogues = [];
        player.hasSeenIntro = false;
        player.lastUpdate = Date.now();
        
        // Nový skill systém - všetky skills začínajú na level 0
        player.skills = {
            S: { investedEnergy: 0, level: 0 },
            P: { investedEnergy: 0, level: 0 },
            E: { investedEnergy: 0, level: 0 },
            C: { investedEnergy: 0, level: 0 },
            I: { investedEnergy: 0, level: 0 },
            A: { investedEnergy: 0, level: 0 },
            L: { investedEnergy: 0, level: 0 }
        };
        
        player.inventory = {};
        player.kodex = {};
        player.quests = { active: [], completed: [] };
        // Reset achievements
        player.achievements = [
            {
                id: 'first_steps',
                title: 'Prvé kroky',
                description: 'Urob prvých 100 krokov od začiatku hry',
                category: 'fitness',
                target: 100,
                current: 0,
                completed: false,
                completedAt: null,
                rewards: { perkUnlocked: 'endurance_boost_1' }
            },
            {
                id: 'first_thousand',
                title: 'Dosiahnu prvú tisícku',
                description: 'Dosiahni 1000 krokov od začiatku hry (TOTAL)',
                category: 'fitness',
                target: 1000,
                current: 0,
                completed: false,
                completedAt: null
            }
        ];
        // Reset perks
        player.perks = [];
        
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

// ============================================================
// SKILL SYSTEM - Accumulator Investment Based
// ============================================================

/**
 * Vypočíta koľko energie je potrebné na dosiahnutie určitého levelu
 * Exponenciálny rast: level 1 = 100, level 2 = 250, level 3 = 500...
 * Formula: energyRequired = 100 * (1.5 ^ (level - 1))
 * @param {number} level - Cieľový level (1, 2, 3...)
 * @returns {number} - Potrebná energia na dosiahnutie tohto levelu
 */
export function calculateSkillEnergyRequired(level) {
    if (level <= 0) return 0;
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Vypočíta aktuálny level na základe investovanej energie
 * @param {number} investedEnergy - Celková investovaná energia do skillu
 * @returns {number} - Aktuálny level skillu
 */
export function calculateSkillLevel(investedEnergy) {
    if (investedEnergy <= 0) return 0;
    
    let level = 0;
    let totalRequired = 0;
    
    while (totalRequired <= investedEnergy) {
        level++;
        totalRequired += calculateSkillEnergyRequired(level);
    }
    
    return level - 1; // Vráti posledný dokončený level
}

/**
 * Vypočíta celkovú energiu potrebnú na dosiahnutie levelu (suma všetkých predošlých levelov)
 * @param {number} targetLevel - Cieľový level
 * @returns {number} - Celková energia potrebná
 */
export function calculateTotalEnergyForLevel(targetLevel) {
    let total = 0;
    for (let i = 1; i <= targetLevel; i++) {
        total += calculateSkillEnergyRequired(i);
    }
    return total;
}

/**
 * Investuje energiu z akumulátora do konkrétneho skillu (len S a E)
 * @param {string} playerId - ID hráča
 * @param {string} skillKey - Kľúč skillu (S alebo E)
 * @param {number} amount - Množstvo energie na investíciu
 * @param {object} robotObj - Robot objekt s accumulator hodnotou
 * @returns {object} - { success, newLevel, remainingAcc, message }
 */
export async function investSkillEnergy(playerId, skillKey, amount, robotObj) {
    const validStats = ['S', 'E'];  // Len S a E z ACC
    if (!validStats.includes(skillKey)) {
        return { success: false, message: 'Tento skill sa nemôže investovať z ACC' };
    }
    
    if (amount <= 0) {
        return { success: false, message: 'Množstvo musí byť väčšie ako 0' };
    }
    
    // Skontroluj či má dostatok v akumulátore
    if (!robotObj || robotObj.accumulator < amount) {
        return { success: false, message: 'Nedostatok energie v akumulátore' };
    }
    
    try {
        const res = await fetchNoCacheHelper('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        
        if (!player) throw new Error('Player does not exist');
        
        // Inicializuj skills ak neexistujú
        if (!player.skills) player.skills = {};
        
        // Inicializuj konkrétny skill
        if (!player.skills[skillKey]) {
            player.skills[skillKey] = { investedEnergy: 0, level: 0 };
        }
        
        const skill = player.skills[skillKey];
        const oldLevel = skill.level || 0;
        
        // Pridaj investovanú energiu
        skill.investedEnergy = (skill.investedEnergy || 0) + amount;
        
        // Prepočítaj level
        skill.level = calculateSkillLevel(skill.investedEnergy);
        const newLevel = skill.level;
        
        // Zníž accumulator
        robotObj.accumulator -= amount;
        player.accumulator = robotObj.accumulator;

        // Perk unlock check: ACC capacity TIER 1 po splnení "first_thousand" a Strength >= 1
        // Robíme tu, aby sa perk odomkol aj bez nových krokov z Firebase (po investovaní do S)
        let newlyUnlockedPerkId = null;
        try {
            if (!Array.isArray(player.perks)) player.perks = [];
            if (!Array.isArray(player.achievements)) player.achievements = [];
            const thousandAch = player.achievements.find(a => a.id === 'first_thousand' && a.completed);
            const strengthLevelNow = (player.skills && player.skills.S && (player.skills.S.level || 0)) || 0;
            if (thousandAch && strengthLevelNow >= 1) {
                const exists = player.perks.find(p => p.id === 'acc_capacity_tier1');
                if (!exists) {
                    player.perks.push({
                        id: 'acc_capacity_tier1',
                        title: 'Zvýšenie kapacity akumulátora — TIER 1',
                        description: '+250 k max kapacite akumulátora',
                        acquiredAt: new Date().toISOString(),
                        applied: true
                    });
                    const beforeAcc = player.maxAccumulator || 1000;
                    player.maxAccumulator = beforeAcc + 250;
                    player.accumulator = Math.min(player.accumulator || 0, player.maxAccumulator);
                    try {
                        if (window && window.robot) {
                            window.robot.maxAccumulator = player.maxAccumulator;
                            if (typeof window.updateAccumulatorHUD === 'function') {
                                window.updateAccumulatorHUD(window.robot.accumulator, window.robot.maxAccumulator);
                            }
                        }
                    } catch (_) { /* ignore runtime sync issues */ }
                    newlyUnlockedPerkId = 'acc_capacity_tier1';
                    console.log('[Perk] Unlocked (via skills): Zvýšenie kapacity akumulátora — TIER 1 (+250 maxAccumulator)');
                }
            }
        } catch (_) { /* no-op */ }
        
        // Ulož zmeny
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            
            console.log(`[Skills] Investovaných ${amount} EP do ${skillKey}`);
            console.log(`[Skills] Level: ${oldLevel} → ${newLevel}`);
            console.log(`[Skills] Celková investícia: ${skill.investedEnergy} EP`);
            
            // Dispatch event pre UI update
            window.dispatchEvent(new CustomEvent('skillsUpdated', {
                detail: {
                    skillKey,
                    oldLevel,
                    newLevel,
                    investedEnergy: skill.investedEnergy,
                    accumulator: robotObj.accumulator
                }
            }));
            if (newlyUnlockedPerkId) {
                window.dispatchEvent(new CustomEvent('perksUpdated', {
                    detail: { perkId: newlyUnlockedPerkId, perks: player.perks }
                }));
            }
            
            return {
                success: true,
                newLevel,
                oldLevel,
                remainingAcc: robotObj.accumulator,
                investedEnergy: skill.investedEnergy,
                message: newLevel > oldLevel ? `Level UP! ${skillKey}: ${newLevel}` : 'Energia investovaná'
            };
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error('[Skills] Error investing energy:', error);
        return { success: false, message: 'Chyba pri investovaní energie' };
    }
}

/**
 * Investuje Learning Points do konkrétneho skillu (len I, P, C)
 * @param {string} playerId - ID hráča
 * @param {string} skillKey - Kľúč skillu (I, P alebo C)
 * @param {number} amount - Množstvo LP na investíciu
 * @param {object} robotObj - Robot objekt s learningPoints hodnotou
 * @returns {object} - { success, newLevel, remainingLP, message }
 */
export async function investSkillEnergyFromLP(playerId, skillKey, amount, robotObj) {
    const validStats = ['I', 'P', 'C'];  // Len I, P, C z LP
    if (!validStats.includes(skillKey)) {
        return { success: false, message: 'Tento skill sa nemôže investovať z Learning Points' };
    }
    
    if (amount <= 0) {
        return { success: false, message: 'Množstvo musí byť väčšie ako 0' };
    }
    
    // Skontroluj či má dostatok Learning Points
    if (!robotObj || robotObj.learningPoints < amount) {
        return { success: false, message: 'Nedostatok Learning Points' };
    }
    
    try {
        const res = await fetchNoCacheHelper('player_quests.json');
        const data = await res.json();
        const player = data.find(q => q.playerId === playerId);
        
        if (!player) throw new Error('Player does not exist');
        
        // Inicializuj skills ak neexistujú
        if (!player.skills) player.skills = {};
        
        // Inicializuj konkrétny skill
        if (!player.skills[skillKey]) {
            player.skills[skillKey] = { investedEnergy: 0, level: 0 };
        }
        
        const skill = player.skills[skillKey];
        const oldLevel = skill.level || 0;
        
        // Pridaj investovanú energiu (LP sa ukladajú ako energia)
        skill.investedEnergy = (skill.investedEnergy || 0) + amount;
        
        // Prepočítaj level
        skill.level = calculateSkillLevel(skill.investedEnergy);
        const newLevel = skill.level;
        
        // Zníž Learning Points
        robotObj.learningPoints -= amount;
        player.learningPoints = robotObj.learningPoints;
        
        // Ulož zmeny
        if (window.saveLocalJson) {
            await window.saveLocalJson('player_quests.json', data);
            
            console.log(`[Skills] Investovaných ${amount} LP do ${skillKey}`);
            console.log(`[Skills] Level: ${oldLevel} → ${newLevel}`);
            console.log(`[Skills] Celková investícia: ${skill.investedEnergy} LP`);
            
            // Dispatch event pre UI update
            window.dispatchEvent(new CustomEvent('skillsUpdated', {
                detail: {
                    skillKey,
                    oldLevel,
                    newLevel,
                    investedEnergy: skill.investedEnergy,
                    learningPoints: robotObj.learningPoints
                }
            }));
            
            return {
                success: true,
                newLevel,
                oldLevel,
                remainingLP: robotObj.learningPoints,
                investedEnergy: skill.investedEnergy,
                message: newLevel > oldLevel ? `Level UP! ${skillKey}: ${newLevel}` : 'Learning Points investované'
            };
        } else {
            throw new Error('saveLocalJson helper nie je dostupný!');
        }
    } catch (error) {
        console.error('[Skills] Error investing LP:', error);
        return { success: false, message: 'Chyba pri investovaní Learning Points' };
    }
}

// Legacy funkcie (zachované pre backward compatibility, ale deprecated)
export async function allocateSkillPoint(playerId, statKey) {
    console.warn('[Skills] allocateSkillPoint is DEPRECATED - použite investSkillEnergy()');
    return { success: false, message: 'Deprecated function' };
}

export async function updateSkill(playerId, statKey, updates) {
    console.warn('[Skills] updateSkill is DEPRECATED - použite investSkillEnergy()');
    return false;
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
                const maxAccumulator = playerDoc.data()?.accumulatorMax || 1000;
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
                const maxAccumulator = playerDoc.data()?.accumulatorMax || 1000;
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
            if (questData.rewards.learningPoints) {
                player.learningPoints = (player.learningPoints || 0) + questData.rewards.learningPoints;
                const maxLP = player.maxLearningPoints || 5000;
                if (player.learningPoints > maxLP) {
                    player.learningPoints = maxLP;
                }
                // Dispatch event pre HUD update
                window.dispatchEvent(new CustomEvent('learningPointsUpdated', {
                    detail: { lp: player.learningPoints, maxLP: maxLP }
                }));
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
