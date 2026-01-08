/**
 * Airport Overlay Manager
 * Manages custom airport objects (runways, taxiways, aprons)
 * that overlay on satellite imagery
 */

class AirportOverlay {
    constructor(viewer) {
        this.viewer = viewer;
        this.entities = [];
        this.dataSource = new Cesium.CustomDataSource('airportOverlay');
        viewer.dataSources.add(this.dataSource);

        this.visible = true;
        this.opacity = Config.overlay.defaultOpacity;
    }

    /**
     * Add a runway
     * @param {Object} options
     */
    addRunway(options) {
        const {
            name = 'RWY',
            startLat, startLon,
            endLat, endLon,
            width = 45
        } = options;

        // Create runway polygon
        const coords = Coordinates.createRunwayPolygon(
            startLat, startLon, endLat, endLon, width
        );

        const positions = [];
        coords.forEach(c => positions.push(c[0], c[1]));

        const entity = this.dataSource.entities.add({
            name: `Runway: ${name}`,
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
                material: Cesium.Color.fromCssColorString(Config.overlay.runwayColor)
                    .withAlpha(this.opacity),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(Config.overlay.runwayOutlineColor),
                outlineWidth: 2,
                height: Config.overlay.heightAboveGround,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            },
            properties: {
                type: 'runway',
                name: name,
                startLat, startLon,
                endLat, endLon,
                width
            }
        });

        // Add center line
        const centerLine = this.dataSource.entities.add({
            name: `Runway CL: ${name}`,
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    startLon, startLat, Config.overlay.heightAboveGround + 0.1,
                    endLon, endLat, Config.overlay.heightAboveGround + 0.1
                ]),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.WHITE,
                    dashLength: 30
                }),
                clampToGround: false
            }
        });

        // Add threshold markings
        this.addThresholdMarking(startLat, startLon,
            Coordinates.bearing(startLat, startLon, endLat, endLon), width);
        this.addThresholdMarking(endLat, endLon,
            Coordinates.bearing(endLat, endLon, startLat, startLon), width);

        this.entities.push({ entity, centerLine, type: 'runway', data: options });

        return entity;
    }

    /**
     * Add threshold marking
     */
    addThresholdMarking(lat, lon, heading, width) {
        // Simplified threshold - just a line
        const halfWidth = width / 2;
        const perpendicular = (heading + 90) % 360;

        const p1 = Coordinates.destinationPoint(lat, lon, perpendicular, halfWidth);
        const p2 = Coordinates.destinationPoint(lat, lon, (perpendicular + 180) % 360, halfWidth);

        this.dataSource.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    p1.lon, p1.lat, Config.overlay.heightAboveGround + 0.1,
                    p2.lon, p2.lat, Config.overlay.heightAboveGround + 0.1
                ]),
                width: 8,
                material: Cesium.Color.WHITE
            }
        });
    }

    /**
     * Add a taxiway
     * @param {Object} options
     */
    addTaxiway(options) {
        const {
            name = 'TWY',
            coordinates,  // Array of [lon, lat] pairs
            width = 23
        } = options;

        if (!coordinates || coordinates.length < 2) return null;

        // Create taxiway as a corridor
        const positions = coordinates.map(c =>
            Cesium.Cartesian3.fromDegrees(c[0], c[1], Config.overlay.heightAboveGround)
        );

        const entity = this.dataSource.entities.add({
            name: `Taxiway: ${name}`,
            corridor: {
                positions: positions,
                width: width,
                material: Cesium.Color.fromCssColorString(Config.overlay.taxiwayColor)
                    .withAlpha(this.opacity),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(Config.overlay.taxiwayOutlineColor),
                height: Config.overlay.heightAboveGround,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            },
            properties: {
                type: 'taxiway',
                name: name,
                width: width
            }
        });

        this.entities.push({ entity, type: 'taxiway', data: options });

        return entity;
    }

    /**
     * Add an apron/parking area
     * @param {Object} options
     */
    addApron(options) {
        const {
            name = 'Apron',
            coordinates  // Array of [lon, lat] pairs forming polygon
        } = options;

        if (!coordinates || coordinates.length < 3) return null;

        const positions = [];
        coordinates.forEach(c => positions.push(c[0], c[1]));

        const entity = this.dataSource.entities.add({
            name: `Apron: ${name}`,
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
                material: Cesium.Color.fromCssColorString(Config.overlay.apronColor)
                    .withAlpha(this.opacity),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(Config.overlay.apronOutlineColor),
                height: Config.overlay.heightAboveGround,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            },
            properties: {
                type: 'apron',
                name: name
            }
        });

        this.entities.push({ entity, type: 'apron', data: options });

        return entity;
    }

    /**
     * Load from GeoJSON
     * @param {Object} geojson
     */
    loadFromGeoJSON(geojson) {
        const parsed = GeoJSONLoader.parse(geojson);

        // Add runways
        parsed.runways.forEach(rwy => {
            if (rwy.geometry.type === 'Polygon') {
                const coords = rwy.geometry.coordinates[0];
                if (coords.length >= 4) {
                    // Estimate start/end from polygon
                    const center1 = [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
                    const center2 = [(coords[2][0] + coords[3][0]) / 2, (coords[2][1] + coords[3][1]) / 2];

                    this.addRunway({
                        name: rwy.name || rwy.properties.ref || 'RWY',
                        startLat: center1[1],
                        startLon: center1[0],
                        endLat: center2[1],
                        endLon: center2[0],
                        width: 45
                    });
                }
            } else if (rwy.geometry.type === 'LineString') {
                const coords = rwy.geometry.coordinates;
                this.addRunway({
                    name: rwy.name || rwy.properties.ref || 'RWY',
                    startLat: coords[0][1],
                    startLon: coords[0][0],
                    endLat: coords[coords.length - 1][1],
                    endLon: coords[coords.length - 1][0],
                    width: 45
                });
            }
        });

        // Add taxiways
        parsed.taxiways.forEach(twy => {
            if (twy.geometry.type === 'LineString') {
                this.addTaxiway({
                    name: twy.name || twy.properties.ref || 'TWY',
                    coordinates: twy.geometry.coordinates,
                    width: 23
                });
            }
        });

        // Add aprons
        parsed.aprons.forEach(apron => {
            if (apron.geometry.type === 'Polygon') {
                this.addApron({
                    name: apron.name || 'Apron',
                    coordinates: apron.geometry.coordinates[0]
                });
            }
        });

        return parsed;
    }

    /**
     * Set visibility
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.visible = visible;
        this.dataSource.show = visible;
    }

    /**
     * Set opacity
     * @param {number} opacity - 0 to 1
     */
    setOpacity(opacity) {
        this.opacity = opacity;

        this.dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                const currentColor = entity.polygon.material.getValue().color;
                entity.polygon.material = currentColor.withAlpha(opacity);
            }
            if (entity.corridor) {
                const currentColor = entity.corridor.material.getValue().color;
                entity.corridor.material = currentColor.withAlpha(opacity);
            }
        });
    }

    /**
     * Clear all overlays
     */
    clear() {
        this.dataSource.entities.removeAll();
        this.entities = [];
    }

    /**
     * Get all entities
     */
    getEntities() {
        return this.entities;
    }

    /**
     * Remove specific entity
     * @param {Object} entity
     */
    removeEntity(entity) {
        const index = this.entities.findIndex(e => e.entity === entity);
        if (index > -1) {
            this.dataSource.entities.remove(entity);
            this.entities.splice(index, 1);
        }
    }

    /**
     * Export to GeoJSON
     */
    exportToGeoJSON() {
        const features = [];

        this.entities.forEach(item => {
            const props = item.entity.properties;
            let feature = null;

            if (item.type === 'runway') {
                feature = {
                    type: 'Feature',
                    properties: {
                        aeroway: 'runway',
                        ref: props.name?.getValue() || ''
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [item.data.startLon, item.data.startLat],
                            [item.data.endLon, item.data.endLat]
                        ]
                    }
                };
            } else if (item.type === 'taxiway' && item.data.coordinates) {
                feature = {
                    type: 'Feature',
                    properties: {
                        aeroway: 'taxiway',
                        ref: props.name?.getValue() || ''
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: item.data.coordinates
                    }
                };
            } else if (item.type === 'apron' && item.data.coordinates) {
                feature = {
                    type: 'Feature',
                    properties: {
                        aeroway: 'apron',
                        name: props.name?.getValue() || ''
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [item.data.coordinates]
                    }
                };
            }

            if (feature) features.push(feature);
        });

        return {
            type: 'FeatureCollection',
            features: features
        };
    }
}

// Make available globally
window.AirportOverlay = AirportOverlay;
