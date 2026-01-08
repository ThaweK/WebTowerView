/**
 * GeoJSON Loader for airport layouts
 * Parses GeoJSON and creates Cesium entities
 */

const GeoJSONLoader = {
    /**
     * Load GeoJSON from file input
     * @param {File} file
     * @returns {Promise<Object>} Parsed GeoJSON
     */
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const geojson = JSON.parse(e.target.result);
                    resolve(geojson);
                } catch (err) {
                    reject(new Error('Invalid GeoJSON file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    /**
     * Parse GeoJSON and categorize features
     * @param {Object} geojson
     * @returns {Object} Categorized features
     */
    parse(geojson) {
        const result = {
            runways: [],
            taxiways: [],
            aprons: [],
            buildings: [],
            others: [],
            bounds: null
        };

        if (!geojson || !geojson.features) {
            console.warn('Invalid GeoJSON structure');
            return result;
        }

        // Calculate bounds
        result.bounds = this.calculateBounds(geojson);

        // Categorize features
        geojson.features.forEach(feature => {
            const type = this.getFeatureType(feature);
            const parsed = {
                type: type,
                geometry: feature.geometry,
                properties: feature.properties || {},
                name: feature.properties?.name || feature.properties?.ref || ''
            };

            switch (type) {
                case 'runway':
                    result.runways.push(parsed);
                    break;
                case 'taxiway':
                    result.taxiways.push(parsed);
                    break;
                case 'apron':
                case 'parking':
                    result.aprons.push(parsed);
                    break;
                case 'building':
                case 'terminal':
                case 'hangar':
                    result.buildings.push(parsed);
                    break;
                default:
                    result.others.push(parsed);
            }
        });

        return result;
    },

    /**
     * Determine feature type from properties
     * @param {Object} feature
     * @returns {string}
     */
    getFeatureType(feature) {
        const props = feature.properties || {};

        // Check aeroway tag (OSM style)
        if (props.aeroway) return props.aeroway;

        // Check type property
        if (props.type) return props.type.toLowerCase();

        // Check building
        if (props.building) {
            if (props.building === 'hangar') return 'hangar';
            if (props.building === 'terminal') return 'terminal';
            return 'building';
        }

        // Check for specific keys
        if (props.runway) return 'runway';
        if (props.taxiway) return 'taxiway';
        if (props.apron) return 'apron';

        return 'unknown';
    },

    /**
     * Calculate bounds of GeoJSON
     * @param {Object} geojson
     * @returns {Object} {west, south, east, north}
     */
    calculateBounds(geojson) {
        let west = Infinity, south = Infinity;
        let east = -Infinity, north = -Infinity;

        const processCoord = (coord) => {
            west = Math.min(west, coord[0]);
            east = Math.max(east, coord[0]);
            south = Math.min(south, coord[1]);
            north = Math.max(north, coord[1]);
        };

        const processGeometry = (geometry) => {
            if (!geometry) return;

            switch (geometry.type) {
                case 'Point':
                    processCoord(geometry.coordinates);
                    break;
                case 'LineString':
                    geometry.coordinates.forEach(processCoord);
                    break;
                case 'Polygon':
                    geometry.coordinates.forEach(ring => ring.forEach(processCoord));
                    break;
                case 'MultiPolygon':
                    geometry.coordinates.forEach(poly =>
                        poly.forEach(ring => ring.forEach(processCoord))
                    );
                    break;
                case 'MultiLineString':
                    geometry.coordinates.forEach(line => line.forEach(processCoord));
                    break;
            }
        };

        geojson.features.forEach(f => processGeometry(f.geometry));

        return { west, south, east, north };
    },

    /**
     * Get center point of bounds
     * @param {Object} bounds
     * @returns {Object} {lat, lon}
     */
    getBoundsCenter(bounds) {
        return {
            lat: (bounds.south + bounds.north) / 2,
            lon: (bounds.west + bounds.east) / 2
        };
    },

    /**
     * Convert GeoJSON coordinates to Cesium format
     * @param {Array} coordinates - GeoJSON coordinates
     * @param {number} height - Height above ground
     * @returns {Array} Flat array for Cesium
     */
    coordsToCesium(coordinates, height = 0) {
        const result = [];
        coordinates.forEach(coord => {
            result.push(coord[0], coord[1], height);
        });
        return result;
    },

    /**
     * Create sample airport GeoJSON
     * @param {number} centerLat
     * @param {number} centerLon
     * @returns {Object} GeoJSON
     */
    createSampleAirport(centerLat, centerLon) {
        // Create a simple airport layout
        const features = [];

        // Main runway (09/27)
        const rwyHalfLen = 0.015; // ~1.5km in degrees
        const rwyWidth = 0.0004; // ~45m

        features.push({
            type: 'Feature',
            properties: { aeroway: 'runway', ref: '09/27' },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [centerLon - rwyHalfLen, centerLat - rwyWidth],
                    [centerLon + rwyHalfLen, centerLat - rwyWidth],
                    [centerLon + rwyHalfLen, centerLat + rwyWidth],
                    [centerLon - rwyHalfLen, centerLat + rwyWidth],
                    [centerLon - rwyHalfLen, centerLat - rwyWidth]
                ]]
            }
        });

        // Parallel taxiway
        const twyOffset = 0.0015;
        features.push({
            type: 'Feature',
            properties: { aeroway: 'taxiway', ref: 'A' },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [centerLon - rwyHalfLen, centerLat + twyOffset],
                    [centerLon + rwyHalfLen, centerLat + twyOffset]
                ]
            }
        });

        // Apron
        features.push({
            type: 'Feature',
            properties: { aeroway: 'apron', name: 'Main Apron' },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [centerLon + 0.005, centerLat + 0.002],
                    [centerLon + 0.010, centerLat + 0.002],
                    [centerLon + 0.010, centerLat + 0.005],
                    [centerLon + 0.005, centerLat + 0.005],
                    [centerLon + 0.005, centerLat + 0.002]
                ]]
            }
        });

        // Terminal building
        features.push({
            type: 'Feature',
            properties: { building: 'terminal', name: 'Terminal 1' },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [centerLon + 0.006, centerLat + 0.0055],
                    [centerLon + 0.009, centerLat + 0.0055],
                    [centerLon + 0.009, centerLat + 0.0065],
                    [centerLon + 0.006, centerLat + 0.0065],
                    [centerLon + 0.006, centerLat + 0.0055]
                ]]
            }
        });

        return {
            type: 'FeatureCollection',
            features: features
        };
    }
};

// Make available globally
window.GeoJSONLoader = GeoJSONLoader;
