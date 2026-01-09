/**
 * Aircraft Manager - Advanced 3D Aircraft Rendering
 * Creates realistic 3D aircraft models using Cesium entities with proper terrain sync
 */

class AircraftManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.aircraft = new Map();
        this.dataSource = new Cesium.CustomDataSource('aircraft');
        viewer.dataSources.add(this.dataSource);

        this.nextId = 1;

        // Aircraft color schemes by airline prefix
        this.airlineColors = {
            'LOT': { fuselage: '#FFFFFF', tail: '#003366', accent: '#DC0032' },
            'RYR': { fuselage: '#003366', tail: '#F7C82E', accent: '#F7C82E' },
            'WZZ': { fuselage: '#E20074', tail: '#E20074', accent: '#FFFFFF' },
            'DLH': { fuselage: '#FFFFFF', tail: '#0A1F44', accent: '#F0AB00' },
            'BAW': { fuselage: '#FFFFFF', tail: '#BA0C2F', accent: '#012169' },
            'AFR': { fuselage: '#FFFFFF', tail: '#002157', accent: '#ED1B2E' },
            'UAE': { fuselage: '#FFFFFF', tail: '#D4A855', accent: '#007D4A' },
            'AAL': { fuselage: '#C6C6C6', tail: '#0078D2', accent: '#BF0D3E' },
            'UAL': { fuselage: '#FFFFFF', tail: '#002244', accent: '#00AEEF' },
            'SWA': { fuselage: '#304CB2', tail: '#FFBF27', accent: '#FF0000' },
            'default': { fuselage: '#FFFFFF', tail: '#333333', accent: '#FF6600' }
        };

        // Setup render loop for smooth updates
        this.setupRenderLoop();
    }

    /**
     * Setup render loop for synchronized position updates
     */
    setupRenderLoop() {
        this.viewer.scene.preRender.addEventListener(() => {
            // Update all VATSIM aircraft positions smoothly
            for (const aircraft of this.aircraft.values()) {
                if (aircraft.isVatsim && aircraft.needsUpdate) {
                    this.updateEntityPositions(aircraft);
                }
            }
        });
    }

    /**
     * Get airline colors from callsign
     */
    getAirlineColors(callsign) {
        const prefix = callsign.substring(0, 3).toUpperCase();
        return this.airlineColors[prefix] || this.airlineColors['default'];
    }

    /**
     * Create 3D aircraft model using multiple entities
     */
    createAircraftEntities(id, typeInfo, colors, lat, lon, altitude, heading) {
        const entities = [];

        // Aircraft dimensions
        const fuselageLength = typeInfo.length;
        const fuselageRadius = typeInfo.length * 0.08;
        const wingspan = typeInfo.wingspan;
        const wingChord = typeInfo.length * 0.15;
        const wingThickness = fuselageRadius * 0.15;
        const tailHeight = typeInfo.length * 0.2;
        const engineRadius = fuselageRadius * 0.4;
        const engineLength = typeInfo.length * 0.12;

        // Position callback for synchronized updates
        const createPositionCallback = (offsetX, offsetY, offsetZ) => {
            return new Cesium.CallbackProperty((time, result) => {
                const aircraft = this.aircraft.get(id);
                if (!aircraft) return Cesium.Cartesian3.ZERO;

                const basePosition = Cesium.Cartesian3.fromDegrees(
                    aircraft.lon, aircraft.lat, aircraft.altitude
                );

                // Apply local offset based on heading
                // Heading is clockwise from North: 0=N, 90=E, 180=S, 270=W
                const headingRad = Cesium.Math.toRadians(aircraft.heading);
                // Rotate offset to ENU coordinates: offsetY=forward (nose), offsetX=right
                const rotatedX = offsetX * Math.cos(headingRad) + offsetY * Math.sin(headingRad);
                const rotatedY = -offsetX * Math.sin(headingRad) + offsetY * Math.cos(headingRad);

                const transform = Cesium.Transforms.eastNorthUpToFixedFrame(basePosition);
                const localOffset = new Cesium.Cartesian3(rotatedX, rotatedY, offsetZ);

                return Cesium.Matrix4.multiplyByPoint(transform, localOffset, result || new Cesium.Cartesian3());
            }, false);
        };

        // Orientation callback
        const createOrientationCallback = () => {
            return new Cesium.CallbackProperty(() => {
                const aircraft = this.aircraft.get(id);
                if (!aircraft) return Cesium.Quaternion.IDENTITY;

                const position = Cesium.Cartesian3.fromDegrees(
                    aircraft.lon, aircraft.lat, aircraft.altitude
                );
                // Cesium HeadingPitchRoll: heading 0 = North, positive = clockwise
                const headingRad = Cesium.Math.toRadians(aircraft.heading);
                const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
                return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            }, false);
        };

        const orientation = createOrientationCallback();

        // Fuselage (main body)
        entities.push(this.dataSource.entities.add({
            id: `${id}_fuselage`,
            position: createPositionCallback(0, 0, 0),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(fuselageRadius * 2, fuselageLength, fuselageRadius * 2),
                material: Cesium.Color.fromCssColorString(colors.fuselage),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.3, new Cesium.Color()),
                outlineWidth: 1
            }
        }));

        // Nose cone
        entities.push(this.dataSource.entities.add({
            id: `${id}_nose`,
            position: createPositionCallback(0, fuselageLength / 2 + fuselageLength * 0.04, 0),
            orientation: orientation,
            ellipsoid: {
                radii: new Cesium.Cartesian3(fuselageRadius * 0.8, fuselageLength * 0.08, fuselageRadius * 0.8),
                material: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.1, new Cesium.Color())
            }
        }));

        // Cockpit windows
        entities.push(this.dataSource.entities.add({
            id: `${id}_cockpit`,
            position: createPositionCallback(0, fuselageLength * 0.4, fuselageRadius * 0.7),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(fuselageRadius * 1.2, fuselageLength * 0.1, fuselageRadius * 0.4),
                material: Cesium.Color.fromCssColorString('#1a1a2e')
            }
        }));

        // Left wing
        const wingOffsetY = -fuselageLength * 0.05;
        entities.push(this.dataSource.entities.add({
            id: `${id}_wing_left`,
            position: createPositionCallback(-wingspan / 4 - fuselageRadius / 2, wingOffsetY, 0),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(wingspan / 2 - fuselageRadius, wingChord, wingThickness),
                material: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color()),
                outline: true,
                outlineColor: Cesium.Color.GRAY
            }
        }));

        // Right wing
        entities.push(this.dataSource.entities.add({
            id: `${id}_wing_right`,
            position: createPositionCallback(wingspan / 4 + fuselageRadius / 2, wingOffsetY, 0),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(wingspan / 2 - fuselageRadius, wingChord, wingThickness),
                material: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color()),
                outline: true,
                outlineColor: Cesium.Color.GRAY
            }
        }));

        // Left winglet
        entities.push(this.dataSource.entities.add({
            id: `${id}_winglet_left`,
            position: createPositionCallback(-wingspan / 2, wingOffsetY, fuselageRadius * 0.4),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(wingThickness * 2, wingChord * 0.4, fuselageRadius * 0.8),
                material: Cesium.Color.fromCssColorString(colors.fuselage)
            }
        }));

        // Right winglet
        entities.push(this.dataSource.entities.add({
            id: `${id}_winglet_right`,
            position: createPositionCallback(wingspan / 2, wingOffsetY, fuselageRadius * 0.4),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(wingThickness * 2, wingChord * 0.4, fuselageRadius * 0.8),
                material: Cesium.Color.fromCssColorString(colors.fuselage)
            }
        }));

        // Vertical stabilizer (tail fin)
        entities.push(this.dataSource.entities.add({
            id: `${id}_vertical_stab`,
            position: createPositionCallback(0, -fuselageLength / 2 + fuselageLength * 0.1, fuselageRadius + tailHeight / 2),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(wingThickness, fuselageLength * 0.15, tailHeight),
                material: Cesium.Color.fromCssColorString(colors.tail),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(colors.tail).darken(0.2, new Cesium.Color())
            }
        }));

        // Horizontal stabilizers
        const hstabSpan = wingspan * 0.3;
        entities.push(this.dataSource.entities.add({
            id: `${id}_horizontal_stab`,
            position: createPositionCallback(0, -fuselageLength / 2 + fuselageLength * 0.05, fuselageRadius * 0.7),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(hstabSpan, wingChord * 0.5, wingThickness),
                material: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color())
            }
        }));

        // Left engine
        const engineOffsetX = wingspan * 0.25;
        const engineOffsetY = wingOffsetY + wingChord * 0.1;
        const engineOffsetZ = -fuselageRadius * 0.6;

        entities.push(this.dataSource.entities.add({
            id: `${id}_engine_left`,
            position: createPositionCallback(-engineOffsetX, engineOffsetY, engineOffsetZ),
            orientation: orientation,
            cylinder: {
                length: engineLength,
                topRadius: engineRadius,
                bottomRadius: engineRadius * 0.9,
                material: Cesium.Color.fromCssColorString('#404040')
            }
        }));

        // Left engine intake
        entities.push(this.dataSource.entities.add({
            id: `${id}_intake_left`,
            position: createPositionCallback(-engineOffsetX, engineOffsetY + engineLength / 2, engineOffsetZ),
            orientation: orientation,
            cylinder: {
                length: engineLength * 0.15,
                topRadius: engineRadius * 1.1,
                bottomRadius: engineRadius * 1.1,
                material: Cesium.Color.fromCssColorString('#1a1a1a')
            }
        }));

        // Right engine
        entities.push(this.dataSource.entities.add({
            id: `${id}_engine_right`,
            position: createPositionCallback(engineOffsetX, engineOffsetY, engineOffsetZ),
            orientation: orientation,
            cylinder: {
                length: engineLength,
                topRadius: engineRadius,
                bottomRadius: engineRadius * 0.9,
                material: Cesium.Color.fromCssColorString('#404040')
            }
        }));

        // Right engine intake
        entities.push(this.dataSource.entities.add({
            id: `${id}_intake_right`,
            position: createPositionCallback(engineOffsetX, engineOffsetY + engineLength / 2, engineOffsetZ),
            orientation: orientation,
            cylinder: {
                length: engineLength * 0.15,
                topRadius: engineRadius * 1.1,
                bottomRadius: engineRadius * 1.1,
                material: Cesium.Color.fromCssColorString('#1a1a1a')
            }
        }));

        // Accent stripe
        entities.push(this.dataSource.entities.add({
            id: `${id}_stripe`,
            position: createPositionCallback(0, 0, fuselageRadius * 0.3),
            orientation: orientation,
            box: {
                dimensions: new Cesium.Cartesian3(fuselageRadius * 2.02, fuselageLength * 0.6, fuselageRadius * 0.15),
                material: Cesium.Color.fromCssColorString(colors.accent)
            }
        }));

        // Label
        entities.push(this.dataSource.entities.add({
            id: `${id}_label`,
            position: createPositionCallback(0, 0, fuselageRadius * 2 + 10),
            label: {
                text: this.aircraft.get(id)?.callsign || id,
                font: 'bold 14px monospace',
                fillColor: Cesium.Color.fromCssColorString(Config.aircraft.labelColor),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -5),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scale: 1.0
            }
        }));

        return entities;
    }

    /**
     * Add an aircraft
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

        const existing = this.findByCallsign(callsign);
        if (existing) {
            this.updateAircraft(existing.id, { lat, lon, altitude, heading, speed });
            return existing.id;
        }

        const id = `aircraft_${this.nextId++}`;
        const typeInfo = Config.aircraft.types[type] || Config.aircraft.types['A320'];
        const colors = this.getAirlineColors(callsign);

        // Store aircraft data first (needed for position callbacks)
        const aircraftData = {
            id,
            entities: [],
            callsign,
            type,
            typeInfo,
            colors,
            lat,
            lon,
            altitude,
            heading,
            speed,
            targetLat: lat,
            targetLon: lon,
            targetAlt: altitude,
            targetHdg: heading,
            lastUpdate: Date.now(),
            isVatsim: isVatsim,
            needsUpdate: false
        };

        this.aircraft.set(id, aircraftData);

        // Create entities after data is stored
        aircraftData.entities = this.createAircraftEntities(id, typeInfo, colors, lat, lon, altitude, heading);

        // Update label text
        const labelEntity = aircraftData.entities.find(e => e.id === `${id}_label`);
        if (labelEntity) {
            labelEntity.label.text = callsign;
        }

        this.updateAircraftList();
        return id;
    }

    /**
     * Update entity positions (called from render loop)
     */
    updateEntityPositions(aircraft) {
        aircraft.needsUpdate = false;
        // Position callbacks automatically handle updates
    }

    /**
     * Update aircraft position/heading
     */
    updateAircraft(id, updates) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        if (aircraft.isVatsim) {
            if (updates.lat !== undefined) aircraft.targetLat = updates.lat;
            if (updates.lon !== undefined) aircraft.targetLon = updates.lon;
            if (updates.altitude !== undefined) aircraft.targetAlt = updates.altitude;
            if (updates.heading !== undefined) aircraft.targetHdg = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;

            // Smooth interpolation
            const lerpFactor = 0.15;
            aircraft.lat = this.lerp(aircraft.lat, aircraft.targetLat, lerpFactor);
            aircraft.lon = this.lerp(aircraft.lon, aircraft.targetLon, lerpFactor);
            aircraft.altitude = this.lerp(aircraft.altitude, aircraft.targetAlt, lerpFactor);
            aircraft.heading = this.lerpAngle(aircraft.heading, aircraft.targetHdg, lerpFactor);

            aircraft.needsUpdate = true;
        } else {
            if (updates.lat !== undefined) aircraft.lat = updates.lat;
            if (updates.lon !== undefined) aircraft.lon = updates.lon;
            if (updates.altitude !== undefined) aircraft.altitude = updates.altitude;
            if (updates.heading !== undefined) aircraft.heading = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;
            if (updates.callsign !== undefined) {
                aircraft.callsign = updates.callsign;
                const labelEntity = aircraft.entities.find(e => e.id.endsWith('_label'));
                if (labelEntity) {
                    labelEntity.label.text = updates.callsign;
                }
            }
        }
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return ((a + diff * t) + 360) % 360;
    }

    removeAircraft(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        // Remove all entities
        for (const entity of aircraft.entities) {
            this.dataSource.entities.remove(entity);
        }

        this.aircraft.delete(id);
        this.updateAircraftList();
    }

    getAircraft(id) {
        return this.aircraft.get(id) || null;
    }

    findByCallsign(callsign) {
        for (const aircraft of this.aircraft.values()) {
            if (aircraft.callsign === callsign) {
                return aircraft;
            }
        }
        return null;
    }

    updateAircraftPosition(callsign, updates) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.updateAircraft(aircraft.id, updates);
        }
    }

    removeByCallsign(callsign) {
        const aircraft = this.findByCallsign(callsign);
        if (aircraft) {
            this.removeAircraft(aircraft.id);
        }
    }

    getAllAircraft() {
        return Array.from(this.aircraft.values());
    }

    clearAll() {
        for (const aircraft of this.aircraft.values()) {
            for (const entity of aircraft.entities) {
                this.dataSource.entities.remove(entity);
            }
        }
        this.aircraft.clear();
        this.updateAircraftList();
    }

    focusOn(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                aircraft.lon - 0.002 * Math.sin(Cesium.Math.toRadians(aircraft.heading)),
                aircraft.lat - 0.002 * Math.cos(Cesium.Math.toRadians(aircraft.heading)),
                aircraft.altitude + 100
            ),
            orientation: {
                heading: Cesium.Math.toRadians(aircraft.heading),
                pitch: Cesium.Math.toRadians(-25),
                roll: 0
            },
            duration: 1.5
        });
    }

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
}

window.AircraftManager = AircraftManager;
