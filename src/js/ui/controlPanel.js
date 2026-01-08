/**
 * Control Panel UI Handler
 */

const ControlPanel = {
    init(app) {
        this.app = app;
        this.setupEventListeners();
        this.updateDisplayValues();
    },

    setupEventListeners() {
        // Tower height
        const towerHeight = document.getElementById('tower-height');
        towerHeight?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('tower-height-value').textContent = value;
            this.app.towerCamera.setHeight(value);
        });

        // Camera heading
        const cameraHeading = document.getElementById('camera-heading');
        cameraHeading?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('camera-heading-value').textContent = `${value}°`;
            this.app.towerCamera.setHeading(value);
        });

        // Camera pitch
        const cameraPitch = document.getElementById('camera-pitch');
        cameraPitch?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('camera-pitch-value').textContent = `${value}°`;
            this.app.towerCamera.setPitch(value);
        });

        // Camera FOV
        const cameraFov = document.getElementById('camera-fov');
        cameraFov?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('camera-fov-value').textContent = `${value}°`;
            this.app.towerCamera.setFov(value);
        });

        // Reset camera
        document.getElementById('reset-camera-btn')?.addEventListener('click', () => {
            this.app.towerCamera.reset();
            this.updateDisplayValues();
        });

        // Go to coordinates
        document.getElementById('goto-coords-btn')?.addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('input-lat').value);
            const lon = parseFloat(document.getElementById('input-lon').value);
            if (!isNaN(lat) && !isNaN(lon)) {
                this.app.goToLocation(lat, lon);
            }
        });

        // Airport search
        document.getElementById('goto-airport-btn')?.addEventListener('click', () => {
            const search = document.getElementById('airport-search').value.toUpperCase();
            const airport = Config.airports.find(a => a.icao === search || a.name.toUpperCase().includes(search));
            if (airport) {
                document.getElementById('input-lat').value = airport.lat;
                document.getElementById('input-lon').value = airport.lon;
                this.app.goToLocation(airport.lat, airport.lon, airport.elevation);
            } else {
                alert('Lotnisko nie znalezione. Spróbuj: EPWA, KJFK, EGLL...');
            }
        });

        // GeoJSON loading
        document.getElementById('load-geojson-btn')?.addEventListener('click', () => {
            document.getElementById('geojson-input').click();
        });

        document.getElementById('geojson-input')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const geojson = await GeoJSONLoader.loadFromFile(file);
                    this.app.airportOverlay.loadFromGeoJSON(geojson);

                    // Center on loaded data
                    const bounds = GeoJSONLoader.calculateBounds(geojson);
                    const center = GeoJSONLoader.getBoundsCenter(bounds);
                    this.app.goToLocation(center.lat, center.lon);
                } catch (err) {
                    alert('Błąd wczytywania GeoJSON: ' + err.message);
                }
            }
        });

        // Overlay visibility
        document.getElementById('show-overlay')?.addEventListener('change', (e) => {
            this.app.airportOverlay.setVisible(e.target.checked);
        });

        // Overlay opacity
        const overlayOpacity = document.getElementById('overlay-opacity');
        overlayOpacity?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('overlay-opacity-value').textContent = `${value}%`;
            this.app.airportOverlay.setOpacity(value / 100);
        });

        // Add manual objects
        document.getElementById('add-runway-btn')?.addEventListener('click', () => {
            Modals.showRunwayModal();
        });

        document.getElementById('add-taxiway-btn')?.addEventListener('click', () => {
            Modals.showTaxiwayModal();
        });

        document.getElementById('add-apron-btn')?.addEventListener('click', () => {
            Modals.showApronModal();
        });

        // Clear overlay
        document.getElementById('clear-overlay-btn')?.addEventListener('click', () => {
            if (confirm('Czy na pewno wyczyścić wszystkie obiekty overlay?')) {
                this.app.airportOverlay.clear();
            }
        });

        // Add aircraft
        document.getElementById('add-aircraft-btn')?.addEventListener('click', () => {
            Modals.showAircraftModal();
        });

        // View options
        document.getElementById('show-osm-buildings')?.addEventListener('change', (e) => {
            if (this.app.osmBuildings) {
                this.app.osmBuildings.show = e.target.checked;
            }
        });

        document.getElementById('show-terrain')?.addEventListener('change', (e) => {
            this.app.viewer.scene.globe.show = e.target.checked;
        });

        document.getElementById('show-atmosphere')?.addEventListener('change', (e) => {
            this.app.viewer.scene.skyAtmosphere.show = e.target.checked;
        });

        // Load demo
        document.getElementById('load-demo-btn')?.addEventListener('click', () => {
            this.app.loadDemo();
        });
    },

    /**
     * Update camera display values from current state
     * @param {TowerCamera} camera
     */
    updateCameraDisplay(camera) {
        if (!camera) return;

        const state = camera.getState();

        // Update sliders
        document.getElementById('camera-heading').value = state.heading;
        document.getElementById('camera-heading-value').textContent = `${Math.round(state.heading)}°`;

        document.getElementById('camera-pitch').value = state.pitch;
        document.getElementById('camera-pitch-value').textContent = `${Math.round(state.pitch)}°`;

        document.getElementById('tower-height').value = state.height;
        document.getElementById('tower-height-value').textContent = Math.round(state.height);

        // Update position info
        document.getElementById('pos-lat').textContent = state.lat.toFixed(5);
        document.getElementById('pos-lon').textContent = state.lon.toFixed(5);
        document.getElementById('pos-alt').textContent = Math.round(state.elevation + state.height);
        document.getElementById('pos-heading').textContent = `${Math.round(state.heading)}°`;

        // Update compass
        const compassArrow = document.getElementById('compass-arrow');
        if (compassArrow) {
            compassArrow.style.transform = `rotate(${state.heading}deg)`;
        }
    },

    /**
     * Update all display values
     */
    updateDisplayValues() {
        if (this.app?.towerCamera) {
            this.updateCameraDisplay(this.app.towerCamera);
        }
    }
};

// Make available globally
window.ControlPanel = ControlPanel;
