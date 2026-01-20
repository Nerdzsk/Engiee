import * as THREE from 'three';

(function(){
    try {
        const overlay = document.createElement('div');
        overlay.id = 'engee-overlay-debug';
        overlay.style.position = 'fixed';
        overlay.style.top = '10px';
        overlay.style.right = '10px';
        overlay.style.width = '320px';
        overlay.style.height = '320px';
        overlay.style.zIndex = '20000';
        overlay.style.pointerEvents = 'none';
        overlay.style.background = 'rgba(0,0,0,0.0)';
        document.body.appendChild(overlay);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(320,320);
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '320px';
        renderer.domElement.style.height = '320px';
        renderer.domElement.style.pointerEvents = 'none';
        overlay.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        camera.position.set(0,0,5);

        const geo = new THREE.BoxGeometry(1,1,1);
        const mat = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geo, mat);
        scene.add(cube);

        const light = new THREE.AmbientLight(0xffffff, 1);
        scene.add(light);

        let last = performance.now();
        function anim(t){
            const dt = (t-last)/1000; last = t;
            cube.rotation.x += dt * 0.8;
            cube.rotation.y += dt * 1.1;
            renderer.render(scene, camera);
            requestAnimationFrame(anim);
        }
        requestAnimationFrame(anim);
        console.log('[DEBUG-OVERLAY] overlay renderer started');
    } catch(e) {
        console.error('[DEBUG-OVERLAY] failed', e);
    }
})();
