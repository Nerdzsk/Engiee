import { watchPlayerInventory, addToInventory, removeFromInventory, useInventoryItem } from './database.js';

let currentInventory = {};
let currentPlayerId = null;

// IKONY PRE ITEMS (emoji alebo custom)
const ITEM_ICONS = {
    // Quest Items
    'keycard': '🔑',
    'datapad': '📱',
    'map': '🗺️',
    'blueprint': '📋',
    
    // Consumables
    'health_pack': '❤️',
    'energy_cell': '🔋',
    'battery_pack': '🔋',
    'repair_kit': '🔧',
    'antidote': '⚗️',
    
    // Equipment
    'wrench': '🔨',
    'scanner': '🔍',
    'beacon': '📡',
    'tool_kit': '🧰',
    
    // Default
    'default': '📦'
};

// POPISY ITEMOV (pre examine Q)
export const ITEM_DESCRIPTIONS = {
    'battery_pack': {
        name: 'Energetický Balík',
        shortDesc: 'Prenosná batéria plná energie.',
        fullDesc: 'Kompaktný energetický modul navrhnutý na okamžité doplnenie akumulátora. Pri použití pridá 100 jednotiek energie. Ideálny pre dlhé misie alebo núdzové situácie.',
        value: 100,
        type: 'consumable'
    },
    'energy_cell': {
        name: 'Energetická Bunka',
        shortDesc: 'Základná energetická bunka.',
        fullDesc: 'Štandardná energetická bunka používaná v lodiach a robotoch.',
        value: 50,
        type: 'consumable'
    }
};

const ITEM_CATEGORIES = {
    'quest': {
        label: 'QUEST ITEMS',
        icon: '🎯',
        items: ['keycard', 'datapad', 'map', 'blueprint']
    },
    'consumable': {
        label: 'CONSUMABLES',
        icon: '🍖',
        items: ['health_pack', 'energy_cell', 'battery_pack', 'repair_kit', 'antidote']
    },
    'equipment': {
        label: 'EQUIPMENT',
        icon: '⚙️',
        items: ['wrench', 'scanner', 'beacon', 'tool_kit']
    }
};

export function initInventoryUI() {
    const modal = document.getElementById('inventory-modal');
    if (!modal) {
        console.warn("Inventory modal element not found!");
        return;
    }
    
    // Klávesa I na otvorenie/zatvorenie inventára
    document.addEventListener('keydown', (e) => {
        if (e.key === 'i' || e.key === 'I') {
            if (!e.target.matches('input, textarea')) {
                toggleInventoryModal();
            }
        }
    });

    // Event listener pre X tlačidlo - použiť document.addEventListener na dynamické tlačidlá
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('inventory-modal-close')) {
            toggleInventoryModal();
        }
    });

    // Klik mimo modal - zatvorí modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            toggleInventoryModal();
        }
    });
}

export function toggleInventoryModal() {
    const modal = document.getElementById('inventory-modal');
    const hud = document.getElementById('hud');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        modal.classList.remove('hidden');
        if (hud) hud.style.display = 'none'; // Skry HUD keď je inventár otvorený
    } else {
        modal.classList.add('hidden');
        if (hud) hud.style.display = 'block'; // Vrať HUD späť
    }
}

export function watchPlayerInventoryUI(playerId) {
    currentPlayerId = playerId;
    watchPlayerInventory(playerId, (inventory) => {
        currentInventory = inventory || {};
        updateInventoryDisplay();
    });
}

function updateInventoryDisplay() {
    const contentDiv = document.getElementById('inventory-modal-content');
    if (!contentDiv) return;

    const categories = Object.entries(ITEM_CATEGORIES);
    const activeCategory = window._activeInventoryCategory || 'quest';

    // Záložky (karty)
    let html = '<div class="inventory-tabs">';
    
    for (const [categoryKey, categoryData] of categories) {
        const categoryItems = categoryData.items.filter(itemType => {
            return currentInventory[itemType] && currentInventory[itemType].count > 0;
        });
        const count = categoryItems.length;
        const isActive = categoryKey === activeCategory ? 'active' : '';

        html += `
            <div class="inventory-tab ${isActive}" data-category="${categoryKey}">
                <span class="tab-icon">${categoryData.icon}</span>
                <span class="tab-label">${categoryData.label}</span>
                <span class="tab-badge">${count}</span>
            </div>
        `;
    }
    
    html += '</div>';

    // Obsah aktívnej kategórie
    const activeCategoryData = ITEM_CATEGORIES[activeCategory];
    const categoryItems = activeCategoryData.items.filter(itemType => {
        return currentInventory[itemType] && currentInventory[itemType].count > 0;
    });

    html += '<div class="inventory-content">';
    html += '<div class="inventory-category-content">';

    if (categoryItems.length === 0) {
        html += '<div class="no-items">Žiadne položky v tejto kategórii</div>';
    } else {
        categoryItems.forEach(itemType => {
            const itemData = currentInventory[itemType];
            if (!itemData) return;

            const icon = ITEM_ICONS[itemType] || ITEM_ICONS['default'];
            const itemName = formatItemName(itemType);
            const count = itemData.count || 0;

            html += `
                <div class="inventory-item" data-item-type="${itemType}">
                    <div class="item-icon">${icon}</div>
                    <div class="item-info">
                        <div class="item-name">${itemName}</div>
                        <div class="item-count">x${count}</div>
                    </div>
                    <button class="item-use-btn" data-item-type="${itemType}">Použiť</button>
                </div>
            `;
        });
    }

    html += '</div></div>';
    contentDiv.innerHTML = html;

    // Event listenery na záložky
    contentDiv.querySelectorAll('.inventory-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const categoryKey = e.currentTarget.dataset.category;
            window._activeInventoryCategory = categoryKey;
            updateInventoryDisplay();
        });
    });

    // Event listenery na tlačidlá "Použiť"
    contentDiv.querySelectorAll('.item-use-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemType = e.target.dataset.itemType;
            useItem(itemType);
        });
    });
}

function useItem(itemType) {
    if (!currentPlayerId) return;

    const itemData = currentInventory[itemType];
    if (!itemData || itemData.count <= 0) {
        console.log(`Nemáte ${itemType}`);
        return;
    }

    // Zavolajte DB funkciu na použitie itemu
    useInventoryItem(currentPlayerId, itemType);
    
    console.log(`Použili ste: ${itemType}`);
}

function formatItemName(itemType) {
    return itemType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
