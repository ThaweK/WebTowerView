/**
 * WebTowerView - Main Application
 * Airport 3D Tower View using CesiumJS with optimized glTF aircraft models
 */

class WebTowerViewApp {
    constructor() {
        this.viewer = null;
        this.towerCamera = null;
        this.airportOverlay = null;
        this.aircraftManager = null;
        this.modelManager = null;
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

        // Setup viewer options with optimizations
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
            infoBox: false,
            // Performance optimizations
            requestRenderMode: false,  // Keep continuous rendering for smooth animations
            maximumRenderTimeChange: Infinity,
            targetFrameRate: 60,
            // Scene settings
            shadows: false,
            terrainShadows: Cesium.ShadowMode.DISABLED,
            // Context options for better precision
            contextOptions: {
                webgl: {
                    alpha: false,
                    depth: true,
                    stencil: false,
                    antialias: true,
                    premultipliedAlpha: true,
                    preserveDrawingBuffer: false,
                    failIfMajorPerformanceCaveat: false
                }
            }
        };

        // If no Ion token, use OpenStreetMap tiles
        if (!Config.CESIUM_ION_TOKEN) {
            viewerOptions.imageryProvider = new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/'
            });
            console.log('Using OpenStreetMap imagery (no Cesium Ion token)');
        }

        // Create Cesium viewer
        this.viewer = new Cesium.Viewer('cesiumContainer', viewerOptions);

        console.log('Viewer created');

        // Configure scene for optimal performance and precision
        this.configureScene();

        // Add terrain and buildings if token is available
        if (Config.CESIUM_ION_TOKEN) {
            await this.loadTerrainAndBuildings();
        }

        // Initialize model manager first
        this.modelManager = new ModelManager();

        // Initialize modules
        this.towerCamera = new TowerCamera(this.viewer);
        this.airportOverlay = new AirportOverlay(this.viewer);
        this.aircraftManager = new AircraftManager(this.viewer, this.modelManager);

        // Initialize services
        this.metarService = new MetarService();
        this.vatsimService = new VatsimService(this.aircraftManager, this.viewer, this.modelManager);
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

        // Setup FPS counter
        this.setupFPSCounter();

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
     * Configure scene for optimal performance and precision
     */
    configureScene() {
        const scene = this.viewer.scene;
        const globe = scene.globe;

        // Globe settings
        globe.show = true;
        globe.enableLighting = false;
        globe.depthTestAgainstTerrain = true;  // Enable depth testing for proper occlusion
        globe.showGroundAtmosphere = true;
        globe.showWaterEffect = true;

        // Precision settings - enable logarithmic depth buffer to reduce z-fighting
        scene.logarithmicDepthBuffer = true;

        // Near/far plane settings for better precision at close range
        scene.camera.frustum.near = 1.0;      // 1 meter near plane
        scene.camera.frustum.far = 500000000; // 500,000 km far plane

        // Atmosphere and sky
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = false;  // Disable by default, weather effects will control this
        scene.fog.density = 0.0001;
        scene.fog.minimumBrightness = 0.1;

        // Rendering optimizations
        scene.debugShowFramesPerSecond = false;
        scene.requestRenderMode = false;  // Continuous rendering for smooth animations

        // Anti-aliasing
        if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
            this.viewer.resolutionScale = window.devicePixelRatio;
        }

        // FXAA for better edge rendering
        scene.postProcessStages.fxaa.enabled = true;

        // Disable unused features for performance
        scene.highDynamicRange = false;
        scene.sun.show = true;
        scene.moon.show = false;
        scene.skyBox.show = true;

        // Ground atmosphere for better visuals
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a3a5c');

        // Optimize tile loading
        globe.tileCacheSize = 100;
        globe.maximumScreenSpaceError = 2;  // Higher quality terrain

        console.log('Scene configured with optimizations');
    }

    /**
     * Load terrain and OSM buildings
     */
    async loadTerrainAndBuildings() {
        // Load terrain
        try {
            const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
            this.viewer.terrainProvider = terrain;
            console.log('Terrain loaded');
        } catch (e) {
            console.warn('Could not load terrain:', e.message);
        }

        // Load OSM buildings
        try {
            this.osmBuildings = await Cesium.createOsmBuildingsAsync();
            this.viewer.scene.primitives.add(this.osmBuildings);
            console.log('OSM Buildings loaded');
        } catch (e) {
            console.warn('Could not load OSM Buildings:', e.message);
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

        // Set reference position for aircraft manager (helps with precision)
        this.aircraftManager.setReferencePosition(lat, lon);

        // Update VATSIM center with terrain height for altitude calculations
        this.vatsimService.setCenter(lat, lon, terrainHeight);

        // Update weather effects center for cloud positioning
        this.weatherEffects.setCenter(lat, lon);

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

        // Demo aircraft with different types
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
            type: 'A321',
            lat: state.lat - 0.015,
            lon: state.lon - 0.005,
            altitude: 300,
            heading: 90
        });

        this.aircraftManager.addAircraft({
            callsign: 'DLH101',
            type: 'A333',
            lat: state.lat + 0.008,
            lon: state.lon + 0.015,
            altitude: 500,
            heading: 180
        });

        console.log('Demo data loaded with glTF models');
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
                <span class="label">Widocznosc:</span>
                <span class="value">${this.metarService.formatVisibility(metar)}</span>
            </div>
            <div class="weather-item">
                <span class="label">Temp:</span>
                <span class="value">${metar.temp !== null ? metar.temp + ' C' : 'N/A'}</span>
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

    /**
     * Setup FPS counter
     */
    setupFPSCounter() {
        const fpsElement = document.getElementById('fps-value');
        if (!fpsElement) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 60;

        // Use Cesium's postRender event for accurate frame counting
        this.viewer.scene.postRender.addEventListener(() => {
            frameCount++;
            const currentTime = performance.now();
            const elapsed = currentTime - lastTime;

            // Update FPS every 500ms
            if (elapsed >= 500) {
                fps = Math.round((frameCount * 1000) / elapsed);
                frameCount = 0;
                lastTime = currentTime;

                fpsElement.textContent = fps;

                // Color coding based on FPS
                fpsElement.classList.remove('low', 'medium');
                if (fps < 20) {
                    fpsElement.classList.add('low');
                } else if (fps < 40) {
                    fpsElement.classList.add('medium');
                }
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebTowerViewApp();
    window.app.init().catch(err => {
        console.error('Failed to initialize WebTowerView:', err);
        alert('Error initializing. Check console (F12).');
    });
});
