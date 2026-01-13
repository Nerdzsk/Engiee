import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, model;
let visitedOptions = [];

// --- 1. INICIALIZÁCIA 3D AVATARA ---
function initEngeeModel() {
    const canvas = document.getElementById('engee-canvas');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);

    scene = new THREE.Scene();
    
    // Kamera posunutá kúsok pred model
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 2;

    // Svetlo pre model
    const light = new THREE.AmbientLight(0x00ffff, 2); // Modré okolité svetlo
    scene.add(light);
    const pointLight = new THREE.PointLight(0xffffff, 5);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    // Načítanie modelu
    const loader = new GLTFLoader();
    loader.load('assets/engee_model.glb', (gltf) => {
        model = gltf.scene;
        
        // Vycentrovanie modelu
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); 
        
        scene.add(model);
        animate();
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (model) {
        // Jemné kývanie alebo otáčanie, aby "žila"
        model.rotation.y += 0.01;
        model.position.y = Math.sin(Date.now() * 0.002) * 0.05;
    }
    renderer.render(scene, camera);
}

// Spustíme nastavenie hneď pri načítaní
window.addEventListener('DOMContentLoaded', initEngeeModel);

// --- 2. FUNKCIA PRE ROZPRÁVANIE (Typewriter) ---
// ... (začiatok súboru s initEngeeModel zostáva rovnaký) ...

export function speak(dialogueObject) {
    if (!dialogueObject || typeof dialogueObject.text === 'undefined') {
        console.error("Angie Error: Funkcia speak nedostala text alebo objekt!", dialogueObject);
        return;
    }

    const ui = document.getElementById('angie-ui');
    const textElement = document.getElementById('angie-text');

    ui.classList.remove('hidden');
    textElement.innerHTML = "";
    
    if (window.angieInterval) clearInterval(window.angieInterval);

    let i = 0;
    const text = dialogueObject.text;

    window.angieInterval = setInterval(() => {
        if (i < text.length) {
            textElement.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(window.angieInterval);
            
            const btnContainer = document.createElement('div');
            btnContainer.className = 'angie-btn-container';

            if (dialogueObject.options && Array.isArray(dialogueObject.options)) {
                dialogueObject.options.forEach(option => {
                    const btn = document.createElement('button');
                    btn.className = 'angie-next-btn';
                    btn.innerHTML = option.text;

                    // --- NOVÁ ČASŤ: KONTROLA ZABLOKOVANIA ---
                    if (option.disabled) {
                        btn.disabled = true;
                        btn.classList.add('btn-disabled'); // Pridáme triedu pre vzhľad
                    }
                    // ---------------------------------------

                    if (option.id && visitedOptions.includes(option.id)) {
                        btn.classList.add('visited');
                    }

                    btn.onclick = (e) => {
                        // Ak je tlačidlo vypnuté, nič sa nestane
                        if (option.disabled) return;

                        e.stopPropagation();
                        if (option.id) visitedOptions.push(option.id);
                        if (option.action) option.action();

                        if (!option.next) {
                            ui.classList.add('hidden');
                            visitedOptions = []; 
                        } else {
                            speak(option.next);
                        }
                    };
                    btnContainer.appendChild(btn);
                });
            }
            textElement.appendChild(btnContainer);
        }
    }, 30);
}