import { db } from './database.js';
import { doc, updateDoc, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Pomocné premenné pre stabilitu na pozadí (podobne ako v tvojom StepService.kt)
let stepBuffer = 0;
let lastSyncTime = Date.now();
let lastSteps = -1;

export async function activatePedometer(playerId) {
    // 1. Kontrola, či sme v mobilnom prostredí
    if (typeof pedometer === 'undefined') {
        console.warn("Natívny pedometer nie je dostupný. Bežíš v prehliadači?");
        return "BROWSER_MODE";
    }

    // 2. Povolenia pre Android (Rozšírené pre verzie 13+)
    if (window.cordova && window.cordova.plugins.permissions) {
        const perms = window.cordova.plugins.permissions;
        const list = [
            perms.ACTIVITY_RECOGNITION,
            perms.POST_NOTIFICATIONS 
        ];
        
        perms.requestPermissions(list, (status) => {
            if(!status.hasPermission) console.warn("Chýbajú povolenia pre beh na pozadí.");
        });
    }

    // 3. Background Mode - Konfigurácia pre Realme
    if (window.cordova && window.cordova.plugins.backgroundMode) {
        const bg = window.cordova.plugins.backgroundMode;
        bg.enable();
        bg.setDefaults({
            title: 'Engee 3D Tracking',
            text: 'Systém je aktívny aj v kapse...',
            icon: 'ic_launcher', 
            color: '44ff41',
            resume: true,
            hidden: false,
            sticky: true // Zabezpečí, že notifikácia nezmizne
        });

        bg.on('activate', () => {
            bg.disableWebViewOptimizations();
            bg.disableBatteryOptimizations(); // Špeciálne pre Realme/Xiaomi
            if (bg.unlock) bg.unlock(); 
        });
    }

    // 4. Spustenie senzora s inteligentným bufferom
    pedometer.startPedometerUpdates((data) => {
        // Výpočet reálneho prírastku (rozdiel medzi novým a starým stavom)
        let diff = 0;
        if (lastSteps === -1) {
            lastSteps = data.numberOfSteps;
            diff = 1;
        } else if (data.numberOfSteps > lastSteps) {
            diff = data.numberOfSteps - lastSteps;
            lastSteps = data.numberOfSteps;
        }

        if (diff > 0) {
            stepBuffer += diff; // Pridáme kroky do dočasného "zásobníka"
        }

        const currentTime = Date.now();
        // SYNCHRONIZÁCIA: Pošleme dáta len ak:
        // - prešlo aspoň 10 krokov (šetrí batériu a stabilitu siete)
        // - ALEBO prešlo viac ako 15 sekúnd od posledného zápisu
        if (stepBuffer >= 10 || (currentTime - lastSyncTime > 15000 && stepBuffer > 0)) {
            const playerRef = doc(db, "players", playerId);
            const toSync = stepBuffer;
            stepBuffer = 0; // Vynulujeme zásobník pred zápisom
            lastSyncTime = currentTime;

            runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                const currentAccumulator = playerDoc.data()?.accumulator || 0;
                const maxAccumulator = playerDoc.data()?.accumulatorMax || 1000;
                const newAccumulator = Math.min(currentAccumulator + toSync, maxAccumulator);
                
                transaction.update(playerRef, {
                    accumulator: newAccumulator,
                    last_sync: new Date(),
                    debug_steps: data.numberOfSteps
                });
            }).then(() => {
                console.log(`Úspešná synchronizácia: +${toSync} krokov (kapacita rešpektovaná).`);
            }).catch(err => {
                // Ak zápis zlyhá (napr. vypnutá sieť v kapse), vrátime kroky do zásobníka
                stepBuffer += toSync;
                console.warn("Zápis odložený (offline), kroky zostávajú v buffery.");
            });
        }

    }, (error) => {
        console.error("Chyba senzora pedometra:", error);
    });

    return "ACTIVE_ACCUMULATOR_SYNC_V2";
}

// Funkcia pre DEBUG tlačidlo
export async function addStepToDatabase(playerId, amount) {
    const playerRef = doc(db, "players", playerId);
    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            const currentAccumulator = playerDoc.data()?.accumulator || 0;
            const maxAccumulator = playerDoc.data()?.accumulatorMax || 1000;
            const newAccumulator = Math.min(currentAccumulator + amount, maxAccumulator);
            
            transaction.update(playerRef, {
                accumulator: newAccumulator
            });
        });
        console.log(`Debug: Pridaných ${amount} jednotiek (kapacita rešpektovaná).`);
    } catch (e) {
        console.error("Chyba pri debug kroku:", e);
    }
}