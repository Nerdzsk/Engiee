# HUD Tier System - Dokumentácia

## Prehľad
HUD Tier systém umožňuje upgrady vizuálneho rámu HUDu (10 tierov). Každý tier má vlastný grafický frame a jemne upravené pozície funkčných prvkov.

## Štruktúra

### Súbory
- `hud-tiers.js` - Logika prepínania tierov
- `style.css` - CSS anchor pointy pre každý tier
- `assets/[TierName]/HUD_Frame_Tier_[TierName].png` - Grafické rámce

### Dostupné tiery
1. **Rusted** - Základný hrdzavý rám (aktuálne aktívny)
2. **Advanced** - Pokročilý rám (pripravené CSS premenné)
3. **Tactical** - Taktický rám
4. **Military** - Vojenský rám
5. **Prototype** - Prototypový rám
6. **Cyber** - Kybernetický rám
7. **Quantum** - Kvantový rám
8. **Nexus** - Nexus rám
9. **Apex** - Apex rám
10. **Legendary** - Legendárny rám

## Použitie

### Prepnutie HUD tier v konzole (testovanie)
```javascript
// Zobraz dostupné tiery
console.log(window.hudTierAPI.tiers);

// Prepni na Advanced tier
window.hudTierAPI.setTier(window.hudTierAPI.tiers.ADVANCED);

// Upgrade na ďalší tier v poradí
window.hudTierAPI.upgrade();
```

### Programatické prepnutie v hre
```javascript
import { setHudTier, HUD_TIERS } from './hud-tiers.js';

// Keď hráč kúpi upgrade
function purchaseHudUpgrade(tierName) {
    setHudTier(tierName);
    // Uloží sa do Firestore player profilu
}
```

### Počúvanie zmeny tieru
```javascript
window.addEventListener('hudTierChanged', (event) => {
    console.log('New HUD tier:', event.detail.tier);
    // Spusti animáciu, uloží do databázy, atď.
});
```

## Pridanie nového tieru

### 1. Priprav grafický asset
- Vytvor PNG s transparentným pozadím
- Názov: `HUD_Frame_Tier_[TierName].png`
- Umiestnenie: `assets/[TierName]/`
- Odporúčaný rozmer: 1920×400px (16:9 aspect ratio pre spodný panel)

### 2. Pridaj CSS anchor pointy
V `style.css`, do `:root` sekcie:
```css
/* Tier X: [TierName] */
--tier-[tiername]-left-module-x: Xvw;
--tier-[tiername]-left-module-y: Xpx;
--tier-[tiername]-center-module-x: auto;
--tier-[tiername]-center-module-y: Xpx;
--tier-[tiername]-right-module-x: Xvw;
--tier-[tiername]-right-module-y: Xpx;
--tier-[tiername]-acc-bar-bottom: XXXpx;
```

### 3. Pridaj tier-specific CSS (ak potrebné)
```css
.hud-frame--tier-[tiername] ~ .hud-top-center {
    bottom: var(--tier-[tiername]-acc-bar-bottom);
}

.hud-frame--tier-[tiername] ~ .hud-bottom .hud-left {
    /* Špecifické úpravy pre tento tier */
}
```

### 4. Pridaj tier do `hud-tiers.js`
Už je pripravené v `HUD_TIERS` objekte — stačí asset a CSS!

## Best Practices

### Pozicionovanie prvkov
- Používaj **%** pre horizontálne pozície (škáluje sa so šírkou)
- Používaj **px** pre vertikálne offsety (konzistentné na všetkých rozlíšeniach)
- Anchor pointy definuj cez CSS premenné

### Responzívnosť
- Všetky media queries automaticky platia pre všetky tiery
- Pri zmene rozlíšenia sa proporcie zachovajú
- Frame sa škáluje proporcionálne (aspect ratio locked)

### Testovanie
1. Otvor konzolu
2. Prepni tier: `window.hudTierAPI.setTier('advanced')`
3. Skontroluj pozície na rôznych rozlíšeniach (F12 → Responsive Mode)
4. Uprav CSS anchor pointy podľa potreby

## Príklad workflow pre nový tier

```javascript
// 1. Pridaj asset do assets/Tactical/HUD_Frame_Tier_Tactical.png

// 2. Pridaj CSS premenné
:root {
    --tier-tactical-acc-bar-bottom: 215px;
    /* ... ďalšie anchor pointy */
}

// 3. Otestuj v konzole
window.hudTierAPI.setTier('tactical');

// 4. Doladuj pozície v CSS podľa grafického designu

// 5. Pripoj do game logiky (napr. quest reward)
async function completeMainQuest() {
    await updateQuestProgress(...);
    setHudTier(HUD_TIERS.TACTICAL); // Upgrade!
}
```

## FAQ

**Q: Čo ak chcem tier s úplne iným layoutom (napr. ľavý modul väčší)?**
A: Pridaj tier-specific CSS:
```css
.hud-frame--tier-custom ~ .hud-bottom {
    grid-template-columns: 2fr 1fr 1fr; /* upravené proporcie */
}
```

**Q: Ako uložiť aktuálny tier do Firestore?**
A: Pridaj field `hudTier` do player dokumentu:
```javascript
await db.collection('players').doc('robot1').update({
    hudTier: 'advanced'
});
```

**Q: Môžem mať animovaný prechod medzi tiermi?**
A: Áno, už je v CSS transition na `.hud-frame-img` (0.3s fade). Môžeš pridať vlastnú animáciu.

**Q: Čo keď frame asset má iný aspect ratio?**
A: Frame sa škáluje automaticky cez `height: auto`. Upravíš iba anchor pointy v CSS premenných.
