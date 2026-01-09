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

        // Create Cesium viewer with default Cesium Ion imagery
        this.viewer = new Cesium.Viewer('cesiumContainer', {
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
            requestRenderMode: false,
            maximumRenderTimeChange: Infinity
            // Use default Cesium Ion imagery (Bing Maps)
        });

        // Ensure globe and sky are visible
        this.viewer.scene.globe.show = true;
        this.viewer.scene.skyBox.show = true;
        this.viewer.scene.skyAtmosphere.show = true;
        this.viewer.scene.sun.show = true;
        this.viewer.scene.moon.show = true;

        // Configure scene
        this.viewer.scene.globe.enableLighting = false;
        this.viewer.scene.globe.depthTestAgainstTerrain = false;
        this.viewer.scene.fog.enabled = false;

        // Set globe base color (visible before tiles load)
        this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a3d1a');

        // Add terrain and buildings if token is available
        if (Config.CESIUM_ION_TOKEN) {
            try {
                const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
                this.viewer.terrainProvider = terrain;
                console.log('Terrain loaded');
            } catch (e) {
                console.warn('Could not load terrain:', e.message);
            }

            try {
                this.osmBuildings = await Cesium.createOsmBuildingsAsync();
                this.viewer.scene.primitives.add(this.osmBuildings);
                console.log('OSM Buildings loaded');
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
        await this.goToLocation(
            Config.defaultAirport.lat,
            Config.defaultAirport.lon
        );

        console.log('WebTowerView initialized successfully');
        if (!Config.CESIUM_ION_TOKEN) {
            console.log('Tip: Add Cesium Ion token in config.js for 3D terrain and buildings');
        }
    }

    /**
     * Go to a specific location with automatic terrain height detection
     */
    async goToLocation(lat, lon) {
        let terrainHeight = 0;

        try {
            const positions = [Cesium.Cartographic.fromDegrees(lon, lat)];
            const terrain = this.viewer.terrainProvider;

            if (terrain && terrain.availability) {
                const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrain, positions);
                if (sampledPositions && sampledPositions[0]) {
                    terrainHeight = sampledPositions[0].height || 0;
                    console.log(`Terrain height: ${terrainHeight.toFixed(1)}m`);
                }
            }
        } catch (e) {
            console.warn('Could not sample terrain:', e.message);
        }

        terrainHeight = Math.max(0, terrainHeight);

        this.towerCamera.flyTo(lat, lon, terrainHeight, () => {
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

        const sampleGeoJSON = GeoJSONLoader.createSampleAirport(state.lat, state.lon);
        this.airportOverlay.loadFromGeoJSON(sampleGeoJSON);

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
        alert('Błąd inicjalizacji. Sprawdź konsolę (F12).');
    });
});
