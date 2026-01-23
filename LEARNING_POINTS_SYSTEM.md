# Learning Points System (LP)

**Vytvorené:** 22. január 2026  
**Status:** Funkčné, kompletne implementované

---

## Koncept

Learning Points (LP) je **druhá mena** v hre, oddelená od Accumulator Energy (ACC). Slúži na investovanie do **mentálnych skills**: Intelligence, Perception, Charisma.

### Tri typy energií v hre:

| Mena | Zdroj | Použitie | Skills |
|------|-------|----------|--------|
| **ACC (Accumulator)** | Pedometer (kroky z mobilu) | Fyzické vlastnosti | Strength (S), Endurance (E), Agility (A) |
| **LP (Learning Points)** | Quest rewards, Academy videos | Mentálne vlastnosti | Intelligence (I), Perception (P), Charisma (C) |
| **LUCK Points** | *(Budúcnosť: Rewarded Ads)* | Špeciálne vlastnosti | Luck (L) |

---

## Implementácia

### 1. Databáza (player_quests.json)

```json
{
  "playerId": "robot1",
  "learningPoints": 0,
  "maxLearningPoints": 5000,
  ...
}
```

### 2. Quest Rewards (quests.json)

Každý quest má `learningPoints` field v rewards:

```json
{
  "questId": "quest_where_am_i",
  "rewards": {
    "xp": 50,
    "learningPoints": 50
  }
}
```

**Aktuálne LP rewards:**
- `quest_where_am_i`: **50 LP**
- `quest_broken_charger`: **20 LP**
- `quest_broken_door`: **15 LP**

### 2.5. Academy System (YouTube Videos)

Od Jan 23, 2026 - LP možno získať aj sledovaním tutoriálových videí:

**Mechanika:**
- Každých **10 sekúnd** sledovania = **1 LP**
- Playtime tracking v 1-sekundových intervaloch
- YouTube IFrame API integrácia
- Progress persistácia v `player_quests.json`

**Súbory:**
- `academy.js` (600+ lines) - kompletný modul
- `academy_videos.json` - video knižnica
- Toast notifikácie (+1 LP Earned!)
- Session statistics UI (live counters)

**Video struktura:**
```json
{
  "id": "video_001",
  "youtubeId": "AO13fuu-_dk",
  "title": "Getting Started",
  "lpPerInterval": 1,
  "intervalSeconds": 10
}
```

### 3. Backend (database.js)

#### completeQuest() - Distribúcia LP
```javascript
export async function completeQuest(playerId, questId) {
  // ... quest completion logic
  
  if (rewards.learningPoints) {
    player.learningPoints = Math.min(
      (player.learningPoints || 0) + rewards.learningPoints,
      player.maxLearningPoints
    );
    
    window.dispatchEvent(new CustomEvent('learningPointsUpdated', {
      detail: {
        learningPoints: player.learningPoints,
        maxLearningPoints: player.maxLearningPoints
      }
    }));
  }
}
```

#### investSkillEnergyFromLP() - Investovanie LP
```javascript
export async function investSkillEnergyFromLP(playerId, skillKey, amount, robotObj) {
  const validStats = ['I', 'P', 'C'];  // Len I, P, C z LP
  
  // Skontroluj dostatok LP
  if (robotObj.learningPoints < amount) {
    return { success: false, message: 'Nedostatok Learning Points' };
  }
  
  // Investuj do skillu
  skill.investedEnergy += amount;
  skill.level = calculateSkillLevel(skill.investedEnergy);
  
  // Zníž LP
  robotObj.learningPoints -= amount;
  player.learningPoints = robotObj.learningPoints;
  
  // Save & dispatch event
  await window.saveLocalJson('player_quests.json', data);
  window.dispatchEvent(new CustomEvent('skillsUpdated', { ... }));
}
```

### 4. Frontend (app.js)

```javascript
// Robot objekt
robot.learningPoints = 0;
robot.maxLearningPoints = 5000;

// Event listener pre LP updates
window.addEventListener('learningPointsUpdated', (event) => {
  const { learningPoints, maxLearningPoints } = event.detail;
  robot.learningPoints = learningPoints;
  robot.maxLearningPoints = maxLearningPoints;
  updateLearningPointsHUD(learningPoints, maxLearningPoints);
});

// Load pri štarte
function loadPlayerState(data) {
  robot.learningPoints = data.learningPoints || 0;
  robot.maxLearningPoints = data.maxLearningPoints || 5000;
  updateLearningPointsHUD(robot.learningPoints, robot.maxLearningPoints);
}
```

### 5. HUD (hud.js)

```javascript
export function updateLearningPointsHUD(lp, maxLP) {
  const lpDisplay = document.getElementById('learning-points-display');
  const lpLiquid = document.querySelector('.learning-liquid');
  
  if (lpDisplay) {
    lpDisplay.textContent = `${lp} / ${maxLP}`;
  }
  
  if (lpLiquid) {
    const fillPercent = (lp / maxLP) * 100;
    lpLiquid.style.setProperty('--fill-percent', `${fillPercent}%`);
  }
}
```

### 6. HTML (index.html)

```html
<!-- Learning Points Orb (fialový) - vpravo hore -->
<div class="learning-orb">
  <div class="learning-liquid"></div>
</div>
<div id="learning-points-display" class="learning-orb-display">
  0 / 5000
</div>
```

### 7. CSS (css/02-energy-orb.css)

```css
.learning-orb {
  position: absolute;
  top: 2.5vw;
  right: 2.5vw;
  width: 11.25vw;
  height: 10vw;
  border-radius: 50%;
  overflow: hidden;
  z-index: 910;
  filter: drop-shadow(0 0 20px rgba(200, 100, 255, 0.8));
}

.learning-liquid {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: var(--fill-percent, 0%);
  background: linear-gradient(180deg, #c864ff 0%, #9932ff 50%, #6600cc 100%);
  transition: height 0.8s ease-out;
  box-shadow: 0 0 30px rgba(200, 100, 255, 0.8);
}

.learning-orb-display {
  position: absolute;
  top: calc(2.5vw + 80px);
  right: calc(2.5vw + 30px);
  color: #c864ff;
  font-family: 'VT323', monospace;
  font-size: 2.0vw;
  text-shadow: 0 0 8px rgba(200, 100, 255, 0.6);
}
```

### 8. Skills UI (skills.js)

#### Skill Modal Tabs (5 tabů)
1. **⚡ SPECIAL ATTRIBUTES** - Investment do skills (S,P,E,C,I,A,L)
2. **🎯 PERKS** - Placeholder pre budúce perky
3. **💪 FITNESS** - Pedometer tracking
4. **🎓 LEARNING POINTS** - LP panel a info
5. **🎬 ACADEMY** - YouTube video learning system

#### LP Panel
```javascript
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
```

#### Skill Card Generation (3 kategórie)
```javascript
Object.keys(SKILL_NAMES).forEach(statKey => {
  const canInvestFromAcc = (statKey === 'S' || statKey === 'E');
  const canInvestFromLP = (statKey === 'I' || statKey === 'P' || statKey === 'C');
  const isLocked = (statKey === 'A' || statKey === 'L');
  
  // HTML s ternary operator
  card.innerHTML = `
    ${canInvestFromAcc ? `
      <input type="number" class="invest-input" data-source="acc" max="${accumulator}">
      <button class="invest-btn">INVEST</button>
    ` : canInvestFromLP ? `
      <input type="number" class="invest-input" data-source="lp" max="${lp}">
      <button class="invest-btn">INVEST</button>
    ` : `
      <div class="skill-locked-message">
        🔒 Momentálne uzamknuté
      </div>
    `}
  `;
});
```

#### Event Handlers
```javascript
btn.addEventListener('click', async () => {
  const sourceType = input.getAttribute('data-source');
  
  const result = sourceType === 'acc' 
    ? await investSkillEnergy(playerId, statKey, amount, robotObj)
    : await investSkillEnergyFromLP(playerId, statKey, amount, robotObj);
});
```

---

## CSS Styling (css/04-modals.css)

### LP Panel
```css
.learning-panel {
  background: linear-gradient(135deg, rgba(120, 0, 180, 0.3), rgba(200, 100, 255, 0.2));
  border: 2px solid #c864ff;
  padding: 6px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  box-shadow: 0 0 15px rgba(200, 100, 255, 0.4);
}

.lp-fill {
  height: 100%;
  background: linear-gradient(90deg, #9932ff, #c864ff);
  border-radius: 8px;
  transition: width 0.5s ease;
  box-shadow: 0 0 15px rgba(200, 100, 255, 0.8);
}
```

### Skills Grid Layout
```css
.skills-investment-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr); /* 5 stĺpcov - prvý riadok: S,P,E,C,I; druhý: A,L */
  gap: 18px;
  overflow: hidden; /* Žiadne scrollbars! */
}

.skills-modal-content {
  width: 98%;
  max-width: 1800px;
  height: 95%;
  overflow: hidden; /* Celý modal bez scrollbars */
}
```

### Skill Cards
- **Padding**: 16px (upgraded from 12px)
- **Font sizes**: 
  - SPECIAL key: **48px** (upgraded from 28px)
  - Skill name: **16px** (upgraded from 12px)
  - Description: **13px** (upgraded from 9px)
  - Level badge: **28px** (upgraded from 20px)
  - Progress texts: **13px**
  - Input field: **15px**
  - Buttons: **13px**
- **Progress bar**: 24px height (upgraded from 16px)
- **Layout**: Inline investment controls (Input + INVEST + ALL v jednom riadku)
- **Color coding**: ACC skills=modrá (#00d4ff), LP skills=fialová (#c864ff)

---

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| LP Orb | Purple/Violet | `#c864ff` |
| LP Liquid Gradient | Dark Purple → Bright Purple | `#6600cc → #9932ff → #c864ff` |
| LP Panel Border | Bright Purple | `#c864ff` |
| LP Text | White | `#ffffff` |
| LP Label | Purple | `#c864ff` |
| **LP Skills (I,P,C) Card** | **Purple** | **`#c864ff`** |
| **ACC Skills (S,E,A) Card** | **Cyan** | **`#00d4ff`** |

---

## Testing Checklist

✅ Quest completion → LP reward  
✅ LP orb updates v reálnom čase  
✅ LP panel zobrazuje správne hodnoty  
✅ I, P, C skills majú LP input fieldy  
✅ INVEST button investuje z LP (nie z ACC)  
✅ INVEST ALL button investuje všetky LP (skrátený na "ALL")  
✅ Level-up notification pri dosiahnutí levelu  
✅ **Academy tab** - YouTube video playback  
✅ **Playtime tracking** - 10 sekúnd = 1 LP  
✅ **Color-coded skills** - ACC modrá, LP fialová  
✅ **UI improvements** - väčšie texty, inline controls  
✅ Skills modal bez scrollbars  
✅ **Agility (A)** presunnutý na ACC skills (bolo locked)  
✅ Locked skills (L) zobrazujú zámok  

---

## Budúce rozšírenia (Pripravené, ale neimplementované)

### 1. LUCK Points System (Rewarded Ads)
- **Zdroj**: AdMob rewarded video ads v mobile app
- **Použitie**: Investovanie do Luck (L) - Agility je už ACC skill
- **Technológia**: Google AdMob SDK + Firebase
- **Potenciálny príjem**: $2-$10 CPM (za 1000 zobrazení)

### 2. Achievement System
- Špeciálne LP bonusy za achievements
- Napr. "Complete 10 quests" → +200 LP

### 3. Daily Quests
- Denné questy s LP odmenou
- Reset každých 24 hodín

---

## Súvisiace súbory

- `player_quests.json` - Player data (learningPoints field)
- `quests.json` - Quest rewards (learningPoints)
- `academy.js` - YouTube video learning system (600+ lines)
- `academy_videos.json` - Video library definition
- `database.js` - Backend logic (investSkillEnergyFromLP, completeQuest, level formulas)
- `app.js` - Robot objekt, event listeners, academy init
- `hud.js` - updateLearningPointsHUD()
- `skills.js` - Skills modal UI (5 tabs), investment logic, color coding
- `index.html` - LP orb HTML, skills modal tabs
- `css/02-energy-orb.css` - LP orb styling
- `css/04-modals.css` - Skills modal, LP panel, Academy UI, skill card colors (2957 lines)

---

## Poznámky

- LP systém je **kompletne oddelený** od ACC systému
- **Nový level vzorec (Jan 23, 2026)**: `XP(L) = BASE × L^(1+0.09×L)`
  - ACC skills (S,E,A): BASE = 1000 EP
  - LP skills (I,P,C): BASE = 100 LP
- Max capacity: **5000 LP** (ACC kapacita sa číta z `robot.maxAccumulator` – číslo nikdy nehardcoduj)
- Farba fialová (#c864ff) bola zvolená pre kontrast s cyan (ACC) a green (Energy)
- Grid layout (5 stĺpcov) zabezpečuje, že všetko sa zmestí na obrazovku bez scrollovania
- **Academy system** umožňuje zarábať LP sledovaním YouTube videí (10s = 1LP)
- **Agility skill** bol presunnutý z LUCK do ACC kategórie (Jan 23, 2026)

---

## Aktualizácie — Jan 23, 2026

### Academy System (NEW)
- Kompletný YouTube video learning systém
- Playtime tracking s 1-sekundovým intervalom
- LP rewards: 10 sekúnd sledovania = 1 LP
- Session statistics UI (live counters)
- Toast notifications (+1 LP Earned!)
- Video progress persistácia v `player_quests.json`
- Debug commands: `academyStats()`, `resetAcademyProgress(videoId)`

### Level System Overhaul
- **Nový vzorec**: `XP(L) = BASE × L^(1+0.09×L)` (namiesto `100 * 1.5^(L-1)`)
- **Konfigurovateľné base hodnoty**:
  - `ACC_SKILL_BASE_ENERGY = 1000` (S, E, A)
  - `LP_SKILL_BASE_ENERGY = 100` (I, P, C)
- Prvý level teraz vyžaduje 1000 EP (ACC) alebo 100 LP
- Funkcie aktualizované s `skillKey` parametrom:
  - `calculateSkillEnergyRequired(level, skillKey)`
  - `calculateSkillLevel(investedEnergy, skillKey)`
  - `calculateTotalEnergyForLevel(targetLevel, skillKey)`

### Skills Modal UI Improvements
- **Väčšie fonty** pre lepšiu čitateľnosť:
  - SPECIAL key: 48px (bolo 28px)
  - Skill name: 16px (bolo 12px)
  - Description: 13px (bolo 9px)
  - Level badge: 28px (bolo 20px)
- **Color coding** podľa energie type:
  - ACC skills (S,E,A): Modrá (#00d4ff)
  - LP skills (I,P,C): Fialová (#c864ff)
  - Locked (L): Šedá
- **Inline investment controls**: Input + INVEST + ALL v jednom riadku
- Input pole: 65px wide (kompaktné)
- "INVEST ALL" skrátené na "ALL"
- Odstránená hláška "🔍 Klikni pre detaily"
- Lepší spacing (gap 15px medzi Progress a EP needed)
- Vycentrované elementy v kartách

### Skills System Changes
- **Agility (A)** presunnutý z locked na ACC-based skills
- Validné ACC skills: `['S', 'E', 'A']` (bolo `['S', 'E']`)
- LP/EP rozlíšenie v UI textoch ("150 LP needed" vs "1000 EP needed")

### Technical Changes
- Event `learningPointsUpdated` podporuje dva formáty:
  - `{lp, maxLP}` (academy.js)
  - `{learningPoints, maxLearningPoints}` (database.js)
- 5-tab system v Skills modal:
  - ⚡ SPECIAL ATTRIBUTES
  - 🎯 PERKS
  - 💪 FITNESS
  - 🎓 LEARNING POINTS (NEW)
  - 🎬 ACADEMY (NEW)
