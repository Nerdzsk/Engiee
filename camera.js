import * as THREE from 'three';

export function updateCamera(camera, robot) {
    // Vzdialenosť od robota
    const distance = 8;
    const height = 5;

    // Vypočítame pozíciu kamery tak, aby bola vždy "za chrbtom" podľa rotácie sveta
    const targetX = robot.position.x + Math.sin(window.worldRotation) * distance;
    const targetZ = robot.position.z + Math.cos(window.worldRotation) * distance;
    const targetY = robot.position.y + height;

    // Plynulý pohyb kamery
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;

    camera.lookAt(robot.position);
}