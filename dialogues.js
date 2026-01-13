// dialogues.js - Knižnica rozhovorov

export const ENGEE_DIALOGUES = {
    // --- 1. ÚVODNÝ ROZHOVOR ---
    INTRO: {
        text: "Systémové jadro online. Tu Engee. Moje senzory detegujú kritické poškodenie v sektore 1. Ako sa cítiš, operátor?",
        options: [
            { 
                id: "intro_where", 
                text: "Kde to som?", 
                next: { 
                    text: "Nachádzaš sa v servisnom module lode. Tvoj kód bol prenesený do tejto jednotky pred 3 minútami.",
                    options: [{ text: "❮ SPÄŤ K OTÁZKAM", next: null }] // Prepojíme dole
                }
            },
            { 
                id: "intro_what",
                text: "Čo mám robiť?", 
                next: { 
                    text: "Tvojou prioritou je obnova energie. Nájdi v miestnosti náhradné články a vlož ich do systému.",
                    options: [{ text: "❮ SPÄŤ K OTÁZKAM", next: null }] // Prepojíme dole
                }
            },
            { text: "Rozumiem, končím komunikáciu." }
        ]
    },

    // --- 2. ROZHOVOR PRI POKAZENÝCH DVERÁCH ---
    BROKEN_DOOR: {
        generate: (cost, currentEnergy) => {
            const canAfford = currentEnergy >= cost;
            
            return {
                text: `Tieto dvere sú zablokované. Magnetický zámok vyžaduje energetický impulz o sile ${cost} jednotiek.`,
                options: [
                    { 
                        id: "door_repair_btn",
                        text: `Opraviť dvere (použiť ${cost} energie)`, 
                        disabled: !canAfford,
                        action: () => {
                            window.dispatchEvent(new CustomEvent('requestRepair', { detail: { cost } }));
                        },
                        next: { 
                            text: "Energia bola úspešne prenesená. Hydraulika dverí sa aktivuje.",
                            options: [{ text: "Vstúpiť", next: null }] 
                        }
                    },
                    { text: "Neskôr. (Odísť)", next: null }
                ]
            };
        }
    },

    BROKEN_CHARGER: {
        generate: (cost, currentAccumulator) => {
            const canAfford = currentAccumulator >= cost;
            
            return {
                text: "Detegujem poškodenú nabíjaciu stanicu typu 'Nova-7'. Obvody sú prerušené, ale konštrukcia je stabilná. Na rekalibráciu systému a opravu induktorov je potrebných " + cost + " jednotiek energie z tvojho externého akumulátora.",
                options: [
                    { 
                        id: "charger_repair_btn",
                        text: "Opraviť stanicu (Použiť " + cost + " z akumulátora)", 
                        disabled: !canAfford,
                        action: () => {
                            // Vyšleme špeciálny signál pre opravu nabíjačky
                            window.dispatchEvent(new CustomEvent('requestChargerRepair', { detail: { cost } }));
                        },
                        next: { 
                            text: "Výborne! Systém je online. Stanica teraz môže čerpať energiu z hlavného reaktora lode a dobíjať tvoje systémy.",
                            options: [{ text: "Rozumiem", next: null }] 
                        }
                    },
                    { text: "Neskôr. (Odísť)", next: null }
                ]
            };
        }
    }
    
};

// --- LOGIKA NÁVRATU PRE INTRO ---
// Tieto dva riadky fungujú, lebo INTRO je stále fixný objekt
ENGEE_DIALOGUES.INTRO.options[0].next.options[0].next = ENGEE_DIALOGUES.INTRO;
ENGEE_DIALOGUES.INTRO.options[1].next.options[0].next = ENGEE_DIALOGUES.INTRO;

// POZNÁMKA: Riadky pre BROKEN_DOOR sme odstránili, pretože 
// dvere sa generujú dynamicky a starý spôsob prepojenia by nefungoval.