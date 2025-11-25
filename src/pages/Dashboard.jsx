// src/pages/Dashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as Esri from "esri-leaflet";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API = "http://127.0.0.1:5000"; // backend Flask local

const colors = {
  verde: "#007344",
  azul: "#1100FF",
  vermelho: "#FF0000",
  amarelo: "#D3D000",
  laranja: "#FF8C00",
  preto: "#000000",
  cinza: "#666666",
  filtro: "#096232",
};

export default function Dashboard() {
  const mapRef = useRef(null);
  const mapDivRef = useRef(null);

  const [status, setStatus] = useState("Selecione um talhão no mapa…");
  const [chave, setChave] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  // ícone vermelho (DivIcon)
  const redDivIcon = L.divIcon({
    className: "pin-red",
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#FF0000;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.25);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  // extrai CHAVE das props do KML
  function getChave(props) {
    if (!props) return "";
    for (const k of Object.keys(props)) {
      if (k.toLowerCase() === "chave") return String(props[k]);
    }
    return "";
  }

  // última captura (para popup)
  async function fetchUltima(ch) {
    try {
      const url = new URL(API + "/api/ultima_captura_psilideo");
      url.searchParams.set("chave", ch);
      const r = await fetch(url);
      const j = await r.json();
      return { dt: j.sk_data || "—", qtd: j.qtd ?? 0 };
    } catch (e) {
      console.error("Erro API ultima captura", e);
      return { dt: "—", qtd: 0 };
    }
  }

  // inicializa o mapa
  useEffect(() => {
    // (1) Evita reuso do container em hot-reload
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapDivRef.current).setView([-22.9, -48.4], 11);

    // (2) Esri como módulo: use Esri.basemapLayer(...)
    const imagery = Esri.basemapLayer("Imagery").addTo(map);
    Esri.basemapLayer("ImageryLabels").addTo(map);

    // fallback pra OSM se der erro de tile
    imagery.on("tileerror", () => {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
    });

    mapRef.current = map;

    // Panes para garantir z-index
    map.createPane("limitsPane");
    map.getPane("limitsPane").style.zIndex = 400; // abaixo dos popups
    map.createPane("pinPane");
    map.getPane("pinPane").style.zIndex = 620;

    // Camada de limites (linhas/polígonos)
    const limites = L.geoJson(null, {
      pane: "limitsPane",
      style: () => ({ stroke: true, color: colors.amarelo, weight: 3, opacity: 1, fill: false }),
      onEachFeature: (f, layer) => {
        const ch = getChave(f.properties) || "—";
        layer.bindPopup("Carregando…");
        layer.on("click", async () => {
          setChave(ch);
          setStatus(`Talhão selecionado: ${ch}`);
          const { dt, qtd } = await fetchUltima(ch);
          layer.setPopupContent(`<b>Chave:</b> ${ch}<br><b>Última:</b> ${dt}<br><b>Qtd:</b> ${qtd}`);
        });
      },
    }).addTo(map);

    // Grupo de pontos
    const pontos = L.layerGroup().addTo(map);

    const KML_LINHAS = `${API}/kml/JF_GERAL_LINHAS.kml`;
    const KML_PONTOS = `${API}/kml/CENTROIDE.kml`;

    // helper: adiciona geometrias convertidas
    function addGeomAsFeature(geom, props) {
      if (!geom) return;
      const t = geom.type;
      if (t === "Polygon" || t === "LineString") {
        limites.addData({ type: "Feature", geometry: geom, properties: props || {} });
        return;
      }
      if (t === "Point") {
        const c = geom.coordinates;
        const ch = getChave(props) || "—";
        const m = L.marker([c[1], c[0]], { pane: "pinPane", icon: redDivIcon }).addTo(pontos);
        m.bindPopup("Carregando…");
        m.on("click", async () => {
          setChave(ch);
          setStatus(`Talhão selecionado: ${ch}`);
          const { dt, qtd } = await fetchUltima(ch);
          m.setPopupContent(`<b>Chave:</b> ${ch}<br><b>Última:</b> ${dt}<br><b>Qtd:</b> ${qtd}`);
        });
      }
      if (t === "MultiPolygon") {
        (geom.coordinates || []).forEach((c) =>
          addGeomAsFeature({ type: "Polygon", coordinates: c }, props)
        );
        return;
      }
      if (t === "MultiLineString") {
        (geom.coordinates || []).forEach((c) =>
          addGeomAsFeature({ type: "LineString", coordinates: c }, props)
        );
        return;
      }
      if (t === "MultiPoint") {
        (geom.coordinates || []).forEach((pt) =>
          addGeomAsFeature({ type: "Point", coordinates: pt }, props)
        );
        return;
      }
      if (t === "GeometryCollection" && Array.isArray(geom.geometries)) {
        geom.geometries.forEach((g) => addGeomAsFeature(g, props));
      }
    }

    async function loadKmls() {
      // Omnivore precisa de L global
      window.L = L;
      const mod = await import("leaflet-omnivore");
      const omnivore = mod.default || mod;

      function loadKml(url, optional) {
        const full = url + (url.includes("?") ? "&" : "?") + "ts=" + Date.now();
        omnivore
          .kml(full)
          .on("ready", function () {
            const gj = this.toGeoJSON();
            (gj.features || []).forEach((f) => addGeomAsFeature(f.geometry, f.properties));

            // centraliza
            try {
              const b = limites.getBounds();
              if (b && b.isValid()) {
                map.fitBounds(b, { padding: [20, 20] });
              } else if (pontos.getLayers().length) {
                map.fitBounds(L.featureGroup(pontos.getLayers()).getBounds(), { padding: [20, 20] });
              }
            } catch {}
          })
          .on("error", (e) => {
            if (!optional) console.warn("Falha ao carregar", url, e);
          })
          .addTo(map);
      }

      loadKml(KML_LINHAS, false);
      loadKml(KML_PONTOS, true);
    }

    loadKmls().catch(console.error);

    return () => {
      // cleanup ao desmontar
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // gráfico (placeholder simples até ligar na /api/serie_psilideo)
  useEffect(() => {
    if (!chave) return;
    setChartData({
      labels: ["2025-01", "2025-02", "2025-03"],
      datasets: [
        {
          label: "Capturas",
          data: [5, 7, 4],
          borderColor: colors.verde,
          backgroundColor: colors.verde,
        },
      ],
    });
  }, [chave]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: colors.verde }}>Dashboard Psilídeo</h1>
      <div
        ref={mapDivRef}
        style={{ height: "50vh", borderRadius: 10, marginBottom: 20 }}
      />
      <div style={{ background: "#fff", padding: 20, borderRadius: 10 }}>
        <h2>Série semanal</h2>
        <div style={{ height: 300 }}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 20 }}>{status}</div>
    </div>
  );
}
