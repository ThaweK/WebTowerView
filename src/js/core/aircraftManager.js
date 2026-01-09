/**
 * Aircraft Manager
 * Manages aircraft entities in the scene
 */

class AircraftManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.aircraft = new Map();
        this.dataSource = new Cesium.CustomDataSource('aircraft');
        viewer.dataSources.add(this.dataSource);

        this.nextId = 1;
    }

    /**
     * Add an aircraft
     * @param {Object} options
     * @returns {string} Aircraft ID
     */
    addAircraft(options) {
        const {
            callsign = `AC${this.nextId}`,
            type = 'A320',
            lat,
            lon,
            altitude = 0,  // AGL
            heading = 0,
            speed = 0,  // knots, for future animation
            isVatsim = false
        } = options;

        // Check if aircraft with this callsign exists (for VATSIM)
        const existing = this.findByCallsign(callsign);
        if (existing) {
            this.updateAircraft(existing.id, { lat, lon, altitude, heading, speed });
            return existing.id;
        }

        const id = `aircraft_${this.nextId++}`;
        const typeInfo = Config.aircraft.types[type] || Config.aircraft.types['A320'];

        // Create aircraft entity with a simple 3D model representation
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
        const headingRad = Cesium.Math.toRadians(heading);
        const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

        // Create a simple aircraft representation using primitives
        const entity = this.dataSource.entities.add({
            id: id,
            name: callsign,
            position: position,
            orientation: orientation,

            // Aircraft body (box approximation)
            box: {
                dimensions: new Cesium.Cartesian3(
                    typeInfo.wingspan,
                    typeInfo.length,
                    typeInfo.length * 0.15
                ),
                material: Cesium.Color.WHITE.withAlpha(0.9),
                outline: true,
                outlineColor: Cesium.Color.GRAY
            },

            // Label
            label: {
                text: callsign,
                font: '14px monospace',
                fillColor: Cesium.Color.fromCssColorString(Config.aircraft.labelColor),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },

            properties: {
                callsign: callsign,
                type: type,
                typeName: typeInfo.name,
                heading: heading,
                speed: speed,
                altitude: altitude
            }
        });

        // Store aircraft data with interpolation state
        const aircraftData = {
            id,
            entity,
            callsign,
            type,
            typeInfo,
            // Current position (for rendering)
            lat,
            lon,
            altitude,
            heading,
            speed,
            // Target position (for interpolation)
            targetLat: lat,
            targetLon: lon,
            targetAlt: altitude,
            targetHdg: heading,
            // Last update time
            lastUpdate: Date.now(),
            isVatsim: isVatsim
        };

        this.aircraft.set(id, aircraftData);

        // For VATSIM aircraft, use callback property for smooth interpolation
        if (isVatsim) {
            this.setupSmoothPosition(aircraftData);
        }

        // Update UI
        this.updateAircraftList();

        return id;
    }

    /**
     * Setup smooth position interpolation using CallbackProperty
     */
    setupSmoothPosition(aircraft) {
        const self = this;

        // Position callback - interpolates toward target
        aircraft.entity.position = new Cesium.CallbackProperty(() => {
            return Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude
            );
        }, false);

        // Orientation callback - interpolates toward target heading
        aircraft.entity.orientation = new Cesium.CallbackProperty(() => {
            const position = Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude
            );
            const headingRad = Cesium.Math.toRadians(aircraft.heading);
            const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
            return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        }, false);
    }

    /**
     * Update aircraft position/heading
     * @param {string} id
     * @param {Object} updates
     */
    updateAircraft(id, updates) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        // For VATSIM aircraft, update targets and smoothly interpolate
        if (aircraft.isVatsim) {
            // Set targets
            if (updates.lat !== undefined) aircraft.targetLat = updates.lat;
            if (updates.lon !== undefined) aircraft.targetLon = updates.lon;
            if (updates.altitude !== undefined) aircraft.targetAlt = updates.altitude;
            if (updates.heading !== undefined) aircraft.targetHdg = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;

            // Smoothly interpolate current position toward target
            const lerpFactor = 0.15; // Smoothing factor (0-1, higher = faster)

            aircraft.lat = this.lerp(aircraft.lat, aircraft.targetLat, lerpFactor);
            aircraft.lon = this.lerp(aircraft.lon, aircraft.targetLon, lerpFactor);
            aircraft.altitude = this.lerp(aircraft.altitude, aircraft.targetAlt, lerpFactor);
            aircraft.heading = this.lerpAngle(aircraft.heading, aircraft.targetHdg, lerpFactor);

            // Update properties
            aircraft.entity.properties.heading = aircraft.heading;
            aircraft.entity.properties.altitude = aircraft.altitude;
            aircraft.entity.properties.speed = aircraft.speed;
        } else {
            // For manual aircraft, update directly
            if (updates.lat !== undefined) aircraft.lat = updates.lat;
            if (updates.lon !== undefined) aircraft.lon = updates.lon;
            if (updates.altitude !== undefined) aircraft.altitude = updates.altitude;
            if (updates.heading !== undefined) aircraft.heading = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;
            if (updates.callsign !== undefined) {
                aircraft.callsign = updates.callsign;
                aircraft.entity.name = updates.callsign;
                aircraft.entity.label.text = updates.callsign;
            }

            // Update entity position directly
            const position = Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude
            );
            aircraft.entity.position = position;

            // Update orientation
            const headingRad = Cesium.Math.toRadians(aircraft.heading);
            const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
            aircraft.entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

            // Update properties
            aircraft.entity.properties.heading = aircraft.heading;
            aircraft.entity.properties.altitude = aircraft.altitude;
            aircraft.entity.properties.speed = aircraft.speed;
        }
    }

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Angle interpolation (handles wraparound)
     */
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return ((a + diff * t) + 360) % 360;
    }

    /**
     * Remove aircraft
     * @param {string} id
     */
    removeAircraft(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        this.dataSource.entities.remove(aircraft.entity);
        this.aircraft.delete(id);

        this.updateAircraftList();
    }

    /**
     * Get aircraft by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getAircraft(id) {
        return this.aircraft.get(id) || null;
    }

    /**
     * Find aircraft by callsign
     * @param {string} callsign
     * @returns {Object|null}
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
     * Update aircraft position by callsign (for VATSIM)
     * @param {string} callsign
     * @param {Object} updates
     */
    updateAircraftPosition(callsign, updates) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.updateAircraft(aircraft.id, updates);
        }
    }

    /**
     * Remove aircraft by callsign
     * @param {string} callsign
     */
    removeByCallsign(callsign) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.removeAircraft(aircraft.id);
        }
    }

    /**
     * Get all aircraft
     * @returns {Array}
     */
    getAllAircraft() {
        return Array.from(this.aircraft.values());
    }

    /**
     * Clear all aircraft
     */
    clearAll() {
        this.dataSource.entities.removeAll();
        this.aircraft.clear();
        this.updateAircraftList();
    }

    /**
     * Focus camera on aircraft
     * @param {string} id
     */
    focusOn(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        this.viewer.flyTo(aircraft.entity, {
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(aircraft.heading + 180),
                Cesium.Math.toRadians(-30),
                500
            )
        });
    }

    /**
     * Update aircraft list in UI
     */
    updateAircraftList() {
        const listEl = document.getElementById('aircraft-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        this.aircraft.forEach((ac, id) => {
            const item = document.createElement('div');
            item.className = 'aircraft-item';
            item.innerHTML = `
                <div>
                    <span class="callsign">${ac.callsign}</span>
                    <span class="type">${ac.type}</span>
                </div>
                <div class="actions">
                    <button class="btn-small" onclick="window.app.aircraftManager.focusOn('${id}')" title="Focus">👁</button>
                    <button class="btn-small" onclick="window.Modals.editAircraft('${id}')" title="Edit">✏</button>
                    <button class="btn-small remove" onclick="window.app.aircraftManager.removeAircraft('${id}')" title="Remove">×</button>
                </div>
            `;
            listEl.appendChild(item);
        });
    }

    /**
     * Move aircraft along a path (for animation)
     * @param {string} id
     * @param {Array} waypoints - Array of {lat, lon, alt, heading}
     * @param {number} duration - Duration in seconds
     */
    animateAlong(id, waypoints, duration) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft || waypoints.length < 2) return;

        const startTime = Cesium.JulianDate.now();
        const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

        // Create sampled position property
        const positionProperty = new Cesium.SampledPositionProperty();
        const orientationProperty = new Cesium.SampledProperty(Cesium.Quaternion);

        const timeStep = duration / (waypoints.length - 1);

        waypoints.forEach((wp, i) => {
            const time = Cesium.JulianDate.addSeconds(startTime, i * timeStep, new Cesium.JulianDate());
            const position = Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt || 0);

            positionProperty.addSample(time, position);

            const heading = wp.heading !== undefined ? wp.heading :
                (i < waypoints.length - 1 ?
                    Coordinates.bearing(wp.lat, wp.lon, waypoints[i + 1].lat, waypoints[i + 1].lon) :
                    waypoints[i - 1] ? Coordinates.bearing(waypoints[i - 1].lat, waypoints[i - 1].lon, wp.lat, wp.lon) : 0);

            const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0);
            const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            orientationProperty.addSample(time, orientation);
        });

        aircraft.entity.position = positionProperty;
        aircraft.entity.orientation = orientationProperty;

        // Set interpolation
        positionProperty.setInterpolationOptions({
            interpolationDegree: 2,
            interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
        });
    }
}

// Make available globally
window.AircraftManager = AircraftManager;
