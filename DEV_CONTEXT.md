# Engee3D — Developer Context

Krátky súhrn pre rýchlu orientáciu (na účely spolupráce a nástrojov).

## Účel repozitára
- Webová hra / demo založené na Three.js a Firebase (Firestore). Klient je čistý ES module + importmap bez bundlera.

## Ako spustiť lokálne (rýchlo)
- Otvoriť `index.html` cez lokálny server (Live Server alebo):
  - `python -m http.server 5500` (v priečinku `www`) a prejsť na `http://127.0.0.1:5500`
- Konfigurácia Firebase sa načítava z `config.local.js` (není v GIT). Skontroluj `config.example.js`.

## Dôležité súbory
- `index.html` — hlavný vstup; obsahuje importmap a načítava `app.js`.
- `app.js` — hlavná aplikácia (scéna, render loop, integrácia s DB a subsystémami).
- `config.js`, `config.local.js`, `config.example.js` — Firebase config; `config.local.js` je ignorovaný v .gitignore.
- `database.js` — wrapper pre Firestore operácie (watchRoom, watchItems, watchPlayer, update functions).
- `world.js` — generovanie miestností, dverí, nabíjačiek a ich stavov.
- `items.js`, `angie.js`, `hud.js`, `controls.js`, `camera.js` — herné subsystémy (itemy, UI hovorenie, HUD, input, kamera).
- `assets/` — 3D modely, obrázky, video.
- `css/` — Modularizované CSS súbory (00-root, 01-base, 02-energy-orb, 03-buttons, 04-modals, 05-responsive, 06-angie).

## Quick Reference - Function Map

### 📁 database.js (834 lines)
**Room Management:**
- `watchRoom(roomId, callback)` - Real-time room listener

**Item Management:**
- `watchItems(roomId, callback)` - Items on ground in room
- `pickUpItem(playerId, itemId)` - Move item to inventory

**Player Core:**
- `watchPlayer(playerId, callback)` - Real-time player data
- `updatePlayerStatus(playerId, x, z, energy)` - Update position & energy
- `useBattery(playerId, itemId, energyAmount)` - Consume battery
- `transferEnergy(playerId)` - Transfer ACC → battery

**Room State:**
- `updateRoomDoors(roomId, doorIndex, isBroken)` - Door state
- `performRepairInDB(robotId, roomId, doorId, newAcc)` - Repair door
- `setupChargerInDB(roomId)` - Create charger
- `performChargerRepairInDB(...)` - Repair charger

**Skills:**
- `getSkills(playerId)` - Fetch skills data
- `allocateSkillPoint(playerId, statKey)` - Spend skill point
- `watchPlayerSkills(playerId, callback)` - Real-time skills

**Inventory:**
- `watchPlayerInventory(playerId, callback)` - Real-time inventory
- `addToInventory(playerId, itemType, count)` - Add item
- `removeFromInventory(playerId, itemType, count)` - Remove item
- `useInventoryItem(playerId, itemType)` - Use item

**Kodex:**
- `watchPlayerKodex(playerId, callback)` - Real-time kodex
- `addKodexEntry(playerId, entryId, entryData)` - Unlock entry

**Quests:**
- `watchPlayerQuests(playerId, callback)` - Real-time quests
- `startQuest(playerId, questId, questData)` - Activate quest
- `updateQuestProgress(playerId, questId, objIndex, amount)` - Progress
- `completeQuest(playerId, questId, questData)` - Finish quest
- `giveXP(playerId, amount, source)` - Award XP + level up

### 📁 app.js (402 lines)
- `animate()` - Main render loop (real-time HUD updates here)
- `watchPlayer()` callback - Syncs Firestore → robot object
- Energy orb real-time refresh via `lastEnergyHUD` cache

### 📁 hud.js (99 lines)
- `updateEnergyHUD(current, max)` - Sets CSS vars `--fill-percent`, `--fill-fraction`
- `updateAccumulatorHUD(current, max)` - ACC bar
- `updateLevelHUD(level)` - Level badge
- `updateXPHUD(current, max)` - XP bar

### 📁 skills.js (177 lines)
- `openSkillsModal()` - Show fullscreen skills
- `renderSkillsPanel()` - Render skill cards
- `handleAllocatePoint(statKey)` - Spend point

### 📁 inventory.js (197 lines)
- `openInventoryModal()` - Show inventory UI
- `renderInventory(items)` - Render item grid
- Tab system for categories

### 📁 kodex.js (221 lines)
- `openKodexModal()` - Show kodex UI
- `renderKodex(entries)` - Render unlocked entries

### 📁 quests.js (223 lines)
- `openQuestModal()` - Show quest UI
- `renderQuests(quests)` - Render active/completed

### 📁 world.js (243 lines)
- `generateRoom(roomData)` - Create 3D room from Firestore
- Door/charger interaction logic

### 📁 hud-tiers.js (96 lines)
- `setHudTier(tierNumber)` - Change HUD frame asset
- `upgradeHudTier()` - Advance to next tier

## Common Tasks - Quick Guide

### 🎨 Change Energy Orb Visual
**File:** `css/02-energy-orb.css`
- Glow color: `.energy-orb { filter: drop-shadow(...) }`
- Fill animation: `.energy-orb::after { clip-path: ... }`
- Rotating layer: `.energy-orb::before { animation: orbSlowSpin ... }`

### 🎯 Add New Skill
1. **Database:** Add skill to `database.js` → `getSkills()` default structure
2. **UI:** Add card in `skills.js` → `renderSkillsPanel()`
3. **Logic:** Update `allocateSkillPoint()` calculation

### 📦 Add New Item Type
1. **Database:** Update `addToInventory()` in `database.js`
2. **UI:** Add icon/category in `inventory.js`
3. **Usage:** Implement `useInventoryItem()` logic

### 🗺️ Add New Kodex Entry
1. **Trigger:** Call `addKodexEntry(playerId, entryId, { title, desc, ... })`
2. **UI:** Entry auto-appears in `kodex.js` modal

### ⚡ Modify HUD Layout
**Files:** `css/01-base.css`, `index.html`
- Grid structure: `.hud-bottom { grid-template-columns: ... }`
- Module positioning: `.hud-left`, `.hud-center`, `.hud-right`

### 🎭 Change HUD Tier Frame
**File:** `hud-tiers.js`
- Add tier to `HUD_TIERS` object
- Create asset: `assets/{TierName}/HUD_Frame_Tier_{TierName}.png`
- Call: `setHudTier(tierNumber)`

### 🔧 Debug Real-Time Updates
**Check these:**
1. `app.js` animate() loop - `lastEnergyHUD` cache
2. `database.js` watchers - `onSnapshot` callbacks
3. Browser DevTools → Network → Check Firestore requests

## Firestore — aktuálna schéma (z konzoly)
- Kolekcie: `players`, `rooms`, `ship_data`.
- `players/{playerId}` (príklad `robot1`):
  - `accumulator` (number)
  - `accumulatorMax` (number)
  - `energy` (number)
  - `maxEnergy` (number)
  - `positionX`, `positionZ` (number)
  - `seenDialogues` (array[string])
  - `serviceActive` (bool)
  - `steps_sync`, `storyStep` (number)
- `rooms/{roomId}` (príklad `room1`):
  - `width`, `depth`, `name`, `walls` (array)
  - `doors` (array of maps: id, x, z, isBroken, repairCost, rotation)
  - `chargers` (array of maps: id, isBroken, repairCost, position...)

Poznámka: schéma je flexibilná (používa sa množstvo polí v objektoch). Pre robustnosť odporúčam držať konzistenciu tvarov (napr. `position: {x,z}` namiesto samostatných polí), ale nie je to nutné teraz.

## Bezpečnosť / pravidlá
- Aktuálne Firestore pravidlá v konzole sú veľmi otvorené (dočasné pravidlo umožňujúce read/write do určitého dátumu). To je riziko v produkcii.
- Odporúčanie: pridať `firestore.rules` do repo a nastaviť pravidlá, ktoré povoľujú klientovi zápis iba svojmu dokumentu (`request.auth.uid == playerId`) alebo zakázať klientský zápis a použiť Admin SDK / Cloud Functions.

## Návrhy krátkodobo
- Pridať `firestore.rules` s jednoduchými pravidlami.
- Pridať Firebase Emulator + seed skript (`tools/seed-firestore.js`) pre lokálny vývoj.
- Presunúť citlivé operácie (napr. platby/seed/masívne update) do admin skriptu.

## Kde ďalej upraviť (typické zmeny)
- Ak pridáš nové kolekcie alebo zmeníš polia, uprav `database.js` (watch/transform) a `app.js` ktorý transformy využíva.
- Ak meníš 3D modely, pridaj ich do `assets/` a aktualizuj cesty v `app.js`/`world.js`.

## Checkpointy a commity
- Keď robíš zmeny v `config.js`/`config.local.js`, uisti sa, že `config.local.js` zostane v `.gitignore`.

## Kontakty / poznámky
- Ak chceš, vytvorím: `firestore.rules` + `firebase.json` + `tools/seed-firestore.js`.

---
Súbor vytvorený na zlepšenie viditeľnosti projektu pri ďalšej spolupráci.
