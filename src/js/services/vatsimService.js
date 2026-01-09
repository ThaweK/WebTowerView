/**
 * VATSIM Live Traffic Service
 * Fetches real pilots from VATSIM and provides smooth position interpolation
 */

class VatsimService {
    constructor(aircraftManager, viewer) {
        this.aircraftManager = aircraftManager;
        this.viewer = viewer;

        // State
        this.centerLat = 0;
        this.centerLon = 0;
        this.centerElevation = 0; // Airport elevation in meters
        this.radius = 100; // km
        this.enabled = false;

        // Pilots data with interpolation
        this.pilots = new Map(); // callsign -> pilot data with interpolation state

        // Update intervals
        this.fetchInterval = null;
        this.renderInterval = null;

        // Settings
        this.fetchIntervalMs = 15000; // VATSIM data updates every ~15 seconds
        this.renderIntervalMs = 33;   // ~30 FPS for smooth movement

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

        // Smooth rendering loop (30+ FPS)
        this.renderInterval = setInterval(() => {
            this.updatePositions();
        }, this.renderIntervalMs);
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

        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
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
     * Accounts for pressure altitude vs true altitude
     */
    convertAltitude(altitudeFeet, groundspeed, pilotLat, pilotLon) {
        // If aircraft is on ground (low groundspeed), use ground level
        if (groundspeed < this.GROUND_SPEED_THRESHOLD) {
            // Aircraft is on ground - use small offset above terrain
            return 2; // 2 meters above ground (will be added to terrain height)
        }

        // For airborne aircraft, convert feet to meters
        // VATSIM altitude is pressure altitude (MSL)
        const altitudeMeters = altitudeFeet * this.FEET_TO_METERS;

        // Approximate: aircraft altitude relative to airport elevation
        // This gives AGL-like altitude for local area
        const agl = altitudeMeters - this.centerElevation;

        // Return altitude above ground (minimum 10m for airborne)
        return Math.max(10, agl);
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
                    pilot.groundspeed,
                    pilot.latitude,
                    pilot.longitude
                );

                const existing = this.pilots.get(pilot.callsign);

                if (existing) {
                    // Update existing pilot - set new target for interpolation
                    existing.prevLat = existing.currentLat;
                    existing.prevLon = existing.currentLon;
                    existing.prevAlt = existing.currentAlt;
                    existing.prevHdg = existing.currentHdg;

                    existing.targetLat = pilot.latitude;
                    existing.targetLon = pilot.longitude;
                    existing.targetAlt = altitudeAGL;
                    existing.targetHdg = pilot.heading;

                    existing.lastUpdate = now;
                    existing.groundspeed = pilot.groundspeed;
                } else {
                    // New pilot
                    this.pilots.set(pilot.callsign, {
                        callsign: pilot.callsign,
                        // Current interpolated position
                        currentLat: pilot.latitude,
                        currentLon: pilot.longitude,
                        currentAlt: altitudeAGL,
                        currentHdg: pilot.heading,
                        // Previous position (for interpolation start)
                        prevLat: pilot.latitude,
                        prevLon: pilot.longitude,
                        prevAlt: altitudeAGL,
                        prevHdg: pilot.heading,
                        // Target position (for interpolation end)
                        targetLat: pilot.latitude,
                        targetLon: pilot.longitude,
                        targetAlt: altitudeAGL,
                        targetHdg: pilot.heading,
                        // Meta
                        lastUpdate: now,
                        groundspeed: pilot.groundspeed,
                        aircraft: this.parseAircraftType(pilot.flight_plan?.aircraft_short),
                        departure: pilot.flight_plan?.departure,
                        arrival: pilot.flight_plan?.arrival
                    });

                    // Add to scene
                    this.aircraftManager.addAircraft({
                        callsign: pilot.callsign,
                        type: this.parseAircraftType(pilot.flight_plan?.aircraft_short),
                        lat: pilot.latitude,
                        lon: pilot.longitude,
                        altitude: altitudeAGL,
                        heading: pilot.heading,
                        isVatsim: true
                    });
                }
            }

            // Remove pilots that are no longer nearby
            for (const [callsign, pilot] of this.pilots.entries()) {
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
     * Update aircraft positions (smooth interpolation)
     * Called 30+ times per second for smooth movement
     */
    updatePositions() {
        if (!this.enabled) return;

        const now = Date.now();

        for (const [callsign, pilot] of this.pilots.entries()) {
            const timeSinceUpdate = now - pilot.lastUpdate;
            // Interpolation factor (0 to 1 over 15 seconds, the fetch interval)
            const t = Math.min(1, timeSinceUpdate / this.fetchIntervalMs);

            // Lerp positions
            pilot.currentLat = this.lerp(pilot.prevLat, pilot.targetLat, t);
            pilot.currentLon = this.lerp(pilot.prevLon, pilot.targetLon, t);
            pilot.currentAlt = this.lerp(pilot.prevAlt, pilot.targetAlt, t);
            pilot.currentHdg = this.lerpAngle(pilot.prevHdg, pilot.targetHdg, t);

            // Update aircraft in scene
            this.aircraftManager.updateAircraftPosition(callsign, {
                lat: pilot.currentLat,
                lon: pilot.currentLon,
                altitude: pilot.currentAlt,
                heading: pilot.currentHdg
            });
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
        return (a + diff * t + 360) % 360;
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
     * Parse aircraft type from VATSIM flight plan
     */
    parseAircraftType(typeStr) {
        if (!typeStr) return 'A320';

        const type = typeStr.toUpperCase();

        // Map common types
        if (type.includes('B738') || type.includes('B737')) return 'B738';
        if (type.includes('A320') || type.includes('A32')) return 'A320';
        if (type.includes('B77')) return 'B77W';
        if (type.includes('A380') || type.includes('A388')) return 'A388';
        if (type.includes('E190') || type.includes('E19')) return 'E190';
        if (type.includes('C172') || type.includes('C17')) return 'C172';

        return 'A320'; // Default
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
}

window.VatsimService = VatsimService;
