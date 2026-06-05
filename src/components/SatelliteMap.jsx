import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import { useTheme } from "./theme-provider.jsx";

function MapFlight({ result }) {
  const map = useMap();

  useEffect(() => {
    if (!result) return;
    const zoom = result.intent.radiusKm > 350 ? 5 : result.intent.radiusKm > 150 ? 6 : 8;
    map.flyTo([result.location.lat, result.location.lon], zoom, {
      duration: 1.8
    });
  }, [map, result]);

  return null;
}

function EventMarkers({ events = [] }) {
  return events.map((event) => (
    <CircleMarker
      key={event.id}
      center={[event.lat, event.lon]}
      radius={6}
      pathOptions={{
        color: "#ff7458",
        weight: 2,
        fillColor: "#ff7458",
        fillOpacity: 0.35
      }}
    >
      <Popup>
        <strong>{event.title}</strong>
        <br />
        {event.category} · {event.distanceKm} km away
      </Popup>
    </CircleMarker>
  ));
}

export default function SatelliteMap({ result, loading }) {
  const { resolvedTheme } = useTheme();
  const center = result
    ? [result.location.lat, result.location.lon]
    : [18, -12];
  const baseMap =
    resolvedTheme === "dark" ? "dark_nolabels" : "light_nolabels";
  const labelMap =
    resolvedTheme === "dark" ? "dark_only_labels" : "light_only_labels";

  return (
    <div className="map-shell">
      <MapContainer
        center={center}
        zoom={3}
        minZoom={2}
        maxZoom={12}
        zoomControl={false}
        worldCopyJump
        className="map"
      >
        <TileLayer
          key={baseMap}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/${baseMap}/{z}/{x}/{y}{r}.png`}
        />
        {result && (
          <TileLayer
            key={result.imagery.tileUrl}
            attribution="NASA GIBS"
            url={result.imagery.tileUrl}
            maxNativeZoom={9}
            maxZoom={12}
            opacity={0.86}
            crossOrigin
          />
        )}
        <TileLayer
          key={labelMap}
          attribution=""
          url={`https://{s}.basemaps.cartocdn.com/${labelMap}/{z}/{x}/{y}{r}.png`}
          pane="overlayPane"
        />
        {result && (
          <>
            <MapFlight result={result} />
            <Circle
              center={[result.location.lat, result.location.lon]}
              radius={result.intent.radiusKm * 1000}
              pathOptions={{
                color: "#b9ff66",
                weight: 1,
                dashArray: "5 8",
                fillColor: "#b9ff66",
                fillOpacity: 0.035
              }}
            />
            <CircleMarker
              center={[result.location.lat, result.location.lon]}
              radius={8}
              pathOptions={{
                color: "#eaffc8",
                weight: 2,
                fillColor: "#b9ff66",
                fillOpacity: 0.9
              }}
            >
              <Popup>{result.location.name}</Popup>
            </CircleMarker>
            <EventMarkers events={result.evidence.events} />
          </>
        )}
      </MapContainer>

      <div className="map-topbar">
        <div className="live-chip">
          <span className="live-dot" />
          {result ? result.imagery.freshness : "Freshest available imagery"}
        </div>
      </div>

      <div className="map-bottom-left">
        <div className="sensor-readout">
          <span className="eyebrow">ACTIVE SENSOR</span>
          <strong>{result ? result.imagery.label : "Multisensor search"}</strong>
          <span>
            {result
              ? `${result.imagery.date} · ${result.imagery.freshness}`
              : "Waiting for target"}
          </span>
        </div>
      </div>

      {!result && !loading && (
        <div className="map-intro">
          <h1>Ask the planet a question.</h1>
          <p>
            Fresh satellite imagery and live Earth data, explained clearly.
          </p>
        </div>
      )}

      {loading && (
        <div className="acquiring-overlay">
          <div className="orbit-loader">
            <span />
            <span />
            <span />
          </div>
          <strong>Acquiring observation window</strong>
          <small>Coordinating sensors and live data feeds</small>
        </div>
      )}
    </div>
  );
}
