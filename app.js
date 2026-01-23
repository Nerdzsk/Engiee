import * as THREE from 'three';
import { ENGEE_DIALOGUES } from './dialogues.js';
import { speak } from './angie.js';
import { transferEnergy, markDialogueAsSeen, markIntroAsSeen, performRepairInDB, setupChargerInDB, performChargerRepairInDB, giveXP, startQuest, getQuestData, updateQuestProgress, watchPlayerSkills, fixObjectPositions, addToInventory, watchPedometerSteps, ensureDailyStepsForToday } from './database.js';
import { setupControls, updateMovement } from './controls.js';
import { generateRoom, generateDoors, doorMixers, generateChargers, chargerObjects, replaceChargerModel } from './world.js';
import { updateCamera, handleZoom } from './camera.js';
import { generateItems, animateItems, currentItemsData } from './items.js';
import { triggerSyncFlash, updateEnergyHUD, updateAccumulatorHUD, updateMobileStatusHUD, updateLevelHUD, showQuestNotification, updateLearningPointsHUD } from './hud.js';
import { showPerkUnlockedToast, showDailyResetToast, showAchievementToast } from './hud.js';
import { initSkillsUI, toggleSkillsModal } from './skills.js';
import { initInventoryUI, watchPlayerInventoryUI, toggleInventoryModal, ITEM_DESCRIPTIONS } from './inventory.js';
import { initKodexUI, toggleKodexModal, unlockKodexEntry, watchPlayerKodexUI } from './kodex.js';
import { initQuestsUI, toggleQuestModal, refreshQuestUI } from './quests.js';
import { initLevelUpSystem, showLevelUpModal } from './levelup.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initHudTierSystem, setHudTier, upgradeHudTier, HUD_TIERS } from './hud-tiers.js';
import { initGameMenu } from './game-menu.js';
import { initAcademyUI, renderAcademyTab } from './academy.js';

// Globálne premenné pre proximity logiku
let isRobotInChargerZone = false;
let robot = {
    position: { x: 0, y: 0, z: 0 },
    accumulator: 0,
    maxAccumulator: 1000,
    totalPedometerEnergy: 0,
    dailySteps: 0,
    dailyStepsDate: null,
    learningPoints: 0,
    maxLearningPoints: 5000,
    maxEnergy: 200,
    energy: 200
};

// Načítaj player state z player_quests.json pri štarte
async function loadPlayerState() {
    try {
        const fetchNoCache = (url) => fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
        const response = await fetchNoCache('player_quests.json');
        const players = await response.json();
        const player = players.find(p => p.playerId === 'robot1');
        
        if (player) {
            robot.energy = player.energy || 200;
            robot.maxEnergy = player.maxEnergy ?? 200;
            robot.accumulator = player.accumulator || 0;
            robot.maxAccumulator = player.maxAccumulator ?? 1000;
            robot.totalPedometerEnergy = player.totalPedometerEnergy || 0;
            robot.dailySteps = player.dailySteps || 0;
            robot.dailyStepsDate = player.dailyStepsDate || null;
            robot.learningPoints = player.learningPoints || 0;
            robot.maxLearningPoints = player.maxLearningPoints || 5000;
            robot.position.x = player.positionX || 0;
            robot.position.z = player.positionZ || 0;
            
            // Update HUD hneď po načítaní
            updateEnergyHUD(robot.energy, robot.maxEnergy);
            updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
            updateLearningPointsHUD(robot.learningPoints, robot.maxLearningPoints);
        }
    } catch (err) {
        console.error('Failed to load player state:', err);
    }
}

// Spusti načítanie ihneď
loadPlayerState();

// === PLAYER MODEL ===
let robotModel = null;
const gltfLoader = new GLTFLoader();
gltfLoader.load('assets/robot.glb', (gltf) => {
    robotModel = gltf.scene;
    robotModel.name = 'player_robot';
    robotModel.position.set(robot.position.x, robot.position.y, robot.position.z);
    robotModel.scale.set(0.33, 0.33, 0.33); // Zmenšený 3x
    scene.add(robotModel);
    // Vylepšenie materiálov a tieňov
    robotModel.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.side = THREE.DoubleSide;
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Vylepšenie PBR materiálov
            if (child.material.isMeshStandardMaterial) {
                child.material.metalness = 0.6;
                child.material.roughness = 0.4;
                child.material.envMapIntensity = 1.5;
            }
            
            child.material.needsUpdate = true;
        }
    });
});
let lastEnergyHUD = 0;
let isRobotInItemZone = false;
let nearbyItemId = null;

// === THREE.js základná inicializácia ===
const scene = new THREE.Scene();

// Pridanie atmosférickej hmly
scene.fog = new THREE.Fog(0x1a2332, 10, 80);
scene.background = new THREE.Color(0x0f1419);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
// Start camera a bit higher and further back to avoid being inside models
camera.position.set(0, 10, 40); // Kamera pred stredom
camera.lookAt(0, 0, 0);
if (!Number.isFinite(window.worldRotation)) {
    window.worldRotation = 0;
}
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);
// Add explicit id for easier devtools inspection
renderer.domElement.id = 'engee-canvas';
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '1';
renderer.setClearColor(0x0f1419, 1); // Tmavšie sci-fi pozadie
// Grid helper odstránený (request užívateľa)
// Sprístupni premenné globálne pre konzolu
window.scene = scene;
window.camera = camera;
window.renderer = renderer; // Globálny prístup pre cleanup pri NEW GAME
window.robot = robot; // Globálny prístup k robot objektu pre testovanie

// Helper funkcie pre testovanie (volateľné z konzoly)
window.setAccumulator = (value) => {
    robot.accumulator = Math.max(0, Math.min(value, robot.maxAccumulator));
    updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
    console.log(`Akumulátor nastavený na: ${robot.accumulator}/${robot.maxAccumulator}`);
};

window.setEnergy = (value) => {
    robot.energy = Math.max(0, Math.min(value, robot.maxEnergy));
    updateEnergyHUD(robot.energy, robot.maxEnergy);
    console.log(`Energia nastavená na: ${robot.energy}/${robot.maxEnergy}`);
};

window.fillAccumulator = () => {
    robot.accumulator = robot.maxAccumulator;
    updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
    console.log(`Akumulátor naplnený na maximum: ${robot.maxAccumulator}`);
};

window.emptyAccumulator = () => {
    robot.accumulator = 0;
    updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
    console.log(`Akumulátor vyprázdnený`);
};
// Debug: pridaj kroky do Firebase (odomkne achievement/perk po 100+)
window.addSteps = async (amount = 100) => {
    try {
        const mod = await import('./pedometer.js');
        await mod.addStepToDatabase('robot1', amount);
        console.log(`[Debug] Požiadavka na pridanie ${amount} krokov odoslaná do Firebase.`);
    } catch (e) {
        console.error('[Debug] addSteps zlyhalo:', e);
    }
};
// Debug funkcie pre skills
window.testInvestSkill = async (skillKey, amount) => {
    const { investSkillEnergy } = await import('./database.js');
    const result = await investSkillEnergy('robot1', skillKey, amount, robot);
    console.log('Investment result:', result);
    return result;
};

window.showSkillsFormula = () => {
    console.log('=== SKILL ENERGY REQUIREMENTS ===');
    for (let i = 1; i <= 10; i++) {
        const { calculateSkillEnergyRequired, calculateTotalEnergyForLevel } = window;
        const energyForLevel = Math.floor(100 * Math.pow(1.5, i - 1));
        const totalEnergy = Array.from({length: i}, (_, idx) => Math.floor(100 * Math.pow(1.5, idx))).reduce((a,b) => a+b, 0);
        console.log(`Level ${i}: ${energyForLevel} EP (Total: ${totalEnergy} EP)`);
    }
};
// (Removed debug HUD)

// END DEBUG HELPERS

// Rebuild scene from scratch (lights + helpers + room)
function resetWorldScene(roomData) {
    // Remove all children from scene
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // Vylepšené osvetlenie s tieňmi a atmosférou
    // 1. Ambient svetlo (základné osvetlenie)
    const ambient = new THREE.AmbientLight(0x4a5f7f, 0.4);
    scene.add(ambient);
    
    // 2. Hlavné svetlo s tieňmi (DirectionalLight)
    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(15, 25, 15);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 100;
    dir.shadow.camera.left = -30;
    dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;
    dir.shadow.camera.bottom = -30;
    dir.shadow.bias = -0.0001;
    scene.add(dir);
    
    // 3. Hemisférické svetlo (simuluje oblohu)
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.6);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);
    
    // 4. Bodové svetlá pre atmosféru (2 svetlá z rohov)
    const pointLight1 = new THREE.PointLight(0x00ffff, 1.5, 30);
    pointLight1.position.set(-10, 8, -10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff6600, 1.2, 25);
    pointLight2.position.set(10, 6, 10);
    scene.add(pointLight2);

    // Room generation
    if (!roomData) {
        console.warn('resetWorldScene: missing roomData');
        return;
    }
    generateRoom(scene, roomData);
    if (roomData.doors) generateDoors(scene, roomData.doors);
    if (roomData.chargers) generateChargers(scene, roomData.chargers);

    // Re-add robot model if it was already loaded
    if (robotModel) {
        scene.add(robotModel);
    }

    // Ensure camera looks at origin
    camera.position.set(0, 10, 40);
    camera.lookAt(0, 0, 0);
}

// Sprístupni globálne pre NEW GAME reset
window.resetWorldScene = resetWorldScene;

// Lokálne načítanie questov z JSON
async function getQuestDataLocal(questId) {
    try {
        const response = await fetch('quests.json');
        const quests = await response.json();
        return quests.find(q => q.id === questId) || null;
    } catch (e) {
        console.error('Chyba pri načítaní quests.json:', e);
        return null;
    }
}
// [REMOVED] watchPlayer: Firestore logic deleted. Use local file logic to handle player state, quest triggers, and proximity checks.

/**
 * checkAndShowIntro - Skontroluje, či hráč už videl intro dialóg.
 * Ak nie, zobrazí INTRO a spustí hlavný quest "quest_where_am_i".
 * @param {string} playerId - ID hráča (napr. "robot1")
 */

// === BROKEN CHARGER DIALOG & REPAIR ===
async function showBrokenChargerDialog() {
    // Kontrola či quest už nie je splnený
    const fetchNoCache = (url) => fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
    const players = await fetchNoCache('player_quests.json').then(r => r.json());
    const player = players.find(p => p.playerId === 'robot1');
    
    if (!player) {
        console.error('[Charger] Player not found!');
        return;
    }
    
    const activeQuest = player.quests.active.find(q => q.questId === 'quest_broken_charger');
    const completedQuest = player.quests.completed.find(q => q.questId === 'quest_broken_charger');
    
    // Ak je quest splnený, už nedávaj dialóg
    if (completedQuest || (activeQuest && activeQuest.completed)) {
        console.log('[Charger] Quest already completed, skipping dialog');
        return;
    }
    
    const REPAIR_COST = 100;
    const dialog = ENGEE_DIALOGUES.BROKEN_CHARGER.generate(REPAIR_COST, robot.accumulator);
    
    speak(dialog, async () => {
        // Dialog ukončený - pridaj quest LEN ak ešte neexistuje
        if (!activeQuest) {
            const questData = await getQuestDataLocal('quest_broken_charger');
            if (questData) {
                await startQuest('robot1', 'quest_broken_charger', questData);
                showQuestNotification('Oprav pokazenú nabíjaciu stanicu');
                console.log('[Charger] Quest pridaný do denníka');
            }
        } else {
            console.log('[Charger] Quest už existuje, notifikácia sa nezobrazí');
        }
    });
}

// Handler pre repair event z dialogu
window.addEventListener('requestChargerRepair', async (event) => {
    const { cost } = event.detail;
    
    // Kontrola či má dostatok energie
    if (robot.accumulator < cost) {
        console.error('[Charger] Nedostatok energie v akumulátore');
        return;
    }
    
    // Odpočítaj energiu
    robot.accumulator -= cost;
    updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
    
    // Oprav charger
    await performChargerRepairInDB('robot1');
    
    // Nahraď broken_charger model za charger.glb
    if (typeof chargerObjects !== 'undefined' && typeof scene !== 'undefined') {
        const brokenCharger = chargerObjects.find(obj => obj.userData.isBroken);
        if (brokenCharger) {
            console.log('[Charger] Replacing broken model with repaired charger.glb');
            replaceChargerModel(scene, brokenCharger.userData.id);
        }
    }
    
    // Update quest progress (obj_1 je na indexe 0)
    await updateQuestProgress('robot1', 'quest_broken_charger', 0, 1);
    
    // Schová prompt
    isRobotInChargerZone = false;
    const promptDiv = document.getElementById('interaction-prompt');
    if (promptDiv) promptDiv.classList.remove('active');
});

async function checkAndShowIntro(playerId) {
    try {
        // Cache busting helper
        const fetchNoCache = (url) => fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
        
        // Načítaj player data z player_quests.json
        const response = await fetchNoCache('player_quests.json');
        const players = await response.json();
        const player = players.find(p => p.playerId === playerId);
        
        if (!player) {
            console.warn(`[Intro] Hráč ${playerId} nebol nájdený.`);
            return;
        }
        
        // Ak už videl intro, skonči
        if (player.hasSeenIntro) {
            return;
        }
        
        // Zobraz intro dialóg
        speak(ENGEE_DIALOGUES.INTRO, async () => {
            // Načítaj quest data a spusť ho
            const questData = await getQuestDataLocal('quest_where_am_i');
            
            if (questData) {
                const questStarted = await startQuest(playerId, 'quest_where_am_i', questData);
                
                if (questStarted) {
                    showQuestNotification(questData.title || 'Kde to som');
                } else {

// Exportuj pre použitie v game-menu.js (NEW GAME)
window.checkAndShowIntro = checkAndShowIntro;
                    console.error('[Intro] Quest sa nepodarilo spustiť');
                }
            } else {
                console.error('[Intro] Quest "quest_where_am_i" nebol nájdený');
            }
            
            // Označ intro ako videný (uloženie do player_quests.json)
            await markIntroAsSeen(playerId);
        });
        
    } catch (error) {
        console.error('[Intro] Chyba pri kontrole intro dialógu:', error);
    }
}

// --- Game Initialization Block ---
function initGame() {
    // Inicializuj skills panel na prvý krát
    if (!window._skillsPanelInitialized) {
        initSkillsUI("robot1", robot); // Pridaj robot objekt pre accumulator
        initInventoryUI();
        watchPlayerInventoryUI("robot1");
        initKodexUI();
        watchPlayerKodexUI("robot1");
        initQuestsUI("robot1");
        initGameMenu(); // Initialize Game Menu (ESC)
        initAcademyUI("robot1"); // Initialize Academy system
        
        // Sprístupni renderAcademyTab globálne pre skills.js
        window.renderAcademyTab = renderAcademyTab;
        
        // Initialize skills indicator once
        if (!window._skillIndicatorInitialized) {
            const levelInfo = document.getElementById('level-info');
            if (levelInfo) {
                // Click handler pre Level text - otvorí Skills modal
                levelInfo.addEventListener('click', () => {
                    // Kliknutie funguje len keď bliká (sú dostupné skill body)
                    if (levelInfo.classList.contains('skill-available-blink')) {
                        toggleSkillsModal();
                    }
                });
                // Watch skills to toggle Level text blinking
                watchPlayerSkills('robot1', ({ skillPointsAvailable }) => {
                    try {
                        if (skillPointsAvailable && skillPointsAvailable > 0) {
                            levelInfo.classList.add('skill-available-blink');
                        } else {
                            levelInfo.classList.remove('skill-available-blink');
                        }
                    } catch (e) {
                        console.warn('Skill indicator update failed:', e);
                    }
                });
            }
            window._skillIndicatorInitialized = true;
        }
        window._skillsPanelInitialized = true;
    }

    // --- INTRO DIALOG CHECK: Ak hráč ešte nevidel intro, zobraz ho a spusť hlavný quest ---
    // Volá sa vždy pri initGame() (aj po reloade), aby sa správne zobrazil intro po NEW GAME
    checkAndShowIntro("robot1");

    // --- PEDOMETER SYNC: Sledovanie krokov z Firebase ---
    if (!window._pedometerWatcherInitialized) {
        console.log("[Pedometer] Inicializujem watcher pre kroky z Firebase...");
        watchPedometerSteps("robot1", robot, (newAccumulator) => {
            console.log(`[Pedometer] Akumulátor aktualizovaný: ${newAccumulator}`);
            updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
        });
        window._pedometerWatcherInitialized = true;
    }

    // --- DAILY STEPS AUTO-RESET okolo polnoci ---
    if (!window._dailyStepsWatcherStarted) {
        // Okamžitá normalizácia po štarte (v prípade otvorenia hry nasledujúci deň)
        try { ensureDailyStepsForToday('robot1', robot); } catch (_) {}

        const getToday = () => new Date().toISOString().substring(0, 10);
        window._lastDailyDate = robot.dailyStepsDate || getToday();
        window._dailyStepsWatcherStarted = true;
        window._dailyStepsInterval = setInterval(async () => {
            const todayStr = getToday();
            if (window._lastDailyDate !== todayStr) {
                window._lastDailyDate = todayStr;
                robot.dailySteps = 0;
                robot.dailyStepsDate = todayStr;
                try { await ensureDailyStepsForToday('robot1', robot); } catch (_) {}
                window.dispatchEvent(new CustomEvent('accumulatorUpdated', {
                    detail: {
                        accumulator: robot.accumulator,
                        totalPedometerEnergy: robot.totalPedometerEnergy,
                        dailySteps: robot.dailySteps,
                        dailyStepsDate: robot.dailyStepsDate
                    }
                }));
                try { showDailyResetToast('Nový deň', 'Daily Steps boli vynulované'); } catch (_) {}
                console.log('[Pedometer] Daily steps reset for new day:', todayStr);
            }
        }, 60000); // kontrola raz za minútu
    }

    // --- PERK UNLOCK TOAST LISTENER ---
    window.addEventListener('perksUpdated', (event) => {
        const { perkId, perks } = event.detail || {};
        const p = Array.isArray(perks) ? perks.find(x => x.id === perkId) : null;
        if (p && p.applied) {
            showPerkUnlockedToast(p.title || 'Perk odomknutý', p.description || 'Nová schopnosť aktivovaná');
        }
    });

    // --- LEARNING POINTS EVENT LISTENER ---
    window.addEventListener('learningPointsUpdated', (event) => {
        const { learningPoints, maxLearningPoints, lp, maxLP } = event.detail;
        // Support both formats (academy uses learningPoints, database.js uses lp)
        const lpValue = learningPoints !== undefined ? learningPoints : lp;
        const maxLPValue = maxLearningPoints !== undefined ? maxLearningPoints : maxLP;
        
        if (lpValue !== undefined) {
            robot.learningPoints = lpValue;
        }
        if (maxLPValue !== undefined) {
            robot.maxLearningPoints = maxLPValue;
        }
        updateLearningPointsHUD(robot.learningPoints, robot.maxLearningPoints);
        console.log(`[Learning Points] Aktualizované: ${robot.learningPoints} / ${robot.maxLearningPoints}`);
    });

    // --- ACHIEVEMENT COMPLETED LISTENER ---
    window.addEventListener('achievementCompleted', (event) => {
        const { id, title, description } = event.detail || {};
        if (id === 'first_thousand') {
            try {
                showAchievementToast(title || 'Cieľ splnený', description || 'Dosiahol si 1000 krokov (TOTAL)');
            } catch (_) {}
        }
    });

    // --- ENERGY MAX CHANGE LISTENER (napr. po odomknutí perku) ---
    window.addEventListener('energyMaxChanged', (event) => {
        const { maxEnergy } = event.detail || {};
        if (Number.isFinite(maxEnergy) && maxEnergy > 0) {
            robot.maxEnergy = maxEnergy;
            // Zabezpeč, že current energia nepresahuje nový max
            robot.energy = Math.min(robot.energy || 0, robot.maxEnergy);
            updateEnergyHUD(robot.energy, robot.maxEnergy);
            console.log(`[Energy] Max kapacita aktualizovaná na ${robot.maxEnergy}`);
        }
    });

    // --- ROOM LOADING AND RENDERING ---

    // Normalize room data coming from local JSON or migrated Firestore documents
    function normalizeRoom(room) {
        if (!room) return room;
        const dirMap = { north: Math.PI, south: 0, east: Math.PI / 2, west: -Math.PI / 2 };
        const out = Object.assign({}, room);
        out.width = Number(out.width || 10);
        out.depth = Number(out.depth || 10);

        if (Array.isArray(out.doors)) {
            out.doors = out.doors.map(d => {
                const nd = Object.assign({}, d);
                if (nd.rotation === undefined && nd.direction) {
                    nd.rotation = dirMap[String(nd.direction).toLowerCase()] ?? 0;
                }
                nd.x = Number(nd.x || 0);
                nd.z = Number(nd.z || 0);
                nd.repairCost = Number(nd.repairCost || 0);
                return nd;
            });
        }

        if (Array.isArray(out.chargers)) {
            out.chargers = out.chargers.map(c => {
                const nc = Object.assign({}, c);
                nc.x = Number(nc.x || 0);
                nc.z = Number(nc.z || 0);
                nc.rotation = Number(nc.rotation || 0);
                nc.repairCost = Number(nc.repairCost || 0);
                return nc;
            });
        }

        return out;
    }

    // Cache busting helper
    const fetchNoCache = (url) => fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
    
    fetchNoCache('rooms.json')
        .then(res => {
            if (!res.ok) throw new Error(`rooms.json HTTP ${res.status}`);
            return res.json();
        })
        .then(rooms => {
            if (rooms && rooms.length > 0) {
                const raw = rooms[0];
                const roomData = normalizeRoom(raw);
                resetWorldScene(roomData);
            } else {
                console.warn('No room data found in rooms.json');
            }
        })
        .catch(err => console.error('Error loading rooms.json:', err));

    // Proximity detection - itemy
    if (currentItemsData && currentItemsData.length > 0) {
        const ITEM_PROXIMITY = 1.5;
        let closestItem = null;
        let closestDist = ITEM_PROXIMITY;

        currentItemsData.forEach(item => {
            const dist = Math.sqrt(Math.pow(px - item.coords.x, 2) + Math.pow(pz - item.coords.z, 2));
            if (dist < closestDist) {
                closestDist = dist;
                closestItem = item;
            }
        });

        if (closestItem && !isRobotInItemZone) {
            nearbyItemId = closestItem.id;
            isRobotInItemZone = true;
            showItemPrompt(closestItem);
        } else if (!closestItem && isRobotInItemZone) {
            isRobotInItemZone = false;
            hideItemPrompt();
            nearbyItemId = null;
        }
    }

    // Získaj zoznam videných dialógov z playerData alebo z JSON
    // ...existing code...
}


window.onload = initGame;

window.addEventListener('requestRepair', async (e) => {
    const { cost } = e.detail;
    if (robot.accumulator >= cost) {
        const newAccumulator = robot.accumulator - cost;
        const success = await performRepairInDB("robot1", "room1", "door_1", newAccumulator);
        if (success) {
                // XP za opravu dverí
                const xpResult = await giveXP("robot1", 50, "repair_door");
                if (xpResult.leveled) {
                    showLevelUpModal(xpResult.newLevel, xpResult.skillPointsGained);
                }
        } else {
            alert("Chyba pri komunikácii s databázou.");
        }
    } else {
        alert("Systém: Nedostatok energie v akumulátore!");
    }
});

// --- ITEM PROXIMITY UI ---

let itemPromptDiv = null;

function showItemPrompt(item) {
    if (!itemPromptDiv) {
        itemPromptDiv = document.createElement('div');
        itemPromptDiv.id = 'item-prompt';
        itemPromptDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 255, 0.9);
            border: 2px solid #00ffff;
            border-radius: 8px;
            padding: 15px 20px;
            color: #000;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            z-index: 999;
            text-align: center;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        `;
        document.body.appendChild(itemPromptDiv);
    }

    const itemName = item.type === 'battery' ? 'Batéria' : 'Item';
    itemPromptDiv.innerHTML = `
        <div style="margin-bottom: 10px;">Blízko: <strong>${itemName}</strong></div>
        <div>
            <button id="btn-pickup" style="margin-right: 10px; padding: 8px 15px; background: #00ff00; border: none; color: #000; font-weight: bold; cursor: pointer; border-radius: 4px;">ZDVIHNÚŤ [E]</button>
            <button id="btn-examine" style="padding: 8px 15px; background: #ffff00; border: none; color: #000; font-weight: bold; cursor: pointer; border-radius: 4px;">PRESKÚMAŤ [Q]</button>
        </div>
    `;

    document.getElementById('btn-pickup').addEventListener('click', () => {
        pickupItem(item);
        renderer.domElement.focus();
    });
    document.getElementById('btn-examine').addEventListener('click', () => {
        examineItem(item);
        renderer.domElement.focus();
    });
}

function hideItemPrompt() {
    if (itemPromptDiv) {
        itemPromptDiv.remove();
        itemPromptDiv = null;
    }
}

async function pickupItem(item) {
    console.log(`Zdvihol si: ${item.type}`);
    // Pridaj do inventára
    await addToInventory("robot1", item.type, 1);
    // Zmaž item z databázy (zmení status aby zmizol zo zeme)
    await pickUpItem("robot1", item.id);
        // Pridaj XP za pickup
        const xpResult = await giveXP("robot1", 10, `pickup_${item.type}`);
        if (xpResult.leveled) {
            showLevelUpModal(xpResult.newLevel, xpResult.skillPointsGained);
        }
    // Skry prompt
    hideItemPrompt();
    isRobotInItemZone = false;
    nearbyItemId = null;
}

function examineItem(item) {
    const itemDesc = ITEM_DESCRIPTIONS[item.type];
    
    if (itemDesc) {
        const examineText = `
═══════════════════════════
${itemDesc.name}
═══════════════════════════

${itemDesc.fullDesc}

${itemDesc.value ? `[Hodnota: +${itemDesc.value} jednotiek energie]` : ''}
        `.trim();
        
        alert(examineText);
    } else {
        alert(`${item.type}\n\nŽiadne ďalšie informácie.`);
    }
    
    console.log(`Preskúmal si: ${item.type}`);
}

// Klávesové skratky pre interakciu s itemom (E/Q) bez potreby klikania
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Item interaction
    if (!isRobotInItemZone || !nearbyItemId) return;
    if (key !== 'e' && key !== 'q') return;

    const item = currentItemsData.find(it => it.id === nearbyItemId);
    if (!item) return;

    e.preventDefault();
    if (key === 'e') {
        pickupItem(item);
    } else {
        examineItem(item);
    }
    renderer.domElement.focus();
});

// --- HUD BUTTON LISTENERS ---

document.getElementById('skills-btn-asset').addEventListener('click', toggleSkillsModal);
document.getElementById('inventory-btn').addEventListener('click', toggleInventoryModal);




// Ensure robot.position is defined before setupControls
if (!robot.position) {
    robot.position = { x: 0, y: 0, z: 0 };
}
setupControls(robot);

// Energy transfer with visual effect
function playEnergyTransferEffect(callback) {
    const overlay = document.getElementById('transfer-wave-overlay');
    
    console.log('playEnergyTransferEffect called', overlay);
    
    if (!overlay) {
        console.log('overlay not found!');
        if (callback) callback();
        return;
    }
    
    // Activate wave effect on overlay
    overlay.classList.add('active');
    console.log('active class added to overlay');
    
    // Execute callback earlier, then remove overlay after animation
    setTimeout(() => {
        if (callback) callback();
        console.log('energy transfer executed');
    }, 1000);
    
    setTimeout(() => {
        overlay.classList.remove('active');
        console.log('active class removed from overlay');
    }, 1500);
}

document.getElementById('transfer-btn').onclick = async () => {
    console.log('Transfer button clicked!');
    // Pošleme robot objekt do transferEnergy
    playEnergyTransferEffect(async () => {
        const success = await transferEnergy("robot1", robot);
        if (success) {
            // Aktualizuj HUD po úspešnom prenose
            updateEnergyHUD(robot.energy, robot.maxEnergy);
            updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
            console.log('HUD updated after energy transfer');
        }
    });
}

// Mouse wheel zoom
window.addEventListener('wheel', (event) => {
    event.preventDefault();
    handleZoom(event.deltaY);
}, { passive: false });

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = Date.now() * 0.001;

    // Update robot model position and rotation if loaded
    if (robotModel) {
        robotModel.position.set(robot.position.x, robot.position.y, robot.position.z);
        // Synchronizuj rotáciu s robot objektom (aby sa otáčal s miestnosťou)
        if (robot.rotation && typeof robot.rotation.y !== 'undefined') {
            robotModel.rotation.y = robot.rotation.y;
        }
    }

    // Proximity detection - Broken Charger Dialog (automatický)
    if (typeof chargerObjects !== 'undefined') {
        chargerObjects.forEach(obj => {
            if (!obj.userData.isBroken) return;
            
            const dx = (robot.position.x || 0) - (obj.position.x || 0);
            const dz = (robot.position.z || 0) - (obj.position.z || 0);
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 1.5 && !isRobotInChargerZone) {
                console.log('[Charger] Proximity detected! Distance:', dist.toFixed(2), 'Charger ID:', obj.userData.id);
                isRobotInChargerZone = true;
                
                // Spusti dialóg automaticky
                showBrokenChargerDialog();
            } else if (dist >= 1.5 && isRobotInChargerZone) {
                isRobotInChargerZone = false;
            }
        });
    }

    if (typeof chargerObjects !== 'undefined') {
        chargerObjects.forEach(obj => {
            const light = obj.userData.statusLight;
            if (!light) return;
            // Manual distance calculation (robot.position is plain object)
            const dx = (robot.position.x || 0) - (obj.position.x || 0);
            const dy = (robot.position.y || 0) - (obj.position.y || 0);
            const dz = (robot.position.z || 0) - (obj.position.z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (obj.userData.isBroken) {
                light.color.setHex(0xff0000);
                light.intensity = Math.sin(time * 10) > 0 ? 15 : 2;
            } else {
                if (dist < 1.2 && robot.energy < robot.maxEnergy) {
                    light.color.setHex(0x00ff00);
                    light.intensity = 8 + Math.sin(time * 15) * 5;
                    robot.energy += 5 * delta;
                    if (robot.energy > robot.maxEnergy) robot.energy = robot.maxEnergy;
                } else {
                    light.color.setHex(0x00ffff);
                    light.intensity = 5 + Math.sin(time * 2) * 3;
                }
            }
        });
    }

    // Realtime update HUD energy (bar + orb) keď sa energia mení lokálne (nabíjanie pri nabíjačke)
    if (robot.energy !== lastEnergyHUD) {
        lastEnergyHUD = robot.energy;
        updateEnergyHUD(robot.energy, robot.maxEnergy);
    }
    // Realtime update HUD accumulator (akumulátor)
    updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator ?? 1000);

    if (doorMixers) doorMixers.forEach(mixer => mixer.update(delta));
    updateMovement(robot);
    // Debug override: allow freezing camera updates and force-basic-materials for visibility checks
    if (!window.__engee_debug_noCamera) {
        updateCamera(camera, robot);
    } else {
        // keep camera where it is (or set to reasonable default if requested)
        if (window.__engee_debug_camera_pos) {
            const p = window.__engee_debug_camera_pos;
            camera.position.set(p.x || 0, p.y || 10, p.z || 40);
            camera.lookAt(p.tx || 0, p.ty || 0, p.tz || 0);
        }
    }

    if (typeof animateItems === 'function') animateItems();

    // If requested, force all meshes to a simple visible material once
    if (window.__engee_debug_forceBasicMaterials && !window.__engee_debug_materials_applied) {
        scene.traverse((obj) => {
            if (obj.isMesh) {
                try {
                    obj.material = new THREE.MeshBasicMaterial({ color: 0xffffff * Math.random(), side: THREE.DoubleSide });
                    obj.visible = true;
                } catch (e) {
                    // ignore
                }
            }
        });
        window.__engee_debug_materials_applied = true;
        console.log('[DEBUG] forced basic materials on meshes');
    }

    renderer.render(scene, camera);
}
animate();

document.getElementById('skills-btn-asset').addEventListener('click', toggleSkillsModal);
document.getElementById('inventory-btn').addEventListener('click', toggleInventoryModal);
document.getElementById('kodex-btn').addEventListener('click', toggleKodexModal);

// === HUD Tier Testing (konzola) ===
// Exponované funkcie pre testovanie a debug
window.hudTierAPI = {
    setTier: setHudTier,
    upgrade: upgradeHudTier,
    tiers: HUD_TIERS
};



window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};



