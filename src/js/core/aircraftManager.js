/**
 * Aircraft Manager - Advanced 3D Aircraft Rendering
 * Creates realistic 3D aircraft models using Cesium primitives
 */

class AircraftManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.aircraft = new Map();
        this.dataSource = new Cesium.CustomDataSource('aircraft');
        viewer.dataSources.add(this.dataSource);

        // Primitive collection for 3D aircraft models
        this.primitiveCollection = new Cesium.PrimitiveCollection();
        viewer.scene.primitives.add(this.primitiveCollection);

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
    }

    /**
     * Get airline colors from callsign
     */
    getAirlineColors(callsign) {
        const prefix = callsign.substring(0, 3).toUpperCase();
        return this.airlineColors[prefix] || this.airlineColors['default'];
    }

    /**
     * Create 3D aircraft model geometry
     */
    create3DAircraftModel(typeInfo, colors) {
        const scale = typeInfo.length / 40; // Normalize to A320 size
        const instances = [];

        // Aircraft dimensions (scaled)
        const fuselageLength = typeInfo.length;
        const fuselageRadius = typeInfo.length * 0.08;
        const wingspan = typeInfo.wingspan;
        const wingChord = typeInfo.length * 0.15;
        const wingThickness = fuselageRadius * 0.15;
        const tailHeight = typeInfo.length * 0.2;
        const engineRadius = fuselageRadius * 0.4;
        const engineLength = typeInfo.length * 0.12;

        // Fuselage (main body) - elongated cylinder approximation using box
        instances.push({
            type: 'fuselage',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-fuselageRadius, -fuselageLength / 2, -fuselageRadius),
                maximum: new Cesium.Cartesian3(fuselageRadius, fuselageLength / 2, fuselageRadius)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage)
        });

        // Nose cone
        instances.push({
            type: 'nose',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-fuselageRadius * 0.7, fuselageLength / 2, -fuselageRadius * 0.7),
                maximum: new Cesium.Cartesian3(fuselageRadius * 0.7, fuselageLength / 2 + fuselageLength * 0.08, fuselageRadius * 0.7)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.1, new Cesium.Color())
        });

        // Cockpit windows (dark strip)
        instances.push({
            type: 'cockpit',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-fuselageRadius * 0.6, fuselageLength * 0.38, fuselageRadius * 0.3),
                maximum: new Cesium.Cartesian3(fuselageRadius * 0.6, fuselageLength * 0.48, fuselageRadius * 1.01)
            }),
            color: Cesium.Color.fromCssColorString('#1a1a2e')
        });

        // Main wings (left and right)
        const wingOffsetY = -fuselageLength * 0.05;

        // Left wing
        instances.push({
            type: 'wing_left',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-wingspan / 2, wingOffsetY - wingChord / 2, -wingThickness / 2),
                maximum: new Cesium.Cartesian3(-fuselageRadius, wingOffsetY + wingChord / 2, wingThickness / 2)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color())
        });

        // Right wing
        instances.push({
            type: 'wing_right',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(fuselageRadius, wingOffsetY - wingChord / 2, -wingThickness / 2),
                maximum: new Cesium.Cartesian3(wingspan / 2, wingOffsetY + wingChord / 2, wingThickness / 2)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color())
        });

        // Winglets (if modern aircraft)
        const wingletHeight = fuselageRadius * 0.8;
        instances.push({
            type: 'winglet_left',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-wingspan / 2 - wingThickness, wingOffsetY - wingChord * 0.3, 0),
                maximum: new Cesium.Cartesian3(-wingspan / 2, wingOffsetY + wingChord * 0.1, wingletHeight)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage)
        });

        instances.push({
            type: 'winglet_right',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(wingspan / 2, wingOffsetY - wingChord * 0.3, 0),
                maximum: new Cesium.Cartesian3(wingspan / 2 + wingThickness, wingOffsetY + wingChord * 0.1, wingletHeight)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage)
        });

        // Vertical stabilizer (tail fin)
        instances.push({
            type: 'vertical_stabilizer',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-wingThickness / 2, -fuselageLength / 2 + fuselageLength * 0.05, fuselageRadius * 0.5),
                maximum: new Cesium.Cartesian3(wingThickness / 2, -fuselageLength / 2 + fuselageLength * 0.2, fuselageRadius + tailHeight)
            }),
            color: Cesium.Color.fromCssColorString(colors.tail)
        });

        // Horizontal stabilizers
        const hstabSpan = wingspan * 0.3;
        const hstabChord = wingChord * 0.5;

        instances.push({
            type: 'horizontal_stabilizer',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-hstabSpan / 2, -fuselageLength / 2, fuselageRadius * 0.6),
                maximum: new Cesium.Cartesian3(hstabSpan / 2, -fuselageLength / 2 + hstabChord, fuselageRadius * 0.7)
            }),
            color: Cesium.Color.fromCssColorString(colors.fuselage).darken(0.05, new Cesium.Color())
        });

        // Engines (under wings for most jets)
        const engineOffsetX = wingspan * 0.25;
        const engineOffsetY = wingOffsetY + wingChord * 0.2;
        const engineOffsetZ = -fuselageRadius * 0.8;

        // Left engine
        instances.push({
            type: 'engine_left',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-engineOffsetX - engineRadius, engineOffsetY - engineLength / 2, engineOffsetZ - engineRadius),
                maximum: new Cesium.Cartesian3(-engineOffsetX + engineRadius, engineOffsetY + engineLength / 2, engineOffsetZ + engineRadius)
            }),
            color: Cesium.Color.fromCssColorString('#404040')
        });

        // Left engine intake (darker)
        instances.push({
            type: 'engine_intake_left',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-engineOffsetX - engineRadius * 1.1, engineOffsetY + engineLength / 2, engineOffsetZ - engineRadius * 1.1),
                maximum: new Cesium.Cartesian3(-engineOffsetX + engineRadius * 1.1, engineOffsetY + engineLength / 2 + engineLength * 0.1, engineOffsetZ + engineRadius * 1.1)
            }),
            color: Cesium.Color.fromCssColorString('#1a1a1a')
        });

        // Right engine
        instances.push({
            type: 'engine_right',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(engineOffsetX - engineRadius, engineOffsetY - engineLength / 2, engineOffsetZ - engineRadius),
                maximum: new Cesium.Cartesian3(engineOffsetX + engineRadius, engineOffsetY + engineLength / 2, engineOffsetZ + engineRadius)
            }),
            color: Cesium.Color.fromCssColorString('#404040')
        });

        // Right engine intake
        instances.push({
            type: 'engine_intake_right',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(engineOffsetX - engineRadius * 1.1, engineOffsetY + engineLength / 2, engineOffsetZ - engineRadius * 1.1),
                maximum: new Cesium.Cartesian3(engineOffsetX + engineRadius * 1.1, engineOffsetY + engineLength / 2 + engineLength * 0.1, engineOffsetZ + engineRadius * 1.1)
            }),
            color: Cesium.Color.fromCssColorString('#1a1a1a')
        });

        // Landing gear (simplified)
        const gearHeight = fuselageRadius * 0.6;

        // Nose gear
        instances.push({
            type: 'nose_gear',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-wingThickness, fuselageLength * 0.3, -fuselageRadius - gearHeight),
                maximum: new Cesium.Cartesian3(wingThickness, fuselageLength * 0.35, -fuselageRadius)
            }),
            color: Cesium.Color.fromCssColorString('#2a2a2a')
        });

        // Main gear left
        instances.push({
            type: 'main_gear_left',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-fuselageRadius * 1.5, wingOffsetY - wingChord * 0.2, -fuselageRadius - gearHeight),
                maximum: new Cesium.Cartesian3(-fuselageRadius * 0.8, wingOffsetY, -fuselageRadius)
            }),
            color: Cesium.Color.fromCssColorString('#2a2a2a')
        });

        // Main gear right
        instances.push({
            type: 'main_gear_right',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(fuselageRadius * 0.8, wingOffsetY - wingChord * 0.2, -fuselageRadius - gearHeight),
                maximum: new Cesium.Cartesian3(fuselageRadius * 1.5, wingOffsetY, -fuselageRadius)
            }),
            color: Cesium.Color.fromCssColorString('#2a2a2a')
        });

        // Accent stripe on fuselage
        instances.push({
            type: 'accent_stripe',
            geometry: new Cesium.BoxGeometry({
                minimum: new Cesium.Cartesian3(-fuselageRadius * 1.01, -fuselageLength * 0.3, fuselageRadius * 0.2),
                maximum: new Cesium.Cartesian3(fuselageRadius * 1.01, fuselageLength * 0.35, fuselageRadius * 0.35)
            }),
            color: Cesium.Color.fromCssColorString(colors.accent)
        });

        return instances;
    }

    /**
     * Create primitive instances for aircraft
     */
    createAircraftPrimitives(id, typeInfo, colors, position, heading) {
        const modelParts = this.create3DAircraftModel(typeInfo, colors);
        const primitives = [];

        const headingRad = Cesium.Math.toRadians(heading - 90); // Adjust for aircraft pointing forward
        const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
            position,
            new Cesium.HeadingPitchRoll(headingRad, 0, 0)
        );

        for (const part of modelParts) {
            const primitive = new Cesium.Primitive({
                geometryInstances: new Cesium.GeometryInstance({
                    geometry: part.geometry,
                    modelMatrix: modelMatrix,
                    attributes: {
                        color: Cesium.ColorGeometryInstanceAttribute.fromColor(part.color)
                    },
                    id: `${id}_${part.type}`
                }),
                appearance: new Cesium.PerInstanceColorAppearance({
                    flat: false,
                    translucent: false
                }),
                asynchronous: false
            });
            primitives.push(primitive);
            this.primitiveCollection.add(primitive);
        }

        return primitives;
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

        const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);

        // Create 3D primitives
        const primitives = this.createAircraftPrimitives(id, typeInfo, colors, position, heading);

        // Create label entity
        const labelEntity = this.dataSource.entities.add({
            id: `${id}_label`,
            name: callsign,
            position: position,
            label: {
                text: callsign,
                font: 'bold 14px monospace',
                fillColor: Cesium.Color.fromCssColorString(Config.aircraft.labelColor),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -30),
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scale: 1.0
            }
        });

        const aircraftData = {
            id,
            primitives,
            labelEntity,
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
            isVatsim: isVatsim
        };

        this.aircraft.set(id, aircraftData);

        if (isVatsim) {
            this.setupSmoothPosition(aircraftData);
        }

        this.updateAircraftList();
        return id;
    }

    /**
     * Setup smooth position interpolation
     */
    setupSmoothPosition(aircraft) {
        aircraft.labelEntity.position = new Cesium.CallbackProperty(() => {
            return Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude + 15 // Offset label above aircraft
            );
        }, false);
    }

    /**
     * Update aircraft 3D model position and rotation
     */
    updateAircraftModel(aircraft) {
        const position = Cesium.Cartesian3.fromDegrees(
            aircraft.lon,
            aircraft.lat,
            aircraft.altitude
        );

        const headingRad = Cesium.Math.toRadians(aircraft.heading - 90);
        const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
            position,
            new Cesium.HeadingPitchRoll(headingRad, 0, 0)
        );

        // Remove old primitives
        for (const primitive of aircraft.primitives) {
            this.primitiveCollection.remove(primitive);
        }

        // Create new primitives at updated position
        aircraft.primitives = this.createAircraftPrimitives(
            aircraft.id,
            aircraft.typeInfo,
            aircraft.colors,
            position,
            aircraft.heading
        );
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

            const lerpFactor = 0.15;

            aircraft.lat = this.lerp(aircraft.lat, aircraft.targetLat, lerpFactor);
            aircraft.lon = this.lerp(aircraft.lon, aircraft.targetLon, lerpFactor);
            aircraft.altitude = this.lerp(aircraft.altitude, aircraft.targetAlt, lerpFactor);
            aircraft.heading = this.lerpAngle(aircraft.heading, aircraft.targetHdg, lerpFactor);

            // Update 3D model
            this.updateAircraftModel(aircraft);
        } else {
            if (updates.lat !== undefined) aircraft.lat = updates.lat;
            if (updates.lon !== undefined) aircraft.lon = updates.lon;
            if (updates.altitude !== undefined) aircraft.altitude = updates.altitude;
            if (updates.heading !== undefined) aircraft.heading = updates.heading;
            if (updates.speed !== undefined) aircraft.speed = updates.speed;
            if (updates.callsign !== undefined) {
                aircraft.callsign = updates.callsign;
                aircraft.labelEntity.name = updates.callsign;
                aircraft.labelEntity.label.text = updates.callsign;
            }

            const position = Cesium.Cartesian3.fromDegrees(
                aircraft.lon,
                aircraft.lat,
                aircraft.altitude + 15
            );
            aircraft.labelEntity.position = position;

            this.updateAircraftModel(aircraft);
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

        // Remove 3D primitives
        for (const primitive of aircraft.primitives) {
            this.primitiveCollection.remove(primitive);
        }

        // Remove label
        this.dataSource.entities.remove(aircraft.labelEntity);
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
            for (const primitive of aircraft.primitives) {
                this.primitiveCollection.remove(primitive);
            }
        }
        this.dataSource.entities.removeAll();
        this.aircraft.clear();
        this.updateAircraftList();
    }

    focusOn(id) {
        const aircraft = this.aircraft.get(id);
        if (!aircraft) return;

        const position = Cesium.Cartesian3.fromDegrees(
            aircraft.lon,
            aircraft.lat,
            aircraft.altitude
        );

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
