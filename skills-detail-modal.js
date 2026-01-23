/**
 * skills-detail-modal.js
 * Modal pre zobrazenie detailných informácií o konkrétnej vlastnosti (SPECIAL)
 */

// Detailné popisy pre každú vlastnosť
const SKILL_DETAILS = {
    S: {
        name: "Strength (Sila)",
        shortName: "SILA",
        description: `Fyzická sila robota určuje jeho schopnosť manipulovať s ťažkými predmetmi a vykonávať náročné úlohy. 
        Silnejší robot dokáže otvárať zablokované dvere, presúvať kontajnery a odstraňovať prekážky, ktoré by slabšiemu modelu znemožnili postup. 
        V priestoroch vesmírnej lode je sila kľúčová pri opravách poškodených panelov, inštalácii nových komponentov a záchranných operáciách. 
        Vyššia úroveň sily umožňuje používať ťažké náradie a zbrane, čo otvára nové možnosti v prieskume a obrane. 
        Každá investovaná energia do sily zvyšuje maximálnu nosnosť inventára a efektivitu pri fyzických interakciách s prostredím. 
        Robot s vysokou silou je nenahraditelným pomocníkom pri rekonštrukcii kritických systémov lode.`,
        image: "assets/skills/strength.png" // placeholder
    },
    P: {
        name: "Perception (Vnímanie)",
        shortName: "VNÍMANIE",
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
        shortName: "VÝDRŽ",
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
        shortName: "CHARIZMA",
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
        shortName: "INTELIGENCIA",
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
        shortName: "OBRATNOSŤ",
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
        shortName: "ŠŤASTIE",
        description: `Šťastie je najzáhadnejšia vlastnosť robota – kombinácia náhody, pravdepodobnosti a nevysvetliteľných udalostí. 
        Robot so šťastím častejšie nachádza vzácne predmety v kontajneroch, získava kritické úspech pri hackovaní a vyhýba sa náhodným poruchám. 
        Táto vlastnosť ovplyvňuje kvalitu looťu, šancu na úspešný critical hit a pravdepodobnosť priaznivých náhodných eventov. 
        Vysoké šťastie môže zachrániť život v kritických situáciách – zbraň nepriateľa sa zasekne, núdzové dvere sa otvoria v poslednú chvíľu. 
        Pri craftingu a opravách šťastie zvyšuje šancu na lepšie výsledky a bonusové vlastnosti vytvorených predmetov. 
        Aj keď sa nedá vypočítať ani predvídať, šťastie je silou, ktorá dokáže zmeniť osud celej misie.`,
        image: "assets/skills/luck.png"
    }
};

/**
 * Otvorí detail modal pre konkrétnu vlastnosť
 */
export function openSkillDetail(skillKey) {
    console.log('[Skill Detail] openSkillDetail ZAVOLANÉ s key:', skillKey);
    
    const detail = SKILL_DETAILS[skillKey];
    if (!detail) {
        console.error(`[Skill Detail] Neplatný skill key: ${skillKey}`);
        return;
    }

    console.log('[Skill Detail] Detail nájdený:', detail.name);

    // Vytvor modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'skill-detail-overlay';
    overlay.id = 'skill-detail-overlay';

    // Vytvor modal content
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
                     alt="${detail.shortName}" 
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

    // Event listeners
    const closeBtn = document.getElementById('close-skill-detail');
    closeBtn.addEventListener('click', closeSkillDetail);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeSkillDetail();
        }
    });

    // ESC key
    document.addEventListener('keydown', handleEscKey);

    // Fade in animácia
    setTimeout(() => overlay.classList.add('active'), 10);
}

/**
 * Zatvorí detail modal
 */
export function closeSkillDetail() {
    const overlay = document.getElementById('skill-detail-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
    document.removeEventListener('keydown', handleEscKey);
}

/**
 * Handler pre ESC key
 */
function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeSkillDetail();
    }
}
