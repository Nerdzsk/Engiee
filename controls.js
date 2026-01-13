import { updatePlayerStatus, pickUpItem, watchInventory, useBattery, updateRoomDoors } from './database.js';
import { wallMap,doorObjects,chargerObjects } from './world.js'; 
import { currentItemsData } from './items.js';

// Premenné pre správu stavov
let isMenuOpen = false;
let isInventoryOpen = false;
let activeItem = null;
let inventory = [];

export function setupControls(robot) {
    if (!robot.targetPosition) {
        robot.targetPosition = { x: robot.position.x, z: robot.position.z };
    }
    
    if (robot.energy === undefined) robot.energy = 100;
    if (window.worldRotation === undefined) window.worldRotation = 0;

    // --- 1. SLEDOVANIE INVENTÁRA (Real-time) ---
    watchInventory("robot1", (data) => {
        inventory = data;
        renderInventoryUI();
    });

    // --- 2. INTERAKCIA S KONTEXTOVÝM MENU (Zem) ---
    window.interact = (action) => {
        if (!activeItem) return;

        if (action === 'inspect') {
            const overlay = document.getElementById('inspect-overlay');
            const text = document.getElementById('inspect-text');
            text.innerText = activeItem.description || "Tento predmet nemá žiadny záznam v databáze.";
            overlay.style.display = 'block';
        } 
        else if (action === 'take') {
            pickUpItem("robot1", activeItem.id);
            closeMenu();
        }
        else if (action === 'close') {
            closeMenu();
        }
    };

    // --- 3. LOGIKA INVENTÁRA (Používanie predmetov) ---
    window.toggleInventory = () => {
        isInventoryOpen = !isInventoryOpen;
        document.getElementById('inventory-window').style.display = isInventoryOpen ? 'block' : 'none';
    };

    window.consumeItem = (itemId, capacity) => {
        useBattery("robot1", itemId, capacity);
        // Okamžitá lokálna aktualizácia pre plynulosť HUD
        robot.energy = Math.min(100, robot.energy + capacity);
    };

    function renderInventoryUI() {
        const listDiv = document.getElementById('inventory-list');
        if (!listDiv) return;
        
        listDiv.innerHTML = "";
        if (inventory.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 12px; color: #777;">Prázdne...</div>';
            return;
        }

        inventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border: 1px dashed #44ff41; padding: 5px;";
            itemDiv.innerHTML = `
                <span style="font-size: 11px;">${item.type.toUpperCase()} (+${item.capacity}%)</span>
                <button onclick="window.consumeItem('${item.id}', ${item.capacity})" style="background: #44ff41; color: #000; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px; font-weight: bold;">POUŽIŤ</button>
            `;
            listDiv.appendChild(itemDiv);
        });
    }

    function closeMenu() {
        isMenuOpen = false;
        activeItem = null;
        document.getElementById('context-menu').style.display = 'none';
    }

    function checkForItemUnderRobot(x, z) {
        const found = currentItemsData.find(item => item.coords.x === x && item.coords.z === z);
        if (found) {
            activeItem = found;
            isMenuOpen = true; 
            document.getElementById('context-menu').style.display = 'block';
        }
    }

   // --- 4. KLÁVESNICA (OPRAVENÝ BLOK) ---
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        // 1. Inventár (Klávesa I)
        if (key === 'i') {
            window.toggleInventory();
            return;
        }

        // 2. Oprava dverí (Klávesa R)
        if (key === 'r') {
            repairDoor(robot);
            return;
        }

        // Ak je otvorené menu na zemi, pohyb je blokovaný
        if (isMenuOpen) return;

        let moved = false;

        // Otáčanie kamery
        if (e.key === "ArrowLeft") window.worldRotation += Math.PI / 2;
        if (e.key === "ArrowRight") window.worldRotation -= Math.PI / 2;

        // Pohyb robota
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            if (robot.energy <= 0) return;

            const moveZ = (e.key === "ArrowUp") ? -1 : 1;
            const nextX = Math.round(robot.targetPosition.x + Math.sin(window.worldRotation) * moveZ);
            const nextZ = Math.round(robot.targetPosition.z + Math.cos(window.worldRotation) * moveZ);

            // Kontrola kolízií so stenami
            if (wallMap.has(`${nextX},${nextZ}`)) return;
            // 1. Kontrola kolízií so stenami
            if (wallMap.has(`${nextX},${nextZ}`)) return;

            // 2. PRIDANÉ: Kontrola kolízií s nabíjačkami
            // 2. Kontrola kolízií s nabíjačkami (Obdĺžniková kolízia)
            let isBlockedByCharger = false;
            chargerObjects.forEach(charger => {
                // Vypočítame absolútnu vzdialenosť (vždy kladné číslo)
                const diffX = Math.abs(nextX - charger.position.x);
                const diffZ = Math.abs(nextZ - charger.position.z);

                // Definujeme hranice "krabice" okolo nabíjačky:
                // Šírka (X): 0.8 metra na každú stranu (celkovo 1.6m)
                // Hĺbka (Z): 0.3 metra na každú stranu (celkovo 0.6m)
                if (diffX < 1 && diffZ < 0.6) {
                    isBlockedByCharger = true;
                }
            });

            if (isBlockedByCharger) return;

            robot.targetPosition.x = nextX;
            robot.targetPosition.z = nextZ;
            robot.energy -= 2;
            if (robot.energy < 0) robot.energy = 0;
            moved = true;
        }

        if (moved) {
            updatePlayerStatus("robot1", robot.targetPosition.x, robot.targetPosition.z, robot.energy);
            checkForItemUnderRobot(robot.targetPosition.x, robot.targetPosition.z);
        }
    }); // Koniec event listenera
}

function handleDoorInteraction(robot) {
    if (!doorObjects) return;

    doorObjects.forEach(door => {
        const distance = robot.position.distanceTo(door.position);

        if (distance < 1.2) {
            // VOLÁME openDoor VŽDY. 
            // Funkcia si sama vnútri skontroluje, či má dvere "sekať" (ak sú broken)
            // alebo ich poriadne otvoriť (ak sú opravené).
            openDoor(door); 
        } else {
            // Ak sme ďaleko a dvere sú otvorené, zavrieme ich
            if (door.userData.isOpen) {
                closeDoor(door);
            }
        }
    });
}
export function updateMovement(robot) {
    handleDoorInteraction(robot);
    if (robot.targetPosition) {
        robot.position.x += (robot.targetPosition.x - robot.position.x) * 0.1;
        robot.position.z += (robot.targetPosition.z - robot.position.z) * 0.1;
    }
    
    // Namiesto okamžitého skoku pridáme plynulý prechod (0.05 určuje rýchlosť otáčania)
        robot.rotation.y += (window.worldRotation - robot.rotation.y) * 0.05;

// --- 5. AKTUALIZÁCIA HUD (Energy Bar) v controls.js ---
    const energyFill = document.getElementById('energy-fill');
    const energyText = document.getElementById('energy-text');
    
    if (energyFill && energyText) {
        // Získame maxEnergy (buď z robota alebo predvolených 200)
        const maxEng = robot.maxEnergy || 200;
        const currentEng = robot.energy || 0;

        // Výpočet percenta pre vizuálnu šírku baru
        const visualPercent = (currentEng / maxEng) * 100;
        energyFill.style.width = Math.max(0, Math.min(100, visualPercent)) + "%";
        
        // OPRAVA: Tu prepíšeme text na formát "Aktuálna / Max EP"
        energyText.innerText = Math.round(currentEng) + " / " + maxEng + " EP";

        // Logika farieb zostáva, ale používame vypočítané percentá
        if (visualPercent < 25) {
            energyFill.style.backgroundColor = "#ff4141";
        } else {
            energyFill.style.backgroundColor = "#44ff41";
        }
    }

    // Vizuálny stav robota (vybitý = čierny)
    if (robot.energy <= 0) {
        robot.traverse((child) => {
            if (child.isMesh) {
                if (!child.userData.originalColor) child.userData.originalColor = child.material.color.getHex();
                child.material.color.set(0x111111);
            }
        });
    } else {
        robot.traverse((child) => {
            if (child.isMesh && child.userData.originalColor) {
                child.material.color.setHex(child.userData.originalColor);
            }
        });
    }
}
// 1. Nezabudni pridať updateRoomDoors do importov hore!

export function repairDoor(robot) {
    if (!doorObjects) return;

    doorObjects.forEach((door, index) => { // Pridali sme 'index' do forEach
        const distance = robot.position.distanceTo(door.position);
        const cost = door.userData.repairCost || 20;

        if (distance < 1.5 && door.userData.isBroken) {
            if (robot.energy >= cost) {
                // LOKÁLNA ZMENA
                robot.energy -= cost;
                door.userData.isBroken = false;
                openDoor(door);

                // ZÁPIS DO FIREBASE
                // "room1" je ID tvojej miestnosti, index je poradie dverí v poli
                updateRoomDoors("room1", index, false); 

                updatePlayerStatus("robot1", robot.targetPosition.x, robot.targetPosition.z, robot.energy);
                console.log("Dvere opravené a stav zapísaný do databázy.");
            } else {
                console.log("Málo energie!");
            }
        }
    });
}

function openDoor(door) {
    const action = door.userData.action;
    if (!action) return;

    // --- STAV: POKAZENÉ (Prehráme celú druhú časť: Malfunction Open + Close) ---
    if (door.userData.isBroken) {
        // Ak animácia už beží, nepúšťame ju znova (aby nesekalo)
        if (action.isRunning()) return;

        action.paused = false;
        action.timeScale = 1;
        action.time = 2.6; // Skočíme na začiatok poruchy
        action.play();
        
        console.log("Dvere: Spúšťam varovný cyklus (porucha)");

        // Počkáme 2.7 sekundy (zvyšok animácie) a potom ju stopneme, 
        // aby sa pri ďalšom priblížení/státí mohla pustiť znova
        setTimeout(() => {
            if (door.userData.isBroken) {
                action.stop(); 
            }
        }, 2700);

    } 
    // --- STAV: OPRAVENÉ (Klasické čisté otvorenie) ---
    else if (!door.userData.isOpen) {
        action.paused = false;
        action.timeScale = 1;
        action.time = 0; // Začiatok čistej animácie
        action.play();
        door.userData.isOpen = true;
        
        // Zastavíme dvere v otvorenej polohe (koniec prvého segmentu)
        setTimeout(() => {
            if (door.userData.isOpen) action.paused = true;
        }, 1300);
    }
}

function closeDoor(door) {
    const action = door.userData.action;
    if (!action || !door.userData.isOpen) return;

    action.paused = false;
    action.timeScale = 1;
    
    // Skočíme na začiatok zatvárania (čisté zatváranie začína na 1.3s)
    action.time = 1.3; 
    action.play();
    door.userData.isOpen = false;

    // Po 1.3s animáciu úplne stopneme (aby nezačala hrať malfunction časť)
    setTimeout(() => {
        if (!door.userData.isOpen) action.stop();
    }, 1300);
}