/**
 * Weather Visual Effects
 * Applies visual effects to Cesium scene based on METAR data
 */

class WeatherEffects {
    constructor(viewer) {
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.currentMetar = null;

        // Store original settings
        this.originalFog = {
            enabled: this.scene.fog.enabled,
            density: this.scene.fog.density,
            minimumBrightness: this.scene.fog.minimumBrightness
        };

        // Rain/snow particles
        this.precipitationSystem = null;

        // Cloud layers
        this.cloudEntities = [];
        this.cloudDataSource = new Cesium.CustomDataSource('clouds');
        viewer.dataSources.add(this.cloudDataSource);

        // Reference position for clouds
        this.centerLat = 0;
        this.centerLon = 0;
    }

    /**
     * Set center position for cloud rendering
     */
    setCenter(lat, lon) {
        this.centerLat = lat;
        this.centerLon = lon;
    }

    /**
     * Apply weather effects based on METAR
     */
    applyWeather(metar) {
        if (!metar) return;

        this.currentMetar = metar;

        // Apply visibility effects (fog)
        this.applyVisibility(metar.visibility);

        // Apply cloud/sky effects
        this.applyClouds(metar.clouds, metar.flightCategory);

        // Apply precipitation effects
        this.applyPrecipitation(metar.wxString);

        // Apply lighting based on conditions
        this.applyLighting(metar);

        console.log('Weather effects applied:', metar.flightCategory);
    }

    /**
     * Apply visibility/fog effects
     */
    applyVisibility(visibilityKm) {
        if (visibilityKm === null || visibilityKm === undefined) {
            // Reset to clear
            this.scene.fog.enabled = false;
            return;
        }

        // Enable fog for reduced visibility
        if (visibilityKm < 10) {
            this.scene.fog.enabled = true;

            // Calculate fog density based on visibility
            // Lower visibility = higher density
            if (visibilityKm < 1) {
                // Very low visibility (fog, mist)
                this.scene.fog.density = 0.001;
                this.scene.fog.minimumBrightness = 0.8;
            } else if (visibilityKm < 3) {
                // Low visibility (haze, light fog)
                this.scene.fog.density = 0.0004;
                this.scene.fog.minimumBrightness = 0.6;
            } else if (visibilityKm < 5) {
                // Moderate visibility
                this.scene.fog.density = 0.0002;
                this.scene.fog.minimumBrightness = 0.4;
            } else {
                // Light haze
                this.scene.fog.density = 0.00008;
                this.scene.fog.minimumBrightness = 0.3;
            }
        } else {
            // Good visibility - disable fog
            this.scene.fog.enabled = false;
        }
    }

    /**
     * Apply cloud/atmosphere effects - creates actual 3D cloud layers
     */
    applyClouds(clouds, flightCategory) {
        const atmosphere = this.scene.skyAtmosphere;

        // Remove existing cloud entities
        this.cloudDataSource.entities.removeAll();
        this.cloudEntities = [];

        if (!clouds || clouds.length === 0) {
            // Clear sky
            atmosphere.hueShift = 0;
            atmosphere.saturationShift = 0;
            atmosphere.brightnessShift = 0;
            return;
        }

        // Create 3D cloud layers for each reported layer
        for (const cloud of clouds) {
            this.createCloudLayer(cloud.cover, cloud.base);
        }

        // Find lowest cloud layer for atmosphere adjustment
        const lowestCloud = clouds[0];
        const coverage = lowestCloud?.cover || 'SKC';

        // Adjust atmosphere based on cloud coverage
        switch (coverage) {
            case 'OVC': // Overcast
                atmosphere.hueShift = 0;
                atmosphere.saturationShift = -0.3;
                atmosphere.brightnessShift = -0.25;
                break;
            case 'BKN': // Broken
                atmosphere.hueShift = 0;
                atmosphere.saturationShift = -0.2;
                atmosphere.brightnessShift = -0.15;
                break;
            case 'SCT': // Scattered
                atmosphere.hueShift = 0;
                atmosphere.saturationShift = -0.1;
                atmosphere.brightnessShift = -0.05;
                break;
            case 'FEW': // Few
            default:
                atmosphere.hueShift = 0;
                atmosphere.saturationShift = 0;
                atmosphere.brightnessShift = 0;
                break;
        }

        // Additional adjustments for flight category
        if (flightCategory === 'IFR' || flightCategory === 'LIFR') {
            atmosphere.brightnessShift -= 0.1;
            atmosphere.saturationShift -= 0.1;
        }
    }

    /**
     * Create a cloud layer at specified altitude
     */
    createCloudLayer(coverage, baseFeet) {
        // Convert feet to meters
        const baseMeters = baseFeet * 0.3048;

        // Coverage determines opacity and spread
        const coverageSettings = {
            'FEW': { opacity: 0.2, count: 8, spread: 3000 },
            'SCT': { opacity: 0.35, count: 15, spread: 4000 },
            'BKN': { opacity: 0.5, count: 25, spread: 5000 },
            'OVC': { opacity: 0.7, count: 40, spread: 6000 },
            'VV': { opacity: 0.85, count: 50, spread: 4000 }  // Vertical visibility (fog/mist)
        };

        const settings = coverageSettings[coverage] || coverageSettings['SCT'];

        // Create cloud patches around the center position
        for (let i = 0; i < settings.count; i++) {
            // Random position within spread radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * settings.spread;
            const offsetLat = (distance * Math.cos(angle)) / 111000; // meters to degrees
            const offsetLon = (distance * Math.sin(angle)) / (111000 * Math.cos(this.centerLat * Math.PI / 180));

            const cloudLat = this.centerLat + offsetLat;
            const cloudLon = this.centerLon + offsetLon;

            // Random altitude variation within layer (±50m)
            const altitude = baseMeters + (Math.random() - 0.5) * 100;

            // Random cloud size
            const size = 200 + Math.random() * 400;
            const height = 30 + Math.random() * 70;

            // Create cloud entity as semi-transparent ellipsoid
            const entity = this.cloudDataSource.entities.add({
                position: Cesium.Cartesian3.fromDegrees(cloudLon, cloudLat, altitude),
                ellipsoid: {
                    radii: new Cesium.Cartesian3(size, size, height),
                    material: Cesium.Color.WHITE.withAlpha(settings.opacity * (0.5 + Math.random() * 0.5)),
                    outline: false
                }
            });

            this.cloudEntities.push(entity);
        }
    }

    /**
     * Apply precipitation effects (rain, snow)
     */
    applyPrecipitation(wxString) {
        // Remove existing precipitation
        if (this.precipitationSystem) {
            this.scene.primitives.remove(this.precipitationSystem);
            this.precipitationSystem = null;
        }

        if (!wxString) return;

        const wx = wxString.toUpperCase();

        // Check for precipitation types
        const hasRain = wx.includes('RA') || wx.includes('DZ') || wx.includes('SH');
        const hasSnow = wx.includes('SN') || wx.includes('GR') || wx.includes('GS');
        const isHeavy = wx.includes('+');
        const isLight = wx.includes('-');

        if (hasRain || hasSnow) {
            this.createPrecipitationEffect(hasSnow, isHeavy, isLight);
        }
    }

    /**
     * Create precipitation particle system
     */
    createPrecipitationEffect(isSnow, isHeavy, isLight) {
        const camera = this.viewer.camera;

        // Determine particle count based on intensity
        let particleCount = 500;
        if (isHeavy) particleCount = 1500;
        if (isLight) particleCount = 200;

        // Create particle system
        const particleSystem = new Cesium.ParticleSystem({
            modelMatrix: new Cesium.Matrix4(),

            // Particle appearance
            image: this.createPrecipitationTexture(isSnow),
            startColor: isSnow ?
                new Cesium.Color(1, 1, 1, 0.8) :
                new Cesium.Color(0.7, 0.7, 0.8, 0.5),
            endColor: isSnow ?
                new Cesium.Color(1, 1, 1, 0.3) :
                new Cesium.Color(0.6, 0.6, 0.7, 0.2),

            // Particle size
            startScale: isSnow ? 2.0 : 1.0,
            endScale: isSnow ? 1.5 : 0.5,
            minimumParticleLife: isSnow ? 3.0 : 1.0,
            maximumParticleLife: isSnow ? 5.0 : 2.0,

            // Emission
            minimumSpeed: isSnow ? 2.0 : 15.0,
            maximumSpeed: isSnow ? 5.0 : 25.0,
            emissionRate: particleCount,

            // Emitter
            emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(500.0, 500.0, 50.0)),

            // Gravity for rain, less for snow
            gravity: isSnow ?
                new Cesium.Cartesian3(0.5, 0, -3.0) :
                new Cesium.Cartesian3(0, 0, -9.8),

            lifetime: 16.0,
            loop: true
        });

        // Update particle position to follow camera
        this.scene.preUpdate.addEventListener(() => {
            if (this.precipitationSystem) {
                const position = camera.positionWC;
                // Offset particles above camera
                const offset = new Cesium.Cartesian3(0, 0, 200);
                const particlePosition = Cesium.Cartesian3.add(
                    position,
                    Cesium.Matrix3.multiplyByVector(
                        Cesium.Matrix3.fromQuaternion(
                            Cesium.Transforms.headingPitchRollQuaternion(
                                position,
                                new Cesium.HeadingPitchRoll(0, 0, 0)
                            )
                        ),
                        offset,
                        new Cesium.Cartesian3()
                    ),
                    new Cesium.Cartesian3()
                );
                this.precipitationSystem.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(particlePosition);
            }
        });

        this.precipitationSystem = particleSystem;
        this.scene.primitives.add(particleSystem);
    }

    /**
     * Create precipitation texture
     */
    createPrecipitationTexture(isSnow) {
        const size = isSnow ? 8 : 4;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = isSnow ? size : size * 4;

        const ctx = canvas.getContext('2d');

        if (isSnow) {
            // Snowflake - simple circle
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Raindrop - elongated shape
            ctx.fillStyle = 'rgba(200, 200, 220, 0.8)';
            ctx.beginPath();
            ctx.ellipse(size/2, canvas.height/2, size/3, canvas.height/2 - 1, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas.toDataURL();
    }

    /**
     * Apply lighting adjustments
     */
    applyLighting(metar) {
        const globe = this.scene.globe;

        // Check for thunderstorms
        if (metar.wxString && metar.wxString.includes('TS')) {
            // Darker, more dramatic lighting
            globe.enableLighting = true;
            this.scene.skyAtmosphere.brightnessShift = -0.3;
        }
    }

    /**
     * Reset all weather effects
     */
    reset() {
        // Reset fog
        this.scene.fog.enabled = this.originalFog.enabled;
        this.scene.fog.density = this.originalFog.density;
        this.scene.fog.minimumBrightness = this.originalFog.minimumBrightness;

        // Reset atmosphere
        const atmosphere = this.scene.skyAtmosphere;
        atmosphere.hueShift = 0;
        atmosphere.saturationShift = 0;
        atmosphere.brightnessShift = 0;

        // Remove precipitation
        if (this.precipitationSystem) {
            this.scene.primitives.remove(this.precipitationSystem);
            this.precipitationSystem = null;
        }

        // Remove cloud entities
        this.cloudDataSource.entities.removeAll();
        this.cloudEntities = [];

        // Reset globe
        this.scene.globe.enableLighting = false;

        this.currentMetar = null;
    }

    /**
     * Get current weather description
     */
    getDescription() {
        if (!this.currentMetar) return 'Brak danych';

        const parts = [];

        // Visibility
        if (this.currentMetar.visibility !== null) {
            if (this.currentMetar.visibility < 1) parts.push('Bardzo słaba widoczność');
            else if (this.currentMetar.visibility < 3) parts.push('Słaba widoczność');
            else if (this.currentMetar.visibility < 5) parts.push('Umiarkowana widoczność');
        }

        // Clouds
        if (this.currentMetar.clouds?.length > 0) {
            const cover = this.currentMetar.clouds[0].cover;
            const coverNames = {
                'OVC': 'Zachmurzenie całkowite',
                'BKN': 'Duże zachmurzenie',
                'SCT': 'Częściowe zachmurzenie',
                'FEW': 'Niewielkie zachmurzenie'
            };
            if (coverNames[cover]) parts.push(coverNames[cover]);
        }

        // Precipitation
        if (this.currentMetar.wxString) {
            const wx = this.currentMetar.wxString;
            if (wx.includes('RA')) parts.push('Deszcz');
            if (wx.includes('SN')) parts.push('Śnieg');
            if (wx.includes('TS')) parts.push('Burza');
            if (wx.includes('FG')) parts.push('Mgła');
            if (wx.includes('BR')) parts.push('Zamglenie');
        }

        return parts.length > 0 ? parts.join(', ') : 'Dobra pogoda';
    }
}

window.WeatherEffects = WeatherEffects;
