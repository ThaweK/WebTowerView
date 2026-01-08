/**
 * Tower Camera Controller
 * Controls camera view from a fixed tower position
 */

class TowerCamera {
    constructor(viewer) {
        this.viewer = viewer;
        this.camera = viewer.camera;

        // Tower position
        this.towerLat = Config.defaultAirport.lat;
        this.towerLon = Config.defaultAirport.lon;
        this.towerHeight = Config.tower.defaultHeight;
        this.groundElevation = Config.defaultAirport.elevation;

        // Camera orientation
        this.heading = Config.camera.defaultHeading;
        this.pitch = Config.camera.defaultPitch;
        this.fov = Config.camera.defaultFov;

        // Control state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Bind methods
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        this.setupControls();
        this.updateCamera();
    }

    /**
     * Set tower position
     * @param {number} lat
     * @param {number} lon
     * @param {number} groundElevation - Ground elevation in meters
     */
    setPosition(lat, lon, groundElevation = 0) {
        this.towerLat = lat;
        this.towerLon = lon;
        this.groundElevation = groundElevation;
        this.updateCamera();
    }

    /**
     * Set tower height
     * @param {number} height - Height in meters above ground
     */
    setHeight(height) {
        this.towerHeight = Math.max(Config.tower.minHeight,
            Math.min(Config.tower.maxHeight, height));
        this.updateCamera();
    }

    /**
     * Set camera heading
     * @param {number} heading - Heading in degrees (0 = North)
     */
    setHeading(heading) {
        this.heading = ((heading % 360) + 360) % 360;
        this.updateCamera();
    }

    /**
     * Set camera pitch
     * @param {number} pitch - Pitch in degrees (-90 to +10)
     */
    setPitch(pitch) {
        this.pitch = Math.max(Config.camera.minPitch,
            Math.min(Config.camera.maxPitch, pitch));
        this.updateCamera();
    }

    /**
     * Set field of view
     * @param {number} fov - FOV in degrees
     */
    setFov(fov) {
        this.fov = Math.max(20, Math.min(120, fov));
        this.camera.frustum.fov = Cesium.Math.toRadians(this.fov);
    }

    /**
     * Reset camera to default orientation
     */
    reset() {
        this.heading = Config.camera.defaultHeading;
        this.pitch = Config.camera.defaultPitch;
        this.fov = Config.camera.defaultFov;
        this.updateCamera();
    }

    /**
     * Update camera position and orientation
     */
    updateCamera() {
        const totalHeight = this.groundElevation + this.towerHeight;

        // Set camera position at tower location
        const position = Cesium.Cartesian3.fromDegrees(
            this.towerLon,
            this.towerLat,
            totalHeight
        );

        // Calculate orientation
        const headingRad = Cesium.Math.toRadians(this.heading);
        const pitchRad = Cesium.Math.toRadians(this.pitch);

        this.camera.setView({
            destination: position,
            orientation: {
                heading: headingRad,
                pitch: pitchRad,
                roll: 0
            }
        });

        // Update FOV
        this.camera.frustum.fov = Cesium.Math.toRadians(this.fov);

        // Trigger update event
        this.onUpdate();
    }

    /**
     * Setup mouse and keyboard controls
     */
    setupControls() {
        const canvas = this.viewer.canvas;

        // Disable default camera controls
        this.viewer.scene.screenSpaceCameraController.enableRotate = false;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
        this.viewer.scene.screenSpaceCameraController.enableZoom = false;
        this.viewer.scene.screenSpaceCameraController.enableTilt = false;
        this.viewer.scene.screenSpaceCameraController.enableLook = false;

        // Add custom controls
        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mouseup', this.onMouseUp);
        canvas.addEventListener('mouseleave', this.onMouseUp);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('wheel', this.onWheel);
        document.addEventListener('keydown', this.onKeyDown);
    }

    /**
     * Remove controls
     */
    removeControls() {
        const canvas = this.viewer.canvas;
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        canvas.removeEventListener('mouseleave', this.onMouseUp);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('wheel', this.onWheel);
        document.removeEventListener('keydown', this.onKeyDown);
    }

    onMouseDown(event) {
        if (event.button === 0) { // Left mouse button
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.viewer.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.viewer.canvas.style.cursor = 'grab';
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        // Update heading (horizontal movement)
        this.heading += deltaX * Config.camera.rotationSpeed * 50;
        this.heading = ((this.heading % 360) + 360) % 360;

        // Update pitch (vertical movement)
        this.pitch -= deltaY * Config.camera.rotationSpeed * 30;
        this.pitch = Math.max(Config.camera.minPitch,
            Math.min(Config.camera.maxPitch, this.pitch));

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        this.updateCamera();
    }

    onWheel(event) {
        event.preventDefault();

        // Adjust pitch with scroll
        const delta = event.deltaY > 0 ? -2 : 2;
        this.pitch = Math.max(Config.camera.minPitch,
            Math.min(Config.camera.maxPitch, this.pitch + delta));

        this.updateCamera();
    }

    onKeyDown(event) {
        const step = 5; // degrees

        switch (event.key) {
            case 'ArrowLeft':
                this.heading = (this.heading - step + 360) % 360;
                this.updateCamera();
                break;
            case 'ArrowRight':
                this.heading = (this.heading + step) % 360;
                this.updateCamera();
                break;
            case 'ArrowUp':
                this.pitch = Math.min(Config.camera.maxPitch, this.pitch + step);
                this.updateCamera();
                break;
            case 'ArrowDown':
                this.pitch = Math.max(Config.camera.minPitch, this.pitch - step);
                this.updateCamera();
                break;
            case 'r':
            case 'R':
                this.reset();
                break;
        }
    }

    /**
     * Callback when camera updates
     */
    onUpdate() {
        // Update UI elements
        if (window.ControlPanel) {
            window.ControlPanel.updateCameraDisplay(this);
        }
    }

    /**
     * Get current camera state
     */
    getState() {
        return {
            lat: this.towerLat,
            lon: this.towerLon,
            height: this.towerHeight,
            elevation: this.groundElevation,
            heading: this.heading,
            pitch: this.pitch,
            fov: this.fov
        };
    }

    /**
     * Fly to a new location smoothly
     * @param {number} lat
     * @param {number} lon
     * @param {number} elevation
     * @param {Function} callback
     */
    flyTo(lat, lon, elevation = 0, callback) {
        const totalHeight = elevation + this.towerHeight;
        const destination = Cesium.Cartesian3.fromDegrees(lon, lat, totalHeight);

        this.viewer.camera.flyTo({
            destination: destination,
            orientation: {
                heading: Cesium.Math.toRadians(this.heading),
                pitch: Cesium.Math.toRadians(this.pitch),
                roll: 0
            },
            duration: 2,
            complete: () => {
                this.towerLat = lat;
                this.towerLon = lon;
                this.groundElevation = elevation;
                if (callback) callback();
            }
        });
    }
}

// Make available globally
window.TowerCamera = TowerCamera;
