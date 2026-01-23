# Engee3D

RPG hra v 3D prostredí vesmírnej lode. Hráč ovláda malého robota, ktorého prebudí AI lode. Hra kombinuje klasické RPG mechaniky s fitnes integráciou (pedometer) a vzdelávacím systémom (Academy).

## Technológie
- **Frontend**: Three.js (3D engine), vanilla JavaScript (ES modules)
- **Backend**: Firebase Firestore (len pedometer sync), lokálne JSON súbory
- **Mobile**: Cordova wrapper s pedometer API
- **YouTube**: IFrame API pre Academy video system

## Základné informácie
- Otvor `index.html` v prehliadači alebo spusti lokálny server (odporúčané).
- Projekt používa Firebase (Firestore) **LEN pre pedometer** - ostatné dáta sú lokálne (JSON).
- Hlavné súbory: `app.js`, `world.js`, `controls.js`, `database.js`, `skills.js`, `academy.js`

## Ako spustiť lokálne
1. Skopíruj `config.example.js` ako `config.local.js` a doplň svoje Firebase kľúče.
2. Spusti lokálny server:
   - Python 3: `python -m http.server 5500` v priečinku `www`
   - Alebo: `start-server.bat` (Windows)
3. Otvor `http://localhost:5500`
4. Použi konzolu (F12) na sledovanie chýb a logov.

## Hlavné systémy

### SPECIAL Skills (S.P.E.C.I.A.L.)
- **7 skills**: Strength, Perception, Endurance, Charisma, Intelligence, Agility, Luck
- **3 typy energií**:
  - **ACC (Accumulator)**: S, E, A - z pedometra (kroky)
  - **LP (Learning Points)**: I, P, C - z questov a Academy videí
  - **LUCK Points**: L - budúcnosť (rewarded ads)
- **Level vzorec**: `XP(L) = BASE × L^(1+0.09×L)`
  - ACC skills: BASE = 1000 EP
  - LP skills: BASE = 100 LP
- **UI**: 5-tab modal (⚡SPECIAL, 🎯PERKS, 💪FITNESS, 🎓LEARNING, 🎬ACADEMY)
- **Color coding**: ACC=modrá (#00d4ff), LP=fialová (#c864ff)

### Academy System (NEW - Jan 23, 2026)
- **YouTube video learning** s LP odmenami
- **10 sekúnd sledovania = 1 LP**
- Playtime tracking v reálnom čase (1s interval)
- Session statistics (čas, LP, countdown)
- Video progress persistácia v `player_quests.json`
- Toast notifikácie (+1 LP Earned!)
- Debug: `academyStats()`, `resetAcademyProgress(videoId)`

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
- Skills modal obsahuje päť tabov: `⚡SPECIAL`, `🎯PERKS`, `💪FITNESS`, `🎓LEARNING`, `🎬ACADEMY`.
- `PERKS` zobrazuje aj zamknuté perky s badge `LOCKED`, popisom a požiadavkou (achievement/target), vrátane progresu a tooltipu.
- Tooltip: zobrazuje stav, požiadavku a percento s mini progress barom.
- `FITNESS` tab zobrazuje aktuálny `ACC` panel a `TOTAL PEDOMETER ENERGY` panel.
- `LEARNING` tab zobrazuje LP panel a informácie o LP systéme.
- `ACADEMY` tab zobrazuje YouTube video library s playtime tracking.

### Eventy (CustomEvent)
- `accumulatorUpdated`: `{ accumulator, totalPedometerEnergy }` — update UI panelov.
- `achievementsUpdated`: `{ achievements }` — re-render FITNESS/Perks progres.
- `perksUpdated`: `{ perkId, perks }` — zobrazí perk toast, re-render Perks tabu.
- `energyMaxChanged`: `{ maxEnergy }` — okamžitý refresh hlavného HUD.
- `learningPointsUpdated`: `{ lp, maxLP }` alebo `{ learningPoints, maxLearningPoints }` — update LP orbu.
- `questsUpdated`: `{ activeQuests }` — refresh quest log.
- `skillsUpdated`: `{ skills }` — refresh skills UI.

### Testovanie (konzola)
- Pridané helpery v `app.js`:
   - `addSteps(120)` — pridá kroky do Firebase, vhodné na odomknutie prvého perku.
   - `fillAccumulator()`, `emptyAccumulator()`, `setAccumulator(value)` — rýchle testy ACC panelu.
   - `robot.learningPoints` — LP hodnota (môžeš manuálne zmeniť).
   - `academyStats()` — zobraz všetky video štatistiky.
   - `resetAcademyProgress(videoId)` — reset video progresu.

### NEW GAME reset
- `resetGame(playerId)` v `database.js` resetuje:
   - `accumulator = 0`, `totalPedometerEnergy = 0`
   - `achievements = [first_steps (target=100, current=0)]`
   - `perks = []`
   - Firebase `players/robot1.accumulator = 0`

## Dizajn a farby
- **ACC (pedometer energia)**: Azúrová/Cyan `#00ffff`
- **LP (learning points)**: Fialová `#c864ff`
- **Energy (HP)**: Zelená
- **Perk toast**: Fialový rám, zobrazí sa po `perksUpdated`
- **ACC skills cards**: Modrá `#00d4ff`
- **LP skills cards**: Fialová `#c864ff`

## UI Improvements (Jan 23, 2026)
- **Väčšie fonty**: SPECIAL key 48px, názvy 16px, popisy 13px
- **Inline controls**: Input (65px) + INVEST + ALL v jednom riadku
- **Color-coded skills**: ACC=modrá, LP=fialová
- **Odstránené**: "🔍 Klikni pre detaily" hláška
- **Lepší spacing**: 15px gap medzi progress textami

## Poznámky
- `config.local.js` je povinný pre Firebase; používa sa len pre pedometer sync.
- Lokálne dáta sa ukladajú do `player_quests.json` cez helper `window.saveLocalJson` (POST na lokálny server).
- **Agility (A)** bol presunnutý z locked na ACC skills (Jan 23, 2026).
- **Nový level vzorec** (Jan 23, 2026): `XP(L) = BASE × L^(1+0.09×L)` namiesto starého `100 * 1.5^(L-1)`.
- Firebase sa používa **LEN pre pedometer** - questy, skills, inventory sú lokálne JSON.

## Dokumentácia
Pozri súbory:
- `DEV_CONTEXT.md` - kompletný technický prehľad
- `LEARNING_POINTS_SYSTEM.md` - LP systém, Academy, UI improvements
- `SKILLS_INVESTMENT_SYSTEM.md` - SPECIAL skills, level vzorce
- `HUD_TIER_SYSTEM.md` - HUD tier management
- `.github/copilot-instructions.md` - coding štandardy

Bezpečnosť
- Nikdy necommituj `config.local.js` s kľúčmi. Použi `config.example.js` v repozitári.
- Pre GitHub push používaj Personal Access Token (PAT) alebo SSH kľúč.

Ďalšie kroky (navrhované)
- Pridať `README` rozšírený o popis assetov a workflow pre Android/Cordova.
- Pridať Git LFS ak chceš verzovať veľké modely alebo videá.

Kontakt
- Ak chceš pokračovať, napíš mi, ktorú featuru implementovať ďalej (UI, opravy, nové dialógy).

## Aktualizácie — Jan 23, 2026

### Nové Achievementy a Perky
- Achievement `first_thousand` (Prvá tisícka): cieľ 1000 krokov (TOTAL). Progres sa počíta ako `min(totalPedometerEnergy, target)`. Po splnení sa vyvolá špecifická udalosť `achievementCompleted` pre toast.
- Perk `acc_capacity_tier1`: trvalé `+250` k `maxAccumulator`. Odomkne sa len vtedy, ak sú splnené OBE podmienky: `first_thousand.completed === true` a `Strength (S) >= 1`. Odomykanie funguje pri pedometer update aj priamo po investovaní do S.

### Denné kroky (Daily Steps)
- `dailySteps` sleduje dnešný prírastok krokov; resetuje sa pri zmene dátumu (polnoc). UI využíva runtime hodnoty z `accumulatorUpdated` eventu a nikdy neznižuje zobrazenú hodnotu staršou JSON hodnotou.

### Nové eventy a toasty
- `achievementCompleted`: `{ id, title, description }` — používa sa na zobrazenie 🏆 achievement toastu (napr. pri `first_thousand`).
- `accumulatorUpdated`: rozšírené o `{ dailySteps, dailyStepsDate }` — umožňuje realtime zobrazenie Daily.
- Pridané toast komponenty v `index.html` + štýly v `css/04-modals.css`: achievement (cyan) a daily reset (zeleno-azúrový).

### UI
- FITNESS tab zobrazuje tri panely: `TOTAL (Since New Game)`, `CURRENT ACCUMULATOR`, `DAILY STEPS` + sekciu Achievements (`Prvé kroky`, `Prvá tisícka`).
