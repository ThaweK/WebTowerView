/**
 * Aircraft Manager - Optimized 3D Aircraft Rendering with glTF Models
 * Uses single Cesium Entity per aircraft with glTF models for better performance
 */

class AircraftManager {
    constructor(viewer, modelManager) {
        this.viewer = viewer;
        this.modelManager = modelManager;
        this.aircraft = new Map();
        this.dataSource = new Cesium.CustomDataSource('aircraft');
        viewer.dataSources.add(this.dataSource);

        this.nextId = 1;

        // Reference position for relative-to-center rendering (reduces float precision issues)
        this.referencePosition = null;

        // Setup optimized render loop
        this.setupRenderLoop();
    }

    /**
     * Set reference position for RTC rendering
     * Should be called when changing airports
     */
    setReferencePosition(lat, lon) {
        this.referencePosition = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
        console.log(`AircraftManager: Reference position set to ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }

    /**
     * Setup render loop for smooth position interpolation
     */
    setupRenderLoop() {
        // Use scene preRender for smooth updates
        this.viewer.scene.preRender.addEventListener(() => {
            const now = Date.now();

            for (const aircraft of this.aircraft.values()) {
                if (aircraft.isVatsim) {
                    // Interpolate towards target position
                    this.interpolatePosition(aircraft, now);
                }
            }
        });
    }

    /**
     * Smooth position interpolation for VATSIM aircraft
     */
    interpolatePosition(aircraft, now) {
        const elapsed = now - aircraft.lastUpdate;
        // Interpolation over 2 seconds (VATSIM update interval)
        const t = Math.min(1.0, elapsed / 2000);

        // Smooth interpolation
        const smoothT = this.smoothstep(t);

        aircraft.currentLat = this.lerp(aircraft.prevLat, aircraft.targetLat, smoothT);
        aircraft.currentLon = this.lerp(aircraft.prevLon, aircraft.targetLon, smoothT);
        aircraft.currentAlt = this.lerp(aircraft.prevAlt, aircraft.targetAlt, smoothT);
        aircraft.currentHdg = this.lerpAngle(aircraft.prevHdg, aircraft.targetHdg, smoothT);

        // Update displayed position/orientation
        aircraft.lat = aircraft.currentLat;
        aircraft.lon = aircraft.currentLon;
        aircraft.altitude = aircraft.currentAlt;
        aircraft.heading = aircraft.currentHdg;
    }

    /**
     * Smoothstep function for eased interpolation
     */
    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Angle interpolation (handles wraparound at 0/360)
     */
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return ((a + diff * t) + 360) % 360;
    }

    /**
     * Create position callback property for an aircraft
     */
    createPositionProperty(id) {
        return new Cesium.CallbackProperty(() => {
            const aircraft = this.aircraft.get(id);
            if (!aircraft) return Cesium.Cartesian3.ZERO;

            return Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude
            );
        }, false);
    }

    /**
     * Create orientation callback property for an aircraft
     */
    createOrientationProperty(id) {
        return new Cesium.CallbackProperty(() => {
            const aircraft = this.aircraft.get(id);
            if (!aircraft) return Cesium.Quaternion.IDENTITY;

            const position = Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude
            );

            // Cesium heading: 0 = North, positive = clockwise (East)
            // Add 180 degrees offset as models typically face -Y (south)
            const headingRad = Cesium.Math.toRadians(aircraft.heading);
            const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);

            return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        }, false);
    }

    /**
     * Add an aircraft to the scene
     */
    addAircraft(options) {
        const {
            callsign = `AC${this.nextId}`,
            type = 'A320',
            lat,
            lon,
            altitude = 0,
            heading = 0,
            speed = 0,
            isVatsim = false
        } = options;

        // Check for existing aircraft with same callsign
        const existing = this.findByCallsign(callsign);
        if (existing) {
            this.updateAircraft(existing.id, { lat, lon, altitude, heading, speed });
            return existing.id;
        }

        const id = `aircraft_${this.nextId++}`;

        // Get model information
        const modelUri = this.modelManager.getModelUri(type);
        const modelScale = this.modelManager.getModelScale(type);
        const aircraftName = this.modelManager.getAircraftName(type);
        const airlineInfo = this.modelManager.getAirlineInfo(callsign);

        // Store aircraft data
        const aircraftData = {
            id,
            callsign,
            type,
            aircraftName,
            airlineInfo,
            // Current position
            lat,
            lon,
            altitude,
            heading,
            speed,
            // Interpolation state (for VATSIM)
            currentLat: lat,
            currentLon: lon,
            currentAlt: altitude,
            currentHdg: heading,
            prevLat: lat,
            prevLon: lon,
            prevAlt: altitude,
            prevHdg: heading,
            targetLat: lat,
            targetLon: lon,
            targetAlt: altitude,
            targetHdg: heading,
            // State
            lastUpdate: Date.now(),
            isVatsim,
            entity: null,
            labelEntity: null
        };

        this.aircraft.set(id, aircraftData);

        // Create the aircraft entity with glTF model
        // heightReference: RELATIVE_TO_GROUND ensures altitude is measured from terrain surface,
        // not the WGS84 ellipsoid. This fixes the parallax effect at oblique viewing angles.
        const entity = this.dataSource.entities.add({
            id: id,
            position: this.createPositionProperty(id),
            orientation: this.createOrientationProperty(id),
            model: {
                uri: modelUri,
                scale: modelScale,
                minimumPixelSize: 32,  // Always visible at minimum size
                maximumScale: 20000,    // Maximum scale when close
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                runAnimations: false,
                clampAnimations: true,
                shadows: Cesium.ShadowMode.DISABLED,  // Disable shadows for performance
                silhouetteColor: Cesium.Color.WHITE,
                silhouetteSize: 0,
                colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
                colorBlendAmount: 0.0
            }
        });

        aircraftData.entity = entity;

        // Create label entity separately for better control
        const labelEntity = this.dataSource.entities.add({
            id: `${id}_label`,
            position: this.createPositionProperty(id),
            label: {
                text: callsign,
                font: Config.aircraft.labelFont,
                fillColor: Cesium.Color.fromCssColorString(Config.aircraft.labelColor),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: Config.aircraft.labelOutlineWidth,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -40),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(100, 1.2, 50000, 0.5),
                translucencyByDistance: new Cesium.NearFarScalar(100, 1.0, 100000, 0.3),
                showBackground: true,
                backgroundColor: new Cesium.Color(0, 0, 0, 0.5)
            }
        });

        aircraftData.labelEntity = labelEntity;

        this.updateAircraftList();
        return id;
    }

    /**
     * Update aircraft position and state
     */
    updateAircraft(id, updates) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        if (aircraft.isVatsim) {
            // For VATSIM aircraft, update targets for interpolation
            const now = Date.now();

            // Save current as previous
            aircraft.prevLat = aircraft.currentLat;
            aircraft.prevLon = aircraft.currentLon;
            aircraft.prevAlt = aircraft.currentAlt;
            aircraft.prevHdg = aircraft.currentHdg;

            // Set new targets
            if (updates.lat !== undefined) aircraft.targetLat = updates.lat;
            if (updates.lon !== undefined) aircraft.targetLon = updates.lon;
            if (updates.altitude !== undefined) aircraft.targetAlt = updates.altitude;
            if (updates.heading !== undefined) aircraft.targetHdg = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;

            aircraft.lastUpdate = now;
        } else {
            // Direct update for manual aircraft
            if (updates.lat !== undefined) {
                aircraft.lat = updates.lat;
                aircraft.currentLat = updates.lat;
                aircraft.targetLat = updates.lat;
                aircraft.prevLat = updates.lat;
            }
            if (updates.lon !== undefined) {
                aircraft.lon = updates.lon;
                aircraft.currentLon = updates.lon;
                aircraft.targetLon = updates.lon;
                aircraft.prevLon = updates.lon;
            }
            if (updates.altitude !== undefined) {
                aircraft.altitude = updates.altitude;
                aircraft.currentAlt = updates.altitude;
                aircraft.targetAlt = updates.altitude;
                aircraft.prevAlt = updates.altitude;
            }
            if (updates.heading !== undefined) {
                aircraft.heading = updates.heading;
                aircraft.currentHdg = updates.heading;
                aircraft.targetHdg = updates.heading;
                aircraft.prevHdg = updates.heading;
            }
            if (updates.speed !== undefined) aircraft.speed = updates.speed;

            // Update callsign if changed
            if (updates.callsign !== undefined && aircraft.labelEntity) {
                aircraft.callsign = updates.callsign;
                aircraft.labelEntity.label.text = updates.callsign;
            }
        }
    }

    /**
     * Update aircraft model (when type changes)
     */
    updateAircraftModel(id, newType) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft || !aircraft.entity) return;

        const modelUri = this.modelManager.getModelUri(newType);
        const modelScale = this.modelManager.getModelScale(newType);

        aircraft.type = newType;
        aircraft.aircraftName = this.modelManager.getAircraftName(newType);

        // Update model properties
        aircraft.entity.model.uri = modelUri;
        aircraft.entity.model.scale = modelScale;
    }

    /**
     * Remove an aircraft from the scene
     */
    removeAircraft(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        // Remove entities
        if (aircraft.entity) {
            this.dataSource.entities.remove(aircraft.entity);
        }
        if (aircraft.labelEntity) {
            this.dataSource.entities.remove(aircraft.labelEntity);
        }

        this.aircraft.delete(id);
        this.updateAircraftList();
    }

    /**
     * Get aircraft by ID
     */
    getAircraft(id) {
        return this.aircraft.get(id) || null;
    }

    /**
     * Find aircraft by callsign
     */
    findByCallsign(callsign) {
        for (const aircraft of this.aircraft.values()) {
            if (aircraft.callsign === callsign) {
                return aircraft;
            }
        }
        return null;
    }

    /**
     * Update aircraft position by callsign
     */
    updateAircraftPosition(callsign, updates) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.updateAircraft(aircraft.id, updates);
        }
    }

    /**
     * Remove aircraft by callsign
     */
    removeByCallsign(callsign) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.removeAircraft(aircraft.id);
        }
    }

    /**
     * Get all aircraft
     */
    getAllAircraft() {
        return Array.from(this.aircraft.values());
    }

    /**
     * Clear all aircraft
     */
    clearAll() {
        for (const aircraft of this.aircraft.values()) {
            if (aircraft.entity) {
                this.dataSource.entities.remove(aircraft.entity);
            }
            if (aircraft.labelEntity) {
                this.dataSource.entities.remove(aircraft.labelEntity);
            }
        }
        this.aircraft.clear();
        this.updateAircraftList();
    }

    /**
     * Focus camera on an aircraft
     */
    focusOn(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        const headingRad = Cesium.Math.toRadians(aircraft.heading);

        // Position camera behind and above the aircraft
        const offsetDistance = 300; // meters behind
        const offsetLat = aircraft.lat - (offsetDistance / 111000) * Math.cos(headingRad);
        const offsetLon = aircraft.lon - (offsetDistance / (111000 * Math.cos(Cesium.Math.toRadians(aircraft.lat)))) * Math.sin(headingRad);

        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                offsetLon,
                offsetLat,
                aircraft.altitude + 100
            ),
            orientation: {
                heading: headingRad,
                pitch: Cesium.Math.toRadians(-25),
                roll: 0
            },
            duration: 1.5
        });
    }

    /**
     * Toggle aircraft labels visibility
     */
    setLabelsVisible(visible) {
        for (const aircraft of this.aircraft.values()) {
            if (aircraft.labelEntity) {
                aircraft.labelEntity.show = visible;
            }
        }
    }

    /**
     * Get aircraft count
     */
    getCount() {
        return this.aircraft.size;
    }

    /**
     * Update the aircraft list in the UI
     */
    updateAircraftList() {
        const listEl = document.getElementById('aircraft-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        this.aircraft.forEach((ac, id) => {
            if (ac.isVatsim) return; // Don't show VATSIM aircraft in manual list

            const item = document.createElement('div');
            item.className = 'aircraft-item';

            const airlineText = ac.airlineInfo ? ` (${ac.airlineInfo.name})` : '';

            item.innerHTML = `
                <div>
                    <span class="callsign">${ac.callsign}</span>
                    <span class="type">${ac.type}</span>
                </div>
                <div class="actions">
                    <button class="btn-small" onclick="window.app.aircraftManager.focusOn('${id}')" title="Focus">O</button>
                    <button class="btn-small" onclick="window.Modals.editAircraft('${id}')" title="Edit">E</button>
                    <button class="btn-small remove" onclick="window.app.aircraftManager.removeAircraft('${id}')" title="Remove">X</button>
                </div>
            `;
            listEl.appendChild(item);
        });
    }
}

window.AircraftManager = AircraftManager;
