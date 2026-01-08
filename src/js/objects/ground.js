/**
 * Ground plane for the airport scene
 * Represents grass/terrain around the airport
 */

class Ground {
    constructor(size = 20000) {
        this.size = size;
        this.mesh = null;
        this.gridHelper = null;
        this.create();
    }

    create() {
        // Create ground plane
        const geometry = new THREE.PlaneGeometry(this.size, this.size, 50, 50);

        // Create grass-like material
        const material = new THREE.MeshLambertMaterial({
            color: 0x2d5a27,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -0.1; // Slightly below zero
        this.mesh.receiveShadow = true;
        this.mesh.name = 'ground';

        // Add grid for reference (optional, can be toggled)
        this.gridHelper = new THREE.GridHelper(this.size, 100, 0x444444, 0x333333);
        this.gridHelper.position.y = 0;
        this.gridHelper.visible = false;
    }

    addToScene(scene) {
        scene.add(this.mesh);
        scene.add(this.gridHelper);
    }

    toggleGrid(visible) {
        this.gridHelper.visible = visible;
    }

    setSize(size) {
        this.size = size;
        // Recreate with new size
        const parent = this.mesh.parent;
        if (parent) {
            parent.remove(this.mesh);
            parent.remove(this.gridHelper);
            this.create();
            parent.add(this.mesh);
            parent.add(this.gridHelper);
        }
    }
}

// Make available globally
window.Ground = Ground;
