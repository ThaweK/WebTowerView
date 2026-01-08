/**
 * Coordinate conversion utilities
 * Converts between geographic coordinates (lat/lon) and local 3D scene coordinates
 */

const CoordinateSystem = {
    // Reference point (center of the airport)
    referencePoint: {
        lat: 52.1657,  // Default: Warsaw Chopin Airport
        lon: 20.9671,
        alt: 110       // meters above sea level
    },

    // Earth radius in meters
    EARTH_RADIUS: 6371000,

    // Scale factor (1 unit = 1 meter in scene)
    scale: 1,

    /**
     * Set the reference point for coordinate conversion
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @param {number} alt - Altitude in meters
     */
    setReferencePoint(lat, lon, alt = 0) {
        this.referencePoint = { lat, lon, alt };
    },

    /**
     * Convert degrees to radians
     * @param {number} degrees
     * @returns {number} radians
     */
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees
     * @param {number} radians
     * @returns {number} degrees
     */
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Convert geographic coordinates to local 3D coordinates
     * Uses equirectangular approximation (good for small areas)
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @param {number} alt - Altitude in meters (optional)
     * @returns {Object} {x, y, z} in scene units
     */
    geoToLocal(lat, lon, alt = 0) {
        const refLat = this.toRadians(this.referencePoint.lat);
        const refLon = this.toRadians(this.referencePoint.lon);
        const pointLat = this.toRadians(lat);
        const pointLon = this.toRadians(lon);

        // Calculate X (East-West) - positive is East
        const x = (pointLon - refLon) * Math.cos(refLat) * this.EARTH_RADIUS * this.scale;

        // Calculate Z (North-South) - positive is North (but in Three.js -Z is forward)
        const z = -(pointLat - refLat) * this.EARTH_RADIUS * this.scale;

        // Y is altitude relative to reference
        const y = (alt - this.referencePoint.alt) * this.scale;

        return { x, y, z };
    },

    /**
     * Convert local 3D coordinates to geographic coordinates
     * @param {number} x - X position in scene
     * @param {number} y - Y position in scene (altitude)
     * @param {number} z - Z position in scene
     * @returns {Object} {lat, lon, alt} in degrees and meters
     */
    localToGeo(x, y, z) {
        const refLat = this.toRadians(this.referencePoint.lat);
        const refLon = this.toRadians(this.referencePoint.lon);

        // Convert back to lat/lon
        const lon = this.toDegrees(refLon + (x / this.scale) / (this.EARTH_RADIUS * Math.cos(refLat)));
        const lat = this.toDegrees(refLat - (z / this.scale) / this.EARTH_RADIUS);
        const alt = (y / this.scale) + this.referencePoint.alt;

        return { lat, lon, alt };
    },

    /**
     * Calculate distance between two geographic points in meters
     * Uses Haversine formula
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = this.EARTH_RADIUS;
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Calculate bearing between two geographic points
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} bearing in degrees (0-360, 0=North)
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.toRadians(lon2 - lon1);
        const lat1Rad = this.toRadians(lat1);
        const lat2Rad = this.toRadians(lat2);

        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

        let bearing = this.toDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360;
    },

    /**
     * Convert heading (degrees from north) to Three.js rotation
     * In Three.js, rotation.y = 0 points along positive X
     * @param {number} heading - Heading in degrees (0 = North, 90 = East)
     * @returns {number} rotation in radians for Three.js
     */
    headingToRotation(heading) {
        // Convert: 0° North -> -PI/2, 90° East -> 0, etc.
        return this.toRadians(90 - heading);
    },

    /**
     * Convert Three.js rotation to heading
     * @param {number} rotation - Rotation in radians
     * @returns {number} heading in degrees
     */
    rotationToHeading(rotation) {
        let heading = 90 - this.toDegrees(rotation);
        return (heading + 360) % 360;
    },

    /**
     * Format coordinates for display
     * @param {number} lat
     * @param {number} lon
     * @returns {string} formatted string
     */
    formatCoordinates(lat, lon) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(5)}°${latDir} ${Math.abs(lon).toFixed(5)}°${lonDir}`;
    }
};

// Make available globally
window.CoordinateSystem = CoordinateSystem;
