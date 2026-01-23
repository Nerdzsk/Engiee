# Skills Investment System - Dokumentácia

## Prehľad

Nový systém pre SPECIAL skills založený na **priamom investovaní energie z akumulátora** namiesto skill bodov.

### Kľúčové vlastnosti:
- ✅ Všetky skills začínajú na **level 0**
- ✅ **Neobmedzený level cap** (môžeš upgraďovať do nekonečna)
- ✅ **Exponenciálny rast** požiadaviek (čím vyšší level, tým viac energie treba)
- ✅ Energia sa presúva **priamo z akumulátora** do skillu
- ✅ **Real-time progress bar** ukazujúci pokrok do ďalšieho levelu

---

## Exponenciálna formula

### Energia potrebná na level
```javascript
energyRequired(level) = 100 * (1.5 ^ (level - 1))
```

### Príklady:
| Level | Energia na level | Celková investícia |
|-------|------------------|-------------------|
| 1     | 100 EP          | 100 EP            |
| 2     | 150 EP          | 250 EP            |
| 3     | 225 EP          | 475 EP            |
| 4     | 338 EP          | 813 EP            |
| 5     | 506 EP          | 1,319 EP          |
| 10    | 3,834 EP        | 11,279 EP         |
| 20    | 1,293,660 EP    | 3,880,975 EP      |

### Prečo exponenciálny rast?
- Začiatočné levely sú **dostupné** (100-500 EP)
- Vyššie levely vyžadujú **strategické rozhodnutia**
- Motivuje hráča **pravidelne zbierať kroky** (pedometer)
- Zabezpečuje **long-term progression**

---

## Použitie v hre

### Otvorenie Skills modalu
- **Klávesa C** alebo kliknutie na Skills button v HUD

### Investovanie energie
1. Otvor Skills modal (C)
2. Vidíš aktuálny **Accumulator stav** (horný panel)
3. Pri každom skille zadaj **množstvo energie** (input field)
4. Klikni **INVEST** button
5. Energia sa presunie z ACC → skill
6. Level sa automaticky prepočíta
7. Ak dosiahneš nový level → **Level UP notifikácia** 🎉

### Progress tracking
- **Progress bar** ukazuje pokrok v rámci aktuálneho levelu
- **Energy needed** zobrazuje, koľko ešte treba na ďalší level
- **Total invested** zobrazuje celkovú investovanú energiu do skillu

---

## API Reference

### Database funkcie (`database.js`)

#### `investSkillEnergy(playerId, skillKey, amount, robotObj)`
Investuje energiu z akumulátora do skillu.

**Parametre:**
- `playerId` (string) - ID hráča (napr. "robot1")
- `skillKey` (string) - Kľúč skillu (S, P, E, C, I, A, L)
- `amount` (number) - Množstvo energie na investíciu
- `robotObj` (object) - Referencia na robot objekt (pre ACC update)

**Návratová hodnota:**
```javascript
{
  success: boolean,
  newLevel: number,
  oldLevel: number,
  remainingAcc: number,
  investedEnergy: number,
  message: string
}
```

**Príklad:**
```javascript
const result = await investSkillEnergy('robot1', 'S', 500, robot);
if (result.success) {
  console.log(`Strength level: ${result.oldLevel} → ${result.newLevel}`);
}
```

#### `calculateSkillLevel(investedEnergy)`
Vypočíta aktuálny level na základe investovanej energie.

**Príklad:**
```javascript
const level = calculateSkillLevel(1500); // → level 5
```

#### `calculateSkillEnergyRequired(level)`
Vráti energiu potrebnú na dosiahnutie konkrétneho levelu.

**Príklad:**
```javascript
const energy = calculateSkillEnergyRequired(3); // → 225 EP
```

#### `calculateTotalEnergyForLevel(targetLevel)`
Vráti celkovú energiu potrebnú na dosiahnutie levelu (suma všetkých predošlých levelov).

**Príklad:**
```javascript
const total = calculateTotalEnergyForLevel(5); // → 1319 EP
```

---

## UI Komponenty

### Accumulator Panel
- **Veľký icon** ⚡ s animáciou
- **Hodnota ACC** (current / max)
- **Progress bar** s gradientom

### Skill Investment Card
Pre každý skill (S, P, E, C, I, A, L):
- **Header**: Veľký písmeno + názov + level
- **Progress section**: Progress bar + info o potrebnej energii
- **Investment controls**: Input field + INVEST button

### Level Up Notification
- Popup notifikácia pri dosiahnutí nového levelu
- Zobrazuje sa 3 sekundy
- Animácia: scale pop + fade out

---

## Debugging nástroje

### Console commands

```javascript
// Nastav ACC na 5000 EP
setAccumulator(5000);

// Naplň ACC na maximum (1000 EP)
fillAccumulator();

// Investuj 500 EP do Strength
testInvestSkill('S', 500);

// Zobraz tabuľku energy requirements (level 1-10)
showSkillsFormula();
```

### Testovací workflow
```javascript
// 1. Naplň accumulator
fillAccumulator(); // → 1000 EP

// 2. Otvor skills modal
// Stlač C

// 3. Investuj do Strength
// Zadaj 1000 do input fieldu pri "S"
// Klikni INVEST

// 4. Sleduj:
// - ACC klesne na 9000
// - Strength level sa zvýši
// - Progress bar sa aktualizuje
```

---

## Skill Meanings (Pre budúcu implementáciu effects)

| Skill | Názov | Popis | Budúci efekt |
|-------|-------|-------|--------------|
| S | Strength | Fyzická sila | Vyššia nosnosť inventára |
| P | Perception | Vnímavosť | Lepší item detection range |
| E | Endurance | Vytrvalosť | Vyšší max HP |
| C | Charisma | Charizmatickosť | Lepšie quest rewards |
| I | Intelligence | Intelekt | Vyššia XP gain |
| A | Agility | Obratnosť | Rýchlejší pohyb |
| L | Luck | Šťastie | Lepší item drop rate |

---

## CSS Classes

### Nové triedy v `style.css`:

```css
.accumulator-panel         /* Horný panel s ACC info */
.acc-info                  /* ACC icon + text wrapper */
.acc-icon                  /* ⚡ ikona s animáciou */
.acc-value                 /* Hodnota ACC */
.acc-bar                   /* Progress bar pre ACC */
.acc-fill                  /* Fill animácia */

.skills-investment-grid    /* Grid pre skill karty */
.skill-investment-card     /* Jednotlivá skill karta */
.skill-header              /* Header sekcia karty */
.skill-key-large           /* Veľké písmeno (S, P, E...) */
.skill-level               /* Level display */

.skill-progress-section    /* Progress info */
.skill-progress-bar        /* Progress bar */
.skill-progress-fill       /* Fill animácia */

.skill-invest-controls     /* Input + button wrapper */
.invest-input              /* Number input field */
.invest-btn                /* INVEST button */

.skill-levelup-notification /* Popup pri level up */
```

---

## Migrácia zo starého systému

### Starý systém:
```javascript
{
  "skills": {
    "strength": { "base": 5, "bonus": 0 }
  },
  "skillPoints": 3
}
```

### Nový systém:
```javascript
{
  "skills": {
    "S": { "investedEnergy": 0, "level": 0 }
  }
  // skillPoints už netreba
}
```

### Automatická migrácia
Pri **NEW GAME** alebo **resetGame()** sa skills automaticky resetujú na nový formát.

---

## Budúce rozšírenia

### Plánované features:
- [ ] **Skill effects** implementácia (napr. Strength zvyšuje nosnosť)
- [ ] **Diminishing returns** po level 50? (Voliteľné)
- [ ] **Skill synergies** (napr. S+E combo bonus)
- [ ] **Respec option** (reset skills za cenu?)
- [ ] **Skill milestones** (každých 10 levelov = special bonus)
- [ ] **Skill trees** (rozvetvené ветви pre každý skill)

### Možné úpravy formuly:
```javascript
// Ak je rast príliš rýchly/pomalý:
energyRequired = BASE * (MULTIPLIER ^ (level - 1))

// Aktuálne: BASE=100, MULTIPLIER=1.5
// Pomalší rast: BASE=100, MULTIPLIER=1.3
// Rýchlejší rast: BASE=100, MULTIPLIER=1.7
```

---

## Troubleshooting

### Problem: Skills modal nezobrazuje ACC hodnotu
**Riešenie:** Skontroluj, či `initSkillsUI()` má parameter `robotObj`:
```javascript
initSkillsUI("robot1", robot); // ✅ Správne
initSkillsUI("robot1");        // ❌ Chybné
```

### Problem: Investment nefunguje
**Riešenie:** Otvor console (F12) a sleduj error logy:
```javascript
[Skills] Error investing energy: ...
```

### Problem: Level sa neprepočítava správne
**Riešenie:** Zavolaj v console:
```javascript
showSkillsFormula(); // Zobraz tabuľku requirements
calculateSkillLevel(yourInvestedEnergy); // Manuálny výpočet
```

### Problem: ACC sa nezníži po investícii
**Riešenie:** Skontroluj, či `robotObj.accumulator` je správne updatovaný:
```javascript
console.log(robot.accumulator); // Pred investíciou
// ... investuj ...
console.log(robot.accumulator); // Po investícii (malo by byť nižšie)
```

---

**Autor**: Implementované Január 2026  
**Verzia**: 1.0  
**Status**: ✅ Kompletné a funkčné
