/**
 * skills.js
 * 
 * Modul na UI zobrazenie a investovanie energie do SPECIAL skills.
 * Modal obrazovka s klávesou C na otvorenie/zatvorenie.
 * 
 * NOVÝ SYSTÉM:
 * - Skills začínajú na level 0
 * - Dva zdroje energie:
 *   - ACC (Accumulator) pre S, E (z pedometra)
 *   - LP (Learning Points) pre I, P, C (z questov)
 * - Exponenciálny rast požiadaviek (100, 250, 500...)
 * - Neobmedzený level cap
 */

import { 
    investSkillEnergy,
    investSkillEnergyFromLP,
    calculateSkillLevel, 
    calculateSkillEnergyRequired,
    calculateTotalEnergyForLevel,
    ensureDailyStepsForToday 
} from './database.js';

const SKILL_NAMES = {
    S: 'Strength',
    P: 'Perception',
    E: 'Endurance',
    C: 'Charisma',
    I: 'Intelligence',
    A: 'Agility',
    L: 'Luck'
};

const SKILL_DESCRIPTIONS = {
    S: 'Fyzická sila - zvýšená nosnosť',
    P: 'Vnímavosť - lepšia detekcia',
    E: 'Vytrvalosť - vyšší max HP',
    C: 'Charizmatickosť - lepšie rewards',
    I: 'Intelekt - vyššia XP gain',
    A: 'Obratnosť - rýchlejší pohyb',
    L: 'Šťastie - lepší item drop'
};

// Detailné popisy pre modal
const SKILL_DETAILS = {
    S: {
        name: "Strength (Sila)",
        description: `Fyzická sila robota určuje jeho schopnosť manipulovať s ťažkými predmetmi a vykonávať náročné úlohy. 
        Silnejší robot dokáže otvárať zablokované dvere, presúvať kontajnery a odstraňovať prekážky, ktoré by slabšiemu modelu znemožnili postup. 
        V priestoroch vesmírnej lode je sila kľúčová pri opravách poškodených panelov, inštalácii nových komponentov a záchranných operáciách. 
        Vyššia úroveň sily umožňuje používať ťažké náradie a zbrane, čo otvára nové možnosti v prieskume a obrane. 
        Každá investovaná energia do sily zvyšuje maximálnu nosnosť inventára a efektivitu pri fyzických interakciách s prostredím. 
        Robot s vysokou silou je nenahraditelným pomocníkom pri rekonštrukcii kritických systémov lode.`,
        image: "assets/skills/strength.png"
    },
    P: {
        name: "Perception (Vnímanie)",
        description: `Vnímanie predstavuje kvalitu senzorov robota a jeho schopnosť detekovať detaily v okolí. 
        Robot s vysokým vnímaním dokáže skenovať prostredie s väčšou presnosťou, odhaľovať skryté predmety a identifikovať anomálie v systémoch lode. 
        Táto vlastnosť je nevyhnutná pri hľadaní tajných vstupov, diagnostike porúch a analýze nebezpečných zón. 
        Lepšie senzory umožňujú vidieť v tme, detekovať radiáciu a zaznamenávať jemné vibrácie, ktoré môžu signalizovať problémy. 
        Vnímanie ovplyvňuje úspešnosť pri hackovaní, keďže robot musí najprv identifikovať správne porty a konektory. 
        Vyššia úroveň vnímania odhalí aj tie najmenšie stopy po minulých udalostiach na lodi a pomôže odhaliť, čo sa skutočne stalo.`,
        image: "assets/skills/perception.png"
    },
    E: {
        name: "Endurance (Výdrž)",
        description: `Výdrž robota určuje kapacitu jeho hlavnej batérie a odolnosť voči poškodeniu. 
        Robot s vysokou výdržou dokáže fungovať dlhšie bez potreby nabíjania, čo je kritické pri dlhých prieskumných misiách v odľahlých sekciách lode. 
        Táto vlastnosť tiež zvyšuje maximálne HP (health points), čo robí robota odolnejším voči environmentálnym hrozbám ako radiácia, toxické výpary alebo elektrické výboje. 
        Vyššia výdrž znamená menšiu spotrebu energie pri náročných úlohách, čímž sa predlžuje doba autonómnej prevádzky. 
        V krizových situáciách môže rozdiel v kapacite batérie rozhodnúť o úspechu alebo zlyhania misie. 
        Investovanie do výdrže je investícia do prežitia – bez energie je robot len bezradný kus kovu.`,
        image: "assets/skills/endurance.png"
    },
    C: {
        name: "Charisma (Charizma)",
        description: `Charizma robota je jeho schopnosť efektívne komunikovať s inými systémami a umelými inteligenciami. 
        Na opustenej vesmírnej lodi sú mnohé systémy riadené AI, ktoré môžu byť kooperatívne alebo nepriateľské – charizma určuje, ako tieto stretnutia dopadnú. 
        Robot s vysokou charizmou dokáže presvedčiť AI o svojich zámeroch, získať prístup k uzamknutým databázam a vyjednať lepšie podmienky. 
        Táto vlastnosť ovplyvňuje aj možnosti v dialógoch – charizmatický robot má viac možností odpovedí a dokáže manipulovať s rozhodovaciou logikou AI. 
        Pri obchodovaní a barteringu charizma znižuje ceny a otvorá prístup k vzácnym predmetom. 
        V prostredí, kde každá interakcia môže byť posledná, je schopnosť komunikácie rovnako dôležitá ako fyzická sila.`,
        image: "assets/skills/charisma.png"
    },
    I: {
        name: "Intelligence (Inteligencia)",
        description: `Inteligencia robota predstavuje jeho výpočtový výkon a schopnosť riešiť komplexné problémy. 
        Inteligentný robot dokáže hacknúť zabezpečené terminály, rozlúštiť šifrované správy a reprogramovať poškodené systémy. 
        Táto vlastnosť je kľúčová pri riešení logických hádaniek, ktoré blokujú prístup do kritických sekcií lode. 
        Vyššia inteligencia umožňuje lepšie pochopenie technických manuálov a blueprintov, čo urýchľuje opravy a upgrady. 
        Robot s vysokou inteligenciou získava viac skill pointov pri level up a efektívnejšie využíva naučené schopnosti. 
        V prostredí plnom technológie a neznámych systémov je inteligencia najcennejším nástrojom prežitia a postupu vpred.`,
        image: "assets/skills/intelligence.png"
    },
    A: {
        name: "Agility (Obratnosť)",
        description: `Obratnosť určuje rýchlosť pohybu robota, presnosť jeho akcií a schopnosť vyhýbať sa nebezpečenstvu. 
        Obratný robot dokáže rýchlo reagovať na hrozby, vyhnúť sa padajúcim trosám a presne manipulovať s krehkými komponentmi. 
        Táto vlastnosť je nevyhnutná pri navigácii cez nebezpečné zóny plné pascí, nestabilných podláh a automatických obrannách systémov. 
        Vyššia obratnosť zvyšuje šancu na úspešné vyhnutie sa útoku a znižuje spotrebu energie pri pohybe. 
        Robot s dobrou obratnosťou dokáže vykonávať presné zásahy pri opravách a montáži, čo znižuje riziko ďalšieho poškodenia. 
        V hektickom prostredí vesmírnej lode, kde každá sekunda ráta, je obratnosť rozdielom medzi životom a deaktivíciou.`,
        image: "assets/skills/agility.png"
    },
    L: {
        name: "Luck (Šťastie)",
        description: `Šťastie je najzáhadnejšia vlastnosť robota – kombinácia náhody, pravdepodobnosti a nevysvetliteľných udalostí. 
        Robot so šťastím častejšie nachádza vzácne predmety v kontajneroch, získava kritické úspech pri hackovaní a vyhýba sa náhodným poruchám. 
        Táto vlastnosť ovplyvňuje kvalitu looťu, šancu na úspešný critical hit a pravdepodobnosť priaznivých náhodných eventov. 
        Vysoké šťastie môže zachrániť život v kritických situáciách – zbraň nepriateľa sa zasekne, núdzové dvere sa otvoria v poslednú chvíľu. 
        Pri craftingu a opravách šťastie zvyšuje šancu na lepšie výsledky a bonusové vlastnosti vytvorených predmetov. 
        Aj keď sa nedá vypočítať ani predvídať, šťastie je silou, ktorá dokáže zmeniť osud celej misie.`,
        image: "assets/skills/luck.png"
    }
};

let currentPlayerId = null;
let currentSkillsData = null;
let currentRobotObj = null; // Referencia na robot objekt pre accumulator
let isSkillsModalOpen = false;
let accUpdateInterval = null; // Interval pre real-time ACC update
let lpUpdateInterval = null; // Interval pre real-time LP update
let currentTab = 'special'; // 'special', 'perks', 'fitness'

// Zoznam známych perkov (renderujeme aj keď sú zamknuté)
const KNOWN_PERKS = [
    {
        id: 'one_step_for_robot',
        title: 'Jeden krok pre robota',
        description: '+50 k max kapacite batérie',
        requires: {
            type: 'achievement',
            id: 'first_steps',
            title: 'Prvé kroky',
            target: 100,
            hint: 'Splň achievement "Prvé kroky" (100 krokov od začiatku hry).'
        }
    },
    {
        id: 'acc_capacity_tier1',
        title: 'Zvýšenie kapacity akumulátora — TIER 1',
        description: '+250 k max kapacite akumulátora',
        requires: {
            type: 'achievement',
            id: 'first_thousand',
            title: 'Dosiahnu prvú tisícku',
            target: 1000,
            hint: 'Splň cieľ "Dosiahnu prvú tisícku" a maj Strength na úrovni 1+'
        }
    }
];

/**
 * initSkillsUI — inicializuje skill modal
 * @param {string} playerId — ID aktuálneho hráča
 * @param {object} robotObj — Referencia na robot objekt (pre accumulator)
 */
export function initSkillsUI(playerId, robotObj) {
    currentPlayerId = playerId;
    currentRobotObj = robotObj;

    const modal = document.getElementById('skills-modal');
    const closeBtn = document.getElementById('skills-close-btn');
    const skillsBtnAsset = document.getElementById('skills-btn-asset');

    if (!modal || !closeBtn) {
        console.warn('Skills modal elements not found');
        return;
    }

    // Event listeners
    closeBtn.addEventListener('click', toggleSkillsModal);
    
    // Event listener pre grafický asset button
    if (skillsBtnAsset) {
        skillsBtnAsset.addEventListener('click', toggleSkillsModal);
    }

    // Tab switching event listeners
    const tabButtons = document.querySelectorAll('.skill-tab');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            if (tabName !== currentTab) {
                currentTab = tabName;
                
                // Update active state
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Re-render content
                updateSkillsDisplay();
            }
        });
    });

    // Klávesa C na otvorenie/zatvorenie
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'č') {
            e.preventDefault();
            toggleSkillsModal();
        }
    });

    // Načítaj skills pri otvorení
    loadSkillsData();
    
    // Počúvaj na zmeny v skills
    window.addEventListener('skillsUpdated', () => {
        loadSkillsData();
    });
    
    // Počúvaj na zmeny v accumulator (z pedometra)
    window.addEventListener('accumulatorUpdated', (event) => {
        if (currentTab === 'fitness' && isSkillsModalOpen) {
            try {
                const detail = event.detail || {};
                if (currentRobotObj) {
                    if (typeof detail.totalPedometerEnergy === 'number') {
                        currentRobotObj.totalPedometerEnergy = detail.totalPedometerEnergy;
                    }
                    if (typeof detail.dailySteps === 'number') {
                        const prev = currentRobotObj.dailySteps || 0;
                        currentRobotObj.dailySteps = Math.max(prev, detail.dailySteps);
                    }
                    if (detail.dailyStepsDate) {
                        currentRobotObj.dailyStepsDate = detail.dailyStepsDate;
                    }
                }
            } catch (_) {}
            loadSkillsData(); // Refresh FITNESS tab pri zmene ACC
        }
    });
    // Počúvaj na zmeny v achievements (napr. splnenie cieľa)
    window.addEventListener('achievementsUpdated', () => {
        if (currentTab === 'fitness' && isSkillsModalOpen) {
            loadSkillsData();
        }
    });
    // Počúvaj na zmeny v perkoch (odomknutie a aplikácia efektu)
    window.addEventListener('perksUpdated', () => {
        if (currentTab === 'perks' && isSkillsModalOpen) {
            loadSkillsData();
        }
    });
}

/**
 * toggleSkillsModal — otvor/zavri modal
 */
export function toggleSkillsModal() {
    const modal = document.getElementById('skills-modal');
    const hud = document.getElementById('hud');
    if (!modal) return;

    isSkillsModalOpen = !isSkillsModalOpen;
    modal.classList.toggle('hidden', !isSkillsModalOpen);
    
    // Skry/ukáž HUD
    if (hud) {
        if (isSkillsModalOpen) {
            hud.style.display = 'none';
            // Refresh data pri otvorení
            loadSkillsData();
            // Spusti real-time monitoring akumulátora a LP
            startAccumulatorMonitoring();
            startLearningPointsMonitoring();
        } else {
            hud.style.display = 'block';
            // Zastav monitoring pri zatvorení
            stopAccumulatorMonitoring();
            stopLearningPointsMonitoring();
        }
    }
}

/**
 * startAccumulatorMonitoring — spustí real-time sledovanie ACC
 */
function startAccumulatorMonitoring() {
    // Zastav existujúci interval ak beží
    if (accUpdateInterval) {
        clearInterval(accUpdateInterval);
    }
    
    // Aktualizuj každých 500ms (0.5 sekundy)
    accUpdateInterval = setInterval(() => {
        if (currentRobotObj && isSkillsModalOpen) {
            updateAccumulatorDisplay(currentRobotObj.accumulator, currentRobotObj.maxAccumulator);
        }
    }, 500);
}

/**
 * stopAccumulatorMonitoring — zastaví real-time sledovanie ACC
 */
function stopAccumulatorMonitoring() {
    if (accUpdateInterval) {
        clearInterval(accUpdateInterval);
        accUpdateInterval = null;
    }
}

/**
 * updateAccumulatorDisplay — aktualizuje len ACC display bez reload celého UI
 */
function updateAccumulatorDisplay(accumulator, maxAccumulator) {
    const accValue = document.querySelector('.acc-value');
    const accFill = document.querySelector('.acc-fill');
    
    if (accValue) {
        accValue.textContent = `${accumulator} / ${maxAccumulator} EP`;
    }
    
    if (accFill) {
        const percent = (accumulator / maxAccumulator * 100).toFixed(1);
        accFill.style.width = `${percent}%`;
    }
    
    // Aktualizuj aj max hodnoty pre input fieldy (len pre S a E)
    document.querySelectorAll('.invest-input[data-source="acc"]').forEach(input => {
        input.max = accumulator;
    });
}

/**
 * startLearningPointsMonitoring — spustí real-time sledovanie LP
 */
function startLearningPointsMonitoring() {
    if (lpUpdateInterval) {
        clearInterval(lpUpdateInterval);
    }
    
    lpUpdateInterval = setInterval(() => {
        if (currentRobotObj && isSkillsModalOpen) {
            updateLearningPointsDisplay(currentRobotObj.learningPoints, currentRobotObj.maxLearningPoints);
        }
    }, 500);
}

/**
 * stopLearningPointsMonitoring — zastaví real-time sledovanie LP
 */
function stopLearningPointsMonitoring() {
    if (lpUpdateInterval) {
        clearInterval(lpUpdateInterval);
        lpUpdateInterval = null;
    }
}

/**
 * updateLearningPointsDisplay — aktualizuje len LP display bez reload celého UI
 */
function updateLearningPointsDisplay(lp, maxLP) {
    const lpValue = document.querySelector('.lp-value');
    const lpFill = document.querySelector('.lp-fill');
    
    if (lpValue) {
        lpValue.textContent = `${lp} / ${maxLP} LP`;
    }
    
    if (lpFill) {
        const percent = (lp / maxLP * 100).toFixed(1);
        lpFill.style.width = `${percent}%`;
    }
    
    // Aktualizuj aj max hodnoty pre input fieldy (len pre I, P, C)
    document.querySelectorAll('.invest-input[data-source="lp"]').forEach(input => {
        input.max = lp;
    });
}

/**
 * loadSkillsData — načíta skills data z JSON
 */
async function loadSkillsData() {
    try {
        const res = await fetch('player_quests.json?_=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        const player = data.find(p => p.playerId === currentPlayerId);
        
        if (player) {
            // Aktualizuj robot objekt s hodnotami z JSON
            if (currentRobotObj) {
                currentRobotObj.totalPedometerEnergy = player.totalPedometerEnergy || 0;
                const jsonDaily = player.dailySteps || 0;
                const jsonDate = player.dailyStepsDate || null;
                const rtDaily = currentRobotObj.dailySteps || 0;
                const rtDate = currentRobotObj.dailyStepsDate || null;
                if (jsonDate && rtDate && jsonDate === rtDate) {
                    // Rovnaký deň: nikdy neznižuj runtime hodnotu
                    currentRobotObj.dailySteps = Math.max(rtDaily, jsonDaily);
                    currentRobotObj.dailyStepsDate = rtDate;
                } else {
                    // Ak runtime nemá nastavený dátum/hodnotu, preber JSON; inak zachovaj runtime
                    currentRobotObj.dailySteps = rtDaily || jsonDaily;
                    currentRobotObj.dailyStepsDate = rtDate || jsonDate;
                }
            }
            
            currentSkillsData = {
                skills: player.skills || {},
                accumulator: currentRobotObj ? currentRobotObj.accumulator : 0,
                maxAccumulator: currentRobotObj ? currentRobotObj.maxAccumulator : 1000,
                achievements: Array.isArray(player.achievements) ? player.achievements : [],
                perks: Array.isArray(player.perks) ? player.perks : []
            };
            updateSkillsDisplay(currentSkillsData);
        }
    } catch (error) {
        console.error('[Skills] Error loading data:', error);
    }
}

/**
 * updateSkillsDisplay — aktualizuje UI podľa aktuálnych dát
 * @param {Object} data — { skills, accumulator, maxAccumulator } (voliteľné, použije sa currentSkillsData)
 */
export function updateSkillsDisplay(data) {
    // Ak nie je poskytnutý data parameter, použi uložené dáta
    if (!data) {
        data = currentSkillsData;
    }
    
    // Ak stále nemáme dáta, return
    if (!data) {
        console.warn('[Skills] No data available for updateSkillsDisplay');
        return;
    }

    const { skills, accumulator, maxAccumulator, achievements = [], perks = [] } = data;
    const lp = currentRobotObj ? currentRobotObj.learningPoints : 0;
    const maxLP = currentRobotObj ? currentRobotObj.maxLearningPoints : 5000;

    const content = document.getElementById('skills-panel-content');
    if (!content) return;

    // Vyčisti starý obsah
    content.innerHTML = '';

    // Zobraz obsah podľa aktívneho tabu
    if (currentTab === 'special') {
        renderSpecialTab(content, skills, accumulator, maxAccumulator, lp, maxLP);
    } else if (currentTab === 'perks') {
        renderPerksTab(content, perks, achievements);
    } else if (currentTab === 'fitness') {
        renderFitnessTab(content, accumulator, maxAccumulator, achievements);
    }
}

/**
 * renderSpecialTab — vykreslí SPECIAL ATTRIBUTES tab
 */
function renderSpecialTab(content, skills, accumulator, maxAccumulator, lp, maxLP) {

    // === ACCUMULATOR PANEL (Pedometer energie) ===
    const accPanel = document.createElement('div');
    accPanel.className = 'accumulator-panel';
    accPanel.innerHTML = `
        <div class="acc-info">
            <div class="acc-icon">⚡</div>
            <div class="acc-text">
                <div class="acc-label">ACCUMULATOR ENERGY (from Pedometer)</div>
                <div class="acc-value">${accumulator} / ${maxAccumulator} EP</div>
            </div>
        </div>
        <div class="acc-bar">
            <div class="acc-fill" style="width: ${(accumulator / maxAccumulator * 100).toFixed(1)}%"></div>
        </div>
    `;

    // === LEARNING POINTS PANEL (Quest rewards) ===
    const lpPanel = document.createElement('div');
    lpPanel.className = 'learning-panel';
    lpPanel.innerHTML = `
        <div class="lp-info">
            <div class="lp-icon">🎓</div>
            <div class="lp-text">
                <div class="lp-label">LEARNING POINTS (from Quests)</div>
                <div class="lp-value">${lp} / ${maxLP} LP</div>
            </div>
        </div>
        <div class="lp-bar">
            <div class="lp-fill" style="width: ${(lp / maxLP * 100).toFixed(1)}%"></div>
        </div>
    `;

    // === SKILLS GRID ===
    const skillsGrid = document.createElement('div');
    skillsGrid.className = 'skills-investment-grid';

    Object.keys(SKILL_NAMES).forEach(statKey => {
        const skillData = skills[statKey] || { investedEnergy: 0, level: 0 };
        const currentLevel = skillData.level || 0;
        const investedEnergy = skillData.investedEnergy || 0;
        
        // Rozdelenie podľa zdroja energie
        const canInvestFromAcc = (statKey === 'S' || statKey === 'E');
        const canInvestFromLP = (statKey === 'I' || statKey === 'P' || statKey === 'C');
        const isLocked = (statKey === 'A' || statKey === 'L');
        
        // Vypočítaj energiu na ďalší level
        const energyForCurrentLevel = calculateTotalEnergyForLevel(currentLevel);
        const energyForNextLevel = calculateTotalEnergyForLevel(currentLevel + 1);
        const energyNeeded = energyForNextLevel - investedEnergy;
        const progressInCurrentLevel = investedEnergy - energyForCurrentLevel;
        const progressPercent = currentLevel === 0 
            ? (investedEnergy / energyForNextLevel * 100) 
            : (progressInCurrentLevel / (energyForNextLevel - energyForCurrentLevel) * 100);

        const card = document.createElement('div');
        let cardClass = 'skill-investment-card';
        if (isLocked) cardClass += ' disabled-skill';
        card.className = cardClass;
        
        card.innerHTML = `
            <div class="skill-header" data-skill="${statKey}">
                <div class="skill-key-large">${statKey}</div>
                <div class="skill-info">
                    <div class="skill-name">${SKILL_NAMES[statKey]}</div>
                    <div class="skill-desc">${SKILL_DESCRIPTIONS[statKey]}</div>
                </div>
                <div class="skill-level">LV ${currentLevel}</div>
            </div>
            <div class="skill-detail-hint" data-skill="${statKey}">🔍 Klikni pre detaily</div>
            
            <div class="skill-progress-section">
                <div class="skill-progress-info">
                    <span>Progress to LV ${currentLevel + 1}</span>
                    <span class="energy-needed">${energyNeeded} EP needed</span>
                </div>
                <div class="skill-progress-bar">
                    <div class="skill-progress-fill" style="width: ${Math.min(progressPercent, 100).toFixed(1)}%"></div>
                </div>
                <div class="skill-total-invested">Total invested: ${investedEnergy} EP</div>
            </div>
            
            ${canInvestFromAcc ? `
                <div class="skill-invest-controls">
                    <input type="number" 
                           class="invest-input" 
                           data-source="acc"
                           id="invest-${statKey}" 
                           min="0" 
                           max="${accumulator}" 
                           value="0" 
                           placeholder="Amount">
                    <div class="invest-buttons">
                        <button class="invest-btn" data-stat="${statKey}" ${accumulator <= 0 ? 'disabled' : ''}>
                            INVEST
                        </button>
                        <button class="invest-all-btn" data-stat="${statKey}" ${accumulator <= 0 ? 'disabled' : ''}>
                            INVEST ALL
                        </button>
                    </div>
                </div>
            ` : canInvestFromLP ? `
                <div class="skill-invest-controls">
                    <input type="number" 
                           class="invest-input" 
                           data-source="lp"
                           id="invest-${statKey}" 
                           min="0" 
                           max="${lp}" 
                           value="0" 
                           placeholder="Amount">
                    <div class="invest-buttons">
                        <button class="invest-btn" data-stat="${statKey}" ${lp <= 0 ? 'disabled' : ''}>
                            INVEST
                        </button>
                        <button class="invest-all-btn" data-stat="${statKey}" ${lp <= 0 ? 'disabled' : ''}>
                            INVEST ALL
                        </button>
                    </div>
                </div>
            ` : `
                <div class="skill-locked-message">
                    <span class="lock-icon">🔒</span>
                    <span class="lock-text">Momentálne uzamknuté</span>
                </div>
            `}
        `;

        // NAJPRV pridaj kartu do DOM
        skillsGrid.appendChild(card);

        // Pridaj event listener na header a hint pre detail modal
        const header = card.querySelector('.skill-header');
        const hint = card.querySelector('.skill-detail-hint');
        
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', (e) => {
                // Ignoruj klik ak je v input controls sekcii
                if (e.target.closest('.skill-invest-controls') || 
                    e.target.closest('.invest-btn') || 
                    e.target.closest('.invest-all-btn') ||
                    e.target.closest('.invest-input')) {
                    return;
                }
                openSkillDetail(statKey);
            });
        }
        if (hint) {
            hint.style.cursor = 'pointer';
            hint.addEventListener('click', () => openSkillDetail(statKey));
        }

        // Event listenery len pre investovateľné skills
        if (canInvestFromAcc || canInvestFromLP) {
            // Event listener na INVEST button
            const btn = card.querySelector('.invest-btn');
            const investAllBtn = card.querySelector('.invest-all-btn');
            const input = card.querySelector('.invest-input');
        
            btn.addEventListener('click', async () => {
                const amount = parseInt(input.value) || 0;
                const sourceType = input.getAttribute('data-source');
                const maxAvailable = sourceType === 'acc' ? accumulator : lp;
                
                if (amount <= 0) {
                    alert('Zadaj platné množstvo energie');
                    return;
                }
                if (amount > maxAvailable) {
                    alert(`Nedostatok ${sourceType === 'acc' ? 'ACC energie' : 'Learning Points'}!`);
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'INVESTING...';
                
                // Použiť správnu funkciu podľa zdroja
                const result = sourceType === 'acc' 
                    ? await investSkillEnergy(currentPlayerId, statKey, amount, currentRobotObj)
                    : await investSkillEnergyFromLP(currentPlayerId, statKey, amount, currentRobotObj);
                
                if (result.success) {
                    input.value = '0';
                    // Data sa automaticky refreshnú cez event listener
                    if (result.newLevel > result.oldLevel) {
                        showLevelUpNotification(statKey, result.newLevel);
                    }
                } else {
                    alert(result.message || 'Chyba pri investovaní energie');
                    btn.disabled = false;
                    btn.textContent = 'INVEST';
                }
            });

            // Event listener na INVEST ALL button
            investAllBtn.addEventListener('click', async () => {
                const sourceType = input.getAttribute('data-source');
                const availableAmount = sourceType === 'acc' 
                    ? (currentRobotObj ? currentRobotObj.accumulator : 0)
                    : (currentRobotObj ? currentRobotObj.learningPoints : 0);
                
                if (availableAmount <= 0) {
                    alert(`${sourceType === 'acc' ? 'Akumulátor' : 'Learning Points'} je prázdny!`);
                    return;
                }

                // Potvrdenie
                const sourceLabel = sourceType === 'acc' ? 'ACC EP' : 'LP';
                if (!confirm(`Investovať všetkých ${availableAmount} ${sourceLabel} do ${SKILL_NAMES[statKey]}?`)) {
                    return;
                }

                investAllBtn.disabled = true;
                btn.disabled = true;
                investAllBtn.textContent = 'INVESTING...';
                
                // Použiť správnu funkciu podľa zdroja
                const result = sourceType === 'acc'
                    ? await investSkillEnergy(currentPlayerId, statKey, availableAmount, currentRobotObj)
                    : await investSkillEnergyFromLP(currentPlayerId, statKey, availableAmount, currentRobotObj);
                
                if (result.success) {
                    input.value = '0';
                    if (result.newLevel > result.oldLevel) {
                        showLevelUpNotification(statKey, result.newLevel);
                    }
                } else {
                    alert(result.message || 'Chyba pri investovaní energie');
                    investAllBtn.disabled = false;
                    btn.disabled = false;
                    investAllBtn.textContent = 'INVEST ALL';
                }
            });
        }
    });

    // Append všetko
    content.appendChild(accPanel);
    content.appendChild(lpPanel);
    content.appendChild(skillsGrid);
}

/**
 * renderPerksTab — vykreslí PERKS tab (zatiaľ prázdny)
 */
function renderPerksTab(content, perks, achievements) {
    const wrap = document.createElement('div');
    wrap.className = 'perks-list';

    const title = document.createElement('div');
    title.className = 'perks-section-title';
    title.textContent = '🎯 Perks';
    content.appendChild(title);

    // Zmerguj známe perky so stavom hráča (odomknuté vs. zamknuté)
    KNOWN_PERKS.forEach(kp => {
        const unlocked = Array.isArray(perks) ? perks.find(p => p.id === kp.id) : null;
        const card = document.createElement('div');
        card.className = 'perk-card' + (unlocked ? '' : ' locked');

        // Ak je požiadavka achievement, vypočítaj progres
        let reqText = kp.requires?.hint || '';
        let progressText = '';
        if (kp.requires?.type === 'achievement' && Array.isArray(achievements)) {
            const ach = achievements.find(a => a.id === kp.requires.id);
            const current = ach ? (ach.current || 0) : 0;
            const target = kp.requires.target || (ach ? ach.target || 0 : 0);
            const percent = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0;
            progressText = `Progres: ${current} / ${target} (${percent}%)`;
        }

        const statusBadge = unlocked && unlocked.applied
            ? `<span class="perk-badge">UNLOCKED</span>`
            : `<span class="perk-badge locked">LOCKED</span>`;

        // Tooltip obsah (zobrazuje sa na hover)
        const tooltipPercent = (kp.requires?.type === 'achievement' && Array.isArray(achievements))
            ? (() => {
                const ach = achievements.find(a => a.id === kp.requires.id);
                const current = ach ? (ach.current || 0) : 0;
                const target = kp.requires.target || (ach ? ach.target || 0 : 0);
                return target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0;
              })()
            : 0;

        const tooltipHtml = `
            <div class="perk-tooltip">
                <div class="perk-tooltip-title">${kp.title}</div>
                ${unlocked ? '<div>Stav: ODOMKNUTÉ</div>' : '<div>Stav: ZAMKNUTÉ</div>'}
                ${!unlocked && kp.requires ? `<div>Požiadavka: ${reqText}</div>` : ''}
                ${kp.requires?.type === 'achievement' ? `<div>Progres: ${tooltipPercent}%</div>
                    <div class="perk-tooltip-bar"><div class="perk-tooltip-fill" style="width:${tooltipPercent}%"></div></div>` : ''}
            </div>
        `;

        card.innerHTML = `
            <div class="perk-header">
                <div class="perk-title">${(unlocked?.title) || kp.title || kp.id}</div>
                ${statusBadge}
            </div>
            <div class="perk-desc">${(unlocked?.description) || kp.description || ''}</div>
            ${unlocked ? `
                <div class="perk-meta">Získané: ${unlocked.acquiredAt ? new Date(unlocked.acquiredAt).toLocaleString() : 'neznáme'}</div>
            ` : `
                <div class="perk-requirement">Požiadavka: ${reqText}</div>
                ${progressText ? `<div class="perk-progress">${progressText}</div>` : ''}
            `}
            ${tooltipHtml}
        `;
        wrap.appendChild(card);
    });

    content.appendChild(wrap);
}

/**
 * renderFitnessTab — vykreslí FITNESS tab s pedometer štatistikami
 */
function renderFitnessTab(content, accumulator, maxAccumulator, achievements) {
    // Zabezpeč, že sa vždy zobrazuje dnešný deň a dnešné denné kroky
    try {
        const todayStr = new Date().toISOString().substring(0, 10);
        if (currentRobotObj && currentRobotObj.dailyStepsDate !== todayStr) {
            currentRobotObj.dailySteps = 0;
            currentRobotObj.dailyStepsDate = todayStr;
            // Persistuj asynchrónne (neblokujúco)
            ensureDailyStepsForToday(currentPlayerId, currentRobotObj).catch(() => {});
        }
    } catch (_) { /* no-op */ }
    const totalPedometer = currentRobotObj ? currentRobotObj.totalPedometerEnergy || 0 : 0;
    const dailySteps = currentRobotObj ? currentRobotObj.dailySteps || 0 : 0;
    const dailyDate = currentRobotObj ? (currentRobotObj.dailyStepsDate || '') : '';
    // === GRID LAYOUT: 3 rovnaké stĺpce v jednom riadku (Total | Current | Daily) ===
    const grid = document.createElement('div');
    grid.className = 'fitness-grid';

    const totalPanel = document.createElement('div');
    totalPanel.className = 'total-pedometer-panel mini compact';
    totalPanel.innerHTML = `
        <div class="total-ped-info">
            <div class="total-ped-icon">📊</div>
            <div class="total-ped-text">
                <div class="total-ped-label">TOTAL (Since New Game)</div>
                <div class="total-ped-value">${totalPedometer.toLocaleString()} EP</div>
                <div class="total-ped-hint">Celková energia od začiatku novej hry</div>
            </div>
        </div>
    `;

    const accPanel = document.createElement('div');
    accPanel.className = 'accumulator-panel mini compact';
    accPanel.innerHTML = `
        <div class="acc-info">
            <div class="acc-icon">⚡</div>
            <div class="acc-text">
                <div class="acc-label">CURRENT ACCUMULATOR</div>
                <div class="acc-value">${accumulator} / ${maxAccumulator} EP</div>
            </div>
        </div>
        <div class="acc-bar">
            <div class="acc-fill" style="width: ${(accumulator / maxAccumulator * 100).toFixed(1)}%"></div>
        </div>
    `;

    const dailyPanel = document.createElement('div');
    dailyPanel.className = 'daily-steps-panel mini compact';
    dailyPanel.innerHTML = `
        <div class="daily-info">
            <div class="daily-icon">📅</div>
            <div class="daily-text">
                <div class="daily-label">DAILY STEPS</div>
                <div class="daily-value">${dailySteps.toLocaleString()} EP</div>
                <div class="daily-hint">Dátum: ${dailyDate || '—'}</div>
            </div>
        </div>
    `;
    grid.appendChild(totalPanel);
    grid.appendChild(accPanel);
    grid.appendChild(dailyPanel);
    
    // === ACHIEVEMENTS (Prvé kroky + Prvá tisícka) ===
    const achWrap = document.createElement('div');
    achWrap.className = 'fitness-achievements-wrap';
    const first = Array.isArray(achievements) ? achievements.find(a => a.id === 'first_steps') : null;
    const firstCurrent = first ? (first.current || 0) : totalPedometer;
    const firstTarget = first ? (first.target || 100) : 100;
    const firstDisplay = Math.min(firstCurrent, firstTarget);
    const firstDone = first ? !!first.completed : firstDisplay >= firstTarget;
    const firstPercent = Math.min(100, Math.floor((firstDisplay / firstTarget) * 100));

    const thousand = Array.isArray(achievements) ? achievements.find(a => a.id === 'first_thousand') : null;
    const thouCurrent = thousand ? (thousand.current || 0) : totalPedometer;
    const thouTarget = thousand ? (thousand.target || 1000) : 1000;
    const thouDisplay = Math.min(thouCurrent, thouTarget);
    const thouDone = thousand ? !!thousand.completed : thouDisplay >= thouTarget;
    const thouPercent = Math.min(100, Math.floor((thouDisplay / thouTarget) * 100));

    achWrap.innerHTML = `
        <div class="fitness-section-title">🏁 Ciele a Achievementy</div>
        <div class="achievement-card ${firstDone ? 'completed' : ''}">
            <div class="ach-header">
                <div class="ach-title">Prvé kroky</div>
                <div class="ach-status">${firstDone ? '✓ Splnené' : `${firstPercent}%`}</div>
            </div>
            <div class="ach-desc">Urob prvých 100 krokov od začiatku hry</div>
            <div class="ach-progress">
                <div class="ach-fill" style="width:${firstPercent}%"></div>
            </div>
            <div class="ach-values">${firstDisplay} / ${firstTarget} krokov</div>
        </div>
        <div class="achievement-card ${thouDone ? 'completed' : ''}">
            <div class="ach-header">
                <div class="ach-title">Dosiahnu prvú tisícku</div>
                <div class="ach-status">${thouDone ? '✓ Splnené' : `${thouPercent}%`}</div>
            </div>
            <div class="ach-desc">Dosiahni 1000 krokov (TOTAL)</div>
            <div class="ach-progress">
                <div class="ach-fill" style="width:${thouPercent}%"></div>
            </div>
            <div class="ach-values">${thouDisplay} / ${thouTarget} krokov</div>
        </div>
    `;

    // Append všetko: Achievements zaradíme do toho istého gridu,
    // aby spadli do 2. riadku, stĺpca 1 (vľavo pod TOTAL)
    grid.appendChild(achWrap);
    content.appendChild(grid);
}

/**
 * Zobraz notifikáciu pri level up
 */
function showLevelUpNotification(skillKey, newLevel) {
    const notification = document.createElement('div');
    notification.className = 'skill-levelup-notification';
    notification.innerHTML = `
        <div class="levelup-icon">⬆</div>
        <div class="levelup-text">
            <strong>${SKILL_NAMES[skillKey]}</strong> reached Level ${newLevel}!
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Cleanup
 */
export function cleanupSkillsUI() {
    stopAccumulatorMonitoring();
    currentPlayerId = null;
    currentRobotObj = null;
    currentSkillsData = null;
}

/**
 * Otvorí detail modal pre konkrétnu vlastnosť
 */
function openSkillDetail(skillKey) {
    const detail = SKILL_DETAILS[skillKey];
    if (!detail) return;

    const overlay = document.createElement('div');
    overlay.className = 'skill-detail-overlay';
    overlay.id = 'skill-detail-overlay';

    const modal = document.createElement('div');
    modal.className = 'skill-detail-modal';
    
    modal.innerHTML = `
        <div class="skill-detail-header">
            <div class="skill-detail-key">${skillKey}</div>
            <h2>${detail.name}</h2>
            <button class="skill-detail-close-btn" id="close-skill-detail">✕</button>
        </div>
        
        <div class="skill-detail-body">
            <div class="skill-detail-image-container">
                <img src="${detail.image}" 
                     alt="${SKILL_NAMES[skillKey]}" 
                     class="skill-detail-image"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="skill-detail-image-placeholder" style="display:none;">
                    <div class="placeholder-icon">${skillKey}</div>
                    <div class="placeholder-text">Obrázok bude pridaný neskôr</div>
                </div>
            </div>
            
            <div class="skill-detail-description">
                <h3>Popis vlastnosti</h3>
                <p>${detail.description}</p>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('close-skill-detail');
    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
        document.removeEventListener('keydown', handleEsc);
    };
    
    const handleEsc = (e) => {
        if (e.key === 'Escape') closeModal();
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', handleEsc);

    setTimeout(() => overlay.classList.add('active'), 10);
}

