# Engee3D

Jednoduchý projekt: webová 3D aplikácia (Three.js) pre robotickú hru.

Základné informácie
- Otvor `index.html` v prehliadači alebo spusti lokálny server (odporúčané).
- Projekt používa Firebase (Firestore) na ukladanie stavu hráča a položiek.

Súbory (stručne)
- `index.html` — hlavná stránka, inicializácia scény a animačná slučka.
- `angie.js` — AI avatar + typografický výstup (dialógy).
- `world.js` — generovanie miestnosti, stien, dverí, nabíjačiek.
- `controls.js` — vstupy, pohyb robota, inventár.
- `database.js` — Firebase wrapper (watch, update, repair functions) + lokálna perzistencia JSON.
- `items.js`, `hud.js`, `camera.js`, `pedometer.js`, `dialogues.js` — pomocné moduly.
- `config.example.js` — príklad konfigurácie Firebase.
- `config.local.js` — tvoje lokálne kľúče (MUSÍ byť v `.gitignore`).

Ako spustiť lokálne (rýchlo)
1. Skopíruj `config.example.js` ako `config.local.js` a doplň svoje Firebase kľúče.
2. Otvor `index.html` dvojklikom (rýchle), alebo spusti jednoduchý server (odporúčam):
   - Python 3: `python -m http.server 8000` v priečinku `www` a potom otvor `http://localhost:8000`.
3. Použi konzolu (F12) na sledovanie chýb a logov.

## Fitness, Achievements a Perks

### Pedometer (Firebase)
- Sledovanie krokov beží cez `watchPedometerSteps(playerId, robotObj, callback)` v `database.js`.
- Logika používa `lastKnownFirebaseValue` inicializovanú z `robot.totalPedometerEnergy` (nie z `accumulator`), aby sa investovanie neprepisovalo novými krokmi.
- Pri zmene z Firebase:
   - `robot.accumulator += (firebaseAccumulator - lastKnownFirebaseValue)` (clamp na `maxAccumulator`)
   - `robot.totalPedometerEnergy = firebaseAccumulator` (mirror total od NEW GAME)
   - Udalosti: `accumulatorUpdated`, `achievementsUpdated`

### Achievement: Prvé kroky
- ID: `first_steps`, kategória `fitness`, cieľ: 100 krokov.
- `current` zrkadlí `totalPedometerEnergy` (celkový počet krokov od NEW GAME).
- Po splnení sa nastaví `completed = true`, `completedAt` sa uloží.

### Perk: Jeden krok pre robota
- ID: `one_step_for_robot`
- Efekt: Trvalé `+50` k `maxEnergy` hráča.
- Odomyká sa automaticky po dokončení `first_steps`.
- Perk sa uloží do `player_quests.json` do poľa `perks` s `applied: true`.
- Udalosti po odomknutí: `perksUpdated` (toast), `energyMaxChanged` (okamžitý HUD refresh).

### UI správanie
- Skills modal obsahuje tri taby: `SPECIAL`, `PERKS`, `FITNESS`.
- `PERKS` zobrazuje aj zamknuté perky s badge `LOCKED`, popisom a požiadavkou (achievement/target), vrátane progresu a tooltipu.
- Tooltip: zobrazuje stav, požiadavku a percento s mini progress barom.
- `FITNESS` tab zobrazuje aktuálny `ACC` panel a `TOTAL PEDOMETER ENERGY` panel.

### Eventy (CustomEvent)
- `accumulatorUpdated`: `{ accumulator, totalPedometerEnergy }` — update UI panelov.
- `achievementsUpdated`: `{ achievements }` — re-render FITNESS/Perks progres.
- `perksUpdated`: `{ perkId, perks }` — zobrazí perk toast, re-render Perks tabu.
- `energyMaxChanged`: `{ maxEnergy }` — okamžitý refresh hlavného HUD.
- `learningPointsUpdated`: `{ lp, maxLP }` — update LP orbu.

### Testovanie (konzola)
- Pridaný helper v `app.js`:
   - `addSteps(120)` — pridá kroky do Firebase, vhodné na odomknutie prvého perku.
   - `fillAccumulator()`, `emptyAccumulator()`, `setAccumulator(value)` — rýchle testy ACC panelu.

### NEW GAME reset
- `resetGame(playerId)` v `database.js` resetuje:
   - `accumulator = 0`, `totalPedometerEnergy = 0`
   - `achievements = [first_steps (target=100, current=0)]`
   - `perks = []`
   - Firebase `players/robot1.accumulator = 0`

## Dizajn a farby
- ACC (pedometer energia): azúrová `#00ffff`
- LP (learning points): fialová `#c864ff`
- Perk toast: fialový rám, zobrazí sa po `perksUpdated`

## Poznámky
- `config.local.js` je povinný pre Firebase; používa sa len pre pedometer sync.
- Lokálne dáta sa ukladajú do `player_quests.json` cez helper `window.saveLocalJson` (POST na lokálny server).

Bezpečnosť
- Nikdy necommituj `config.local.js` s kľúčmi. Použi `config.example.js` v repozitári.
- Pre GitHub push používaj Personal Access Token (PAT) alebo SSH kľúč.

Ďalšie kroky (navrhované)
- Pridať `README` rozšírený o popis assetov a workflow pre Android/Cordova.
- Pridať Git LFS ak chceš verzovať veľké modely alebo videá.

Kontakt
- Ak chceš pokračovať, napíš mi, ktorú featuru implementovať ďalej (UI, opravy, nové dialógy).
