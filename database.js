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
    arrayUnion
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

// --- FUNKCIE PRE MIESTNOSŤ ---
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

// --- FUNKCIE PRE PREDMETY ---
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

// --- FUNKCIE PRE HRÁČA ---
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

export function watchInventory(playerId, callback) {
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
    const snap = await getDoc(playerRef);
    if (snap.exists()) {
        const data = snap.data();
        const maxEng = data.maxEnergy || 200; 
        const available = data.accumulator || 0;
        const current = data.energy || 0;

        if (available > 0 && current < maxEng) {
            const transferAmount = Math.min(available, maxEng - current);
            await updateDoc(playerRef, {
                energy: increment(transferAmount),
                accumulator: increment(-transferAmount)
            });
        }
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
export async function performRepairInDB(robotId, roomId, doorId, newEnergy) {
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

        // 2. Aktualizácia energie a dialógov v kolekcii "players" (opravený názov)
        const robotRef = doc(db, "players", robotId); 
        await updateDoc(robotRef, {
            energy: newEnergy,
            seenDialogues: arrayUnion("DOOR_FIXED")
        });

        console.log("Firestore: Oprava úspešne dokončená!");
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