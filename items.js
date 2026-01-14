import * as THREE from 'three';

let renderedItems = [];
export let currentItemsData = []; // Tu budeme držať dáta z DB

const TIER_COLORS = {
    common: 0xaaaaaa,
    uncommon: 0x22ff22,
    rare: 0x2222ff,
    epic: 0xaa00ff,
    legendary: 0xffaa00
};

export function generateItems(scene, itemsData) {
    currentItemsData = itemsData; // Uložíme si aktuálne dáta z DB
    
    renderedItems.forEach(obj => scene.remove(obj));
    renderedItems = [];

    if (!itemsData) return;

    itemsData.forEach(item => {
        let mesh;
        
        if (item.type === 'battery') {
            const geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
            const material = new THREE.MeshStandardMaterial({ 
                color: TIER_COLORS[item.tier],
                emissive: TIER_COLORS[item.tier],
                emissiveIntensity: 0.5
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(item.coords.x, 0.2, item.coords.z);
        } else if (item.type === 'battery_pack') {
            // Energetický balík - krychľa s cyan farbou
            const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.6,
                metalness: 0.7,
                roughness: 0.3
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(item.coords.x, 0.2, item.coords.z);
        }
        
        if (mesh) {
            scene.add(mesh);
            renderedItems.push(mesh);
        }
    });
}

export function animateItems() {
    renderedItems.forEach(item => {
        item.rotation.y += 0.02;
        item.position.y = 0.2 + Math.sin(Date.now() * 0.005) * 0.05;
    });
}