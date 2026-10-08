import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Undo2 } from 'lucide-react';

const toRadians = (value) => (value * Math.PI) / 180;

const computePolygonAreaHectares = (coords) => {
  if (!Array.isArray(coords) || coords.length < 3) {
    return 0;
  }

  const earthRadiusMeters = 6378137;
  const meanLatRad = toRadians(
    coords.reduce((sum, point) => sum + point[0], 0) / coords.length,
  );
  const projected = coords.map(([lat, lon]) => {
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    return [
      earthRadiusMeters * lonRad * Math.cos(meanLatRad),
      earthRadiusMeters * latRad,
    ];
  });

  let area = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[(i + 1) % projected.length];
    area += (x1 * y2) - (x2 * y1);
  }
  const areaSqMeters = Math.abs(area) / 2;
  return Number((areaSqMeters / 10000).toFixed(4));
};

const BASE_LAYERS = {
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri',
  },
  map: {
    label: 'Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
};

const ClickHandler = ({ addPoint }) => {
  useMapEvents({
    click(e) {
      addPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapPolygonSelector = ({ initialPoints = [], onCoordinatesGenerated, onAreaComputed }) => {
  const [points, setPoints] = useState(initialPoints);
  const [layer, setLayer] = useState('satellite');

  const update = (newPoints) => {
    setPoints(newPoints);
    onCoordinatesGenerated(newPoints.length >= 3 ? newPoints : []);
    onAreaComputed?.(computePolygonAreaHectares(newPoints));
  };

  const area = computePolygonAreaHectares(points);
  const center = points[0] || [13.0827, 80.2707];

  return (
    <div className="space-y-3">
      <p className="text-slate-300">
        Zoom in to your land and <strong className="text-white">click each corner</strong> of it on the map. You need at least 3 corners.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-white/15 overflow-hidden text-sm">
          {Object.entries(BASE_LAYERS).map(([key, base]) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayer(key)}
              className={`px-3 py-1.5 ${layer === key ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-white/[0.06]'}`}
            >
              {base.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => update(points.slice(0, -1))} disabled={points.length === 0} className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40">
            <Undo2 className="w-4 h-4" /> Undo last corner
          </button>
          <button type="button" onClick={() => update([])} disabled={points.length === 0} className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40">
            <RotateCcw className="w-4 h-4" /> Start again
          </button>
        </div>
      </div>

      <div className="h-[420px] w-full rounded-xl overflow-hidden border border-white/15 relative z-0">
        <MapContainer center={center} zoom={points.length ? 16 : 12} scrollWheelZoom className="h-full w-full">
          <TileLayer key={layer} attribution={BASE_LAYERS[layer].attribution} url={BASE_LAYERS[layer].url} maxZoom={19} />
          <ClickHandler addPoint={(point) => update([...points, point])} />
          {points.length > 0 && (
            <Polygon positions={points} pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.25, weight: 2 }} />
          )}
          {points.map((point, index) => (
            <CircleMarker key={index} center={point} radius={5} pathOptions={{ color: '#ffffff', fillColor: '#10b981', fillOpacity: 1, weight: 2 }} />
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-6 text-slate-300">
        <p>Corners: <span className="text-white font-semibold">{points.length}</span></p>
        <p>Land area: <span className="text-white font-semibold">{area > 0 ? `${Number(area.toFixed(2))} hectares` : '–'}</span></p>
      </div>
    </div>
  );
};

export default MapPolygonSelector;
