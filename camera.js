import * as THREE from 'three';

// Zoom settings
export let cameraZoom = {
    distance: 2,         // Predvolený zoom (začíname najbližšie k robotovi)
    minDistance: 2,      // Maximálne priblíženie (najbližšie možné)
    maxDistance: 25,     // Maximálne oddialenie (najďalej)
    height: 1.5          // Výška kamery pri blízkom zoome (pohľad za plecom)
};

export function updateCamera(camera, robot) {
    // Vypočítame pozíciu kamery tak, aby bola vždy "za chrbtom" podľa rotácie sveta
    const rotation = Number.isFinite(window.worldRotation) ? window.worldRotation : 0;
    const targetX = robot.position.x + Math.sin(rotation) * cameraZoom.distance;
    const targetZ = robot.position.z + Math.cos(rotation) * cameraZoom.distance;
    const targetY = robot.position.y + cameraZoom.height;

    // Plynulý pohyb kamery
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;

    const rx = (robot && robot.position && Number.isFinite(robot.position.x)) ? robot.position.x : 0;
    const ry = (robot && robot.position && Number.isFinite(robot.position.y)) ? robot.position.y : 0;
    const rz = (robot && robot.position && Number.isFinite(robot.position.z)) ? robot.position.z : 0;
    camera.lookAt(rx, ry, rz);
}

export function handleZoom(deltaY) {
    // Zoom in/out based on wheel delta
    const zoomSpeed = 0.5;
    cameraZoom.distance += (deltaY > 0 ? zoomSpeed : -zoomSpeed);
    
    // Clamp distance
    cameraZoom.distance = Math.max(cameraZoom.minDistance, Math.min(cameraZoom.maxDistance, cameraZoom.distance));
    
    // Dynamická výška podľa vzdialenosti
    // Pri blízkej vzdialenosti (2-5) -> kamera nižšie (pohľad za plecom)
    // Pri ďalekej vzdialenosti (15-25) -> kamera vyššie (izometrický pohľad)
    if (cameraZoom.distance < 5) {
        cameraZoom.height = 1.5; // Nízka kamera pre pohľad za plecom
    } else if (cameraZoom.distance < 10) {
        cameraZoom.height = 2 + (cameraZoom.distance - 5) * 0.4; // Postupné zvyšovanie
    } else {
        cameraZoom.height = 4 + (cameraZoom.distance - 10) * 0.3; // Izometrický pohľad
    }
}