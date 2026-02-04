/**
 * VATSIM Live Traffic Service
 * Fetches real pilots from VATSIM with proper ICAO type matching
 */

class VatsimService {
    constructor(aircraftManager, viewer, modelManager) {
        this.aircraftManager = aircraftManager;
        this.viewer = viewer;
        this.modelManager = modelManager;

        // State
        this.centerLat = 0;
        this.centerLon = 0;
        this.centerElevation = 0; // Airport elevation in meters
        this.radius = 100; // km
        this.enabled = false;

        // Pilots data
        this.pilots = new Map(); // callsign -> pilot data

        // Update intervals
        this.fetchInterval = null;

        // Settings - optimized for performance
        this.fetchIntervalMs = 3000; // Fetch every 3 seconds

        // Constants
        this.FEET_TO_METERS = 0.3048;
        this.GROUND_SPEED_THRESHOLD = 50; // knots - below this, aircraft is on ground
    }

    /**
     * Start tracking VATSIM traffic
     */
    start(lat, lon, radiusKm = 100) {
        this.centerLat = lat;
        this.centerLon = lon;
        this.radius = radiusKm;
        this.enabled = true;

        console.log(`VATSIM tracking started: ${lat.toFixed(4)}, ${lon.toFixed(4)}, radius ${radiusKm}km`);

        // Initial fetch
        this.fetchPilots();

        // Periodic fetching from VATSIM
        this.fetchInterval = setInterval(() => {
            this.fetchPilots();
        }, this.fetchIntervalMs);
    }

    /**
     * Stop tracking
     */
    stop() {
        this.enabled = false;

        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }

        // Remove all VATSIM aircraft
        for (const callsign of this.pilots.keys()) {
            this.aircraftManager.removeByCallsign(callsign);
        }
        this.pilots.clear();

        console.log('VATSIM tracking stopped');
    }

    /**
     * Update center position
     */
    setCenter(lat, lon, elevation = 0) {
        this.centerLat = lat;
        this.centerLon = lon;
        this.centerElevation = elevation;
    }

    /**
     * Convert VATSIM altitude (feet MSL) to meters for Cesium
     */
    convertAltitude(altitudeFeet, groundspeed) {
        // If aircraft is on ground (low groundspeed), use ground level
        if (groundspeed < this.GROUND_SPEED_THRESHOLD) {
            return 2; // 2 meters above ground
        }

        // For airborne aircraft, convert feet to meters
        const altitudeMeters = altitudeFeet * this.FEET_TO_METERS;

        // Altitude relative to airport elevation (AGL-like for local area)
        const agl = altitudeMeters - this.centerElevation;

        // Never go underground - minimum 10m for airborne
        return Math.max(10, agl);
    }

    /**
     * Parse aircraft type from VATSIM flight plan
     */
    parseAircraftType(typeStr) {
        if (!typeStr) return 'A320';

        // Use model manager's parsing if available
        if (this.modelManager) {
            return this.modelManager.parseVatsimType(typeStr);
        }

        let type = typeStr.toUpperCase().trim();

        // Handle ICAO format with equipment suffix: "B738/L" -> "B738"
        if (type.includes('/')) {
            const parts = type.split('/');
            if (parts.length >= 2) {
                if (parts[0].length === 1) {
                    type = parts[1];
                } else {
                    type = parts[0];
                }
            }
        }

        // Remove common suffixes
        type = type.replace(/[-_].*$/, '');

        return type;
    }

    /**
     * Fetch pilots from VATSIM
     */
    async fetchPilots() {
        if (!this.enabled) return;

        try {
            const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const now = Date.now();

            // Filter pilots within radius
            const nearbyPilots = (data.pilots || []).filter(pilot => {
                const dist = this.calculateDistance(
                    this.centerLat, this.centerLon,
                    pilot.latitude, pilot.longitude
                );
                return dist <= this.radius;
            });

            // Track seen callsigns
            const seenCallsigns = new Set();

            for (const pilot of nearbyPilots) {
                seenCallsigns.add(pilot.callsign);

                // Convert altitude from VATSIM feet to meters AGL
                const altitudeAGL = this.convertAltitude(
                    pilot.altitude,
                    pilot.groundspeed
                );

                // Parse aircraft type
                const aircraftType = this.parseAircraftType(pilot.flight_plan?.aircraft_short);

                const existing = this.pilots.get(pilot.callsign);

                if (existing) {
                    // Update existing pilot
                    existing.targetLat = pilot.latitude;
                    existing.targetLon = pilot.longitude;
                    existing.targetAlt = altitudeAGL;
                    existing.targetHdg = pilot.heading;
                    existing.lastUpdate = now;
                    existing.groundspeed = pilot.groundspeed;

                    // Update aircraft manager
                    this.aircraftManager.updateAircraftPosition(pilot.callsign, {
                        lat: pilot.latitude,
                        lon: pilot.longitude,
                        altitude: altitudeAGL,
                        heading: pilot.heading,
                        speed: pilot.groundspeed
                    });
                } else {
                    // New pilot
                    this.pilots.set(pilot.callsign, {
                        callsign: pilot.callsign,
                        lat: pilot.latitude,
                        lon: pilot.longitude,
                        alt: altitudeAGL,
                        hdg: pilot.heading,
                        targetLat: pilot.latitude,
                        targetLon: pilot.longitude,
                        targetAlt: altitudeAGL,
                        targetHdg: pilot.heading,
                        lastUpdate: now,
                        groundspeed: pilot.groundspeed,
                        aircraft: aircraftType,
                        departure: pilot.flight_plan?.departure,
                        arrival: pilot.flight_plan?.arrival,
                        route: pilot.flight_plan?.route
                    });

                    // Add to scene
                    this.aircraftManager.addAircraft({
                        callsign: pilot.callsign,
                        type: aircraftType,
                        lat: pilot.latitude,
                        lon: pilot.longitude,
                        altitude: altitudeAGL,
                        heading: pilot.heading,
                        speed: pilot.groundspeed,
                        isVatsim: true
                    });
                }
            }

            // Remove pilots that are no longer nearby
            for (const [callsign] of this.pilots.entries()) {
                if (!seenCallsigns.has(callsign)) {
                    this.aircraftManager.removeByCallsign(callsign);
                    this.pilots.delete(callsign);
                }
            }

            console.log(`VATSIM: ${nearbyPilots.length} aircraft within ${this.radius}km`);

        } catch (e) {
            console.warn('Failed to fetch VATSIM data:', e.message);
        }
    }

    /**
     * Calculate distance between two points (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * Math.PI / 180;
    }

    /**
     * Get number of tracked pilots
     */
    getPilotCount() {
        return this.pilots.size;
    }

    /**
     * Get all tracked pilots
     */
    getPilots() {
        return Array.from(this.pilots.values());
    }

    /**
     * Get pilot info by callsign
     */
    getPilotInfo(callsign) {
        return this.pilots.get(callsign) || null;
    }
}

window.VatsimService = VatsimService;
