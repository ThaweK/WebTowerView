/**
 * Model Manager - glTF Aircraft Model Loading and Caching
 * Handles loading, caching, and providing 3D aircraft models for CesiumJS
 */

class ModelManager {
    constructor() {
        // Cache for loaded model URIs (we don't cache actual models, just URLs)
        this.modelCache = new Map();

        // Track loading state to avoid duplicate loads
        this.loadingModels = new Map();

        // Failed models - fallback to default
        this.failedModels = new Set();

        // Base URL for models
        this.baseUrl = Config.modelBaseUrl;

        // Preload common models
        this.preloadCommonModels();
    }

    /**
     * Preload commonly used aircraft models
     */
    async preloadCommonModels() {
        const commonTypes = ['A320', 'B738', 'B77W', 'A332', 'E190', 'B788'];

        for (const type of commonTypes) {
            const modelInfo = this.getModelInfo(type);
            if (modelInfo) {
                // Just validate the URL exists, don't actually download
                this.modelCache.set(modelInfo.model, this.getModelUrl(modelInfo.model));
            }
        }

        console.log('ModelManager: Common models registered');
    }

    /**
     * Get model info for an aircraft type
     * @param {string} icaoType - ICAO aircraft type designator (e.g., 'A320', 'B738')
     * @returns {Object} Model info with path and scale
     */
    getModelInfo(icaoType) {
        if (!icaoType) return Config.defaultModel;

        const type = icaoType.toUpperCase().trim();

        // Direct match
        if (Config.aircraftModels[type]) {
            return Config.aircraftModels[type];
        }

        // Try partial matches for common patterns
        const mappings = [
            // Airbus A320 family
            { pattern: /^A3[12][0-9N]/i, type: 'A320' },
            { pattern: /^A19/i, type: 'A319' },
            // Airbus widebody
            { pattern: /^A33[0-9]/i, type: 'A332' },
            { pattern: /^A34[0-9]/i, type: 'A343' },
            { pattern: /^A35[0-9K]/i, type: 'A359' },
            { pattern: /^A38[0-9]/i, type: 'A380' },
            // Boeing 737
            { pattern: /^B73[0-9M]/i, type: 'B738' },
            // Boeing 747
            { pattern: /^B74[0-9S]/i, type: 'B744' },
            // Boeing 757
            { pattern: /^B75[0-9]/i, type: 'B752' },
            // Boeing 767
            { pattern: /^B76[0-9]/i, type: 'B763' },
            // Boeing 777
            { pattern: /^B77[0-9LWX]/i, type: 'B77W' },
            // Boeing 787
            { pattern: /^B78[0-9X]/i, type: 'B788' },
            // Embraer
            { pattern: /^E1[4-9][0-9]/i, type: 'E190' },
            { pattern: /^E[23][0-9][0-9]/i, type: 'E190' },
            { pattern: /^ERJ/i, type: 'E145' },
            // CRJ
            { pattern: /^CRJ/i, type: 'CRJ9' },
            // ATR
            { pattern: /^AT[4-7][0-9]/i, type: 'AT72' },
            // Dash 8
            { pattern: /^DH8/i, type: 'DH8D' },
            { pattern: /^DHC/i, type: 'DH8D' },
            // Bombardier
            { pattern: /^BCS/i, type: 'BCS1' },
            // Cessna singles
            { pattern: /^C1[5-7][0-9]/i, type: 'C182' },
            { pattern: /^C2[0-1][0-9]/i, type: 'C208' },
            // Cessna twins/jets
            { pattern: /^C[3-4][0-9][0-9]/i, type: 'C421' },
            { pattern: /^C[5-7][0-9][0-9]/i, type: 'C550' },
            // Piper
            { pattern: /^P28/i, type: 'P28A' },
            { pattern: /^PA[0-9]/i, type: 'PA28' },
            // Cirrus
            { pattern: /^SR[0-9]/i, type: 'SR22' },
            // MD/DC
            { pattern: /^MD[0-9]/i, type: 'MD11' },
            { pattern: /^DC[0-9]/i, type: 'MD11' },
            // Helicopter patterns
            { pattern: /^EC[0-9]/i, type: 'EC35' },
            { pattern: /^AS[0-9]/i, type: 'EC35' },
            { pattern: /^R[2-6][0-9]/i, type: 'B407' },
            { pattern: /^B[0-9][0-9][0-9]/i, type: 'B407' },
            { pattern: /^S[0-9][0-9]/i, type: 'B407' },
            { pattern: /^A[0-9][0-9][0-9]/i, type: 'B407' },
            // Gliders
            { pattern: /^GL/i, type: 'GLID' },
            { pattern: /^ASK/i, type: 'ASK21' },
            // Russian
            { pattern: /^TU?[0-9]/i, type: 'T134' },
            { pattern: /^IL[0-9]/i, type: 'IL96' },
            { pattern: /^SU[0-9]/i, type: 'SU95' },
            // Fokker
            { pattern: /^F[0-9][0-9]/i, type: 'F100' },
            // SAAB
            { pattern: /^S[BF][0-9]/i, type: 'SF34' }
        ];

        for (const mapping of mappings) {
            if (mapping.pattern.test(type)) {
                return Config.aircraftModels[mapping.type] || Config.defaultModel;
            }
        }

        return Config.defaultModel;
    }

    /**
     * Get full URL for a model file
     * @param {string} modelPath - Relative model path
     * @returns {string} Full URL
     */
    getModelUrl(modelPath) {
        if (this.failedModels.has(modelPath)) {
            // Return default model URL if this one has failed
            return this.baseUrl + Config.defaultModel.model;
        }
        return this.baseUrl + modelPath;
    }

    /**
     * Get the model URI for an aircraft type (for Cesium Entity)
     * @param {string} icaoType - ICAO aircraft type
     * @returns {string} Model URL
     */
    getModelUri(icaoType) {
        const modelInfo = this.getModelInfo(icaoType);
        return this.getModelUrl(modelInfo.model);
    }

    /**
     * Get the scale for an aircraft type
     * @param {string} icaoType - ICAO aircraft type
     * @returns {number} Scale factor
     */
    getModelScale(icaoType) {
        const modelInfo = this.getModelInfo(icaoType);
        return modelInfo.scale || 1.0;
    }

    /**
     * Get human-readable name for aircraft type
     * @param {string} icaoType - ICAO aircraft type
     * @returns {string} Aircraft name
     */
    getAircraftName(icaoType) {
        const modelInfo = this.getModelInfo(icaoType);
        return modelInfo.name || icaoType || 'Unknown';
    }

    /**
     * Mark a model as failed (will use default model instead)
     * @param {string} modelPath - Model path that failed
     */
    markModelFailed(modelPath) {
        this.failedModels.add(modelPath);
        console.warn(`ModelManager: Model failed to load: ${modelPath}, will use default`);
    }

    /**
     * Parse aircraft type from VATSIM flight plan
     * Handles various formats: "B738", "B738/L", "H/A320/L", etc.
     * @param {string} typeStr - Raw aircraft type string from VATSIM
     * @returns {string} Normalized ICAO type code
     */
    parseVatsimType(typeStr) {
        if (!typeStr) return 'A320';

        let type = typeStr.toUpperCase().trim();

        // Handle ICAO format with equipment suffix: "B738/L" -> "B738"
        if (type.includes('/')) {
            const parts = type.split('/');
            // Handle wake turbulence prefix: "H/A320/L" -> "A320"
            if (parts.length >= 2) {
                // If first part is single char (wake cat), use second part
                if (parts[0].length === 1) {
                    type = parts[1];
                } else {
                    type = parts[0];
                }
            }
        }

        // Remove common suffixes
        type = type.replace(/[-_].*$/, ''); // Remove anything after - or _

        // Normalize some common variations
        const normalizations = {
            'A32N': 'A20N',
            'B73G': 'B738',
            'B77L': 'B77W',
            'B78X': 'B789',
            'A388': 'A380',
            'A20N': 'A320',
            'A21N': 'A321'
        };

        return normalizations[type] || type;
    }

    /**
     * Get airline info from callsign
     * @param {string} callsign - Flight callsign (e.g., 'LOT123')
     * @returns {Object|null} Airline info or null
     */
    getAirlineInfo(callsign) {
        if (!callsign || callsign.length < 3) return null;

        const prefix = callsign.substring(0, 3).toUpperCase();
        return Config.airlineColors[prefix] || null;
    }
}

// Make available globally
window.ModelManager = ModelManager;
