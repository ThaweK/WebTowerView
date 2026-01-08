# WebTowerView

Lekka aplikacja webowa do wizualizacji 3D lotniska z perspektywy wieży kontroli lotów.

## Funkcje

- **Widok 3D z wieży** - realistyczna perspektywa kontrolera ruchu lotniczego
- **Dane satelitarne** - wykorzystanie CesiumJS z danymi OpenStreetMap
- **Budynki 3D** - automatyczne ładowanie budynków z OSM Buildings (wymaga tokenu Cesium Ion)
- **Własny overlay** - możliwość dodania własnych pasów startowych, dróg kołowania i apronów
- **Import GeoJSON** - wczytywanie layoutu lotniska z plików GeoJSON
- **Zarządzanie samolotami** - dodawanie i pozycjonowanie samolotów na współrzędnych
- **Kontrola kamery** - obrót, pochylenie, zoom z pozycji wieży

## Uruchomienie

```bash
# Opcja 1: Użyj dowolnego serwera HTTP
npx serve .

# Opcja 2: Python
python -m http.server 8000

# Opcja 3: Otwórz index.html bezpośrednio (niektóre funkcje mogą nie działać)
```

Otwórz http://localhost:3000 (lub odpowiedni port) w przeglądarce.

## Cesium Ion Token (opcjonalnie)

Dla pełnej funkcjonalności (teren 3D, budynki OSM) potrzebujesz darmowego tokenu Cesium Ion:

1. Zarejestruj się na https://cesium.com/ion/
2. Wygeneruj token w panelu
3. Wklej token w pliku `src/js/config.js`:

```javascript
CESIUM_ION_TOKEN: 'twój-token-tutaj',
```

**Darmowy tier obejmuje:**
- 5 GB storage
- 100 GB streaming/miesiąc
- Globalny teren 3D
- Budynki 3D z OpenStreetMap

## Sterowanie

| Akcja | Kontrola |
|-------|----------|
| Obrót kamery | LPM + przeciągnij |
| Pochylenie | Scroll / strzałki góra/dół |
| Kierunek | Strzałki lewo/prawo |
| Reset widoku | Klawisz R |

## Własny layout lotniska

Możesz dodać własne obiekty gdy dane satelitarne są nieaktualne:

### Ręcznie przez UI:
- Kliknij "+ Pas startowy" / "+ Droga kołowania" / "+ Apron"
- Wprowadź współrzędne geograficzne

### Przez GeoJSON:
Przygotuj plik GeoJSON z obiektami:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "aeroway": "runway", "ref": "09/27" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[20.95, 52.16], [20.98, 52.16]]
      }
    },
    {
      "type": "Feature",
      "properties": { "aeroway": "taxiway", "ref": "A" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[20.95, 52.162], [20.98, 52.162]]
      }
    }
  ]
}
```

Obsługiwane typy (`aeroway`):
- `runway` - pas startowy
- `taxiway` - droga kołowania
- `apron` - płyta postojowa
- `terminal`, `hangar`, `building` - budynki

## Struktura projektu

```
WebTowerView/
├── index.html              # Główny plik HTML
├── src/
│   ├── css/
│   │   └── style.css       # Style aplikacji
│   └── js/
│       ├── config.js       # Konfiguracja
│       ├── app.js          # Główna aplikacja
│       ├── core/
│       │   ├── towerCamera.js    # Kontrola kamery
│       │   ├── airportOverlay.js # Warstwa overlay
│       │   └── aircraftManager.js # Zarządzanie samolotami
│       ├── ui/
│       │   ├── controlPanel.js   # Panel kontrolny
│       │   └── modals.js         # Okna dialogowe
│       └── utils/
│           ├── coordinates.js    # Narzędzia współrzędnych
│           └── geojsonLoader.js  # Parser GeoJSON
└── README.md
```

## Technologie

- **CesiumJS** - silnik 3D (open source, Apache 2.0)
- **OpenStreetMap** - mapy bazowe
- **OSM Buildings** - budynki 3D (przez Cesium Ion)

## Licencja

MIT
