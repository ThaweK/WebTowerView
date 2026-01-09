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

        // Pre-generate cloud textures
        this.cloudTextures = this.generateCloudTextures();
    }

    /**
     * Generate procedural cloud textures
     */
    generateCloudTextures() {
        const textures = [];
        const sizes = [256, 384, 512];

        for (let i = 0; i < 5; i++) {
            const size = sizes[i % sizes.length];
            textures.push(this.createCloudTexture(size, i));
        }

        return textures;
    }

    /**
     * Create a single cloud texture using Perlin-like noise
     */
    createCloudTexture(size, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill with transparent
        ctx.clearRect(0, 0, size, size);

        // Use radial gradient with noise-like effect
        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size / 2;

        // Create multiple overlapping circles with varying opacity
        const numCircles = 15 + seed * 3;

        for (let i = 0; i < numCircles; i++) {
            // Pseudo-random positions within cloud area
            const angle = (i / numCircles) * Math.PI * 2 + seed;
            const distance = Math.random() * maxRadius * 0.5;
            const cx = centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * 40;
            const cy = centerY + Math.sin(angle) * distance + (Math.random() - 0.5) * 40;
            const radius = maxRadius * (0.3 + Math.random() * 0.4);

            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.7, 'rgba(240, 240, 245, 0.15)');
            gradient.addColorStop(1, 'rgba(230, 230, 240, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add central density
        const mainGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxRadius * 0.7
        );
        mainGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        mainGradient.addColorStop(0.5, 'rgba(250, 250, 255, 0.2)');
        mainGradient.addColorStop(1, 'rgba(245, 245, 250, 0)');

        ctx.fillStyle = mainGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        return canvas.toDataURL();
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
     * Create a cloud layer at specified altitude using billboards
     */
    createCloudLayer(coverage, baseFeet) {
        // Convert feet to meters
        const baseMeters = baseFeet * 0.3048;

        // Coverage determines opacity and spread
        const coverageSettings = {
            'FEW': { opacity: 0.4, count: 12, spread: 4000, size: 400 },
            'SCT': { opacity: 0.5, count: 25, spread: 5000, size: 500 },
            'BKN': { opacity: 0.65, count: 40, spread: 6000, size: 600 },
            'OVC': { opacity: 0.8, count: 60, spread: 7000, size: 700 },
            'VV': { opacity: 0.9, count: 80, spread: 5000, size: 500 }  // Vertical visibility (fog/mist)
        };

        const settings = coverageSettings[coverage] || coverageSettings['SCT'];

        // Create cloud billboards around the center position
        for (let i = 0; i < settings.count; i++) {
            // Random position within spread radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * settings.spread;
            const offsetLat = (distance * Math.cos(angle)) / 111000; // meters to degrees
            const offsetLon = (distance * Math.sin(angle)) / (111000 * Math.cos(this.centerLat * Math.PI / 180));

            const cloudLat = this.centerLat + offsetLat;
            const cloudLon = this.centerLon + offsetLon;

            // Random altitude variation within layer (±100m)
            const altitude = baseMeters + (Math.random() - 0.5) * 200;

            // Random cloud size (in meters, will be converted to pixels)
            const cloudSize = settings.size * (0.7 + Math.random() * 0.6);

            // Random texture
            const textureIndex = Math.floor(Math.random() * this.cloudTextures.length);

            // Random rotation for variety
            const rotation = Math.random() * Math.PI * 2;

            // Opacity variation
            const opacity = settings.opacity * (0.6 + Math.random() * 0.4);

            // Create cloud billboard
            const entity = this.cloudDataSource.entities.add({
                position: Cesium.Cartesian3.fromDegrees(cloudLon, cloudLat, altitude),
                billboard: {
                    image: this.cloudTextures[textureIndex],
                    width: cloudSize,
                    height: cloudSize * (0.5 + Math.random() * 0.3),
                    rotation: rotation,
                    color: Cesium.Color.WHITE.withAlpha(opacity),
                    heightReference: Cesium.HeightReference.NONE,
                    disableDepthTestDistance: 50000, // Visible through terrain from distance
                    sizeInMeters: true
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
