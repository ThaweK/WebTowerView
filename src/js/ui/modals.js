/**
 * Modal dialogs handler
 */

const Modals = {
    currentEditId: null,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Aircraft modal
        document.getElementById('ac-save-btn')?.addEventListener('click', () => {
            this.saveAircraft();
        });

        document.getElementById('ac-cancel-btn')?.addEventListener('click', () => {
            this.hideAircraftModal();
        });

        // Runway modal
        document.getElementById('rwy-save-btn')?.addEventListener('click', () => {
            this.saveRunway();
        });

        document.getElementById('rwy-cancel-btn')?.addEventListener('click', () => {
            this.hideRunwayModal();
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // ESC key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            }
        });
    },

    // Aircraft Modal
    showAircraftModal(editId = null) {
        const modal = document.getElementById('aircraft-modal');
        this.currentEditId = editId;

        if (editId) {
            // Edit existing
            const ac = window.app.aircraftManager.getAircraft(editId);
            if (ac) {
                document.getElementById('ac-callsign').value = ac.callsign;
                document.getElementById('ac-type').value = ac.type;
                document.getElementById('ac-lat').value = ac.lat;
                document.getElementById('ac-lon').value = ac.lon;
                document.getElementById('ac-alt').value = ac.altitude;
                document.getElementById('ac-heading').value = ac.heading;
            }
        } else {
            // New aircraft - use current tower position
            const state = window.app.towerCamera.getState();
            document.getElementById('ac-callsign').value = '';
            document.getElementById('ac-type').value = 'A320';
            document.getElementById('ac-lat').value = state.lat.toFixed(5);
            document.getElementById('ac-lon').value = state.lon.toFixed(5);
            document.getElementById('ac-alt').value = 0;
            document.getElementById('ac-heading').value = 0;
        }

        modal.classList.remove('hidden');
        document.getElementById('ac-callsign').focus();
    },

    hideAircraftModal() {
        document.getElementById('aircraft-modal').classList.add('hidden');
        this.currentEditId = null;
    },

    saveAircraft() {
        const callsign = document.getElementById('ac-callsign').value.trim() || `AC${Date.now() % 1000}`;
        const type = document.getElementById('ac-type').value;
        const lat = parseFloat(document.getElementById('ac-lat').value);
        const lon = parseFloat(document.getElementById('ac-lon').value);
        const altitude = parseFloat(document.getElementById('ac-alt').value) || 0;
        const heading = parseFloat(document.getElementById('ac-heading').value) || 0;

        if (isNaN(lat) || isNaN(lon)) {
            alert('Wprowadź prawidłowe współrzędne');
            return;
        }

        if (this.currentEditId) {
            // Update existing
            window.app.aircraftManager.updateAircraft(this.currentEditId, {
                callsign, lat, lon, altitude, heading
            });
        } else {
            // Add new
            window.app.aircraftManager.addAircraft({
                callsign, type, lat, lon, altitude, heading
            });
        }

        this.hideAircraftModal();
    },

    editAircraft(id) {
        this.showAircraftModal(id);
    },

    // Runway Modal
    showRunwayModal() {
        const modal = document.getElementById('runway-modal');
        const state = window.app.towerCamera.getState();

        // Default: create runway near tower
        const offset = 0.005; // ~500m
        document.getElementById('rwy-name').value = '';
        document.getElementById('rwy-start-lat').value = state.lat.toFixed(5);
        document.getElementById('rwy-start-lon').value = (state.lon - offset).toFixed(5);
        document.getElementById('rwy-end-lat').value = state.lat.toFixed(5);
        document.getElementById('rwy-end-lon').value = (state.lon + offset).toFixed(5);
        document.getElementById('rwy-width').value = 45;

        modal.classList.remove('hidden');
        document.getElementById('rwy-name').focus();
    },

    hideRunwayModal() {
        document.getElementById('runway-modal').classList.add('hidden');
    },

    saveRunway() {
        const name = document.getElementById('rwy-name').value.trim() || 'RWY';
        const startLat = parseFloat(document.getElementById('rwy-start-lat').value);
        const startLon = parseFloat(document.getElementById('rwy-start-lon').value);
        const endLat = parseFloat(document.getElementById('rwy-end-lat').value);
        const endLon = parseFloat(document.getElementById('rwy-end-lon').value);
        const width = parseFloat(document.getElementById('rwy-width').value) || 45;

        if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
            alert('Wprowadź prawidłowe współrzędne');
            return;
        }

        window.app.airportOverlay.addRunway({
            name, startLat, startLon, endLat, endLon, width
        });

        this.hideRunwayModal();
    },

    // Taxiway Modal (simplified - inline prompt)
    showTaxiwayModal() {
        const state = window.app.towerCamera.getState();

        const name = prompt('Nazwa drogi kołowania (np. A, B, C):', 'A');
        if (!name) return;

        const coordsStr = prompt(
            'Współrzędne (lon,lat dla każdego punktu, oddzielone średnikiem):\n' +
            'Przykład: 20.96,52.16;20.97,52.16;20.97,52.165',
            `${state.lon.toFixed(4)},${state.lat.toFixed(4)};${(state.lon + 0.01).toFixed(4)},${state.lat.toFixed(4)}`
        );

        if (!coordsStr) return;

        try {
            const coordinates = coordsStr.split(';').map(pair => {
                const [lon, lat] = pair.split(',').map(Number);
                if (isNaN(lon) || isNaN(lat)) throw new Error('Invalid coordinates');
                return [lon, lat];
            });

            window.app.airportOverlay.addTaxiway({
                name: name,
                coordinates: coordinates,
                width: 23
            });
        } catch (e) {
            alert('Błąd parsowania współrzędnych. Format: lon,lat;lon,lat;...');
        }
    },

    // Apron Modal (simplified - inline prompt)
    showApronModal() {
        const state = window.app.towerCamera.getState();

        const name = prompt('Nazwa płyty postojowej:', 'Apron 1');
        if (!name) return;

        const coordsStr = prompt(
            'Współrzędne wielokąta (lon,lat dla każdego wierzchołka, oddzielone średnikiem):\n' +
            'Przykład: 20.96,52.16;20.97,52.16;20.97,52.165;20.96,52.165',
            `${state.lon.toFixed(4)},${state.lat.toFixed(4)};` +
            `${(state.lon + 0.005).toFixed(4)},${state.lat.toFixed(4)};` +
            `${(state.lon + 0.005).toFixed(4)},${(state.lat + 0.003).toFixed(4)};` +
            `${state.lon.toFixed(4)},${(state.lat + 0.003).toFixed(4)}`
        );

        if (!coordsStr) return;

        try {
            const coordinates = coordsStr.split(';').map(pair => {
                const [lon, lat] = pair.split(',').map(Number);
                if (isNaN(lon) || isNaN(lat)) throw new Error('Invalid coordinates');
                return [lon, lat];
            });

            // Close polygon
            if (coordinates.length > 2) {
                coordinates.push(coordinates[0]);
            }

            window.app.airportOverlay.addApron({
                name: name,
                coordinates: coordinates
            });
        } catch (e) {
            alert('Błąd parsowania współrzędnych. Format: lon,lat;lon,lat;...');
        }
    }
};

// Make available globally
window.Modals = Modals;
