// dialogues.js - Knižnica rozhovorov

/**
 * checkSkillRequirement — skontroluje, či hráč splňa skill požiadavky
 * @param {Object} skills — player skills object { S: {base, bonus}, ... }
 * @param {string} stat — stat key (S, P, E, C, I, A, L)
 * @param {number} minLevel — minimálna úroveň
 * @returns {boolean} true ak spĺňa, false ak nie
 */
export function checkSkillRequirement(skills, stat, minLevel) {
    if (!skills || !skills[stat]) return false;
    const totalLevel = (skills[stat].base || 0) + (skills[stat].bonus || 0);
    return totalLevel >= minLevel;
}

/**
 * getSkillLevelText — vráti text s aktuálnou úrovňou
 * @param {Object} skills — player skills object
 * @param {string} stat — stat key
 * @param {number} required — požadovaná úroveň
 * @returns {string}
 */
export function getSkillLevelText(skills, stat, required) {
    if (!skills || !skills[stat]) {
        return `${stat}: 0/${required} ✗`;
    }
    const totalLevel = (skills[stat].base || 0) + (skills[stat].bonus || 0);
    const met = totalLevel >= required ? '✓' : '✗';
    return `${stat}: ${totalLevel}/${required} ${met}`;
}

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
        generate: (cost, currentAccumulator, playerSkills = {}) => {
            const canAfford = currentAccumulator >= cost;
            const hasIntelligence = checkSkillRequirement(playerSkills, 'I', 5);
            const canRepair = canAfford && hasIntelligence;
            
            const skillText = getSkillLevelText(playerSkills, 'I', 5);
            
            return {
                text: `Tieto dvere sú zablokované. Magnetický zámok vyžaduje energetický impulz o sile ${cost} jednotiek z externého akumulátora.
                
POŽIADAVKY:
• Akumulátor: ${currentAccumulator}/${cost} ${canAfford ? '✓' : '✗'}
• Intelekt (I): ${skillText}

${!hasIntelligence ? 'CHYBA: Nemáš dosť intelektu na analýzu systému dverí! Potrebuješ úroveň 5 alebo vyššiu.' : !canAfford ? 'CHYBA: Nedostatok energie v akumulátore!' : 'Máš dostatočnú kapacitu na správu tohto systému.'}`,
                options: [
                    { 
                        id: "door_repair_btn",
                        text: `${!canRepair ? '[ZABLOKOVANÉ] ' : ''}Opraviť dvere (${cost} akumulátora, I: 5+)`, 
                        disabled: !canRepair,
                        action: canRepair ? () => {
                            window.dispatchEvent(new CustomEvent('requestRepair', { detail: { cost } }));
                        } : null,
                        next: canRepair ? { 
                            text: "Energia z akumulátora bola úspešne prenesená. Hydraulika dverí sa aktivuje.",
                            options: [{ text: "Vstúpiť", next: null }] 
                        } : null
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