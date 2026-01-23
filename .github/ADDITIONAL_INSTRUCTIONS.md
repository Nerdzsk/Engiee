# Dodatočné technické inštrukcie pre Engiee projekt

> **Poznámka**: Tento dokument obsahuje pokročilé technické detaily, ktoré treba pridať do hlavných `copilot-instructions.md`

---

## Quest systém (Úlohy)

### Štruktúra a flow
- **Quest definície**: `quests.json` - obsahuje všetky dostupné questy (title, description, objectives, rewards)
- **Player state**: `player_quests.json` - obsahuje aktívne a dokončené questy pre hráča
- **Quest typy**: `main` (hlavné úlohy) a `subquest` (vedľajšie úlohy)
- **Quest flow**: Intro dialog → `startQuest()` → Quest notification → Quest book (klávesa J)

### Implementačné detaily
- **startQuest(playerId, questId, questData)** v `database.js`:
  - Pridá quest do `player.quests.active[]`
  - Dispatche `CustomEvent 'questsUpdated'` pre real-time UI update
  - Volá `/save-json` endpoint na uloženie do súboru
- **Quest UI tabs** v `quests.js`:
  - **Main tab**: `questType === 'main' && status !== 'completed'`
  - **Side tab**: `questType === 'subquest' && status !== 'completed'`
  - **Completed tab**: `status === 'completed'` (oba typy)
- **Event-based updates**: Namiesto cache-prone `fetch()` používame `window.addEventListener('questsUpdated')`

### Best practices
- Vždy dispatuj event po zmene quest state
- Nepoužívaj direct `fetch('player_quests.json')` pre refresh - môže vrátiť zastaranú cache
- Quest notification voláš cez `showQuestNotification(title, message)` z `hud.js`

---

## Dialog systém (ENGEE AI)

### Callback pattern
- **speak(dialogueObject, onCompleteCallback)** v `angie.js`
- Callback sa zavolá **po skončení dialógu** (user klikne na poslednú možnosť bez `next`)
- Použitie: Spustenie questov po intro dialógu

### Príklad použitia
```javascript
speak(ENGEE_DIALOGUES.INTRO, async () => {
    // Tento kód sa vykoná po ukončení dialógu
    await startQuest('robot1', 'quest_where_am_i', questData);
    showQuestNotification('Kde to som');
});
```

### Intro dialog control
- **checkAndShowIntro(playerId)** v `app.js`:
  - Kontroluje `player.hasSeenIntro` flag
  - Ak `false`, zobrazí intro a spustí prvý quest
  - Volá sa automaticky pri `initGame()`
- **markIntroAsSeen(playerId)** - nastaví flag po prvom zobrazení

---

## NEW GAME funkcionalita

### Problematika cache a reload
- **Problém**: `window.location.reload()` alebo `reload(true)` môžu cachovať JSON súbory
- **Riešenie**: Multi-layer prístup - server headers + client cache busting + Firebase reset

### Implementácia v `game-menu.js`
```javascript
// 1. Cleanup (video, storage, service worker cache)
const introVideo = document.getElementById('intro-video');
if (introVideo) {
    video.pause();
    video.currentTime = 0;
    video.src = ''; // Kritické!
}

// 2. Ulož zálohu a resetuj
await saveGame(PLAYER_ID, 'before_reset');
await resetGame(PLAYER_ID); // Resetuje JSON + Firebase

// 3. Wait for disk write
await new Promise(resolve => setTimeout(resolve, 500));

// 4. Hard reload s cache busting
window.location.href = window.location.origin + window.location.pathname + '?_=' + Date.now();
```

### Server-side cache prevention (`server.py`)
```python
def end_headers(self):
    # KRITICKÉ - bez týchto headerov browser cachuje JSON!
    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    self.send_header('Pragma', 'no-cache')
    self.send_header('Expires', '0')
    super().end_headers()
```

### Client-side cache busting (`app.js`)
```javascript
// Helper funkcia pre cache-free fetch
const fetchNoCache = (url) => fetch(url + '?_=' + Date.now(), { cache: 'no-store' });

// Použitie
fetchNoCache('rooms.json').then(res => res.json());
fetchNoCache('player_quests.json').then(res => res.json());
```

### Player state loading (`app.js`)
```javascript
// Načíta player state z JSON pri každom load/reload
async function loadPlayerState() {
    const response = await fetchNoCache('player_quests.json');
    const players = await response.json();
    const player = players.find(p => p.playerId === 'robot1');
    
    if (player) {
        robot.energy = player.energy || 200;
        // Max kapacitu batérie nehardcoduj v textoch. Načítaj zo save,
        // fallback default je centralizovaný (aktuálne 200).
        robot.maxEnergy = player.maxEnergy ?? 200;
        robot.accumulator = player.accumulator || 0;
        // Max kapacitu nikdy nehardcoduj. Použi hodnotu zo save
        // a fallback drž v jedinom mieste (aktuálne 1000).
        robot.maxAccumulator = player.maxAccumulator ?? 1000;
        
        updateEnergyHUD(robot.energy, robot.maxEnergy);
        updateAccumulatorHUD(robot.accumulator, robot.maxAccumulator);
    }
}
loadPlayerState(); // Spusti hneď
```

### Firebase reset v `resetGame()` (`database.js`)
```javascript
// Resetuj lokálny JSON
await window.saveLocalJson('player_quests.json', data);

// Resetuj Firebase accumulator (pedometer)
const playerRef = doc(db, "players", playerId);
await updateDoc(playerRef, { accumulator: 0 });
```

### Kritické pravidlá
- **NIKDY** nepoužívaj `reload(true)` - deprecated a nefunguje
- **VŽDY** reštartuj Python server po zmene `server.py` (cache headers)
- **VŽDY** resetuj Firebase accumulator spolu s lokálnym JSON
- **VŽDY** počkaj 500ms pred reloadom (aby sa stihol uložiť JSON na disk)
- **CLEANUP VIDEO** - `video.src = ''` je kritické, inak blokuje scénu

---

## Firebase Pedometer Integration

### watchPedometerSteps logika
```javascript
// Aktualizuj LEN ak Firebase hodnota je VYŠŠIA (nové kroky)
if (robotObj && firebaseAccumulator > robotObj.accumulator) {
    robotObj.accumulator = Math.min(firebaseAccumulator, robotObj.maxAccumulator);
    callback(robotObj.accumulator);
}
```

**Prečo len pri zvýšení?**
- Po NEW GAME je lokálne ACC = 0
- Firebase môže mať starú hodnotu (napr. 500)
- Podmienka `!==` by prepísala 0 → 500 ❌
- Podmienka `>` neprepíše ak je Firebase vyššia po resete ✅
- Ale: `resetGame()` teraz resetuje aj Firebase na 0, takže problém je vyriešený

### Best practices
- Firebase slúži **LEN pre pedometer** (kroky z mobilu)
- Nikdy nepoužívaj Firebase pre questy, inventory, save/load
- Pri NEW GAME resetuj **obe databázy** (JSON + Firebase)

---

## NEW GAME funkcionalita (LEGACY - staré poznámky)

### Problematika cache a reload (DEPRECATED TEXT BELOW)
- **Problém**: `window.location.reload()` alebo `reload(true)` môžu cachovať JSON súbory
- **Riešenie**: Multi-step proces s cleanup a cache busting

### Implementácia v `game-menu.js`
```javascript
// 1. Ulož zálohu
await saveGame(PLAYER_ID, 'before_reset');

// 2. Reset databázy (upraví player_quests.json)
await resetGame(PLAYER_ID);

// 3. Cleanup HTML5 video (ak existuje)
const video = document.getElementById('intro-video');
if (video) {
    video.pause();
    video.currentTime = 0;
    video.src = ''; // Vyčisti source
}

// 4. Cleanup storage (zachovaj Firebase config)
const firebaseConfig = localStorage.getItem('firebaseConfig');
localStorage.clear();
sessionStorage.clear();
if (firebaseConfig) localStorage.setItem('firebaseConfig', firebaseConfig);

// 5. Hard reload s cache busting
await new Promise(resolve => setTimeout(resolve, 500)); // Wait for JSON save
const url = window.location.pathname + '?reload=' + Date.now();
window.location.replace(url); // Not reload()!
```

### Kritické pravidlá
- **NIKDY** nepoužívaj `reload(true)` - deprecated a nefunguje
- **VŽDY** používaj `location.replace()` s timestamp parametrom
- **VŽDY** počkaj 500ms pred reloadom (aby sa stihol uložiť JSON na disk)
- **CLEANUP VIDEO** - HTML5 video s `autoplay` môže blokovať scénu po reloade

---

## HTML5 Video handling

### Problém s autoplay
- Video element s `autoplay` atribútom sa spustí pri každom načítaní stránky
- Môže blokovať Three.js scénu (overlay prekrýva canvas)

### Riešenie
```html
<!-- NIKDY nepridávaj autoplay, ak to nie je absolútne potrebné -->
<video id="intro-video" class="intro-video">
    <source src="./assets/Video/wakeup.mp4" type="video/mp4">
</video>
```

### Cleanup pri reloadoch
```javascript
const video = document.getElementById('intro-video');
video.pause();           // Zastav prehrávanie
video.currentTime = 0;   // Reset pozície
video.src = '';          // Vyčisti source (najdôležitejšie!)
```

---

## Event-based UI updates (Anti-cache pattern)

### Problém s fetch cache
```javascript
// ❌ ZLÉ - môže vrátiť starú cache
const response = await fetch('player_quests.json');
const data = await response.json();
updateUI(data);
```

### Riešenie: CustomEvent dispatch
```javascript
// ✅ DOBRÉ - v database.js po uložení
window.dispatchEvent(new CustomEvent('questsUpdated', {
    detail: { activeQuests: player.quests.active }
}));

// ✅ DOBRÉ - v UI súbore (quests.js)
window.addEventListener('questsUpdated', (event) => {
    updateQuestDisplay(event.detail.activeQuests);
});
```

### Kedy použiť
- Pri akejkoľvek zmene player state (questy, inventory, stats)
- Pri real-time updates (Firebase pedometer)
- Keď potrebuješ synchronizovať viacero UI komponentov

---

## HUD systém

### Komponenty
- **Energy Orb** (zelený) - `updateEnergyHUD(current, max)`
- **Accumulator Orb** (modrý) - `updateAccumulatorHUD(current, max)`
- **Level display** - `updateLevelHUD(level, currentXP, requiredXP)`
- **Quest notifications** (toast) - `showQuestNotification(title, message)`

### Quest notification timing
```javascript
// Zobraz HNEĎ po startQuest(), nie pred
await startQuest(playerId, questId, questData);
showQuestNotification(questData.title); // ← až tu
```

### Štýl notifikácií
- 4 sekundy display
- Slide-in animácia zľava
- Fade-out na konci
- CSS: `css/04-modals.css` (`.quest-notification` trieda)

---

## JSON súborový systém (Persistence)

### Server endpoint
- **POST `/save-json`** v `server.py`
- Prijíma: `{ filename: "player_quests.json", data: {...} }`
- Zapisuje priamo na disk

### Client-side save
```javascript
// database.js - savePlayerData()
const response = await fetch('/save-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'player_quests.json', data: players })
});
```

### Timing issues
- **Problém**: Disk write nie je okamžitý
- **Riešenie**: `await new Promise(resolve => setTimeout(resolve, 500))` pred reloadom
- Použiť pri: NEW GAME, SAVE GAME, kritických save operáciách

---

## Player state management

### Štruktúra player objektu
```json
{
  "playerId": "robot1",
  "energy": 200,
  "maxEnergy": 200, // zobrazovanie v UI musí používať `robot.maxEnergy`
  "accumulator": 0,
    "maxAccumulator": 1000, // nepoužívaj číslo v logike/texte napevno – čítaj z player.maxAccumulator
  "level": 1,
  "xp": 0,
  "hasSeenIntro": false,
  "quests": {
    "active": [],
    "completed": []
  },
  "inventory": [],
  "skills": {}
}
```

### Kritické flagy
- **hasSeenIntro**: `false` = zobraz intro dialog, `true` = skip
- **quests.active**: Array aktívnych questov (zobrazí sa v quest book)
- **accumulator**: Energia z pedometra (kapacita = `maxAccumulator`, číslo nehardcoduj)

### Reset pattern
```javascript
// resetGame() v database.js
player.hasSeenIntro = false;  // ← KRITICKÉ pre NEW GAME
player.quests = { active: [], completed: [] };
player.energy = 200;
player.accumulator = 0;
```

---

## Global exports (window scope)

### Prečo
- Niektoré funkcie musia byť dostupné z iných modulov
- NEW GAME potrebuje pristúpiť k `resetWorldScene()` z `app.js`
- Debugging v konzole

### Príklady
```javascript
// app.js
window.resetWorldScene = resetWorldScene;  // Pre NEW GAME
window.checkAndShowIntro = checkAndShowIntro;  // Pre NEW GAME
window.renderer = renderer;  // Pre debugging/cleanup
window.robot = robot;  // Pre debugging

// database.js (debugging funkcie)
window.setAccumulator = (value) => { robot.accumulator = value; };
window.fillAccumulator = () => { robot.accumulator = robot.maxAccumulator; };
```

### Best practice
- Exportuj len to, co je naozaj potrebné
- Použi prefix `window._internal` pre private globals
- Dokumentuj každý export komentárom

---

## Coding patterns ktoré fungovali

### ✅ DOBRÉ
```javascript
// 1. Async/await namiesto callback hell
const data = await fetchQuestData();
await startQuest(playerId, questId, data);

// 2. Event-based updates namiesto polling/cache
window.dispatchEvent(new CustomEvent('questsUpdated'));

// 3. Cleanup pred reloadom
video.src = '';
localStorage.clear();
await setTimeout(500);

// 4. Cache busting
const url = window.location.pathname + '?t=' + Date.now();
window.location.replace(url);
```

### ❌ ZLÉ
```javascript
// 1. reload(true) - deprecated
window.location.reload(true);

// 2. Direct reload bez cleanup
window.location.reload();

// 3. Fetch bez event dispatch
await fetch('player_quests.json'); // Stará cache!

// 4. Autoplay na video bez kontroly
<video autoplay> // Môže blokovať scénu
```

---

## Debugging workflow

### Konzolové príkazy (už existujú)
```javascript
robot  // Zobraz robot objekt
setAccumulator(5000)  // Nastav ACC
fillAccumulator()  // Naplň ACC
emptyAccumulator()  // Vyprázdni ACC
setEnergy(100)  // Nastav HP
```

### Konzolové logy ktoré pomáhajú
```javascript
console.log('[NEW GAME] Začínam reset...');
console.log('[Intro] Zobrazujem intro dialog...');
console.log('[Quest] Quest started:', questId);
```

### Prefix pattern
- `[NEW GAME]` - nová hra flow
- `[Intro]` - intro dialog
- `[Quest]` - quest operations
- `[resetWorldScene]` - scéna rendering

---

## Zhrnutie kľúčových lekcií

1. **Cache je nepriateľ**: Používaj events, nie opakované fetches
2. **Video môže blokovať scénu**: Vždy cleanup `video.src = ''`
3. **reload(true) nefunguje**: Použi `window.location.href` s timestamp
4. **Počkaj na disk write**: 500ms delay pred reloadom po save
5. **Capacity ACC čítaj z `robot.maxAccumulator`**: číslo nikdy nehardcoduj
6. **Dispatch events po zmene**: UI sa aktualizuje automaticky
7. **Callback pattern pre dialógy**: Spúšťaj questy v callback, nie pred
8. **Global exports len keď treba**: `window.` len pre NEW GAME a debug
9. **Server cache headers sú kritické**: Bez nich browser cachuje navždy
10. **loadPlayerState() pri štarte**: Synchronizuj robot objekt s JSON po každom load
11. **Firebase reset spolu s JSON**: `resetGame()` musí resetovať obe databázy
12. **watchPedometerSteps len pri zvýšení**: Zabráni prepísaniu po NEW GAME

---

**Autor**: Vytvorené na základe riešenia NEW GAME cache issues, quest system implementation a Firebase integration  
**Dátum**: Január 2026  
**Status**: Testované a funkčné  
**Posledná aktualizácia**: 20.1.2026 - Pridaný loadPlayerState, server cache headers, Firebase reset
