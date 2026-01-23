# Engee3D — Developer Context

Kompletný technický prehľad pre rýchlu orientáciu (na účely spolupráce a nástrojov).

## Účel repozitára
- Webová 3D RPG hra založená na Three.js a Firebase (Firestore)
- Klient: čisté ES modules + importmap bez bundlera
- Server-side: Firebase Firestore real-time synchronizácia
- Mobilná podpora: Cordova wrapper s pedometer intergráciou

## Ako spustiť lokálne (rýchlo)
- Otvoriť `index.html` cez lokálny server (Live Server alebo):
  - `python -m http.server 5500` (v priečinku `www`) a prejsť na `http://127.0.0.1:5500`
- Konfigurácia Firebase sa načítava z `config.local.js` (není v GIT). Skontroluj `config.example.js`.

## Štruktúra súborov (Kompletná)

### 📂 Koreňové súbory
- `index.html` — hlavný vstup; obsahuje importmap, HUD strukturu a načítava `app.js`
- `app.js` (492 lines) — hlavná aplikácia (scéna, render loop, integrácia s DB a subsystémami)
- `config.js`, `config.local.js`, `config.example.js` — Firebase config; `config.local.js` je ignorovaný v .gitignore

### 📁 Core Systems (JavaScript)
- `database.js` (955 lines) — Firestore wrapper pre všetky DB operácie (rooms, items, players, skills, inventory, kodex, quests)
- `world.js` (297 lines) — generovanie miestností z 3D modelov, dverí, nabíjačiek a ich stavov
- `controls.js` (335 lines) — input handling, pohyb robota, wall collision detection
- `camera.js` — 3rd person kamera, zoom handling
- `items.js` — 3D item rendering (batérie, battery packy) s tier system farbami

### 📁 UI & HUD Systems
- `hud.js` (127 lines) — Energy Orb, Accumulator Orb, Learning Points Orb, Level badge, XP bar aktualizácia
- `hud-tiers.js` (96 lines) — HUD tier management system (Rusted → Legendary)
- `angie.js` (128 lines) — ENGEE AI dialogue system, typewriter efekt, avatar management (video/image)
- `dialogues.js` — knižnica rozhovorov s skill requirement checks
- `skills.js` (1111 lines) — SPECIAL skill tree UI (5 tabs), ACC/LP investment system, color-coded cards, inline controls
- `academy.js` (600+ lines) — YouTube IFrame API integration, playtime tracking (10s = 1LP), video progress persistence
- `inventory.js` (197 lines) — inventár modal s tab system, item usage
- `kodex.js` (255 lines) — kodex entries (miesta, technológie, postavy)
- `quests.js` (254 lines) — quest log UI, main/side/completed tabs, LP rewards
- `levelup.js` — level-up modal s animáciami

### 📁 Mobile & Integration
- `pedometer.js` — Cordova pedometer integrácia, background mode, step buffer synchronizácia s Firestore

### 📂 Data Files (JSON)
- `player_quests.json` — player state (quests, LP, ACC, skills, academy progress)
- `quests.json` — quest definitions with LP rewards
- `academy_videos.json` — YouTube video library (id, youtubeId, title, lpPerInterval)
- `items.json` — item definitions
- `rooms.json` — room data

### 📂 CSS Modules (Modularizované)
- `00-root.css` — CSS variables, HUD tier anchor points, global farby
- `01-base.css` (162 lines) — HUD frame layout, grid system, tier-specific positioning
- `02-energy-orb.css` (368 lines) — Energy, Accumulator & Learning Points orb styling, liquid fill animations, glow efekty
- `03-buttons.css` — HUD button styling, sci-fi dizajn
- `04-modals.css` (2957 lines) — Modal windows (skills, inventory, kodex, quests, levelup, academy), ACC/LP panels, skill investment grid, color coding
- `05-responsive.css` — Mobile & tablet breakpoints
- `06-angie.css` — ENGEE AI interface, dialogue box, choice buttons
- `07-game-menu.css` — Game menu (NEW GAME, SAVE, LOAD, SETTINGS)

### 📂 Assets (3D Models & Graphics)
**3D Models (.glb):**
- `robot.glb` — hlavný hráčsky model
- `metal_panel.glb` — steny miestností
- `door.glb` — funkčné dvere
- `charger.glb`, `broken_charger.glb` — nabíjacie stanice
- `engee_model.glb` — ENGEE AI model

**HUD Graphics (Tier System):**
- `assets/Rusted/` — Tier 1 HUD assets
  - `HUD_Frame_Tier_Rusted.png` — hlavný HUD frame
  - `HUD_baseenergyHP_Orb_Rusted.png` — Energy orb asset (green)
  - `HUD_accumulator_Orb_Rusted.png` — Accumulator orb asset (blue)
  - (Learning Points orb používa placeholder - budúca custom grafika)
  - `TS_button_rusted.png` — Transfer System button
  - `skill_button_rusted.png` — Skills button overlay

**Other Assets:**
- `assets/Rooms/floor1.png` — podlahová textúra
- `assets/Engiee AI/avatarAI.png` — default avatar
- `assets/Engiee AI/angie prvy kontakt.mp4` — úvodné video

## Quick Reference - Function Map (Rozšírené)

### 📁 database.js (955 lines)
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
- `watchInventory(playerId, callback)` - Legacy inventory watcher

**Room State:**
- `updateRoomDoors(roomId, doorIndex, isBroken)` - Door state
- `performRepairInDB(robotId, roomId, doorId, newAcc)` - Repair door
- `setupChargerInDB(roomId)` - Create charger
- `performChargerRepairInDB(...)` - Repair charger

**Skills (SPECIAL System):**
- `getSkills(playerId)` - Fetch skills data
- `investSkillEnergy(playerId, skillKey, amount, robotObj)` - Invest ACC into S, E, A
- `investSkillEnergyFromLP(playerId, skillKey, amount, robotObj)` - Invest LP into I, P, C
- `calculateSkillLevel(investedEnergy, skillKey)` - Calculate level from energy (NEW: skillKey param)
- `calculateSkillEnergyRequired(level, skillKey)` - Formula: XP(L) = BASE × L^(1+0.09×L) (NEW formula Jan 23, 2026)
- `calculateTotalEnergyForLevel(targetLevel, skillKey)` - Cumulative energy (NEW: skillKey param)
- `ACC_SKILL_BASE_ENERGY` - Exported constant: 1000 EP (S, E, A)
- `LP_SKILL_BASE_ENERGY` - Exported constant: 100 LP (I, P, C)
- `allocateSkillPoint(playerId, statKey)` - DEPRECATED
- `updateSkill(playerId, statKey, updates)` - DEPRECATED
- `watchPlayerSkills(playerId, callback)` - Real-time skills

**Inventory System:**
- `watchPlayerInventory(playerId, callback)` - Real-time inventory
- `addToInventory(playerId, itemType, count)` - Add item with max count check
- `removeFromInventory(playerId, itemType, count)` - Remove item
- `useInventoryItem(playerId, itemType)` - Use item (battery_pack +100, energy_cell +50)

**Kodex System:**
- `watchPlayerKodex(playerId, callback)` - Real-time kodex
- `addKodexEntry(playerId, entryId, entryData)` - Unlock entry (transakčne)

**Quest System:**
- `watchPlayerQuests(playerId, callback)` - Real-time quests
- `startQuest(playerId, questId, questData)` - Activate quest
- `updateQuestProgress(playerId, questId, objIndex, amount)` - Progress tracking
- `completeQuest(playerId, questId, questData)` - Finish quest with rewards
- `giveXP(playerId, amount, source)` - Award XP + level up
- `getQuestData(questId)` - Fetch quest template

**Story & Dialogues:**
- `updateStoryStep(playerId, step)` - Story progression
- `markDialogueAsSeen(playerId, dialogueId)` - Track seen dialogues

**Level System:**
- `watchPlayerLevel(playerId, callback)` - Real-time level/XP tracking
- `calculateXPForLevel(level)` - XP curve calculation

### 📁 app.js (492 lines)
- `animate()` - Main render loop (real-time HUD updates here)
- `watchPlayer()` callback - Syncs Firestore → robot object
- Energy orb real-time refresh via `lastEnergyHUD` cache
- Three.js scene setup, lighting, robot model loading

### 📁 hud.js (127 lines)
- `updateEnergyHUD(current, max)` - Sets CSS vars `--fill-percent`, `--fill-fraction`
- `updateAccumulatorHUD(current, max)` - ACC orb
- `updateLevelHUD(level, currentXP, xpToNext)` - Level badge + XP bar
- `updateMobileStatusHUD(isActive)` - Mobile service status
- `triggerSyncFlash()` - Sync indicator animation

### 📁 hud-tiers.js (96 lines)
- `setHudTier(tierName)` - Change HUD frame asset
- `upgradeHudTier()` - Advance to next tier
- `getCurrentHudTier()` - Get current tier
- `initHudTierSystem()` - Initialize tier system
- `HUD_TIERS` - Enum: RUSTED → LEGENDARY (10 tiers)

### 📁 skills.js (1111 lines)
- `initSkillsUI(playerId)` - Initialize skills modal (5 tabs)
- `toggleSkillsModal()` - Show/hide skills (key: C)
- `updateSkillsDisplay(data)` - Render skill cards with color coding
- `renderSpecialTab()` - SPECIAL ATTRIBUTES with ACC/LP panels
- `renderPerksTab()` - Perks placeholder
- `renderFitnessTab()` - Pedometer stats
- `renderLearningTab()` - Learning Points info
- `renderAcademyTab()` - Delegated to academy.js
- Tab system: ⚡SPECIAL, 🎯PERKS, 💪FITNESS, 🎓LEARNING, 🎬ACADEMY
- Event handlers for skill investment (ACC & LP)
- Color-coded cards: ACC=blue (#00d4ff), LP=purple (#c864ff)
- Inline investment controls (Input + INVEST + ALL)

### 📁 academy.js (600+ lines) **NEW - Jan 23, 2026**
- `initAcademyUI(playerId)` - Initialize YouTube video system
- `renderAcademyTab(content)` - Render video library UI
- `loadYouTubeAPI()` - Load IFrame API script
- `createYouTubePlayer(videoId, youtubeId)` - Create player instance
- `startPlaytimeTracking(videoId)` - Track watch time (1s interval)
- `awardLPFromVideo(videoId, amount)` - Award LP (10s = 1LP)
- `saveVideoProgress(videoId)` - Persist to player_quests.json
- `academyStats()` - Debug: Show all video stats
- `resetAcademyProgress(videoId)` - Debug: Reset video progress
- Toast notifications for LP rewards (+1 LP Earned!)
- Session statistics UI with live counters

### 📁 inventory.js (197 lines)
- `initInventoryUI()` - Initialize inventory modal
- `toggleInventoryModal()` - Show/hide inventory (key: I)
- `watchPlayerInventoryUI(playerId)` - Start watching
- `updateInventoryDisplay()` - Render item grid with tabs
- Tab system: quest, consumable, equipment
- `ITEM_ICONS` - Emoji/icon mapping
- `ITEM_DESCRIPTIONS` - Item metadata

### 📁 kodex.js (255 lines)
- `initKodexUI()` - Initialize kodex modal
- `toggleKodexModal()` - Show/hide kodex (key: K)
- `watchPlayerKodexUI(playerId)` - Start watching
- `updateKodexDisplay()` - Render entries by category
- `unlockKodexEntry(entryId)` - Unlock new entry
- `KODEX_ENTRIES` - All available entries
- Categories: miesta, technologie, postavy

### 📁 quests.js (254 lines)
- `initQuestsUI(playerId)` - Initialize quest modal
- `toggleQuestModal()` - Show/hide quest log (key: J)
- `updateQuestDisplay(quests)` - Render quests by tab
- Tabs: main, side, completed
- Quest completion handler with rewards

### 📁 levelup.js
- `showLevelUpModal(newLevel, skillPoints)` - Display level-up screen
- `initLevelUpSystem()` - Listen for level-up events
- `playLevelUpSound()` - Sound effect trigger

### 📁 world.js (297 lines)
- `generateRoom(scene, data)` - Create 3D room from Firestore
- `generateDoors(scene, doors)` - Door rendering with GLB models
- `generateChargers(scene, chargers)` - Charger stations
- Door/charger interaction logic
- `wallMap` - Collision detection map
- `doorMixers` - Animation mixers for doors

### 📁 controls.js (335 lines)
- `setupControls(robot)` - Initialize input handlers
- `updateMovement(robot, delta)` - Movement logic with collision
- Item pickup interaction
- Menu systems (deprecated, now modals)
- Wall collision detection using `wallMap`

### 📁 camera.js
- `updateCamera(camera, robot)` - 3rd person camera follow
- `handleZoom(deltaY)` - Mouse wheel zoom
- `cameraZoom` - Distance/height configuration

### 📁 items.js
- `generateItems(scene, itemsData)` - Render 3D items
- `animateItems()` - Rotation + floating animation
- `currentItemsData` - Current items from DB
- `TIER_COLORS` - Item rarity colors (common → legendary)

### 📁 angie.js (128 lines)
- `speak(dialogueObject)` - Display dialogue with typewriter
- `setAvatar(type, src)` - Change avatar (video/image)
- `resetAvatar()` - Return to default
- Supports options, choices, disabled states

### 📁 dialogues.js
- `ENGEE_DIALOGUES` - Dialogue library
- `checkSkillRequirement(skills, stat, minLevel)` - Skill checks
- `getSkillLevelText(skills, stat, required)` - Format skill text
- Dynamic dialogue generation (BROKEN_DOOR, BROKEN_CHARGER)

### 📁 pedometer.js
- `activatePedometer(playerId)` - Start Cordova pedometer
- `addStepToDatabase(playerId, amount)` - Debug step injection
- Step buffer system (syncs every 10 steps or 15s)
- Background mode configuration
- Accumulator capacity respected (max 1000)

## Common Tasks - Quick Guide (Rozšírené)

### 🎨 HUD & Visual Customization

#### Change Energy Orb Visual
**Files:** `css/02-energy-orb.css`
- Glow color: `.energy-orb { filter: drop-shadow(...) }`
- Fill animation: `.energy-orb::after { clip-path: inset(...) }`
- Rotating layer: `.energy-orb::before { animation: orbSlowSpin ... }`
- High energy pulse: `.energy-orb.high-energy { animation: orbGlowDynamic ... }`

#### Change Accumulator Orb Visual
**Files:** `css/02-energy-orb.css`
- Similar structure as Energy Orb
- Uses cyan color scheme (#00ffff)
- Located right of Energy Orb
- HP/ACC text positioning below orbs

#### Change HUD Tier Frame
**Files:** `hud-tiers.js`, `css/01-base.css`, `css/00-root.css`
1. Add tier to `HUD_TIERS` object in `hud-tiers.js`
2. Create asset: `assets/{TierName}/HUD_Frame_Tier_{TierName}.png`
3. Define anchor points in `00-root.css` (--tier-{name}-*)
4. Call: `setHudTier(HUD_TIERS.ADVANCED)`

#### Modify HUD Layout & Positioning
**Files:** `css/01-base.css`, `index.html`
- Grid structure: `.hud-bottom { grid-template-columns: 1fr 1.6fr 1fr }`
- Module positioning: `.hud-left`, `.hud-center`, `.hud-right`
- Top center bar: `.hud-top-center` (XP bar, level badge)
- Responsive breakpoints: `css/05-responsive.css`

#### Add New Button to HUD
**Files:** `index.html`, `css/03-buttons.css`
1. Add button HTML to `.hud-buttons-top-right`
2. Style with `.hud-btn` classes (yellow, green, orange, purple)
3. Add event listener in respective module (e.g., `skills.js`)

### 🎯 Game Systems

#### Add New Skill (SPECIAL)
1. **Database:** Skill already in structure (S,P,E,C,I,A,L)
2. **UI:** Cards auto-render in `skills.js` → `updateSkillsDisplay()`
3. **Logic:** `allocateSkillPoint()` handles allocation
4. **Usage:** Check requirements in `dialogues.js` → `checkSkillRequirement()`

#### Add New Item Type
1. **Database:** Update `useInventoryItem()` in `database.js` with effect logic
2. **UI:** Add icon to `ITEM_ICONS` in `inventory.js`
3. **Description:** Add to `ITEM_DESCRIPTIONS` in `inventory.js`
4. **Category:** Assign to category in `ITEM_CATEGORIES`
5. **Spawn:** Create Firestore document in `items` collection

#### Add New Kodex Entry
1. **Define entry:** Add to `KODEX_ENTRIES` in `kodex.js`
2. **Trigger unlock:** Call `unlockKodexEntry(playerId, entryId)` from event
3. **UI:** Entry auto-appears in modal when unlocked

#### Create New Quest
1. **Template:** Create document in Firestore `quests` collection:
   ```javascript
   {
     title: "Quest Name",
     type: "main" | "side",
     objectives: [{ target: 5, description: "..." }],
     rewards: { xp: 100, items: [{ type: "keycard", count: 1 }] }
   }
   ```
2. **Start:** Call `startQuest(playerId, questId, questData)`
3. **Progress:** Call `updateQuestProgress(playerId, questId, objIndex, amount)`
4. **Complete:** UI auto-shows complete button when ready

#### Modify Level-Up XP Curve
**File:** `database.js`
- Function: `calculateXPForLevel(level)`
- Default: exponential curve
- Level up grants +2 skill points

### 🗺️ World & 3D Content

#### Add New Room
1. **Firestore:** Create document in `rooms` collection:
   ```javascript
   {
     name: "Room Name",
     width: 10, depth: 10,
     doors: [{ id: "door1", x: 5, z: 0, isBroken: false, rotation: 0 }],
     chargers: [{ id: "ch1", x: -3, z: -3, isBroken: false }]
   }
   ```
2. **Navigate:** Room auto-renders via `watchRoom()` in `app.js`

#### Add New 3D Model
1. **Export:** GLB format from Blender/3D software
2. **Place:** `assets/` folder
3. **Load:** Use `GLTFLoader` in relevant module:
   ```javascript
   loader.load('assets/model.glb', (gltf) => {
     scene.add(gltf.scene);
   });
   ```
4. **Scale/Position:** Adjust transform in callback

#### Modify Wall/Floor Texture
**File:** `world.js`
- Floor texture: `textureLoader.load('assets/Rooms/floor1.png')`
- Wall texture: loaded in GLB model or apply material
- Texture repeat: `floorTexture.repeat.set(width/4, depth/4)`

#### Add Interaction Zone
**File:** `controls.js` or relevant module
1. Check distance to target in `updateMovement()`
2. Set `isRobotIn[Type]Zone = true`
3. Display interaction UI
4. Handle keypress (E for interact)

### 🎭 Dialogue & Story

#### Create New Dialogue
**File:** `dialogues.js`
1. Add to `ENGEE_DIALOGUES` object:
   ```javascript
   MY_DIALOGUE: {
     text: "Dialogue text...",
     options: [
       { id: "opt1", text: "Choice 1", next: {...} },
       { text: "Choice 2", action: () => {...} }
     ]
   }
   ```
2. Trigger: `speak(ENGEE_DIALOGUES.MY_DIALOGUE)`

#### Add Skill Requirement to Dialogue
**File:** `dialogues.js`
- Use `checkSkillRequirement(skills, 'I', 5)` for checks
- Use `getSkillLevelText(skills, 'I', 5)` for display
- See `BROKEN_DOOR.generate()` for example

#### Change Avatar (Video/Image)
**Files:** `angie.js`
- Video: `setAvatar('video', 'assets/video.mp4')`
- Image: `setAvatar('image', 'assets/image.png')`
- In dialogue: 
  ```javascript
  {
    avatar: { type: 'video', src: 'path.mp4' },
    text: "..."
  }
  ```

### 📱 Mobile & Cordova

#### Configure Pedometer
**File:** `pedometer.js`
- Step buffer threshold: `stepBuffer >= 10`
- Sync interval: `15000` ms (15 seconds)
- Background mode config in `activatePedometer()`

#### Add Cordova Plugin
1. Terminal: `cordova plugin add <plugin-name>`
2. Use in code with `window.cordova.plugins.*`

### 🔧 Debug & Testing

#### Add Test Item to Inventory
**File:** `tools/add-test-item.js`
- Or use Firebase Console directly
- Or call: `addToInventory('robot1', 'battery_pack', 5)`

#### Seed Quests/Skills
**Files:** `tools/seed-*.js`
- `seed-quests.js` - Populate quests
- `seed-skills.json` - Initial skills
- `seed-firestore.js` - Full DB seed

#### Check Real-Time Updates
**Debug checklist:**
1. `app.js` animate() loop - `lastEnergyHUD` cache
2. `database.js` watchers - `onSnapshot` callbacks
3. Browser DevTools → Network → Firestore requests
4. Console logs for transaction errors

## Firestore — Aktuálna Schéma (Detailne)

### 📊 Kolekcie
- `players` — dáta hráčov
- `rooms` — konfigurácia miestností
- `items` — položky v hre (ground/inventory)
- `quests` — quest templates
- `player_quests` — aktívne/dokončené questy hráčov
- `ship_data` — globálne ship info (optional)

### 🤖 players/{playerId} (robot1)
```javascript
{
  // Energy & Status
  energy: number,              // Aktuálna energia (HP)
  maxEnergy: number,           // Max energia (default 200)
  accumulator: number,         // Nazbierané kroky/energia
  accumulatorMax: number,      // Max kapacita akumulátora (1000)
  serviceActive: boolean,      // Mobile pedometer aktívny
  
  // Position
  positionX: number,
  positionZ: number,
  
  // Level & XP
  level: number,               // Aktuálny level
  currentXP: number,           // XP v aktuálnom leveli
  xpToNextLevel: number,       // XP potrebné na level up
  
  // Skills (SPECIAL)
  skills: {
    S: { base: number, bonus: number },  // Strength
    P: { base: number, bonus: number },  // Perception
    E: { base: number, bonus: number },  // Endurance
    C: { base: number, bonus: number },  // Charisma
    I: { base: number, bonus: number },  // Intelligence
    A: { base: number, bonus: number },  // Agility
    L: { base: number, bonus: number }   // Luck
  },
  skillPointsAvailable: number,  // Nealokované body
  perks: [],                     // Aktivované perky
  
  // Inventory
  inventory: {
    [itemType]: {
      count: number,
      maxCount: number,
      addedAt: timestamp
    }
  },
  
  // Kodex
  kodex: {
    [entryId]: {
      unlocked: boolean,
      unlockedAt: timestamp,
      entry: object  // Full entry data
    }
  },
  
  // Story & Dialogues
  seenDialogues: string[],     // Videné dialógy (INTRO, DOOR_FIXED, ...)
  storyStep: number,           // Aktuálny krok príbehu
  
  // Timestamps
  lastUpdate: timestamp,
  last_sync: timestamp,        // Pedometer sync
  debug_steps: number          // Debug: celkový počet krokov
}
```

### 🚪 rooms/{roomId} (room1)
```javascript
{
  name: string,                // Názov miestnosti
  width: number,               // Šírka (jednotky)
  depth: number,               // Hĺbka (jednotky)
  
  // Walls (optional, can be generated)
  walls: string[],             // ["north", "south", "east", "west"]
  
  // Doors
  doors: [
    {
      id: string,              // "door_1"
      x: number,               // Pozícia X
      z: number,               // Pozícia Z
      rotation: number,        // Rotácia (0, 90, 180, 270)
      isBroken: boolean,       // Je pokazená?
      repairCost: number       // Cena opravy (akumulátor)
    }
  ],
  
  // Chargers
  chargers: [
    {
      id: string,              // "charger_1"
      x: number,
      z: number,
      isBroken: boolean,
      repairCost: number,
      position: { x, y, z }    // Optional 3D position
    }
  ]
}
```

### 📦 items/{itemId}
```javascript
{
  type: string,                // "battery", "battery_pack", "keycard", ...
  tier: string,                // "common", "uncommon", "rare", "epic", "legendary"
  capacity: number,            // Energia (pre batérie)
  
  // Location
  location: string,            // "room1" alebo "none" (inventory)
  status: string,              // "on_ground", "in_inventory"
  owner: string,               // playerId (ak v inventári)
  
  // Position (ak on_ground)
  coords: { x: number, z: number },
  
  // Metadata
  description: string,
  value: number
}
```

### 🎯 quests/{questId}
```javascript
{
  title: string,
  description: string,
  type: string,                // "main" alebo "side"
  
  // Objectives
  objectives: [
    {
      description: string,
      target: number,
      type: string             // "collect", "repair", "talk", ...
    }
  ],
  
  // Rewards
  rewards: {
    xp: number,
    items: [
      { type: string, count: number }
    ],
    skillPoints: number        // Optional bonus points
  },
  
  // Requirements
  requirements: {
    level: number,
    skills: { [statKey]: number }
  }
}
```

### 📋 player_quests/{playerId}_{questId}
```javascript
{
  playerId: string,
  questId: string,
  questTitle: string,
  questDescription: string,
  questType: string,           // "main" alebo "side"
  status: string,              // "active", "completed", "abandoned"
  
  // Progress tracking
  objectivesProgress: {
    [index]: {
      completed: boolean,
      progress: number,
      target: number
    }
  },
  
  // Timestamps
  startedAt: timestamp,
  completedAt: timestamp
}
```

### 🔒 Bezpečnostné Pravidlá (firestore.rules)
**Aktuálny stav:** Veľmi otvorené pravidlá (dočasné)
- Umožňuje read/write do určitého dátumu
- **RIZIKO V PRODUKCII**

**Odporúčanie:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players - hráč môže upravovať len svoj dokument
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == playerId;
    }
    
    // Rooms - read-only pre klientov
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // Items - hráč môže upravovať len svoje
    match /items/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.resource.data.owner == request.auth.uid;
    }
    
    // Quests - read-only templates
    match /quests/{questId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // Player quests - hráč môže upravovať len svoje
    match /player_quests/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.resource.data.playerId == request.auth.uid;
    }
  }
}
```

## Návrhy & Budúce Vylepšenia

### 🔒 Bezpečnosť & Pravidlá
- [ ] Implementovať `firestore.rules` s auth pravidlami
- [ ] Presunúť citlivé operácie do Cloud Functions
- [ ] Pridať Firebase Authentication
- [ ] Seed skript pre Firebase Emulator (lokálny vývoj)

### 🎨 Grafika & Assets
- [ ] **HUD Tier System:** Vytvorenie 9 ďalších tier framov (Advanced → Legendary)
- [ ] **3D Modely:** Diverse room types, furniture, interactive objects
- [ ] **Textures:** High-res PBR materials pre steny/podlahy
- [ ] **Lighting:** Dynamic lighting system, day/night cycle
- [ ] **Particles:** Energy effects, sparks, ambient particles
- [ ] **Skybox:** Vesmírny background cez okná

### 🎮 Gameplay Features
- [ ] **Combat System:** Enemy AI, damage calculation, skills impact
- [ ] **Crafting:** Item combination, blueprint system
- [ ] **Trading:** NPC vendors, economy system
- [ ] **Multiplayer:** Room sharing, co-op missions
- [ ] **Achievements:** Unlock system, progress tracking
- [ ] **Sound System:** Ambient audio, SFX, music layers

### 🗺️ World & Content
- [ ] **Multiple Rooms:** Procedurálne generovanie, room transitions
- [ ] **Quest Chains:** Story arcs, branching narratives
- [ ] **Puzzles:** Logic challenges, environmental puzzles
- [ ] **Secrets:** Hidden areas, easter eggs, lore documents
- [ ] **Factions:** Relationship system, reputation mechanics

### 📱 Mobile & Performance
- [ ] **Touch Controls:** Virtual joystick, gesture support
- [ ] **Offline Mode:** Local storage, sync when online
- [ ] **Performance:** LOD system, occlusion culling
- [ ] **Battery Optimization:** Reduce sync frequency, frame limiting
- [ ] **Cloud Save:** Backup/restore progress

### 🛠️ Developer Tools
- [ ] **Level Editor:** Visual room builder
- [ ] **Quest Editor:** GUI pre quest creation
- [ ] **Debug Console:** In-game developer commands
- [ ] **Analytics:** Player behavior tracking, heatmaps
- [ ] **Admin Panel:** Web dashboard pre game management

## Grafické Assets - Súčasný Stav

### ✅ Implementované
- HUD Frame Tier 1 (Rusted) — frame, orbs, buttons
- Robot model (GLB)
- Door model (GLB) + broken variant
- Charger model (GLB) + broken variant
- Metal wall panels (GLB)
- Floor texture (seamless)
- ENGEE AI avatar (static + video)

### 🎨 Potrebné Pre Grafický Upgrade (Fáza 3)

#### HUD Tier Assets (Priority)
```
assets/
  ├── Advanced/
  │   ├── HUD_Frame_Tier_Advanced.png
  │   ├── HUD_baseenergyHP_Orb_Advanced.png
  │   ├── HUD_accumulator_Orb_Advanced.png
  │   ├── TS_button_advanced.png
  │   └── skill_button_advanced.png
  ├── Tactical/
  │   └── (same structure...)
  ├── Military/
  ├── Prototype/
  ├── Cyber/
  ├── Quantum/
  ├── Nexus/
  ├── Apex/
  └── Legendary/
```

#### 3D Models - Interiér (Priority)
- [ ] **Furniture:** Stoly, stoličky, skrine, police
- [ ] **Electronics:** Konzoly, terminály, obrazovky
- [ ] **Machinery:** Reaktory, pipes, ventilation
- [ ] **Props:** Tools, crates, containers
- [ ] **Lighting:** Ceiling lights, floor lamps, neon strips
- [ ] **Decoration:** Posters, warning signs, cables

#### Textures & Materials
- [ ] **Wall variants:** Clean metal, corroded, painted
- [ ] **Floor types:** Grating, tiles, concrete
- [ ] **Emissive maps:** Glowing panels, indicators
- [ ] **Normal maps:** Surface detail enhancement
- [ ] **PBR maps:** Metallic/Roughness workflow

#### Visual Effects
- [ ] **Energy transfer:** Particle beam animations
- [ ] **Sparks:** Welding/repair effects
- [ ] **Holograms:** UI projections, 3D displays
- [ ] **Screen overlays:** Glitch effects, scan lines
- [ ] **Ambient fog:** Atmospheric depth

### 📋 HUD Upgrade Roadmap

**Tier 1: RUSTED** ✅
- Industrial, worn aesthetic
- Orange/brown color palette
- Basic functionality

**Tier 2: ADVANCED** (Next)
- Cleaner design, blue accents
- Enhanced readability
- Animated borders

**Tier 3-10:** Progressively more futuristic
- Holographic elements
- Particle effects
- Dynamic color schemes
- 3D layer depth

### 🎨 Design Guidelines

**Color Schemes per Tier:**
```
Rusted:    Orange/Brown (#FFA500, #8B4513)
Advanced:  Cyan/Blue (#00FFFF, #4169E1)
Tactical:  Green/Olive (#00FF00, #556B2F)
Military:  Gray/Red (#808080, #DC143C)
Prototype: Purple/Pink (#9400D3, #FF1493)
Cyber:     Neon/Black (#00FF00, #FF00FF)
Quantum:   White/Blue (#FFFFFF, #00BFFF)
Nexus:     Gold/Black (#FFD700, #000000)
Apex:      Rainbow/Holographic
Legendary: Multi-layer composite
```

**Asset Specifications:**
- **HUD Frames:** 1920x1080 PNG, transparent background
- **Orbs:** 256x256 PNG, alpha channel for glow
- **Buttons:** 128x128 PNG, separate states (normal, hover, pressed)
- **3D Models:** GLB format, max 5000 tris per prop
- **Textures:** 1024x1024 or 2048x2048, compressed (JPG/WebP)

## Kde Ďalej Upraviť (Typické Zmeny)

### 📝 Pridanie Novej Funkcionality
- **Nový modul:** Vytvor `.js` súbor, export funkcií, import v `app.js`
- **Nová kolekcia:** Pridaj do Firestore, vytvor watch funkciu v `database.js`
- **Nový modal:** Definuj HTML v `index.html`, CSS v `04-modals.css`, logiku v samostatnom `.js`

### 🎨 Grafické Zmeny
- **HUD:** `css/` moduly, `index.html` štruktúra
- **3D modely:** `assets/` folder, load v `world.js` alebo `app.js`
- **Textúry:** `assets/Rooms/` alebo tier-specific folders

### 🗄️ Databázové Zmeny
- **Firestore schéma:** Priamo v Firebase Console alebo seed skript
- **Watch funkcie:** `database.js` - onSnapshot listeners
- **Transakcie:** Používaj `runTransaction` pre kritické operácie

### 🎮 Herná Logika
- **Controls:** `controls.js` - input handling
- **Collision:** `wallMap` v `world.js`, check v `updateMovement()`
- **AI/Dialogues:** `dialogues.js` - konverzácie, `angie.js` - rendering

## Checkpointy & Commity

### .gitignore Kontrola
```
config.local.js     ✓ Musí byť ignorovaný
node_modules/       ✓ Ak používaš npm
.DS_Store           ✓ Mac systémové súbory
*.log               ✓ Debug logy
```

### Commit Best Practices
- **Config:** Nikdy necommituj `config.local.js` s Firebase kľúčmi
- **Assets:** Zvážiť Git LFS pre veľké binárne súbory (.glb, .png > 1MB)
- **Database:** Necommituj dump/export, len seed skripty

### Branching Strategy
```
main          → Stable production
develop       → Integration branch
feature/*     → New features
hotfix/*      → Critical fixes
```

## Technické Špecifikácie

### Performance Targets
- **FPS:** 60fps @ 1080p na mid-range GPU
- **Load time:** < 3s initial load
- **Memory:** < 500MB RAM usage
- **Network:** < 100KB/s Firestore traffic

### Browser Compatibility
- **Chrome/Edge:** Full support (target)
- **Firefox:** Full support
- **Safari:** Limited (WebGL issues možné)
- **Mobile:** iOS 12+, Android 8+

### Dependencies
```javascript
// Core
three.js (r150+)          - 3D engine
firebase (10.7.1)         - Backend

// Cordova Plugins (Mobile)
cordova-plugin-pedometer
cordova-plugin-background-mode
cordova-plugin-permissions
```

### File Structure Best Practices
```
www/
├── index.html           - Entry point
├── app.js              - Main orchestrator
├── [module].js         - Feature modules
├── css/
│   ├── 00-root.css     - Variables first
│   ├── 01-base.css     - Layout second
│   └── [nn-name].css   - Components numbered
├── assets/
│   ├── [TierName]/     - Organized by tier
│   ├── Rooms/          - By category
│   └── *.glb           - 3D models root
└── tools/
    └── *.js            - Admin/seed scripts
```

## Kontakty / Poznámky

### Quick Start Checklist
- [x] Firebase project setup
- [x] Firestore collections (players, rooms, items, quests)
- [x] Basic 3D scene rendering
- [x] HUD Tier 1 (Rusted) implemented
- [x] Skills system (SPECIAL)
- [x] ACC investment system (Strength, Endurance)
- [x] LP investment system (Intelligence, Perception, Charisma)
- [x] Inventory system
- [x] Kodex system
- [x] Quest system with LP rewards
- [x] Level/XP system
- [x] Mobile pedometer integration
- [x] Learning Points currency system
- [x] Skills modal UI (5-column grid, no scrollbars)
- [ ] Locked skills unlock system (Agility, Luck)
- [ ] Rewarded Ads integration (future LUCK Points)
- [ ] Firebase Authentication
- [ ] Multiplayer sync
- [ ] Sound system

### Nástroje & Extensions (Odporúčané)
- **VS Code:** Live Server extension
- **Chrome:** Firebase DevTools extension
- **3D:** Blender pre modelovanie
- **Graphics:** GIMP/Photoshop pre HUD assety
- **Testing:** Firebase Emulator Suite

### Užitočné Príkazy
```bash
# Local server
python -m http.server 5500

# Firebase deploy
firebase deploy --only firestore:rules

# Cordova build (mobile)
cordova build android
cordova run android --device

# Git
git add .
git commit -m "feat: Add new feature"
git push origin main
```

---
**Dokument aktualizovaný:** 2026-01-23  
**Verzia:** 3.2 (Skills Tab System + Total Pedometer Energy)  
**Súbor vytvorený na zlepšenie viditeľnosti projektu pri ďalšej spolupráci.**

**Najnovšie zmeny (23.1.2026):**
- ✅ **Skills Modal Tab System** - 3 taby: SPECIAL ATTRIBUTES, PERKS (placeholder), FITNESS
- ✅ **Total Pedometer Energy** - kumulatívne sledovanie krokov od NEW GAME
- ✅ **FITNESS Tab** - zobrazuje Current ACC (modrý) a Total Pedometer (zelený panel)
- ✅ **Pedometer logika fix** - `lastKnownFirebaseValue` z Total, nie z Current (investovanie neresetuje pri refresh)
- ✅ **CSS fixes** - odstránené hover efekty a ::before overlays, explicitné z-index a pointer-events pre invest controls
- ✅ **Robot objekt** - pridané `totalPedometerEnergy` field, načítanie pri štarte, ukladanie do JSON
- ✅ **resetGame()** - resetuje `totalPedometerEnergy = 0` pri NEW GAME
- 📊 **FITNESS Tab features** (pripravované): denné/týždenné/mesačné štatistiky, achievementy, grafy, odmeny

**Predchádzajúce zmeny (22.1.2026):**
- ✅ LP investovanie do Intelligence, Perception, Charisma
- ✅ LP HUD orb (fialový, vpravo hore)
- ✅ Skills UI refaktoring - 3 kategórie: ACC (S,E), LP (I,P,C), Locked (A,L)
- ✅ Skills modal layout optimalizácia - 5-column grid, bez scrollbars
- ✅ Quest rewards rozšírené o learningPoints field
- ✅ Event system pre LP updates (learningPointsUpdated)
- 📄 Vytvorený `LEARNING_POINTS_SYSTEM.md` - kompletná dokumentácia
