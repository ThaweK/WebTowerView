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
     * Apply cloud/atmosphere effects
     */
    applyClouds(clouds, flightCategory) {
        const atmosphere = this.scene.skyAtmosphere;

        if (!clouds || clouds.length === 0) {
            // Clear sky
            atmosphere.hueShift = 0;
            atmosphere.saturationShift = 0;
            atmosphere.brightnessShift = 0;
            return;
        }

        // Find lowest cloud layer
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
