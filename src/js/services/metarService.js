/**
 * METAR Weather Service
 * Fetches and parses real weather data for airports
 */

class MetarService {
    constructor() {
        this.currentMetar = null;
        this.currentIcao = null;
        this.updateInterval = null;
        this.listeners = [];
    }

    /**
     * Start fetching METAR for an airport
     */
    startUpdates(icao, intervalMs = 60000) {
        this.stopUpdates();
        this.currentIcao = icao.toUpperCase();

        // Fetch immediately
        this.fetchMetar(this.currentIcao);

        // Then fetch periodically (METAR updates every 30-60 min, but we check more often)
        this.updateInterval = setInterval(() => {
            this.fetchMetar(this.currentIcao);
        }, intervalMs);
    }

    /**
     * Stop updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Fetch METAR from aviationweather.gov (free, no API key required)
     */
    async fetchMetar(icao) {
        try {
            // Using NOAA Aviation Weather Center API
            const url = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data && data.length > 0) {
                this.currentMetar = this.parseMetar(data[0]);
                this.notifyListeners();
                console.log('METAR updated:', this.currentMetar.raw);
            }
        } catch (e) {
            console.warn('Failed to fetch METAR:', e.message);
            // Try backup source
            this.fetchMetarBackup(icao);
        }
    }

    /**
     * Backup METAR source
     */
    async fetchMetarBackup(icao) {
        try {
            const url = `https://metar.vatsim.net/${icao}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const raw = await response.text();
            if (raw && raw.includes(icao)) {
                this.currentMetar = this.parseRawMetar(raw.trim());
                this.notifyListeners();
                console.log('METAR (backup) updated:', this.currentMetar.raw);
            }
        } catch (e) {
            console.warn('Backup METAR also failed:', e.message);
        }
    }

    /**
     * Parse METAR from JSON response
     */
    parseMetar(data) {
        return {
            raw: data.rawOb || data.raw || '',
            icao: data.icaoId || data.station_id || this.currentIcao,
            time: data.reportTime || data.observation_time || new Date().toISOString(),
            temp: data.temp ?? null,
            dewpoint: data.dewp ?? null,
            wind: {
                direction: data.wdir ?? null,
                speed: data.wspd ?? null,
                gust: data.wgst ?? null
            },
            visibility: data.visib ?? null,
            altimeter: data.altim ?? null,
            clouds: data.clouds || [],
            wxString: data.wxString || '',
            flightCategory: data.fltcat || this.determineFlightCategory(data)
        };
    }

    /**
     * Parse raw METAR string
     */
    parseRawMetar(raw) {
        const metar = {
            raw: raw,
            icao: this.currentIcao,
            time: new Date().toISOString(),
            temp: null,
            dewpoint: null,
            wind: { direction: null, speed: null, gust: null },
            visibility: null,
            altimeter: null,
            clouds: [],
            wxString: '',
            flightCategory: 'VFR'
        };

        // Parse wind (e.g., 27015G25KT or VRB05KT)
        const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?(KT|MPS)\b/);
        if (windMatch) {
            metar.wind.direction = windMatch[1] === 'VRB' ? 0 : parseInt(windMatch[1]);
            metar.wind.speed = parseInt(windMatch[2]);
            metar.wind.gust = windMatch[4] ? parseInt(windMatch[4]) : null;
        }

        // Parse visibility (e.g., 9999 or 5SM)
        const visMatch = raw.match(/\b(\d{4})\b|\b(\d+)(SM)\b/);
        if (visMatch) {
            if (visMatch[1]) {
                metar.visibility = parseInt(visMatch[1]) / 1000; // Convert meters to km
            } else if (visMatch[2]) {
                metar.visibility = parseInt(visMatch[2]) * 1.60934; // Convert SM to km
            }
        }

        // Parse temperature (e.g., 15/08 or M02/M05)
        const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
        if (tempMatch) {
            metar.temp = tempMatch[1].startsWith('M') ? -parseInt(tempMatch[1].slice(1)) : parseInt(tempMatch[1]);
            metar.dewpoint = tempMatch[2].startsWith('M') ? -parseInt(tempMatch[2].slice(1)) : parseInt(tempMatch[2]);
        }

        // Parse clouds
        const cloudPatterns = raw.matchAll(/\b(FEW|SCT|BKN|OVC|VV)(\d{3})\b/g);
        for (const match of cloudPatterns) {
            metar.clouds.push({
                cover: match[1],
                base: parseInt(match[2]) * 100 // Convert to feet
            });
        }

        // Parse weather phenomena
        const wxMatch = raw.match(/\b(\+|-|VC)?(RA|SN|DZ|FG|BR|HZ|TS|SH|GR|GS)+\b/g);
        if (wxMatch) {
            metar.wxString = wxMatch.join(' ');
        }

        // Parse altimeter
        const altMatch = raw.match(/\b[AQ](\d{4})\b/);
        if (altMatch) {
            metar.altimeter = parseInt(altMatch[1]);
        }

        metar.flightCategory = this.determineFlightCategory(metar);
        return metar;
    }

    /**
     * Determine flight category (VFR, MVFR, IFR, LIFR)
     */
    determineFlightCategory(metar) {
        const vis = metar.visibility || metar.visib || 10;
        const ceiling = this.getCeiling(metar.clouds);

        if (vis < 1 || ceiling < 500) return 'LIFR';
        if (vis < 3 || ceiling < 1000) return 'IFR';
        if (vis < 5 || ceiling < 3000) return 'MVFR';
        return 'VFR';
    }

    /**
     * Get ceiling height from clouds
     */
    getCeiling(clouds) {
        if (!clouds || clouds.length === 0) return 99999;

        for (const cloud of clouds) {
            if (['BKN', 'OVC', 'VV'].includes(cloud.cover)) {
                return cloud.base;
            }
        }
        return 99999;
    }

    /**
     * Add listener for METAR updates
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.currentMetar);
            } catch (e) {
                console.error('METAR listener error:', e);
            }
        }
    }

    /**
     * Get current METAR
     */
    getMetar() {
        return this.currentMetar;
    }

    /**
     * Format wind for display
     */
    formatWind(metar) {
        if (!metar || !metar.wind || metar.wind.speed === null) return 'N/A';

        const dir = metar.wind.direction === 0 ? 'VRB' : String(metar.wind.direction).padStart(3, '0');
        let str = `${dir}°/${metar.wind.speed}kt`;
        if (metar.wind.gust) str += ` G${metar.wind.gust}kt`;
        return str;
    }

    /**
     * Format visibility for display
     */
    formatVisibility(metar) {
        if (!metar || metar.visibility === null) return 'N/A';
        if (metar.visibility >= 10) return '10+ km';
        return `${metar.visibility.toFixed(1)} km`;
    }
}

window.MetarService = MetarService;
