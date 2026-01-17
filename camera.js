import * as THREE from 'three';

// Zoom settings
export let cameraZoom = {
    distance: 8,
    minDistance: 4,
    maxDistance: 15,
    height: 5
};

export function updateCamera(camera, robot) {
    // Vypočítame pozíciu kamery tak, aby bola vždy "za chrbtom" podľa rotácie sveta
    const targetX = robot.position.x + Math.sin(window.worldRotation) * cameraZoom.distance;
    const targetZ = robot.position.z + Math.cos(window.worldRotation) * cameraZoom.distance;
    const targetY = robot.position.y + cameraZoom.height;

    // Plynulý pohyb kamery
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;

    camera.lookAt(robot.position);
}

export function handleZoom(deltaY) {
    // Zoom in/out based on wheel delta
    const zoomSpeed = 0.5;
    cameraZoom.distance += (deltaY > 0 ? zoomSpeed : -zoomSpeed);
    
    // Clamp distance
    cameraZoom.distance = Math.max(cameraZoom.minDistance, Math.min(cameraZoom.maxDistance, cameraZoom.distance));
    
    // Adjust height proportionally
    cameraZoom.height = 5 * (cameraZoom.distance / 8);
}