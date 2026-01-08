/**
 * WebTowerView Configuration
 *
 * IMPORTANT: To use Cesium Ion features (terrain, OSM buildings),
 * you need a free Cesium Ion access token.
 *
 * Get your free token at: https://cesium.com/ion/tokens
 * The free tier includes 5GB storage + 100GB streaming/month
 */

const Config = {
    // Cesium Ion access token (get free at https://cesium.com/ion/tokens)
    // Leave empty to use basic features without Ion
    CESIUM_ION_TOKEN: '',

    // Default airport location (Warsaw Chopin - EPWA)
    defaultAirport: {
        name: 'Warsaw Chopin Airport',
        icao: 'EPWA',
        lat: 52.1657,
        lon: 20.9671,
        elevation: 110  // meters
    },

    // Tower defaults
    tower: {
        defaultHeight: 40,      // meters
        minHeight: 10,
        maxHeight: 100
    },

    // Camera defaults
    camera: {
        defaultHeading: 0,      // degrees (north)
        defaultPitch: -15,      // degrees (looking down slightly)
        defaultFov: 60,         // field of view in degrees
        minPitch: -90,
        maxPitch: 10,
        rotationSpeed: 0.005,   // mouse sensitivity
        zoomSpeed: 0.5
    },

    // Overlay settings
    overlay: {
        defaultOpacity: 0.7,
        runwayColor: '#333333',
        runwayOutlineColor: '#ffffff',
        taxiwayColor: '#4a4a2a',
        taxiwayOutlineColor: '#666633',
        apronColor: '#3a3a3a',
        apronOutlineColor: '#555555',
        heightAboveGround: 0.3  // meters
    },

    // Aircraft settings
    aircraft: {
        defaultColor: '#ffffff',
        labelColor: '#ffcc00',
        types: {
            'A320': { name: 'Airbus A320', length: 37.6, wingspan: 35.8, color: '#ffffff' },
            'B738': { name: 'Boeing 737-800', length: 39.5, wingspan: 35.8, color: '#ffffff' },
            'B77W': { name: 'Boeing 777-300ER', length: 73.9, wingspan: 64.8, color: '#ffffff' },
            'A388': { name: 'Airbus A380', length: 72.7, wingspan: 79.8, color: '#ffffff' },
            'E190': { name: 'Embraer E190', length: 36.2, wingspan: 28.7, color: '#ffffff' },
            'C172': { name: 'Cessna 172', length: 8.3, wingspan: 11.0, color: '#ffffff' }
        }
    },

    // Common airports for quick access
    airports: [
        { icao: 'EPWA', name: 'Warsaw Chopin', lat: 52.1657, lon: 20.9671, elevation: 110 },
        { icao: 'EPMO', name: 'Warsaw Modlin', lat: 52.4511, lon: 20.6518, elevation: 104 },
        { icao: 'EPKK', name: 'Krakow Balice', lat: 50.0777, lon: 19.7848, elevation: 241 },
        { icao: 'EPGD', name: 'Gdansk Lech Walesa', lat: 54.3776, lon: 18.4662, elevation: 149 },
        { icao: 'KJFK', name: 'New York JFK', lat: 40.6413, lon: -73.7781, elevation: 4 },
        { icao: 'EGLL', name: 'London Heathrow', lat: 51.4700, lon: -0.4543, elevation: 25 },
        { icao: 'EDDF', name: 'Frankfurt', lat: 50.0379, lon: 8.5622, elevation: 111 },
        { icao: 'LFPG', name: 'Paris CDG', lat: 49.0097, lon: 2.5479, elevation: 119 }
    ]
};

// Make available globally
window.Config = Config;
