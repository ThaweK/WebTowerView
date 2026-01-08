/**
 * Coordinate utilities for WebTowerView
 * Works with Cesium's coordinate system
 */

const Coordinates = {
    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return Cesium.Math.toRadians(degrees);
    },

    /**
     * Convert radians to degrees
     */
    toDegrees(radians) {
        return Cesium.Math.toDegrees(radians);
    },

    /**
     * Create Cesium Cartesian3 from lat/lon/alt
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @param {number} alt - Altitude in meters (default 0)
     * @returns {Cesium.Cartesian3}
     */
    fromLatLonAlt(lat, lon, alt = 0) {
        return Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    },

    /**
     * Get lat/lon/alt from Cesium Cartesian3
     * @param {Cesium.Cartesian3} cartesian
     * @returns {Object} {lat, lon, alt}
     */
    toLatLonAlt(cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        return {
            lat: this.toDegrees(cartographic.latitude),
            lon: this.toDegrees(cartographic.longitude),
            alt: cartographic.height
        };
    },

    /**
     * Calculate distance between two points in meters
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} distance in meters
     */
    distance(lat1, lon1, lat2, lon2) {
        const pos1 = this.fromLatLonAlt(lat1, lon1, 0);
        const pos2 = this.fromLatLonAlt(lat2, lon2, 0);
        return Cesium.Cartesian3.distance(pos1, pos2);
    },

    /**
     * Calculate bearing between two points
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} bearing in degrees (0-360, 0=North)
     */
    bearing(lat1, lon1, lat2, lon2) {
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
     * Calculate destination point given start, bearing and distance
     * @param {number} lat - Start latitude
     * @param {number} lon - Start longitude
     * @param {number} bearing - Bearing in degrees
     * @param {number} distance - Distance in meters
     * @returns {Object} {lat, lon}
     */
    destinationPoint(lat, lon, bearing, distance) {
        const R = 6371000; // Earth radius in meters
        const d = distance / R;
        const brng = this.toRadians(bearing);
        const lat1 = this.toRadians(lat);
        const lon1 = this.toRadians(lon);

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) +
            Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
        );
        const lon2 = lon1 + Math.atan2(
            Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );

        return {
            lat: this.toDegrees(lat2),
            lon: this.toDegrees(lon2)
        };
    },

    /**
     * Create polygon coordinates for a runway given start/end points and width
     * @param {number} startLat
     * @param {number} startLon
     * @param {number} endLat
     * @param {number} endLon
     * @param {number} width - Width in meters
     * @returns {Array} Array of [lon, lat] pairs
     */
    createRunwayPolygon(startLat, startLon, endLat, endLon, width) {
        const bearing = this.bearing(startLat, startLon, endLat, endLon);
        const perpendicular = (bearing + 90) % 360;
        const halfWidth = width / 2;

        // Four corners of the runway
        const p1 = this.destinationPoint(startLat, startLon, perpendicular, halfWidth);
        const p2 = this.destinationPoint(startLat, startLon, (perpendicular + 180) % 360, halfWidth);
        const p3 = this.destinationPoint(endLat, endLon, (perpendicular + 180) % 360, halfWidth);
        const p4 = this.destinationPoint(endLat, endLon, perpendicular, halfWidth);

        return [
            [p1.lon, p1.lat],
            [p2.lon, p2.lat],
            [p3.lon, p3.lat],
            [p4.lon, p4.lat],
            [p1.lon, p1.lat]  // Close polygon
        ];
    },

    /**
     * Format coordinates for display
     * @param {number} lat
     * @param {number} lon
     * @returns {string}
     */
    format(lat, lon) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(5)}°${latDir} ${Math.abs(lon).toFixed(5)}°${lonDir}`;
    },

    /**
     * Format heading for display
     * @param {number} heading - Heading in degrees
     * @returns {string}
     */
    formatHeading(heading) {
        const normalized = ((heading % 360) + 360) % 360;
        return `${Math.round(normalized).toString().padStart(3, '0')}°`;
    }
};

// Make available globally
window.Coordinates = Coordinates;
