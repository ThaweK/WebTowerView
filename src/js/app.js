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
        this.metarService = null;
        this.vatsimService = null;
        this.weatherEffects = null;
        this.currentIcao = Config.defaultAirport.icao;
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

        // Setup viewer options
        const viewerOptions = {
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            infoBox: false
        };

        // If no Ion token, use OpenStreetMap tiles
        if (!Config.CESIUM_ION_TOKEN) {
            viewerOptions.imageryProvider = new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/'
            });
            console.log('Using OpenStreetMap imagery (no Cesium Ion token)');
        }
        // With Ion token, don't specify imageryProvider - let Cesium use default Ion imagery

        // Create Cesium viewer
        this.viewer = new Cesium.Viewer('cesiumContainer', viewerOptions);

        console.log('Viewer created');

        // Globe settings
        const globe = this.viewer.scene.globe;
        globe.show = true;
        globe.enableLighting = false;
        globe.depthTestAgainstTerrain = false;

        // Atmosphere
        this.viewer.scene.skyAtmosphere.show = true;
        this.viewer.scene.fog.enabled = false;

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

        // Initialize services
        this.metarService = new MetarService();
        this.vatsimService = new VatsimService(this.aircraftManager, this.viewer);
        this.weatherEffects = new WeatherEffects(this.viewer);

        // Setup METAR listener - update display and visual effects
        this.metarService.addListener((metar) => {
            this.updateWeatherDisplay(metar);
            this.weatherEffects.applyWeather(metar);
        });

        // Initialize UI
        ControlPanel.init(this);
        Modals.init();

        // Setup VATSIM controls
        this.setupVatsimControls();

        // Set cursor style
        this.viewer.canvas.style.cursor = 'grab';

        // Go to default airport
        await this.goToLocation(
            Config.defaultAirport.lat,
            Config.defaultAirport.lon,
            Config.defaultAirport.icao
        );

        // Start METAR updates
        this.metarService.startUpdates(this.currentIcao);

        console.log('WebTowerView initialized successfully');
        if (!Config.CESIUM_ION_TOKEN) {
            console.log('Tip: Add Cesium Ion token in config.js for 3D terrain and buildings');
        }
    }

    /**
     * Go to a specific location with automatic terrain height detection
     */
    async goToLocation(lat, lon, icao = null) {
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

        // Update current ICAO if provided
        if (icao) {
            this.currentIcao = icao;
            this.metarService.startUpdates(icao);
        }

        // Update VATSIM center with terrain height for altitude calculations
        this.vatsimService.setCenter(lat, lon, terrainHeight);

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

    /**
     * Update weather display from METAR data
     */
    updateWeatherDisplay(metar) {
        const container = document.getElementById('weather-info');
        if (!container || !metar) return;

        const categoryColors = {
            'VFR': '#00ff00',
            'MVFR': '#0088ff',
            'IFR': '#ff0000',
            'LIFR': '#ff00ff'
        };

        const categoryColor = categoryColors[metar.flightCategory] || '#ffffff';

        container.innerHTML = `
            <div class="weather-category" style="color: ${categoryColor}">
                ${metar.flightCategory}
            </div>
            <div class="weather-item">
                <span class="label">Wiatr:</span>
                <span class="value">${this.metarService.formatWind(metar)}</span>
            </div>
            <div class="weather-item">
                <span class="label">Widoczność:</span>
                <span class="value">${this.metarService.formatVisibility(metar)}</span>
            </div>
            <div class="weather-item">
                <span class="label">Temp:</span>
                <span class="value">${metar.temp !== null ? metar.temp + '°C' : 'N/A'}</span>
            </div>
            ${metar.clouds.length > 0 ? `
            <div class="weather-item">
                <span class="label">Chmury:</span>
                <span class="value">${metar.clouds.map(c => `${c.cover} ${c.base}ft`).join(', ')}</span>
            </div>
            ` : ''}
            ${metar.wxString ? `
            <div class="weather-item">
                <span class="label">Zjawiska:</span>
                <span class="value">${metar.wxString}</span>
            </div>
            ` : ''}
            <div class="weather-raw">${metar.raw}</div>
        `;
    }

    /**
     * Setup VATSIM controls
     */
    setupVatsimControls() {
        const enabledCheckbox = document.getElementById('vatsim-enabled');
        const radiusSlider = document.getElementById('vatsim-radius');
        const radiusValue = document.getElementById('vatsim-radius-value');
        const countSpan = document.getElementById('vatsim-count');

        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const state = this.towerCamera.getState();
                    const radius = parseInt(radiusSlider.value);
                    this.vatsimService.start(state.lat, state.lon, radius);
                } else {
                    this.vatsimService.stop();
                }
            });
        }

        if (radiusSlider) {
            radiusSlider.addEventListener('input', (e) => {
                const radius = parseInt(e.target.value);
                radiusValue.textContent = `${radius} km`;
                this.vatsimService.radius = radius;
            });
        }

        // Update count periodically
        setInterval(() => {
            if (countSpan && this.vatsimService) {
                countSpan.textContent = this.vatsimService.getPilotCount();
            }
        }, 1000);
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
