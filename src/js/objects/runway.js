/**
 * Runway object for airport scene
 * Creates a runway with markings
 */

class Runway {
    constructor(options = {}) {
        this.length = options.length || 3000;  // meters
        this.width = options.width || 45;       // meters
        this.heading = options.heading || 0;    // degrees from north
        this.position = options.position || { x: 0, z: 0 };
        this.name = options.name || 'RWY';
        this.designation = options.designation || '09/27';

        this.group = new THREE.Group();
        this.group.name = `runway_${this.name}`;

        this.create();
    }

    create() {
        // Main runway surface
        const runwayGeometry = new THREE.PlaneGeometry(this.width, this.length);
        const runwayMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333,
            side: THREE.DoubleSide
        });

        const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
        runway.rotation.x = -Math.PI / 2;
        runway.position.y = 0.05;
        runway.receiveShadow = true;
        runway.name = 'runway_surface';
        this.group.add(runway);

        // Center line
        this.addCenterLine();

        // Threshold markings
        this.addThresholdMarkings();

        // Edge lines
        this.addEdgeLines();

        // Position and rotate the group
        this.group.position.set(this.position.x, 0, this.position.z);
        this.group.rotation.y = CoordinateSystem.headingToRotation(this.heading);
    }

    addCenterLine() {
        const dashLength = 30;
        const gapLength = 20;
        const lineWidth = 0.9;
        const numDashes = Math.floor(this.length / (dashLength + gapLength));

        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i < numDashes; i++) {
            const geometry = new THREE.PlaneGeometry(lineWidth, dashLength);
            const dash = new THREE.Mesh(geometry, material);
            dash.rotation.x = -Math.PI / 2;
            dash.position.y = 0.1;
            dash.position.z = -this.length / 2 + (i + 0.5) * (dashLength + gapLength);
            this.group.add(dash);
        }
    }

    addThresholdMarkings() {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripeWidth = 1.8;
        const stripeLength = 45;
        const stripeSpacing = 1.8;
        const numStripes = 8;
        const totalWidth = numStripes * stripeWidth + (numStripes - 1) * stripeSpacing;

        // Add stripes at both ends
        [-1, 1].forEach(end => {
            for (let i = 0; i < numStripes; i++) {
                const geometry = new THREE.PlaneGeometry(stripeWidth, stripeLength);
                const stripe = new THREE.Mesh(geometry, material);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.y = 0.1;
                stripe.position.x = -totalWidth / 2 + i * (stripeWidth + stripeSpacing) + stripeWidth / 2;
                stripe.position.z = end * (this.length / 2 - stripeLength / 2 - 10);
                this.group.add(stripe);
            }
        });
    }

    addEdgeLines() {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineWidth = 0.9;

        [-1, 1].forEach(side => {
            const geometry = new THREE.PlaneGeometry(lineWidth, this.length);
            const line = new THREE.Mesh(geometry, material);
            line.rotation.x = -Math.PI / 2;
            line.position.y = 0.1;
            line.position.x = side * (this.width / 2 - lineWidth / 2);
            this.group.add(line);
        });
    }

    /**
     * Create runway from GeoJSON polygon
     * @param {Object} feature - Parsed GeoJSON feature
     * @returns {Runway} new runway instance
     */
    static fromGeoJSON(feature) {
        const coords = feature.geometry.localCoords[0]; // First ring of polygon
        if (!coords || coords.length < 4) return null;

        const metrics = GeoJSONParser.calculatePolygonMetrics(coords);
        if (!metrics) return null;

        // Determine length and width (length > width for runway)
        const length = Math.max(metrics.width, metrics.length);
        const width = Math.min(metrics.width, metrics.length);

        // Adjust rotation if needed
        let heading = CoordinateSystem.rotationToHeading(metrics.rotation);
        if (metrics.width > metrics.length) {
            heading = (heading + 90) % 360;
        }

        return new Runway({
            length: length,
            width: Math.max(width, 30), // Minimum width
            heading: heading,
            position: { x: metrics.centerX, z: metrics.centerZ },
            name: feature.name || 'RWY',
            designation: feature.properties.ref || feature.properties.name || ''
        });
    }

    addToScene(scene) {
        scene.add(this.group);
    }

    getPosition() {
        return this.group.position;
    }

    setHighlight(enabled) {
        // Visual feedback when selected
        this.group.children.forEach(child => {
            if (child.name === 'runway_surface') {
                child.material.color.setHex(enabled ? 0x444455 : 0x333333);
            }
        });
    }
}

// Make available globally
window.Runway = Runway;
