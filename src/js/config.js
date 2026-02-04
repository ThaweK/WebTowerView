/**
 * WebTowerView Configuration
 * Reworked for IVAO-style model matching with glTF aircraft models
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
    CESIUM_ION_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MzYyMTA3NC1lYmRiLTQ5ZDctYWFmYS1kZGVjOWZkYjVkZDAiLCJpZCI6Mzc2Njg0LCJpYXQiOjE3Njc5NTE3OTV9.IQ64Cn28jMxBXkPK1j1ttFYQGveRmHQZ0AiLQz3zhhY',

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

    // Model base URL - FlightAirMap 3D models repository (glTF/GLB format)
    modelBaseUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/',

    // Aircraft model definitions with ICAO type codes
    // Maps ICAO aircraft type designators to glTF model files
    aircraftModels: {
        // Airbus narrowbody
        'A319': { model: 'a320/a320.glb', scale: 1.0, name: 'Airbus A319' },
        'A320': { model: 'a320/a320.glb', scale: 1.0, name: 'Airbus A320' },
        'A20N': { model: 'a320/a320.glb', scale: 1.0, name: 'Airbus A320neo' },
        'A321': { model: 'a320/a320.glb', scale: 1.05, name: 'Airbus A321' },
        'A21N': { model: 'a320/a320.glb', scale: 1.05, name: 'Airbus A321neo' },

        // Airbus widebody
        'A332': { model: 'a332/a332.glb', scale: 1.0, name: 'Airbus A330-200' },
        'A333': { model: 'a333/a333.glb', scale: 1.0, name: 'Airbus A330-300' },
        'A338': { model: 'a333/a333.glb', scale: 1.0, name: 'Airbus A330-800neo' },
        'A339': { model: 'a333/a333.glb', scale: 1.0, name: 'Airbus A330-900neo' },
        'A343': { model: 'a343/a343.glb', scale: 1.0, name: 'Airbus A340-300' },
        'A345': { model: 'a343/a343.glb', scale: 1.05, name: 'Airbus A340-500' },
        'A346': { model: 'a343/a343.glb', scale: 1.08, name: 'Airbus A340-600' },
        'A359': { model: 'a350/a350.glb', scale: 1.0, name: 'Airbus A350-900' },
        'A35K': { model: 'a350/a350.glb', scale: 1.05, name: 'Airbus A350-1000' },
        'A380': { model: 'a380/a380.glb', scale: 1.0, name: 'Airbus A380' },
        'A388': { model: 'a380/a380.glb', scale: 1.0, name: 'Airbus A380-800' },

        // Boeing narrowbody
        'B732': { model: 'b737/b737.glb', scale: 0.9, name: 'Boeing 737-200' },
        'B733': { model: 'b737/b737.glb', scale: 0.95, name: 'Boeing 737-300' },
        'B734': { model: 'b737/b737.glb', scale: 0.95, name: 'Boeing 737-400' },
        'B735': { model: 'b737/b737.glb', scale: 0.9, name: 'Boeing 737-500' },
        'B736': { model: 'b737/b737.glb', scale: 0.95, name: 'Boeing 737-600' },
        'B737': { model: 'b737/b737.glb', scale: 1.0, name: 'Boeing 737-700' },
        'B738': { model: 'b737/b737.glb', scale: 1.0, name: 'Boeing 737-800' },
        'B739': { model: 'b737/b737.glb', scale: 1.02, name: 'Boeing 737-900' },
        'B37M': { model: 'b737/b737.glb', scale: 1.0, name: 'Boeing 737 MAX 7' },
        'B38M': { model: 'b737/b737.glb', scale: 1.0, name: 'Boeing 737 MAX 8' },
        'B39M': { model: 'b737/b737.glb', scale: 1.02, name: 'Boeing 737 MAX 9' },
        'B3XM': { model: 'b737/b737.glb', scale: 1.04, name: 'Boeing 737 MAX 10' },

        // Boeing widebody - 747
        'B741': { model: 'b744/b744.glb', scale: 0.95, name: 'Boeing 747-100' },
        'B742': { model: 'b744/b744.glb', scale: 0.95, name: 'Boeing 747-200' },
        'B743': { model: 'b744/b744.glb', scale: 0.98, name: 'Boeing 747-300' },
        'B744': { model: 'b744/b744.glb', scale: 1.0, name: 'Boeing 747-400' },
        'B748': { model: 'b748/b748.glb', scale: 1.0, name: 'Boeing 747-8' },
        'B74S': { model: 'b744/b744.glb', scale: 1.0, name: 'Boeing 747SP' },

        // Boeing widebody - 757
        'B752': { model: 'b752/b752.glb', scale: 1.0, name: 'Boeing 757-200' },
        'B753': { model: 'b752/b752.glb', scale: 1.05, name: 'Boeing 757-300' },

        // Boeing widebody - 767
        'B762': { model: 'b767/b767.glb', scale: 0.95, name: 'Boeing 767-200' },
        'B763': { model: 'b767/b767.glb', scale: 1.0, name: 'Boeing 767-300' },
        'B764': { model: 'b767/b767.glb', scale: 1.05, name: 'Boeing 767-400' },

        // Boeing widebody - 777
        'B772': { model: 'b777/b777.glb', scale: 0.95, name: 'Boeing 777-200' },
        'B77L': { model: 'b777/b777.glb', scale: 0.98, name: 'Boeing 777-200LR' },
        'B773': { model: 'b777/b777.glb', scale: 1.0, name: 'Boeing 777-300' },
        'B77W': { model: 'b777/b777.glb', scale: 1.02, name: 'Boeing 777-300ER' },
        'B778': { model: 'b777/b777.glb', scale: 1.0, name: 'Boeing 777-8' },
        'B779': { model: 'b777/b777.glb', scale: 1.03, name: 'Boeing 777-9' },

        // Boeing widebody - 787
        'B788': { model: 'b788/b788.glb', scale: 1.0, name: 'Boeing 787-8' },
        'B789': { model: 'b788/b788.glb', scale: 1.05, name: 'Boeing 787-9' },
        'B78X': { model: 'b788/b788.glb', scale: 1.08, name: 'Boeing 787-10' },

        // Boeing legacy
        'B703': { model: 'b707/b707.glb', scale: 1.0, name: 'Boeing 707' },
        'B707': { model: 'b707/b707.glb', scale: 1.0, name: 'Boeing 707' },
        'DC10': { model: 'md11/md11.glb', scale: 0.95, name: 'McDonnell Douglas DC-10' },
        'MD11': { model: 'md11/md11.glb', scale: 1.0, name: 'McDonnell Douglas MD-11' },

        // Embraer
        'E135': { model: 'e145/e145.glb', scale: 0.95, name: 'Embraer ERJ-135' },
        'E145': { model: 'e145/e145.glb', scale: 1.0, name: 'Embraer ERJ-145' },
        'E170': { model: 'e190/e190.glb', scale: 0.9, name: 'Embraer E170' },
        'E175': { model: 'e190/e190.glb', scale: 0.95, name: 'Embraer E175' },
        'E190': { model: 'e190/e190.glb', scale: 1.0, name: 'Embraer E190' },
        'E195': { model: 'e190/e190.glb', scale: 1.05, name: 'Embraer E195' },
        'E290': { model: 'e190/e190.glb', scale: 1.0, name: 'Embraer E190-E2' },
        'E295': { model: 'e190/e190.glb', scale: 1.05, name: 'Embraer E195-E2' },

        // Bombardier/Airbus Canada
        'BCS1': { model: 'bcs1/bcs1.glb', scale: 1.0, name: 'Airbus A220-100' },
        'BCS3': { model: 'bcs1/bcs1.glb', scale: 1.05, name: 'Airbus A220-300' },
        'CRJ1': { model: 'crj2/crj2.glb', scale: 0.9, name: 'CRJ-100' },
        'CRJ2': { model: 'crj2/crj2.glb', scale: 1.0, name: 'CRJ-200' },
        'CRJ7': { model: 'crj9/crj9.glb', scale: 0.95, name: 'CRJ-700' },
        'CRJ9': { model: 'crj9/crj9.glb', scale: 1.0, name: 'CRJ-900' },
        'CRJX': { model: 'crj9/crj9.glb', scale: 1.02, name: 'CRJ-1000' },

        // ATR
        'AT43': { model: 'atr42/atr42.glb', scale: 1.0, name: 'ATR 42-300' },
        'AT45': { model: 'atr42/atr42.glb', scale: 1.0, name: 'ATR 42-500' },
        'AT46': { model: 'atr42/atr42.glb', scale: 1.0, name: 'ATR 42-600' },
        'AT72': { model: 'atr72/atr72.glb', scale: 1.0, name: 'ATR 72' },
        'AT75': { model: 'atr72/atr72.glb', scale: 1.0, name: 'ATR 72-500' },
        'AT76': { model: 'atr72/atr72.glb', scale: 1.0, name: 'ATR 72-600' },

        // Dash
        'DH8A': { model: 'dhc4/dhc4.glb', scale: 1.0, name: 'Dash 8-100' },
        'DH8B': { model: 'dhc4/dhc4.glb', scale: 1.0, name: 'Dash 8-200' },
        'DH8C': { model: 'dhc4/dhc4.glb', scale: 1.1, name: 'Dash 8-300' },
        'DH8D': { model: 'dhc4/dhc4.glb', scale: 1.2, name: 'Dash 8-400' },

        // General aviation - Single engine
        'C150': { model: 'c182/c182.glb', scale: 0.85, name: 'Cessna 150' },
        'C152': { model: 'c182/c182.glb', scale: 0.85, name: 'Cessna 152' },
        'C172': { model: 'c182/c182.glb', scale: 0.9, name: 'Cessna 172' },
        'C182': { model: 'c182/c182.glb', scale: 1.0, name: 'Cessna 182' },
        'C206': { model: 'c182/c182.glb', scale: 1.05, name: 'Cessna 206' },
        'C208': { model: 'c208/c208.glb', scale: 1.0, name: 'Cessna 208 Caravan' },
        'C210': { model: 'c182/c182.glb', scale: 1.0, name: 'Cessna 210' },
        'P28A': { model: 'pa28/pa28.glb', scale: 1.0, name: 'Piper PA-28 Cherokee' },
        'P28B': { model: 'pa28/pa28.glb', scale: 1.0, name: 'Piper PA-28 Arrow' },
        'PA18': { model: 'pa18/pa18.glb', scale: 1.0, name: 'Piper PA-18 Super Cub' },
        'PA22': { model: 'pa22/pa22.glb', scale: 1.0, name: 'Piper PA-22 Tri-Pacer' },
        'PA32': { model: 'pa32/pa32.glb', scale: 1.0, name: 'Piper PA-32 Cherokee Six' },
        'SR20': { model: 'sr22/sr22.glb', scale: 0.95, name: 'Cirrus SR20' },
        'SR22': { model: 'sr22/sr22.glb', scale: 1.0, name: 'Cirrus SR22' },
        'DA40': { model: 'sr22/sr22.glb', scale: 0.95, name: 'Diamond DA40' },
        'DA42': { model: 'sr22/sr22.glb', scale: 1.0, name: 'Diamond DA42' },
        'DR40': { model: 'dr40/dr40.glb', scale: 1.0, name: 'Robin DR400' },

        // General aviation - Multi engine / Turboprop
        'C310': { model: 'c421/c421.glb', scale: 0.95, name: 'Cessna 310' },
        'C340': { model: 'c421/c421.glb', scale: 0.95, name: 'Cessna 340' },
        'C402': { model: 'c421/c421.glb', scale: 1.0, name: 'Cessna 402' },
        'C421': { model: 'c421/c421.glb', scale: 1.0, name: 'Cessna 421' },
        'BE58': { model: 'c421/c421.glb', scale: 1.0, name: 'Beechcraft Baron 58' },
        'BE9L': { model: 'c421/c421.glb', scale: 1.0, name: 'Beechcraft King Air 90' },
        'BE20': { model: 'c421/c421.glb', scale: 1.1, name: 'Beechcraft King Air 200' },
        'BE35': { model: 'sr22/sr22.glb', scale: 1.0, name: 'Beechcraft Bonanza' },
        'PC12': { model: 'pc12/pc12.glb', scale: 1.0, name: 'Pilatus PC-12' },
        'PC21': { model: 'pc21/pc21.glb', scale: 1.0, name: 'Pilatus PC-21' },
        'TBM7': { model: 'pc12/pc12.glb', scale: 0.9, name: 'TBM 700' },
        'TBM8': { model: 'pc12/pc12.glb', scale: 0.9, name: 'TBM 850' },
        'TBM9': { model: 'pc12/pc12.glb', scale: 0.9, name: 'TBM 900' },

        // Business jets
        'C500': { model: 'c550/c550.glb', scale: 0.9, name: 'Cessna Citation I' },
        'C510': { model: 'c550/c550.glb', scale: 0.85, name: 'Cessna Citation Mustang' },
        'C525': { model: 'c550/c550.glb', scale: 0.9, name: 'Cessna Citation CJ1' },
        'C550': { model: 'c550/c550.glb', scale: 1.0, name: 'Cessna Citation II' },
        'C560': { model: 'c550/c550.glb', scale: 1.05, name: 'Cessna Citation V' },
        'C56X': { model: 'c550/c550.glb', scale: 1.1, name: 'Cessna Citation Excel' },
        'C680': { model: 'c550/c550.glb', scale: 1.15, name: 'Cessna Citation Sovereign' },
        'C700': { model: 'c550/c550.glb', scale: 1.2, name: 'Cessna Citation Longitude' },
        'E35L': { model: 'c550/c550.glb', scale: 1.0, name: 'Embraer Legacy 450' },
        'E545': { model: 'c550/c550.glb', scale: 1.1, name: 'Embraer Legacy 500' },
        'E550': { model: 'c550/c550.glb', scale: 1.15, name: 'Embraer Legacy 600' },
        'E55P': { model: 'c550/c550.glb', scale: 1.0, name: 'Embraer Phenom 300' },
        'GL5T': { model: 'c550/c550.glb', scale: 1.3, name: 'Bombardier Global 5000' },
        'GL7T': { model: 'c550/c550.glb', scale: 1.35, name: 'Bombardier Global 7500' },
        'GLEX': { model: 'c550/c550.glb', scale: 1.3, name: 'Bombardier Global Express' },
        'CL30': { model: 'c550/c550.glb', scale: 1.1, name: 'Bombardier Challenger 300' },
        'CL35': { model: 'c550/c550.glb', scale: 1.1, name: 'Bombardier Challenger 350' },
        'CL60': { model: 'c550/c550.glb', scale: 1.2, name: 'Bombardier Challenger 600' },
        'LJ35': { model: 'c550/c550.glb', scale: 0.9, name: 'Learjet 35' },
        'LJ45': { model: 'c550/c550.glb', scale: 0.95, name: 'Learjet 45' },
        'LJ60': { model: 'c550/c550.glb', scale: 1.0, name: 'Learjet 60' },
        'LJ75': { model: 'c550/c550.glb', scale: 1.0, name: 'Learjet 75' },
        'G280': { model: 'c550/c550.glb', scale: 1.1, name: 'Gulfstream G280' },
        'GLF4': { model: 'c550/c550.glb', scale: 1.2, name: 'Gulfstream G450' },
        'GLF5': { model: 'c550/c550.glb', scale: 1.25, name: 'Gulfstream G550' },
        'GLF6': { model: 'c550/c550.glb', scale: 1.3, name: 'Gulfstream G650' },
        'FA7X': { model: 'c550/c550.glb', scale: 1.2, name: 'Dassault Falcon 7X' },
        'F900': { model: 'c550/c550.glb', scale: 1.15, name: 'Dassault Falcon 900' },

        // Helicopters
        'B407': { model: 'b407/b407.glb', scale: 1.0, name: 'Bell 407' },
        'B429': { model: 'b407/b407.glb', scale: 1.1, name: 'Bell 429' },
        'EC35': { model: 'ec35/ec35.glb', scale: 1.0, name: 'Eurocopter EC135' },
        'EC45': { model: 'ec35/ec35.glb', scale: 1.1, name: 'Eurocopter EC145' },
        'EC55': { model: 'ec35/ec35.glb', scale: 1.2, name: 'Eurocopter EC155' },
        'R22': { model: 'b407/b407.glb', scale: 0.6, name: 'Robinson R22' },
        'R44': { model: 'b407/b407.glb', scale: 0.7, name: 'Robinson R44' },
        'R66': { model: 'b407/b407.glb', scale: 0.75, name: 'Robinson R66' },
        'S76': { model: 'b407/b407.glb', scale: 1.2, name: 'Sikorsky S-76' },
        'S92': { model: 'b407/b407.glb', scale: 1.4, name: 'Sikorsky S-92' },
        'A109': { model: 'b407/b407.glb', scale: 1.0, name: 'AgustaWestland AW109' },
        'A139': { model: 'b407/b407.glb', scale: 1.2, name: 'AgustaWestland AW139' },

        // Russian/Soviet aircraft
        'T134': { model: 't134/t134.glb', scale: 1.0, name: 'Tupolev Tu-134' },
        'T154': { model: 't134/t134.glb', scale: 1.15, name: 'Tupolev Tu-154' },
        'T204': { model: 'a320/a320.glb', scale: 1.0, name: 'Tupolev Tu-204' },
        'IL96': { model: 'a343/a343.glb', scale: 1.0, name: 'Ilyushin Il-96' },
        'SU95': { model: 'e190/e190.glb', scale: 1.0, name: 'Sukhoi Superjet 100' },
        'MC21': { model: 'a320/a320.glb', scale: 1.0, name: 'Irkut MC-21' },

        // Cargo
        'A306': { model: 'a332/a332.glb', scale: 0.95, name: 'Airbus A300-600F' },
        'A30B': { model: 'a332/a332.glb', scale: 0.9, name: 'Airbus A300B4' },
        'AN12': { model: 'b744/b744.glb', scale: 0.7, name: 'Antonov An-12' },
        'AN24': { model: 'atr72/atr72.glb', scale: 1.0, name: 'Antonov An-24' },
        'AN26': { model: 'atr72/atr72.glb', scale: 1.0, name: 'Antonov An-26' },
        'AN72': { model: 'atr72/atr72.glb', scale: 1.1, name: 'Antonov An-72' },
        'IL76': { model: 'b744/b744.glb', scale: 0.9, name: 'Ilyushin Il-76' },

        // Military
        'C130': { model: 'b744/b744.glb', scale: 0.65, name: 'Lockheed C-130 Hercules' },
        'C17': { model: 'b744/b744.glb', scale: 0.85, name: 'Boeing C-17 Globemaster III' },
        'KC10': { model: 'md11/md11.glb', scale: 1.0, name: 'McDonnell Douglas KC-10' },
        'KC35': { model: 'b767/b767.glb', scale: 1.0, name: 'Boeing KC-135 Stratotanker' },
        'E3CF': { model: 'b707/b707.glb', scale: 1.0, name: 'Boeing E-3 Sentry AWACS' },
        'P40': { model: 'p40/p40.glb', scale: 1.0, name: 'Curtiss P-40 Warhawk' },

        // Fokker
        'F50': { model: 'atr72/atr72.glb', scale: 1.0, name: 'Fokker 50' },
        'F70': { model: 'e190/e190.glb', scale: 0.9, name: 'Fokker 70' },
        'F100': { model: 'e190/e190.glb', scale: 1.0, name: 'Fokker 100' },

        // SAAB
        'SF34': { model: 'atr42/atr42.glb', scale: 1.0, name: 'Saab 340' },
        'SB20': { model: 'atr72/atr72.glb', scale: 1.0, name: 'Saab 2000' },

        // Gliders and ultralights
        'GLID': { model: 'ask21/ask21.glb', scale: 1.0, name: 'Glider' },
        'ASK21': { model: 'ask21/ask21.glb', scale: 1.0, name: 'ASK-21' },
        'ULAC': { model: 'ulac/ulac.glb', scale: 1.0, name: 'Ultralight' },
        'PARA': { model: 'paraglider/paraglider.glb', scale: 1.0, name: 'Paraglider' },

        // Gazelle (helicopter)
        'GAZL': { model: 'gazl/gazl.glb', scale: 1.0, name: 'Aerospatiale Gazelle' }
    },

    // Default model for unknown aircraft types
    defaultModel: { model: 'a320/a320.glb', scale: 1.0, name: 'Unknown Aircraft' },

    // Aircraft label settings
    aircraft: {
        defaultColor: '#ffffff',
        labelColor: '#ffcc00',
        labelFont: 'bold 14px monospace',
        labelOutlineWidth: 3
    },

    // Airline color schemes by callsign prefix (3 letters)
    airlineColors: {
        'LOT': { name: 'LOT Polish Airlines', primary: '#003366', accent: '#DC0032' },
        'RYR': { name: 'Ryanair', primary: '#073590', accent: '#F7C82E' },
        'WZZ': { name: 'Wizz Air', primary: '#E20074', accent: '#FFFFFF' },
        'EZY': { name: 'easyJet', primary: '#FF6600', accent: '#FFFFFF' },
        'DLH': { name: 'Lufthansa', primary: '#0A1F44', accent: '#F0AB00' },
        'BAW': { name: 'British Airways', primary: '#BA0C2F', accent: '#012169' },
        'AFR': { name: 'Air France', primary: '#002157', accent: '#ED1B2E' },
        'KLM': { name: 'KLM', primary: '#00A1DE', accent: '#FFFFFF' },
        'UAE': { name: 'Emirates', primary: '#D4A855', accent: '#007D4A' },
        'QTR': { name: 'Qatar Airways', primary: '#5C0931', accent: '#FFFFFF' },
        'ETD': { name: 'Etihad Airways', primary: '#BD8B13', accent: '#1A1A1A' },
        'THY': { name: 'Turkish Airlines', primary: '#C8102E', accent: '#FFFFFF' },
        'SAS': { name: 'SAS Scandinavian', primary: '#000080', accent: '#C8102E' },
        'FIN': { name: 'Finnair', primary: '#0B1560', accent: '#FFFFFF' },
        'AUA': { name: 'Austrian', primary: '#E20A17', accent: '#FFFFFF' },
        'SWR': { name: 'Swiss', primary: '#E2001A', accent: '#FFFFFF' },
        'BEL': { name: 'Brussels Airlines', primary: '#003366', accent: '#ED2939' },
        'TAP': { name: 'TAP Portugal', primary: '#008C45', accent: '#ED2939' },
        'IBE': { name: 'Iberia', primary: '#FFD700', accent: '#ED1C24' },
        'VLG': { name: 'Vueling', primary: '#FFD100', accent: '#000000' },
        'AEE': { name: 'Aegean Airlines', primary: '#0B2545', accent: '#FFFFFF' },
        'AAL': { name: 'American Airlines', primary: '#0078D2', accent: '#BF0D3E' },
        'UAL': { name: 'United Airlines', primary: '#002244', accent: '#00AEEF' },
        'DAL': { name: 'Delta Air Lines', primary: '#003366', accent: '#C8102E' },
        'SWA': { name: 'Southwest Airlines', primary: '#304CB2', accent: '#FFBF27' },
        'JBU': { name: 'JetBlue', primary: '#003876', accent: '#FF6600' },
        'AAR': { name: 'Asiana Airlines', primary: '#C8102E', accent: '#FFFFFF' },
        'KAL': { name: 'Korean Air', primary: '#003087', accent: '#FFFFFF' },
        'ANA': { name: 'All Nippon Airways', primary: '#00205B', accent: '#00A0E9' },
        'JAL': { name: 'Japan Airlines', primary: '#C8102E', accent: '#FFFFFF' },
        'CPA': { name: 'Cathay Pacific', primary: '#006564', accent: '#FFFFFF' },
        'SIA': { name: 'Singapore Airlines', primary: '#002D62', accent: '#F0AB00' },
        'QFA': { name: 'Qantas', primary: '#E20A17', accent: '#FFFFFF' },
        'ANZ': { name: 'Air New Zealand', primary: '#000000', accent: '#00A4D3' },
        'CCA': { name: 'Air China', primary: '#C8102E', accent: '#FFD700' },
        'CES': { name: 'China Eastern', primary: '#ED1C24', accent: '#003DA5' },
        'CSN': { name: 'China Southern', primary: '#003087', accent: '#ED1C24' },
        'CSZ': { name: 'Shenzhen Airlines', primary: '#003366', accent: '#ED1C24' },
        'AIC': { name: 'Air India', primary: '#C8102E', accent: '#FF9933' },
        'ROU': { name: 'Air Canada Rouge', primary: '#F01428', accent: '#000000' },
        'ACA': { name: 'Air Canada', primary: '#F01428', accent: '#000000' },
        'AVA': { name: 'Avianca', primary: '#ED1C24', accent: '#000000' },
        'LAN': { name: 'LATAM', primary: '#003087', accent: '#E4002B' },
        'GLO': { name: 'Gol', primary: '#FF6600', accent: '#003366' },
        'AZU': { name: 'Azul', primary: '#003087', accent: '#00A0E9' },
        'RAM': { name: 'Royal Air Maroc', primary: '#006233', accent: '#C8102E' },
        'MSR': { name: 'EgyptAir', primary: '#003366', accent: '#C8102E' },
        'SAA': { name: 'South African Airways', primary: '#003366', accent: '#FFD700' },
        'ETH': { name: 'Ethiopian Airlines', primary: '#008751', accent: '#ED1C24' },
        'KQA': { name: 'Kenya Airways', primary: '#C8102E', accent: '#007D4A' },
        'SVA': { name: 'Saudia', primary: '#006633', accent: '#FFD700' },
        'GIA': { name: 'Garuda Indonesia', primary: '#00A651', accent: '#003366' },
        'MAS': { name: 'Malaysia Airlines', primary: '#C8102E', accent: '#003366' },
        'THA': { name: 'Thai Airways', primary: '#7B3F98', accent: '#FFD700' },
        'VNL': { name: 'VietJet Air', primary: '#ED1C24', accent: '#FFD700' },
        'HVN': { name: 'Vietnam Airlines', primary: '#003366', accent: '#00A651' },
        'AFL': { name: 'Aeroflot', primary: '#ED1C24', accent: '#003366' },
        'AZO': { name: 'Azores Airlines', primary: '#003366', accent: '#FFFFFF' },
        'TVF': { name: 'Transavia France', primary: '#00D66E', accent: '#FFFFFF' },
        'EJU': { name: 'easyJet Europe', primary: '#FF6600', accent: '#FFFFFF' },
        'NLY': { name: 'Edelweiss Air', primary: '#E20A17', accent: '#FFFFFF' },
        'CFG': { name: 'Condor', primary: '#FFD700', accent: '#000000' },
        'TUI': { name: 'TUI fly', primary: '#D40E14', accent: '#003366' },
        'FDX': { name: 'FedEx Express', primary: '#4D148C', accent: '#FF6600' },
        'UPS': { name: 'UPS Airlines', primary: '#351C15', accent: '#FFB500' },
        'GTI': { name: 'Atlas Air', primary: '#003366', accent: '#000000' },
        'ABW': { name: 'AirBridgeCargo', primary: '#003366', accent: '#FF6600' },
        'CLX': { name: 'Cargolux', primary: '#C8102E', accent: '#FFFFFF' },
        'MPH': { name: 'Martinair Cargo', primary: '#FF6600', accent: '#003366' }
    },

    // Common airports for quick access
    airports: [
        { icao: 'EPWA', name: 'Warsaw Chopin', lat: 52.1657, lon: 20.9671, elevation: 110 },
        { icao: 'EPMO', name: 'Warsaw Modlin', lat: 52.4511, lon: 20.6518, elevation: 104 },
        { icao: 'EPKK', name: 'Krakow Balice', lat: 50.0777, lon: 19.7848, elevation: 241 },
        { icao: 'EPGD', name: 'Gdansk Lech Walesa', lat: 54.3776, lon: 18.4662, elevation: 149 },
        { icao: 'EPWR', name: 'Wroclaw Copernicus', lat: 51.1027, lon: 16.8858, elevation: 120 },
        { icao: 'EPPO', name: 'Poznan Lawica', lat: 52.4211, lon: 16.8263, elevation: 94 },
        { icao: 'EPKT', name: 'Katowice Pyrzowice', lat: 50.4743, lon: 19.0800, elevation: 303 },
        { icao: 'KJFK', name: 'New York JFK', lat: 40.6413, lon: -73.7781, elevation: 4 },
        { icao: 'KLAX', name: 'Los Angeles', lat: 33.9425, lon: -118.4081, elevation: 39 },
        { icao: 'KORD', name: 'Chicago OHare', lat: 41.9742, lon: -87.9073, elevation: 205 },
        { icao: 'KATL', name: 'Atlanta Hartsfield', lat: 33.6367, lon: -84.4281, elevation: 313 },
        { icao: 'EGLL', name: 'London Heathrow', lat: 51.4700, lon: -0.4543, elevation: 25 },
        { icao: 'EGKK', name: 'London Gatwick', lat: 51.1537, lon: -0.1821, elevation: 62 },
        { icao: 'EGLC', name: 'London City', lat: 51.5053, lon: 0.0553, elevation: 6 },
        { icao: 'LFPG', name: 'Paris CDG', lat: 49.0097, lon: 2.5479, elevation: 119 },
        { icao: 'LFPO', name: 'Paris Orly', lat: 48.7233, lon: 2.3794, elevation: 89 },
        { icao: 'EDDF', name: 'Frankfurt', lat: 50.0379, lon: 8.5622, elevation: 111 },
        { icao: 'EDDM', name: 'Munich', lat: 48.3538, lon: 11.7861, elevation: 453 },
        { icao: 'EHAM', name: 'Amsterdam Schiphol', lat: 52.3105, lon: 4.7683, elevation: -3 },
        { icao: 'LEMD', name: 'Madrid Barajas', lat: 40.4936, lon: -3.5668, elevation: 609 },
        { icao: 'LEBL', name: 'Barcelona El Prat', lat: 41.2971, lon: 2.0785, elevation: 4 },
        { icao: 'LIRF', name: 'Rome Fiumicino', lat: 41.8003, lon: 12.2389, elevation: 5 },
        { icao: 'LSZH', name: 'Zurich', lat: 47.4647, lon: 8.5492, elevation: 432 },
        { icao: 'LOWW', name: 'Vienna', lat: 48.1103, lon: 16.5697, elevation: 183 },
        { icao: 'EKCH', name: 'Copenhagen', lat: 55.6180, lon: 12.6561, elevation: 5 },
        { icao: 'ENGM', name: 'Oslo Gardermoen', lat: 60.1939, lon: 11.1004, elevation: 208 },
        { icao: 'ESSA', name: 'Stockholm Arlanda', lat: 59.6519, lon: 17.9186, elevation: 42 },
        { icao: 'EFHK', name: 'Helsinki Vantaa', lat: 60.3172, lon: 24.9633, elevation: 55 },
        { icao: 'LTFM', name: 'Istanbul', lat: 41.2753, lon: 28.7519, elevation: 99 },
        { icao: 'OMDB', name: 'Dubai', lat: 25.2528, lon: 55.3644, elevation: 19 },
        { icao: 'OTHH', name: 'Doha Hamad', lat: 25.2731, lon: 51.6081, elevation: 4 },
        { icao: 'VHHH', name: 'Hong Kong', lat: 22.3080, lon: 113.9185, elevation: 9 },
        { icao: 'RJTT', name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798, elevation: 6 },
        { icao: 'RKSI', name: 'Seoul Incheon', lat: 37.4602, lon: 126.4407, elevation: 7 },
        { icao: 'WSSS', name: 'Singapore Changi', lat: 1.3644, lon: 103.9915, elevation: 7 },
        { icao: 'YSSY', name: 'Sydney', lat: -33.9461, lon: 151.1772, elevation: 6 }
    ]
};

// Make available globally
window.Config = Config;
