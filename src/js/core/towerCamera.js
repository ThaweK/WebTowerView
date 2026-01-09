/**
 * Tower Camera Controller
 * Controls camera view from a fixed tower position
 * Supports both mouse and touch controls
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
        this.lastX = 0;
        this.lastY = 0;

        // Bind methods
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        this.setupControls();
        this.updateCamera();
    }

    /**
     * Set tower position
     */
    setPosition(lat, lon, groundElevation = 0) {
        this.towerLat = lat;
        this.towerLon = lon;
        this.groundElevation = groundElevation;
        this.updateCamera();
    }

    /**
     * Set tower height
     */
    setHeight(height) {
        this.towerHeight = Math.max(Config.tower.minHeight,
            Math.min(Config.tower.maxHeight, height));
        this.updateCamera();
    }

    /**
     * Set camera heading
     */
    setHeading(heading) {
        this.heading = ((heading % 360) + 360) % 360;
        this.updateCamera();
    }

    /**
     * Set camera pitch
     */
    setPitch(pitch) {
        this.pitch = Math.max(Config.camera.minPitch,
            Math.min(Config.camera.maxPitch, pitch));
        this.updateCamera();
    }

    /**
     * Set field of view
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

        const position = Cesium.Cartesian3.fromDegrees(
            this.towerLon,
            this.towerLat,
            totalHeight
        );

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

        this.camera.frustum.fov = Cesium.Math.toRadians(this.fov);
        this.onUpdate();
    }

    /**
     * Setup mouse, touch and keyboard controls
     */
    setupControls() {
        const canvas = this.viewer.canvas;

        // Disable default camera controls
        const controller = this.viewer.scene.screenSpaceCameraController;
        controller.enableRotate = false;
        controller.enableTranslate = false;
        controller.enableZoom = false;
        controller.enableTilt = false;
        controller.enableLook = false;

        // Use pointer events (works for both mouse and touch)
        canvas.addEventListener('pointerdown', this.onPointerDown);
        canvas.addEventListener('pointerup', this.onPointerUp);
        canvas.addEventListener('pointerleave', this.onPointerUp);
        canvas.addEventListener('pointermove', this.onPointerMove);
        canvas.addEventListener('pointercancel', this.onPointerUp);

        // Touch-specific for pinch zoom
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onPointerUp);

        // Mouse wheel
        canvas.addEventListener('wheel', this.onWheel, { passive: false });

        // Keyboard
        document.addEventListener('keydown', this.onKeyDown);

        // Prevent context menu on long press
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onPointerDown(event) {
        // Accept left mouse button or touch
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        this.isDragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        this.viewer.canvas.style.cursor = 'grabbing';

        // Capture pointer for smooth dragging
        event.target.setPointerCapture(event.pointerId);
    }

    onPointerUp(event) {
        this.isDragging = false;
        this.viewer.canvas.style.cursor = 'grab';

        if (event.pointerId) {
            try {
                event.target.releasePointerCapture(event.pointerId);
            } catch (e) {}
        }
    }

    onPointerMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;

        // Sensitivity adjustment for touch vs mouse
        const sensitivity = event.pointerType === 'touch' ? 0.3 : 0.25;

        // Update heading (horizontal movement)
        this.heading += deltaX * sensitivity;
        this.heading = ((this.heading % 360) + 360) % 360;

        // Update pitch (vertical movement)
        this.pitch -= deltaY * sensitivity * 0.6;
        this.pitch = Math.max(Config.camera.minPitch,
            Math.min(Config.camera.maxPitch, this.pitch));

        this.lastX = event.clientX;
        this.lastY = event.clientY;

        this.updateCamera();
    }

    // Touch handling for two-finger gestures
    lastTouchDistance = 0;

    onTouchStart(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }

    onTouchMove(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                const delta = distance - this.lastTouchDistance;
                // Pinch: change FOV (zoom)
                this.fov -= delta * 0.2;
                this.fov = Math.max(20, Math.min(120, this.fov));
                this.camera.frustum.fov = Cesium.Math.toRadians(this.fov);
                this.onUpdate();
            }

            this.lastTouchDistance = distance;
        }
    }

    onWheel(event) {
        event.preventDefault();

        // Scroll: change FOV (zoom)
        const delta = event.deltaY > 0 ? 2 : -2;
        this.fov += delta;
        this.fov = Math.max(20, Math.min(120, this.fov));
        this.camera.frustum.fov = Cesium.Math.toRadians(this.fov);
        this.onUpdate();
    }

    onKeyDown(event) {
        const step = 5;

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

    onUpdate() {
        if (window.ControlPanel) {
            window.ControlPanel.updateCameraDisplay(this);
        }
    }

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

window.TowerCamera = TowerCamera;
