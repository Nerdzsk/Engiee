import * as THREE from 'three';
import { ENGEE_DIALOGUES } from './dialogues.js';
import { speak } from './angie.js';
import { db, watchRoom, watchItems, watchPlayer, transferEnergy, markDialogueAsSeen, performRepairInDB, setupChargerInDB, performChargerRepairInDB, pickUpItem, watchPlayerLevel, giveXP, startQuest, getQuestData, updateQuestProgress, watchPlayerSkills } from './database.js';
import { setupControls, updateMovement } from './controls.js';
import { generateRoom, generateDoors, doorMixers, generateChargers, chargerObjects } from './world.js';
import { updateCamera } from './camera.js';
import { handleZoom } from './camera.js';
import { generateItems, animateItems, currentItemsData } from './items.js';
import { triggerSyncFlash, updateEnergyHUD, updateAccumulatorHUD, updateMobileStatusHUD, updateLevelHUD } from './hud.js';
import { initSkillsUI, toggleSkillsModal } from './skills.js';
import { initInventoryUI, watchPlayerInventoryUI, toggleInventoryModal, ITEM_DESCRIPTIONS } from './inventory.js';
import { initKodexUI, toggleKodexModal, unlockKodexEntry, watchPlayerKodexUI } from './kodex.js';
import { initQuestsUI, toggleQuestModal } from './quests.js';
import { initLevelUpSystem, showLevelUpModal } from './levelup.js';
import { addToInventory } from './database.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initHudTierSystem, setHudTier, upgradeHudTier, HUD_TIERS } from './hud-tiers.js';

// --- ZÁKLADNÁ SCÉNA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Osvetlenie (zredukované, bez duplicít)
const ambientLight = new THREE.AmbientLight(0x223344, 1.5);
scene.add(ambientLight);

// Hlavné svetlo pre robota
const robotLight = new THREE.PointLight(0xffffff, 100, 10);
robotLight.position.set(0, 3, 0);
scene.add(robotLight);

// Pomocné svetlo zozadu
const fillLight = new THREE.PointLight(0xffffff, 30, 15);
fillLight.position.set(5, 2, 5);
scene.add(fillLight);

renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;

const robot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), new THREE.MeshStandardMaterial({ color: 0x00ff41 }));
robot.position.y = 0.35;
robot.material.visible = false;
scene.add(robot);

const loader = new GLTFLoader();
loader.load('assets/robot.glb', function (gltf) {
    const robotModel = gltf.scene;
    robotModel.scale.set(0.40, 0.40, 0.40);
    robotModel.position.set(0, -0.35, 0);
    robotModel.rotation.y = Math.PI;
    robot.add(robotModel);
}, undefined, function (error) {
    console.error("Stala sa chyba pri načítaní robota:", error);
});

// --- MODULÁRNA AKTUALIZÁCIA ---
watchRoom("room1", (data) => {
    if (!data) return;
    generateRoom(scene, data);
    if (data.doors) generateDoors(scene, data.doors);
    if (data.chargers) generateChargers(scene, data.chargers);
});

watchItems("room1", (items) => generateItems(scene, items));

let isRobotInDoorZone = false;
let isRobotInChargerZone = false;
let lastEnergyHUD = null; // cache pre realtime HUD refresh
let isRobotInItemZone = false;
let nearbyItemId = null;

watchPlayer("robot1", (playerData) => {
    if (!playerData) return;
    triggerSyncFlash();

        // Inicializuj level/XP tracking na prvý krát
        if (!window._levelSystemInitialized) {
            watchPlayerLevel("robot1", (levelData) => {
                updateLevelHUD(levelData.level, levelData.currentXP, levelData.xpToNextLevel);
            });
                initLevelUpSystem();
                initHudTierSystem(); // Inicializuj HUD tier systém
            window._levelSystemInitialized = true;
        }

    updateEnergyHUD(playerData.energy || 0, playerData.maxEnergy || 200);
    updateAccumulatorHUD(playerData.accumulator || 0, playerData.accumulatorMax || 10000);
    updateMobileStatusHUD(playerData.serviceActive || false);
    robot.energy = playerData.energy;
    robot.maxEnergy = playerData.maxEnergy;
    robot.accumulator = playerData.accumulator || 0;

    const seen = playerData.seenDialogues || [];
    const px = playerData.positionX ?? playerData.x ?? 0;
    const pz = playerData.positionZ ?? playerData.z ?? 0;

    // Inicializuj skills panel na prvý krát
    if (!window._skillsPanelInitialized) {
        initSkillsUI("robot1");
        initInventoryUI();
        watchPlayerInventoryUI("robot1");
        initKodexUI();
        watchPlayerKodexUI("robot1");
        initQuestsUI("robot1");
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

    if (!seen.includes("INTRO")) {
        speak(ENGEE_DIALOGUES.INTRO);
        markDialogueAsSeen("robot1", "INTRO");
        // Odomkni kodex entry pre ENGEE AI
        unlockKodexEntry("postavy_engee");
        // Odomkni initial location a tech entries
        unlockKodexEntry("miesta_kabina");
        unlockKodexEntry("tech_special_system");
        // Inicializuj main quest "Kde to som"
        (async () => {
            try {
                console.log("🔍 Fetching quest data for quest_where_am_i...");
                const questData = await getQuestData("quest_where_am_i");
                console.log("📦 Quest data:", questData);
                
                if (questData) {
                    const success = await startQuest("robot1", "quest_where_am_i", questData);
                    console.log("✅ Quest 'Kde to som' initialized, success:", success);
                } else {
                    console.error("❌ Quest data not found in Firestore!");
                }
            } catch (error) {
                console.error("❌ Quest initialization error:", error);
            }
        })();
    }

    const chargerPos = { x: 0, z: -4.5 };
    const distCharger = Math.sqrt(Math.pow(px - chargerPos.x, 2) + Math.pow(pz - chargerPos.z, 2));
    if (distCharger < 1.5) {
        if (!isRobotInChargerZone && !seen.includes("CHARGER_FIXED")) {
            const repairCost = 50;
            const currentAcc = playerData.accumulator || 0;
            const chargerDialogue = ENGEE_DIALOGUES.BROKEN_CHARGER.generate(repairCost, currentAcc);
            speak(chargerDialogue);
            isRobotInChargerZone = true;
            // Odomkni kodex entries keď prvý krát vidí nabíjaciu stanicu
            unlockKodexEntry("miesta_nabijacia_stanica");
            unlockKodexEntry("tech_nabijacia_energia");
        }
    } else if (distCharger > 2.0) {
        isRobotInChargerZone = false;
    }

    const doorPos = { x: 5.5, z: 0 };
    const distDoor = Math.sqrt(Math.pow(px - doorPos.x, 2) + Math.pow(pz - doorPos.z, 2));
    if (distDoor < 2.0) {
        if (!isRobotInDoorZone && !seen.includes("DOOR_FIXED")) {
            const repairCost = 30;
            const currentAccumulator = playerData.accumulator || 0;
            const playerSkills = playerData.skills || {};
            const dynamicDialogue = ENGEE_DIALOGUES.BROKEN_DOOR.generate(repairCost, currentAccumulator, playerSkills);
            speak(dynamicDialogue);
            isRobotInDoorZone = true;
            // Odomkni kodex entries keď prvý krát vidí dverí
            unlockKodexEntry("miesta_vstup_dvere");
            unlockKodexEntry("tech_oprava_dveri");
        }
    } else if (distDoor > 2.5) {
        isRobotInDoorZone = false;
    }
});

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

window.addEventListener('requestChargerRepair', async (e) => {
    const { cost } = e.detail;
    if (robot.accumulator >= cost) {
        const newAccumulator = robot.accumulator - cost;
        const success = await performChargerRepairInDB("robot1", "room1", "charger_1", newAccumulator);
        if (success) {
                // XP za opravu nabíjačky
                const xpResult = await giveXP("robot1", 50, "repair_charger");
                if (xpResult.leveled) {
                    showLevelUpModal(xpResult.newLevel, xpResult.skillPointsGained);
                }
                
                // Update quest progress - "Oprav nabijaciu stanicu"
                try {
                    await updateQuestProgress("robot1", "quest_where_am_i", 0, 1);
                    console.log("✅ Quest progress updated: Charger repaired");
                } catch (error) {
                    console.error("Error updating quest progress:", error);
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

document.getElementById('transfer-btn').onclick = () => {
    console.log('Transfer button clicked!');
    playEnergyTransferEffect(() => transferEnergy("robot1"));
};

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

    if (typeof chargerObjects !== 'undefined') {
        chargerObjects.forEach(obj => {
            const light = obj.userData.statusLight;
            if (!light) return;
            const dist = robot.position.distanceTo(obj.position);
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

    if (doorMixers) doorMixers.forEach(mixer => mixer.update(delta));
    updateMovement(robot);
    updateCamera(camera, robot);
    if (typeof animateItems === 'function') animateItems();
    renderer.render(scene, camera);
}
animate();

document.getElementById('skills-btn').addEventListener('click', toggleSkillsModal);
document.getElementById('inventory-btn').addEventListener('click', toggleInventoryModal);
document.getElementById('kodex-btn').addEventListener('click', toggleKodexModal);

// === HUD Tier Testing (konzola) ===
// Exponované funkcie pre testovanie a debug
window.hudTierAPI = {
    setTier: setHudTier,
    upgrade: upgradeHudTier,
    tiers: HUD_TIERS
};
console.log('🎮 HUD Tier API dostupné cez: window.hudTierAPI');
console.log('Príklad: window.hudTierAPI.setTier(window.hudTierAPI.tiers.ADVANCED)');

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
