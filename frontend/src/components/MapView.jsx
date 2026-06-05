import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useTheme } from '@/lib/theme'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// bbox is [minLon, minLat, maxLon, maxLat]; Leaflet wants [[S,W],[N,E]].
const toBounds = (bbox) => [
  [bbox[1], bbox[0]],
  [bbox[3], bbox[2]],
]

const ESRI_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const CARTO = (t) =>
  `https://{s}.basemaps.cartocdn.com/${t}/{z}/{x}/{y}{r}.png`

export default function MapView({ location, overlays, fires, comparison }) {
  const { theme } = useTheme()
  const mapRef = useRef(null)
  const overlayLayerRef = useRef(null)
  const fireLayerRef = useRef(null)
  const baseRef = useRef(null)
  const markerRef = useRef(null)
  const rectRef = useRef(null)

  useEffect(() => {
    const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([20, 0], 2)

    const carto = L.tileLayer(CARTO(theme === 'dark' ? 'dark_all' : 'light_all'), {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
    })
    // Esri World Imagery is the default base — the left panel shows satellite,
    // not a flat map, by default.
    const esri = L.tileLayer(ESRI_URL, {
      attribution: 'Esri World Imagery',
      maxZoom: 19,
    }).addTo(map)
    L.control.layers(
      { 'Satellite (Esri)': esri, 'Map (themed)': carto },
      {},
      { position: 'topright', collapsed: true },
    ).addTo(map)

    baseRef.current = { carto, esri }
    overlayLayerRef.current = L.layerGroup().addTo(map)
    fireLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap the themed base tiles when the theme changes (only if it's active).
  useEffect(() => {
    const map = mapRef.current
    const base = baseRef.current
    if (!map || !base) return
    if (map.hasLayer(base.carto)) {
      base.carto.setUrl(CARTO(theme === 'dark' ? 'dark_all' : 'light_all'))
    }
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return
    if (markerRef.current) markerRef.current.remove()
    if (rectRef.current) rectRef.current.remove()
    markerRef.current = L.marker([location.lat, location.lon]).addTo(map).bindPopup(location.name)
    const bounds = toBounds(location.bbox)
    rectRef.current = L.rectangle(bounds, { color: '#4cc9f0', weight: 1, fillOpacity: 0, dashArray: '4' }).addTo(map)
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 })
  }, [location])

  useEffect(() => {
    const layer = overlayLayerRef.current
    const map = mapRef.current
    if (!layer || !map || overlays.length === 0) return
    layer.clearLayers()
    const latest = overlays[overlays.length - 1]
    const bounds = toBounds(latest.bbox)
    L.imageOverlay(latest.url, bounds, { opacity: 0.95, interactive: false }).addTo(layer)
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1.0 })
  }, [overlays])

  useEffect(() => {
    const layer = overlayLayerRef.current
    const map = mapRef.current
    if (!layer || !map || !comparison?.frames?.length) return
    layer.clearLayers()
    const newest = comparison.frames[comparison.frames.length - 1]
    const bounds = toBounds(comparison.bbox)
    L.imageOverlay(newest.url, bounds, { opacity: 0.95, interactive: false }).addTo(layer)
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1.0 })
  }, [comparison])

  useEffect(() => {
    const layer = fireLayerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    if (!fires?.fires?.length) return
    fires.fires.forEach((f) => {
      L.circleMarker([f.lat, f.lon], {
        radius: 5,
        color: '#ff3b30',
        weight: 1,
        fillColor: '#ff6b35',
        fillOpacity: 0.85,
      })
        .bindPopup(`🔥 Active fire<br>confidence: ${f.confidence}<br>FRP: ${f.frp ?? '?'} MW<br>${f.acq_date} ${f.acq_time}`)
        .addTo(layer)
    })
    const pts = fires.fires.map((f) => [f.lat, f.lon])
    if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.3), { duration: 1.0 })
  }, [fires])

  return <div id="map" className="size-full" />
}
