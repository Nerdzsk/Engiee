# Všeobecné pokyny pre GitHub Copilot

## Jazyk komunikácie
- Komunikuj so mnou vždy **po slovensky**.
- Vysvetlenia, komentáre ku kódu aj odpovede píš v slovenskom jazyku, pokiaľ výslovne nepoviem inak.
- Angličtinu používaj len pre názvy premenných, funkcií, tried, API a systémové názvy.

## Štýl vysvetľovania
- Predpokladaj, že som **začiatočník** – vysvetľuj veci krok za krokom, jasne popíš každý dôležitý pojem.
- Vždy uveď, **kam presne** mám daný kód vložiť (názov súboru, relatívna cesta, riadok či funkcia).
- Pri novom koncepte alebo API najprv stručne vysvetli, na čo to slúži, potom ukáž príklad.
- Ak odporúčaš knižnicu alebo nástroj, pripoj krátke info, prečo je vhodný a ako ho nainštalovať.

## O projekte Engiee

### Herný koncept a príbeh
- **Žáner**: RPG hra odohravajúca sa v prostredí vesmírnej lode
- **Začiatok hry**: Umelá inteligencia (AI) lode prebudí malého robota v servisnej miestnosti
- **Hlavná postava**: Malý robot, ktorý sa zobúdza na opustenej/poškodenej vesmírnej lodi
- **Cieľ**: Preskúmať loď, odhaliť, čo sa stalo, a prežiť

### Technická implementácia
- **Hlavný vývoj**: Hra sa programuje vo Visual Studio Code, súbory sú ukladané lokálne a verzované na GitHub
- **Názov projektu**: Engiee (skratka z "ENGEE" alebo "Engine")
- **Firebase integrácia**: Momentálne použitá len pre jednu funkcionalitu – pedometer systém
- **Android aplikácia**: Vyvinutá v Android Studio, nainštalovaná na mobilnom telefóne

### Pedometer systém (fitness integrácia)
- **Funkcia**: Hráč môže reálne kroky (z pedometra v telefóne) využiť v hre
- **Tok dát**: Mobilná aplikácia (Android) → Firebase → Webová hra
- **Použitie v hre**: Kroky z pedometra sa dajú použiť na dobíjanie akumulátora robota
- **Energetický systém**:
  - **Batéria robota**: Hlavný hráčov robot má vlastnú batériu s obmedzenou kapacitou
  - **Akumulátor (ACC - súčiastka)**: Špeciálna súčiastka, ktorá dokáže skladovať energiu z krokov
  - **Dobíjanie z krokov**: Kroky z pedometra sa prevádzajú na energiu a ukladajú do akumulátora
  - **Presun energie**: Hráč môže presúvať energiu medzi akumulátorom a batériou robota
  - **ACC investovanie**: ACC energiu možno investovať do Strength (S) a Endurance (E) skills

### Learning Points systém (nový - 22.1.2026)
- **Funkcia**: Druhá mena v hre, získavaná z questov
- **Tok dát**: Quest completion → player_quests.json → LP orb update
- **Použitie v hre**: LP sa dajú použiť na investovanie do mentálnych skills
- **LP systém**:
  - **Learning Points (LP)**: Mena získavaná za dokončenie questov
  - **LP Orb**: Fialový orb vpravo hore (max 5000 LP)
  - **LP investovanie**: LP energiu možno investovať do Intelligence (I), Perception (P), Charisma (C)
  - **Quest rewards**: Každý quest má definované `learningPoints` v rewards (50, 20, 15)
  - **Vizuálna identifikácia**: Fialová farba (#c864ff) pre LP vs modrá (#00ffff) pre ACC

### SPECIAL Skills rozdelenie
- **ACC Skills** (Accumulator - z pedometra): Strength (S), Endurance (E)
- **LP Skills** (Learning Points - z questov): Intelligence (I), Perception (P), Charisma (C)
- **Locked Skills** (zatiaľ nedostupné): Agility (A), Luck (L)
- **Budúca expanzia**: LUCK Points z rewarded ads (AdMob) pre A a L skills

### Technológie a stack
- **Frontend**: HTML, CSS, JavaScript (možno React/Vue)
- **Backend**: Node.js / Python (ak je potrebný)
- **Databáza**: Firebase Realtime Database / Firestore (len pre pedometer)
- **Mobile**: Android (Kotlin), pedometer API
- **Verzovanie**: Git + GitHub
- **Architektúra**: Dodržiavame separation of concerns – repository layer pre databázové operácie, service layer pre biznis logiku, presentation layer pre UI.
- **Coding konvencie**: 
  - Používaj dependency injection (DI) tam, kde to dáva zmysel.
  - Nepíš raw SQL tam, kde môžeš použiť Firebase SDK alebo ORM.
  - Pomenúvaj premenné a funkcie výstižne (camelCase pre JS/TS, snake_case pre Python).
  - Každú funkcionalitu komentuj aspoň stručným vysvetlením, čo robí.

## Čo robiť
- Pri generovaní kódu vždy uvádzaj krátky vysvetľujúci komentár nad každou dôležitou časťou.
- Ponúkaj best practices pre Firebase, Google Maps API a Android vývoj.
- Navrhuj refaktoring, keď vidíš duplicitný alebo ťažko udržiavateľný kód.
- Pri novej feature najprv načrtni architektúru (aké súbory, moduly, prepojenia) a potom uvádzaj kód.

## Čo nerobiť
- Nekopíruj veľké bloky kódu bez vysvetlenia.
- Nepoužívaj zastaralé prístupy (napr. callback hell v JS, použiť async/await).
- Neodporúčaj raw SQL queries tam, kde Firebase SDK postačuje.
- Nevkladaj hardcoded API keys alebo citlivé dáta do kódu – pripomeň používanie environment variables.
- pri kazdom tvojom novom pripsevku pridaj na zaciatok tri hviezdicky pred text ***


---

## Aktuálny stav projektu (Technical Details)

### Ovládanie a pohyb
- **Klávesy**: WASD + šípky (obe fungujú rovnako)
- **Rotácia**: Klávesy A/D rotujú MIESTNOSŤ (nie robota) - robot sa otáča spolu s miestnosťou, aby bol stale viditelný zozadu
- **Robot model**: Scale 0.33 (1/3 pôvodnej veľkosti)
- **Kamera**: Dynamická výška podľa zoom (1.5 pri blízkom = za plecom, až 8.5 pri ďalekom = izometrický)
- **Zoom**: MinDistance 2, MaxDistance 25, predvolene 2 (začíname najblížšie)

### Firebase integrácia
- **DÔLEŽITÉ**: Firebase sa používa **LEN pre pedometer systém** (kroky z mobilu)
- **watchPedometerSteps()** sleduje zmeny v `players/{playerId}/accumulator` v reálnom čase
- **Ostatné systémy** (questy, inventár, save/load) sú **lokálne** (JSON súbory)
- Konfigurácia: `config.local.js` (nie je v GIT, použiť `config.example.js` ako šablónu)

### Transfer energie
- **Funkcia**: `transferEnergy(playerId, robotObj)` v database.js
- Presúva energiu z `robot.accumulator` do `robot.energy`
- Kontroluje limity (prázdny ACC, plná batéria)
- Automaticky aktualizúje HUD (zelený a modrý orb)

### Grafické vylepšenia
- **Osvetlenie**: 
  - Ambient (modrastný tón 0x4a5f7f)
  - Directional light s tieňami (2048x2048 shadow map)
  - Hemisphere light (simulácia oblohy)
  - 2x Point lights (cyan a orange) pre atmosféru
- **Tiene**: Povolené na renderer, robot, steny, podlaha
- **Materiály**: PBR (metalness, roughness) - robot 0.6/0.4, steny 0.5/0.6, podlaha 0.3/0.7
- **Atmosféra**: Fog (10-80), pozadie 0x0f1419, tone mapping ACES Filmic
- **Grid helper**: Odstránený z projektu

### Kolízne systémy
- **Nabíjačka (charger)**: Kruhová kolízia s polomerom 0.6 (funguje pri akejkoľvek rotácii chargeru)
- **Steny**: wallMap (Set s koordinátmi)
- **Itemy**: Blokujú políčko, kde ležia

### Debugging nástroje (dostupné v konzole)
- `robot` - priamy prístup k robot objektu
- `setAccumulator(value)` - nastav ACC hodnotu
- `fillAccumulator()` / `emptyAccumulator()` - naplň/vyprázdni ACC
- `setEnergy(value)` - nastav HP hodnotu
- `robot.learningPoints` - LP hodnota (môžeš manuálne zmeniť pre testovanie)
- `robot.skills` - všetky SPECIAL skills a ich levely

## Coding štandardy pre tento projekt
- Pri pridávaní Firebase kódu: **Len pre pedometer**, nie pre gameplay logiku
- Pri grafických úpravách: Používať PBR materiály (metalness/roughness)
- Pri kolíziách: Preferuj kruhové kolízie pre objekty s rotáciou
- Pri kamerových úpravách: Zachovať dynamickú výšku podľa vzdialenosti
- **Pri skills systéme**: Rozlišuj medzi ACC (S,E) a LP (I,P,C) - nepoužívaj `investSkillEnergy()` pre LP skills!
- **Pri event dispatchingu**: Používaj CustomEvent s detail objektom pre všetky update eventy
- **Pri CSS layout**: Skills modal nesmie mať scrollbars - všetko musí byť viditeľné naraz (5-column grid)


---

## Kritické technické poznatky (Lessons Learned)

### Anti-patterns (Čo NEROBÍŤ) ❌

- **window.location.reload(true)** – deprecated, nefunguje spoľahlivo
- **Direct fetch na playerquests.json** – browser cache vráti staré dáta
- **HTML5 video s autoplay bez cleanup** – blokuje Three.js scénu po reloade
- **Reload bez čakania (500ms delay)** – JSON súbor sa nestihne uložiť na disk
- **Callback hell v async kóde** – použi async/await namiesto vnorených callbackov

### Patterns that work (Čo ROBÍŤ) ✅

- **Event-based UI updates**: `window.dispatchEvent(new CustomEvent('questsUpdated', { detail: data }))`
- **Cache busting reload**: `window.location.replace(url + '?t=' + Date.now())`
- **Video cleanup**: `video.src = ''` pred každým reloadom
- **Async/await pattern**: namiesto callback hell používaj modernú syntax
- **Počkaj na disk write**: `await new Promise(resolve => setTimeout(resolve, 500))` pred reloadom

### Kľúčové systémy a flow

#### Quest system flow
```javascript
// Správny postup:
1. speak(dialogue, async () => {           // Dialog callback
2.   await startQuest(questId, data);     // Start quest
3.   showQuestNotification(title);        // Zobraz notifikáciu
4. });
// startQuest() automaticky dispatchne 'questsUpdated' event
```

#### NEW GAME flow
```javascript
// Správny postup:
1. await saveGame(playerId);              // Ulož aktuálny stav
2. await resetGame(playerId);             // Reset player dát
3. video.pause(); video.src = '';         // Cleanup HTML5 video
4. localStorage.clear();                   // Vymaž storage (okrem Firebase config)
5. await new Promise(r => setTimeout(r, 500)); // Počkaj na disk write
6. window.location.replace(url + '?t=' + Date.now()); // Cache-bust reload
```

#### Event-based updates (anti-cache pattern)
```javascript
// V database.js po zmene stavu:
window.dispatchEvent(new CustomEvent('questsUpdated', {
  detail: { activeQuests: player.quests.active }
}));

// V UI súbore (quests.js, hud.js):
window.addEventListener('questsUpdated', (event) => {
  updateQuestDisplay(event.detail.activeQuests);
});
```

### Debugging (console commands)

Tieto funkcie sú dostupné v browser console pre rýchle testovanie:

```javascript
robot                    // Zobraz robot objekt
setAccumulator(5000)     // Nastav ACC hodnotu
fillAccumulator()        // Naplň ACC na maximum
emptyAccumulator()       // Vyprázdni ACC
setEnergy(100)          // Nastav HP hodnotu
resetWorldScene()       // Reset scény (pre NEW GAME)
```

### Dôležité konštanty

- **Accumulator capacity**: 10000 (nie 100!)
- **Disk write delay**: 500ms minimálne pred reloadom
- **Quest notification duration**: 4 sekundy
- **Video cleanup**: Vždy `video.src = ''` pred reload/cleanup

### Console log prefixes (pre debugging)

- `[NEW GAME]` – nová hra flow
- `[Intro]` – intro dialog systém
- `[Quest]` – quest operácie
- `[resetWorldScene]` – scéna rendering
- `[Firebase]` – pedometer real-time updates- `[Pedometer]` – pedometer logika, total energy tracking

---

## SKILLS MODAL TAB SYSTEM (Jan 23, 2026)

### Tri taby v Skills Modale
1. **⚡ SPECIAL ATTRIBUTES** - Investovanie do skills (S,P,E,C,I,A,L)
2. **🎯 PERKS** - Placeholder pre budúce perky (založené na achievements)
3. **💪 FITNESS** - Pedometer tracking a fitness štatistiky

### Tab implementácia
- **HTML**: `<div class="skills-modal-tabs">` s buttonmi `data-tab="special|perks|fitness"`
- **JavaScript**: `currentTab` state variable, routing v `updateSkillsDisplay()`
- **Render funkcie**: `renderSpecialTab()`, `renderPerksTab()`, `renderFitnessTab()`

### FITNESS Tab - Total Pedometer Energy System

#### Koncept
- **Current Accumulator** (modrý panel) - aktuálna energia v ACC, znižuje sa pri investovaní/transfere
- **Total Pedometer Energy** (zelený panel) - celková energia od NEW GAME, **nikdy sa neznižuje**
- Total = Firebase hodnota (mirror), ukazuje reálny progres z krokov

#### Kľúčové vlastnosti
- `robot.totalPedometerEnergy` - sledované v robot objekte aj JSON
- Pri NEW GAME: `totalPedometerEnergy = 0` (resetuje sa v `resetGame()`)
- Pri nových krokoch: Total = Firebase hodnota (nie prírastok!)
- Pri investovaní: Current klesne, Total zostane (ukazuje celkové kroky od začiatku)

#### Logika watchPedometerSteps (KRITICKÁ)
```javascript
// SPRÁVNA logika - používa lastKnownFirebaseValue z Total, nie z Current!
let lastKnownFirebaseValue = robotObj.totalPedometerEnergy || 0;

// Pri Firebase update:
if (firebaseAccumulator > lastKnownFirebaseValue) {
    const energyGained = firebaseAccumulator - lastKnownFirebaseValue;
    robotObj.accumulator += energyGained;  // Pridaj len rozdiel
    robotObj.totalPedometerEnergy = firebaseAccumulator;  // Mirror Firebase
    lastKnownFirebaseValue = firebaseAccumulator;  // Update tracker
}
```

**Prečo je to dôležité:**
- Ak by sme porovnávali s `robotObj.accumulator`, investovanie by sa resetovalo pri ďalších krokoch
- `lastKnownFirebaseValue` sleduje Firebase stav, nie lokálny ACC stav
- Pri refreshi stránky sa inicializuje z `totalPedometerEnergy`, nie z `accumulator`

#### Príklad scenára
```
1. Začnem: Current = 62, Total = 62, Firebase = 62
2. Investujem 12 EP → Current = 50, Total = 62, Firebase = 62
3. Refresh → Načíta: Current = 50, Total = 62
4. lastKnownFirebaseValue = 62 (z Total!)
5. Nové kroky → Firebase = 65
6. energyGained = 65 - 62 = 3
7. Current = 50 + 3 = 53 ✓
8. Total = 65 ✓
```

### CSS Problémy a riešenia - Skill Investment Controls

#### Problém: Input fieldy a buttony nereagovali na kliky
**Príčina**: Hover efekty na `.skill-investment-card` zvyšovali `z-index: 100` a blokovali pointer events

**Riešenie (Jan 23, 2026):**
1. **Odstránený hover efekt** na `.skill-investment-card:hover` (transform, scale, z-index)
2. **Odstránený `::before` pseudo-element** - overlay blokoval kliky
3. **Explicitné pointer-events a z-index**:
   ```css
   .skill-invest-controls { z-index: 150 !important; pointer-events: auto !important; }
   .invest-input { z-index: 150 !important; pointer-events: auto !important; cursor: text !important; }
   .invest-btn { z-index: 150 !important; pointer-events: auto !important; cursor: pointer !important; }
   .invest-all-btn { z-index: 150 !important; pointer-events: auto !important; }
   ```

**Lesson Learned**: Pri komplexných UI s prekrývajúcimi elementmi:
- Používaj explicitné `pointer-events: auto !important` na interaktívne elementy
- Daj im vyšší `z-index` ako околiu
- Odstráň zbytočné hover efekty, ktoré menia z-index
- Pozor na `::before` / `::after` pseudo-elementy - môžu blokovať kliky