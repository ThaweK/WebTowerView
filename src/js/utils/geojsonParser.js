/**
 * GeoJSON Parser for airport layouts
 * Supports runways, taxiways, aprons, buildings, and other airport features
 */

const GeoJSONParser = {
    /**
     * Parse GeoJSON data and create airport features
     * @param {Object} geojson - GeoJSON object
     * @param {Object} scene - AirportScene instance
     * @returns {Object} parsed features
     */
    parse(geojson, scene) {
        if (!geojson || !geojson.features) {
            console.error('Invalid GeoJSON data');
            return null;
        }

        const features = {
            runways: [],
            taxiways: [],
            aprons: [],
            buildings: [],
            parkings: [],
            towers: [],
            others: []
        };

        // Find center point for reference
        const bounds = this.calculateBounds(geojson);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;

        // Set reference point
        CoordinateSystem.setReferencePoint(centerLat, centerLon, 0);

        // Parse each feature
        geojson.features.forEach(feature => {
            const parsed = this.parseFeature(feature);
            if (parsed) {
                switch (parsed.type) {
                    case 'runway':
                        features.runways.push(parsed);
                        break;
                    case 'taxiway':
                        features.taxiways.push(parsed);
                        break;
                    case 'apron':
                        features.aprons.push(parsed);
                        break;
                    case 'building':
                    case 'terminal':
                    case 'hangar':
                        features.buildings.push(parsed);
                        break;
                    case 'parking':
                    case 'gate':
                        features.parkings.push(parsed);
                        break;
                    case 'tower':
                        features.towers.push(parsed);
                        break;
                    default:
                        features.others.push(parsed);
                }
            }
        });

        return features;
    },

    /**
     * Parse a single GeoJSON feature
     * @param {Object} feature - GeoJSON feature
     * @returns {Object} parsed feature data
     */
    parseFeature(feature) {
        const props = feature.properties || {};
        const geometry = feature.geometry;

        if (!geometry) return null;

        // Determine feature type
        const featureType = this.determineFeatureType(props);

        // Parse geometry
        const parsedGeometry = this.parseGeometry(geometry);

        return {
            type: featureType,
            name: props.name || props.ref || props.id || '',
            properties: props,
            geometry: parsedGeometry,
            originalGeometry: geometry
        };
    },

    /**
     * Determine the type of airport feature
     * @param {Object} props - Feature properties
     * @returns {string} feature type
     */
    determineFeatureType(props) {
        // Check aeroway tag (OSM style)
        if (props.aeroway) {
            return props.aeroway;
        }

        // Check type property
        if (props.type) {
            return props.type.toLowerCase();
        }

        // Check building tag
        if (props.building) {
            if (props.building === 'hangar') return 'hangar';
            if (props.building === 'terminal') return 'terminal';
            return 'building';
        }

        // Check other common properties
        if (props.runway) return 'runway';
        if (props.taxiway) return 'taxiway';
        if (props.apron) return 'apron';

        return 'unknown';
    },

    /**
     * Parse geometry and convert coordinates
     * @param {Object} geometry - GeoJSON geometry
     * @returns {Object} parsed geometry with local coordinates
     */
    parseGeometry(geometry) {
        const result = {
            type: geometry.type,
            localCoords: []
        };

        switch (geometry.type) {
            case 'Point':
                result.localCoords = this.convertPoint(geometry.coordinates);
                break;

            case 'LineString':
                result.localCoords = geometry.coordinates.map(coord =>
                    this.convertPoint(coord)
                );
                break;

            case 'Polygon':
                result.localCoords = geometry.coordinates.map(ring =>
                    ring.map(coord => this.convertPoint(coord))
                );
                break;

            case 'MultiPolygon':
                result.localCoords = geometry.coordinates.map(polygon =>
                    polygon.map(ring =>
                        ring.map(coord => this.convertPoint(coord))
                    )
                );
                break;

            case 'MultiLineString':
                result.localCoords = geometry.coordinates.map(line =>
                    line.map(coord => this.convertPoint(coord))
                );
                break;
        }

        return result;
    },

    /**
     * Convert a GeoJSON coordinate to local 3D coordinates
     * @param {Array} coord - [lon, lat] or [lon, lat, alt]
     * @returns {Object} {x, y, z}
     */
    convertPoint(coord) {
        const lon = coord[0];
        const lat = coord[1];
        const alt = coord[2] || 0;
        return CoordinateSystem.geoToLocal(lat, lon, alt);
    },

    /**
     * Calculate bounds of GeoJSON data
     * @param {Object} geojson - GeoJSON object
     * @returns {Object} {minLat, maxLat, minLon, maxLon}
     */
    calculateBounds(geojson) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        const processCoord = (coord) => {
            const lon = coord[0];
            const lat = coord[1];
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
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
                    geometry.coordinates.forEach(polygon =>
                        polygon.forEach(ring => ring.forEach(processCoord))
                    );
                    break;
                case 'MultiLineString':
                    geometry.coordinates.forEach(line => line.forEach(processCoord));
                    break;
            }
        };

        geojson.features.forEach(feature => {
            processGeometry(feature.geometry);
        });

        return { minLat, maxLat, minLon, maxLon };
    },

    /**
     * Calculate the center and dimensions of a polygon
     * @param {Array} coords - Array of {x, z} coordinates
     * @returns {Object} {centerX, centerZ, width, length, rotation}
     */
    calculatePolygonMetrics(coords) {
        if (!coords || coords.length < 3) return null;

        // Calculate centroid
        let sumX = 0, sumZ = 0;
        coords.forEach(c => {
            sumX += c.x;
            sumZ += c.z;
        });
        const centerX = sumX / coords.length;
        const centerZ = sumZ / coords.length;

        // Calculate bounding box dimensions
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        coords.forEach(c => {
            minX = Math.min(minX, c.x);
            maxX = Math.max(maxX, c.x);
            minZ = Math.min(minZ, c.z);
            maxZ = Math.max(maxZ, c.z);
        });

        const width = maxX - minX;
        const length = maxZ - minZ;

        // Estimate rotation from longest edge
        let rotation = 0;
        if (coords.length >= 2) {
            // Find longest edge
            let maxLen = 0;
            for (let i = 0; i < coords.length - 1; i++) {
                const dx = coords[i + 1].x - coords[i].x;
                const dz = coords[i + 1].z - coords[i].z;
                const len = Math.sqrt(dx * dx + dz * dz);
                if (len > maxLen) {
                    maxLen = len;
                    rotation = Math.atan2(dx, -dz);
                }
            }
        }

        return { centerX, centerZ, width, length, rotation };
    }
};

// Make available globally
window.GeoJSONParser = GeoJSONParser;
