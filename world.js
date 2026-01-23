import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();

let worldObjects = [];

export let doorMixers = []; // Zoznam prehrávačov pre všetky dvere
export let wallMap = new Set();
export let doorObjects = [];
export let chargerObjects = [];

export function generateRoom(scene, data) {
    if (!data) {
        console.warn('generateRoom: missing data');
        return;
    }
    worldObjects.forEach(obj => scene.remove(obj));
    worldObjects = [];
    wallMap.clear();
    const width = data.width || 10;
    const depth = data.depth || 10;
    const halfW = Math.floor(width / 2);
    const halfD = Math.floor(depth / 2);

    const doorCoords = new Set();
    if (data.doors) {
        data.doors.forEach(door => {
            doorCoords.add(`${door.x},${door.z}`);
        });
    }

    // 2. PODLAHA S TEXTÚROU
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load('assets/Rooms/floor1.png');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(width / 4, depth / 4); // Opakuje textúru každé 4 jednotky
    floorTexture.magFilter = THREE.NearestFilter;
    floorTexture.minFilter = THREE.NearestFilter;
    floorTexture.anisotropy = 16;
    
    const floorMat = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        color: 0x6a7a8a,
        metalness: 0.3,
        roughness: 0.7,
        emissive: 0x1a2a3a,
        emissiveIntensity: 0.3,
        envMapIntensity: 1.0
    });
    
    // Jedna veľká podlaha presne podľa veľkosti miestnosti
    const floorGeo = new THREE.BoxGeometry(width + 1, 0.1, depth + 1);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    scene.add(floor);
    worldObjects.push(floor);

   // // 3. NAČÍTANIE 3D MODELU STENY
// 3. NAČÍTANIE 3D MODELU STENY
    loader.load('assets/metal_panel.glb', (gltf) => {
        const rawModel = gltf.scene;

        // --- KROK 1: OPRAVNÉ ROTÁCIE ---
        // Postavíme stenu (X)
        rawModel.rotation.x = -Math.PI / 2; 
        
        // Otočíme ju podľa tvojej požiadavky o -90 stupňov (Y)
        // -Math.PI / 2 zodpovedá -90 stupňom
        rawModel.rotation.y = -Math.PI / 2; 

        // --- KROK 2: AKTUALIZÁCIA (Vynúti prepočet súradníc po otočení) ---
        rawModel.updateMatrixWorld(true);

        // --- KROK 3: MERANIE A CENTROVANIE (PO OTOČENÍ) ---
        const box = new THREE.Box3().setFromObject(rawModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const wallTemplate = new THREE.Group();
        
        // Posunieme vnútro skupiny tak, aby spodok steny bol na nule
        rawModel.position.set(-center.x, -center.y + (size.y / 2), -center.z);
        wallTemplate.add(rawModel);

        // --- KROK 4: AUTOMATICKÁ MIERKA ---
        // Použijeme dlhšiu horizontálnu stranu ako šírku pre 1 meter
        const modelWidth = size.x > size.z ? size.x : size.z;
        const scaleFactor = 1.0 / modelWidth; 
        wallTemplate.scale.set(scaleFactor, scaleFactor, scaleFactor);
        

        // Zvyšok kódu (placeWallModel a cykly) zostáva rovnaký
        const placeWallModel = (x, z, rotationY) => {
            const wallClone = wallTemplate.clone();
            wallClone.position.set(x, 0, z); 
            wallClone.rotation.y = rotationY;
            
            // Pridanie tieňov a vylepšenie materiálov
            wallClone.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material && child.material.isMeshStandardMaterial) {
                        child.material.metalness = 0.5;
                        child.material.roughness = 0.6;
                        child.material.envMapIntensity = 0.8;
                    }
                }
            });
            
            scene.add(wallClone);
            worldObjects.push(wallClone);
        };
        
        // ... (nasledujú tvoje cykly for pre generovanie stien)
    

        // 4. GENEROVANIE STIEN (Západ a Východ)
        for (let z = -halfD; z <= halfD; z++) {
            const westX = -halfW - 0.5;
            const eastX = halfW + 0.5;

            if (!doorCoords.has(`${westX},${z}`)) {
                placeWallModel(westX, z, -Math.PI / 2);
            }
            wallMap.add(`${-halfW - 1},${z}`);

            if (!doorCoords.has(`${eastX},${z}`)) {
                placeWallModel(eastX, z, Math.PI / 2);
            }
            wallMap.add(`${halfW + 1},${z}`);
        }

        // 5. GENEROVANIE STIEN (Sever a Juh)
        for (let x = -halfW; x <= halfW; x++) {
            const northZ = -halfD - 0.5;
            const southZ = halfD + 0.5;

            if (!doorCoords.has(`${x},${northZ}`)) {
                placeWallModel(x, northZ, Math.PI);
            }
            wallMap.add(`${x},${-halfD - 1}`);

            if (!doorCoords.has(`${x},${southZ}`)) {
                placeWallModel(x, southZ, 0);
            }
            wallMap.add(`${x},${halfD + 1}`);
        }

    }, undefined, (error) => {
        console.error("Chyba pri načítaní modelu steny:", error);
    });

    // Ensure any materials in loaded GLTFs will be visible by default
    // (This covers models that rely on environment maps or specific PBR setup)
    function ensureMaterialsVisible(obj) {
        obj.traverse((child) => {
            if (child.isMesh && child.material) {
                try {
                    // Prefer to keep original material, but make it double-sided and ensure update
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                } catch (e) {
                    // ignore
                }
            }
        });
    }

    // (debug material replacement removed)
}


export function generateDoors(scene, doorsData) {
    if (!doorsData) return;

    // 1. Získame zoznam ID dverí, ktoré nám práve prišli z databázy
    const incomingIds = doorsData.map((d, index) => d.id || `${d.x},${d.z}`);

    // 2. ODSTRÁNENIE SKUTOČNE ZMAZANÝCH DVERÍ
    // Prejdeme dvere, ktoré už v hre máme. Ak nie sú v nových dátach, vymažeme ich.
    for (let i = doorObjects.length - 1; i >= 0; i--) {
        const obj = doorObjects[i];
        if (!incomingIds.includes(obj.userData.id)) {
            scene.remove(obj);
            // Vyčistíme aj mixer pre tieto dvere
        console.error("Chyba pri načítaní modelu steny, používam fallback BoxGeometry:", error);
        // Fallback: jednoduchá stena z BoxGeometry
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.4 });
        const wallTemplate = new THREE.Group();
        const wallGeo = new THREE.BoxGeometry(1, 2.5, 0.2); // 1m široká, 2.5m vysoká, 0.2m hrubá
        const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
        wallTemplate.add(wallMesh);
        const placeWallModel = (x, z, rotationY) => {
            const wallClone = wallTemplate.clone();
            wallClone.position.set(x, 1.25, z); // 1.25 je polovica výšky
            wallClone.rotation.y = rotationY;
            scene.add(wallClone);
            worldObjects.push(wallClone);
        };
        // 4. GENEROVANIE STIEN (Západ a Východ)
        for (let z = -halfD; z <= halfD; z++) {
            const westX = -halfW - 0.5;
            const eastX = halfW + 0.5;
            if (!doorCoords.has(`${westX},${z}`)) {
                placeWallModel(westX, z, -Math.PI / 2);
            }
            wallMap.add(`${-halfW - 1},${z}`);
            if (!doorCoords.has(`${eastX},${z}`)) {
                placeWallModel(eastX, z, Math.PI / 2);
            }
            wallMap.add(`${halfW + 1},${z}`);
        }
        // 5. GENEROVANIE STIEN (Sever a Juh)
        for (let x = -halfW; x <= halfW; x++) {
            const northZ = -halfD - 0.5;
            const southZ = halfD + 0.5;
            if (!doorCoords.has(`${x},${northZ}`)) {
                placeWallModel(x, northZ, Math.PI);
            }
            wallMap.add(`${x},${-halfD - 1}`);
            if (!doorCoords.has(`${x},${southZ}`)) {
                placeWallModel(x, southZ, 0);
            }
            wallMap.add(`${x},${halfD + 1}`);
        }
        console.log("Fallback steny vygenerované.");
            const mixerIndex = doorMixers.indexOf(obj.userData.mixer);
            if (mixerIndex > -1) doorMixers.splice(mixerIndex, 1);
            
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.isMaterial) child.material.dispose();
                }
            });
            doorObjects.splice(i, 1);
        }
    }

    // 3. AKTUALIZÁCIA ALEBO PRIDANIE NOVÝCH DVERÍ
    doorsData.forEach((doorInfo, index) => {
        const doorId = doorInfo.id || `${doorInfo.x},${doorInfo.z}`;
        
        // Hľadáme, či tieto dvere už v scéne máme
        let existingDoor = doorObjects.find(d => d.userData.id === doorId);

        if (existingDoor) {
            // --- SMART UPDATE (Dvere už existujú) ---
            // Aktualizujeme stav a ak sa zmenilo isBroken, resetujeme animáciu
            const wasBroken = existingDoor.userData.isBroken;
            const isBrokenNow = doorInfo.isBroken ?? false;
            
            existingDoor.userData.isBroken = isBrokenNow;
            existingDoor.userData.repairCost = doorInfo.repairCost || 20;
            existingDoor.position.set(doorInfo.x, 0, doorInfo.z);
            
            // Ak sa zmenila stav (opravené/pokazené), resetuj animáciu
            if (wasBroken !== isBrokenNow && existingDoor.userData.action && existingDoor.userData.mixer) {
                const action = existingDoor.userData.action;
                const clip = action.getClip();
                const mixer = existingDoor.userData.mixer;
                
                // Reset animácie
                mixer.stopAllAction();
                action.play();
                
                // Nastav správny čas podľa stavu
                if (isBrokenNow) {
                    // Pokazané: spusti od polovice
                    const clipDuration = clip.duration;
                    mixer.setTime(clipDuration * 0.5);
                } else {
                    // Opravené: začni od začiatku
                    mixer.setTime(0);
                }
            }
            
            console.log(`Dvere ${doorId} aktualizované (isBroken: ${existingDoor.userData.isBroken})`);
        } else {
            // --- FULL LOAD (Nové dvere, ktoré ešte v scéne nie sú) ---
            loader.load('assets/door.glb', (gltf) => {
                
                const doorModel = gltf.scene;
                
                doorModel.position.set(doorInfo.x, 0, doorInfo.z);
                doorModel.scale.set(0.40, 0.40, 0.40); 
                doorModel.rotation.y = doorInfo.rotation || 0;

                const mixer = new THREE.AnimationMixer(doorModel);
                const clip = gltf.animations.find(a => a.name === 'DoorAnimationALL') || gltf.animations[0];
                let action = null;

                if (clip) {
                    action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    
                    // Ak sú dvere pokazené, spusť animáciu od polovice
                    if (doorInfo.isBroken) {
                        action.play();
                        // Nastav čas animácie na 50% (polovica dĺžky)
                        const clipDuration = clip.duration;
                        mixer.setTime(clipDuration * 0.5);
                    }
                }

                doorModel.userData = { 
                    id: doorId,
                    isBroken: doorInfo.isBroken ?? false,
                    repairCost: doorInfo.repairCost || 20,
                    isOpen: false,
                    mixer: mixer,
                    action: action 
                };

                scene.add(doorModel);
                // Ensure visibility of materials for imported model
                try { ensureMaterialsVisible(doorModel); } catch(e) {}
                doorObjects.push(doorModel); 
                doorMixers.push(mixer);

                console.log(`Nové dvere ${doorId} načítané do scény.`);
            }, undefined, (error) => {
                console.error("Chyba modelu:", error);
            });
        }
    });
}

export function generateChargers(scene, chargersData) {
    if (!chargersData) return;

    // 1. Získame zoznam ID chargerov z databázy
    const incomingIds = chargersData.map(c => c.id);

    // 2. ODSTRÁNENIE ZMAZANÝCH CHARGEROV
    for (let i = chargerObjects.length - 1; i >= 0; i--) {
        const obj = chargerObjects[i];
        if (!incomingIds.includes(obj.userData.id)) {
            scene.remove(obj);
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.isMaterial) child.material.dispose();
                }
            });
            chargerObjects.splice(i, 1);
        }
    }

    chargersData.forEach(data => {
        // 3. HĽADÁME EXISTUJÚCI CHARGER
        let existingCharger = chargerObjects.find(c => c.userData.id === data.id);

        if (existingCharger) {
            // --- SMART UPDATE (Charger už existuje) ---
            const wasBroken = existingCharger.userData.isBroken;
            const isBrokenNow = data.isBroken ?? false;

            // AKTUALIZUJ POZÍCIU (toto bolo hlavný problém!)
            const currentHeight = isBrokenNow ? 0.2 : 0.2;
            existingCharger.position.set(data.x, currentHeight, data.z);
            
            // Ak sa zmenil stav (opravené/pokazené), vymeň model
            if (wasBroken !== isBrokenNow) {
                // Vymažeme starý model a vytvoríme nový
                scene.remove(existingCharger);
                chargerObjects.splice(chargerObjects.indexOf(existingCharger), 1);
                
                // Zavoláme načítanie nového modelu (kód nižšie)
                loadNewCharger(scene, data);
            } else {
                // Len aktualizuj userData
                existingCharger.userData.isBroken = isBrokenNow;
                console.log(`✅ Charger ${data.id} UPDATED to position (${data.x}, ${data.z})`);
            }
        } else {
            // --- NOVÝ CHARGER ---
            loadNewCharger(scene, data);
        }
    });
}

function loadNewCharger(scene, data) {
    const modelFile = data.isBroken ? 'assets/broken_charger.glb' : 'assets/charger.glb';

    loader.load(modelFile, (gltf) => {
        const model = gltf.scene;
        model.name = data.id;

        const currentScale = data.isBroken ? 1 : 1; 
        model.scale.set(currentScale, currentScale, currentScale);

        const currentHeight = data.isBroken ? 0.2 : 0.2; 
        model.position.set(data.x, currentHeight, data.z);
        // Podpora rotácie chargeru (chrbtom k stene = Math.PI/2, -Math.PI/2, Math.PI, 0)
        model.rotation.y = data.rotation || 0;
        
        const lightColor = data.isBroken ? 0xff0000 : 0x00ffff;
        const statusLight = new THREE.PointLight(lightColor, 0, 3);
        
        statusLight.position.set(0, 0.8, 0); 
        model.add(statusLight);

        model.userData = {
            id: data.id,
            isBroken: data.isBroken,
            statusLight: statusLight,
            x: data.x,
            z: data.z,
            rotation: data.rotation || 0
        };

        scene.add(model);
        // Ensure materials are visible for charger model too
        try { ensureMaterialsVisible(model); } catch (e) {}
        chargerObjects.push(model);
        console.log(`🆕 Charger ${data.id} LOADED at position (${data.x}, ${data.z})`);
    });
}

// Funkcia na výmenu pokazeného chargera za opravený model
export function replaceChargerModel(scene, chargerId) {
    const oldChargerIndex = chargerObjects.findIndex(obj => obj.userData.id === chargerId);
    if (oldChargerIndex === -1) {
        console.error('[Charger] Charger not found:', chargerId);
        return;
    }
    
    const oldCharger = chargerObjects[oldChargerIndex];
    const { x, z, rotation } = oldCharger.userData;
    
    // Odstráň starý model zo scény
    scene.remove(oldCharger);
    chargerObjects.splice(oldChargerIndex, 1);
    console.log('[Charger] Old broken model removed');
    
    // Nahraj nový (opravený) model
    loadNewCharger(scene, {
        id: chargerId,
        x: x,
        z: z,
        rotation: rotation,
        isBroken: false
    });
}

