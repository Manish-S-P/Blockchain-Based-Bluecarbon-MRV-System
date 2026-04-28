import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, MapPin } from 'lucide-react';

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

const ClickHandler = ({ addPoint }) => {
  useMapEvents({
    click(e) {
      addPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapPolygonSelector = ({ onCoordinatesGenerated, onAreaComputed }) => {
  const [points, setPoints] = useState([]);

  const handleAddPoint = (point) => {
    const newPoints = [...points, point];
    setPoints(newPoints);
    onCoordinatesGenerated(newPoints.length >= 3 ? newPoints : []);
    onAreaComputed?.(computePolygonAreaHectares(newPoints));
  };

  const clearPoints = () => {
    setPoints([]);
    onCoordinatesGenerated([]);
    onAreaComputed?.(0);
  };

  const computedArea = computePolygonAreaHectares(points);

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
        <div className="text-sm text-slate-400">
          <p className="font-semibold text-white mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Land Demarcation Tool
          </p>
          <p className="text-xs">Click on the map to plot the corners of your land. At least 3 points required.</p>
          <div className="flex gap-3 mt-2.5">
            <span className="font-mono text-[11px] bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08] text-slate-300">
              Vertices: <span className="text-emerald-400 font-bold">{points.length}</span>
            </span>
            <span className="font-mono text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-emerald-400">
              Area: <span className="font-bold">{computedArea}</span> ha
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={clearPoints}
          className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Map */}
      <div className="h-96 w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg shadow-black/20 relative z-0">
        <MapContainer center={[13.0827, 80.2707]} zoom={12} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler addPoint={handleAddPoint} />
          {points.length > 0 && (
             <Polygon
               positions={points}
               pathOptions={{
                 color: '#34d399',
                 fillColor: '#34d399',
                 fillOpacity: 0.2,
                 weight: 2,
                 dashArray: '5, 5',
               }}
             />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPolygonSelector;
