/**
 * WebTowerView - Main Application
 * Airport 3D Tower View using CesiumJS
 */

class WebTowerViewApp {
    constructor() {
        this.viewer = null;
        this.towerCamera = null;
        this.airportOverlay = null;
        this.aircraftManager = null;
        this.osmBuildings = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('WebTowerView initializing...');

        // Set Cesium Ion token if provided
        if (Config.CESIUM_ION_TOKEN) {
            Cesium.Ion.defaultAccessToken = Config.CESIUM_ION_TOKEN;
        }

        // Create Cesium viewer
        this.viewer = new Cesium.Viewer('cesiumContainer', {
            // Disable default UI elements for cleaner look
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            infoBox: false,

            // Use high quality rendering
            requestRenderMode: false,
            maximumRenderTimeChange: Infinity,

            // Imagery - OpenStreetMap
            baseLayer: Cesium.ImageryLayer.fromProviderAsync(
                Cesium.TileMapServiceImageryProvider.fromUrl(
                    Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
                )
            )
        });

        // Add OpenStreetMap imagery on top
        try {
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/'
            });
            this.viewer.imageryLayers.addImageryProvider(osmProvider);
        } catch (e) {
            console.warn('Could not load OSM imagery:', e.message);
        }

        // Configure scene
        this.viewer.scene.globe.enableLighting = false;
        this.viewer.scene.globe.depthTestAgainstTerrain = true;
        this.viewer.scene.fog.enabled = true;
        this.viewer.scene.fog.density = 0.0002;

        // Add terrain if token is available
        if (Config.CESIUM_ION_TOKEN) {
            try {
                this.viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
            } catch (e) {
                console.warn('Could not load terrain:', e.message);
            }
        }

        // Add OSM Buildings if token is available
        if (Config.CESIUM_ION_TOKEN) {
            try {
                this.osmBuildings = await Cesium.createOsmBuildingsAsync();
                this.viewer.scene.primitives.add(this.osmBuildings);
            } catch (e) {
                console.warn('Could not load OSM Buildings:', e.message);
            }
        }

        // Initialize modules
        this.towerCamera = new TowerCamera(this.viewer);
        this.airportOverlay = new AirportOverlay(this.viewer);
        this.aircraftManager = new AircraftManager(this.viewer);

        // Initialize UI
        ControlPanel.init(this);
        Modals.init();

        // Set cursor style
        this.viewer.canvas.style.cursor = 'grab';

        // Go to default airport
        this.goToLocation(
            Config.defaultAirport.lat,
            Config.defaultAirport.lon,
            Config.defaultAirport.elevation
        );

        console.log('WebTowerView initialized successfully');
        console.log('Tip: Get a free Cesium Ion token at https://cesium.com/ion/tokens for 3D buildings and terrain');
    }

    /**
     * Go to a specific location
     * @param {number} lat
     * @param {number} lon
     * @param {number} elevation
     */
    goToLocation(lat, lon, elevation = 0) {
        this.towerCamera.flyTo(lat, lon, elevation, () => {
            // Update input fields
            document.getElementById('input-lat').value = lat.toFixed(5);
            document.getElementById('input-lon').value = lon.toFixed(5);

            ControlPanel.updateDisplayValues();
        });
    }

    /**
     * Load demo data
     */
    loadDemo() {
        const state = this.towerCamera.getState();

        // Create sample airport layout
        const sampleGeoJSON = GeoJSONLoader.createSampleAirport(state.lat, state.lon);
        this.airportOverlay.loadFromGeoJSON(sampleGeoJSON);

        // Add sample aircraft
        this.aircraftManager.addAircraft({
            callsign: 'LOT123',
            type: 'B738',
            lat: state.lat + 0.002,
            lon: state.lon - 0.01,
            altitude: 0,
            heading: 90
        });

        this.aircraftManager.addAircraft({
            callsign: 'RYR456',
            type: 'A320',
            lat: state.lat + 0.004,
            lon: state.lon + 0.008,
            altitude: 0,
            heading: 270
        });

        this.aircraftManager.addAircraft({
            callsign: 'WZZ789',
            type: 'A320',
            lat: state.lat - 0.015,
            lon: state.lon - 0.005,
            altitude: 300,
            heading: 90
        });

        console.log('Demo data loaded');
    }

    /**
     * Export current overlay as GeoJSON
     */
    exportOverlay() {
        const geojson = this.airportOverlay.exportToGeoJSON();
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'airport-overlay.geojson';
        a.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebTowerViewApp();
    window.app.init().catch(err => {
        console.error('Failed to initialize WebTowerView:', err);
        alert('Błąd inicjalizacji aplikacji. Sprawdź konsolę.');
    });
});
