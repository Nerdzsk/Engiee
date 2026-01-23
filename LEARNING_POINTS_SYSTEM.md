# Learning Points System (LP)

**Vytvorené:** 22. január 2026  
**Status:** Funkčné, kompletne implementované

---

## Koncept

Learning Points (LP) je **druhá mena** v hre, oddelená od Accumulator Energy (ACC). Slúži na investovanie do **mentálnych skills**: Intelligence, Perception, Charisma.

### Tri typy energií v hre:

| Mena | Zdroj | Použitie | Skills |
|------|-------|----------|--------|
| **ACC (Accumulator)** | Pedometer (kroky z mobilu) | Fyzické vlastnosti | Strength (S), Endurance (E) |
| **LP (Learning Points)** | Quest rewards | Mentálne vlastnosti | Intelligence (I), Perception (P), Charisma (C) |
| **LUCK Points** | *(Budúcnosť: Rewarded Ads)* | Špeciálne vlastnosti | Agility (A), Luck (L) |

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
- **Padding**: 12px
- **Font sizes**: Key 28px, Name 12px, Desc 9px, Level 20px
- **Progress bar**: 16px height
- **Hover effect**: `translateY(-4px) scale(1.03)` + `z-index: 100`

---

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| LP Orb | Purple/Violet | `#c864ff` |
| LP Liquid Gradient | Dark Purple → Bright Purple | `#6600cc → #9932ff → #c864ff` |
| LP Panel Border | Bright Purple | `#c864ff` |
| LP Text | White | `#ffffff` |
| LP Label | Purple | `#c864ff` |
| Skills (I,P,C) Border | Cyan | `#00d4ff` |

---

## Testing Checklist

✅ Quest completion → LP reward  
✅ LP orb updates v reálnom čase  
✅ LP panel zobrazuje správne hodnoty  
✅ I, P, C skills majú LP input fieldy  
✅ INVEST button investuje z LP (nie z ACC)  
✅ INVEST ALL button investuje všetky LP  
✅ Level-up notification pri dosiahnutí levelu  
✅ Skills modal bez scrollbars  
✅ Hover effect na kartách funguje správne  
✅ Locked skills (A, L) zobrazujú zámok  

---

## Budúce rozšírenia (Pripravené, ale neimplementované)

### 1. LUCK Points System (Rewarded Ads)
- **Zdroj**: AdMob rewarded video ads v mobile app
- **Použitie**: Investovanie do Agility (A) a Luck (L)
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
- `database.js` - Backend logic (investSkillEnergyFromLP, completeQuest)
- `app.js` - Robot objekt, event listeners
- `hud.js` - updateLearningPointsHUD()
- `skills.js` - Skills modal UI, investment logic
- `index.html` - LP orb HTML
- `css/02-energy-orb.css` - LP orb styling
- `css/04-modals.css` - Skills modal, LP panel styling

---

## Poznámky

- LP systém je **kompletne oddelený** od ACC systému
- Používa rovnakú exponenciálnu formulu pre levely: `100 * (1.5 ^ (level-1))`
- Max capacity: **5000 LP** (ACC kapacita sa číta z `robot.maxAccumulator` – číslo nikdy nehardcoduj)
- Farba fialová (#c864ff) bola zvolená pre kontrast s cyan (ACC) a green (Energy)
- Grid layout (5 stĺpcov) zabezpečuje, že všetko sa zmestí na obrazovku bez scrollovania

---

## Aktualizácie — Jan 23, 2026

- Pre jednotnosť UI boli pridané toasty: `achievementCompleted` (🏆) a `daily reset` (📅). LP systém nimi nie je priamo ovplyvnený, ale `skills.js` a `hud.js` ich zobrazujú v rámci rovnakého modalu.
- Event `accumulatorUpdated` bol rozšírený o `{ dailySteps, dailyStepsDate }` pre FITNESS tab; LP tab ostáva nezmenený.
