// src/pages/Preco.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatJfDateTime } from "../utils/dates";

const API_BASE = "http://127.0.0.1:5000";

const X_MAX = 400; // largura lógica do gráfico no eixo X (0..400)

const TABLES = [
  {
    key: "indicadores_mercado_ultima",
    label: "Cotação atual",
  },
  {
    key: "V_INDICADORES_MERCADO_DIARIO",
    label: "Histórico diário de cotações",
  },
];

export default function Preco() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null); // { indicador, index }
  const [autoIndex, setAutoIndex] = useState(0);
  const [hoverIndicador, setHoverIndicador] = useState(null); // indicador do card em foco


  useEffect(() => {
    let cancelado = false;

    (async () => {
      const out = {};

      for (const t of TABLES) {
        try {
          const r = await fetch(
            `${API_BASE}/api/table?table=${encodeURIComponent(t.key)}`
          );
          const js = await r.json();
          out[t.key] = js;
        } catch (e) {
          out[t.key] = { error: String(e) };
        }
      }

      if (!cancelado) {
        setData(out);
        setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const out = {};

      for (const t of TABLES) {
        try {
          const r = await fetch(
            `${API_BASE}/api/table?table=${encodeURIComponent(t.key)}`
          );
          const js = await r.json();
          out[t.key] = js;
        } catch (e) {
          out[t.key] = { error: String(e) };
        }
      }

      if (!cancelado) {
        setData(out);
        setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  // controla rotação automática dos indicadores a cada 15s,
  // mas PAUSANDO enquanto o mouse estiver em um card (hoverIndicador)
  useEffect(() => {
    const block = data["V_INDICADORES_MERCADO_DIARIO"] || {};
    const rows = block.rows || [];
    if (!rows.length) return;

    // se o mouse estiver em um card, não roda o timer
    if (hoverIndicador) return;

    const id = setInterval(() => {
      setAutoIndex((prev) => prev + 1);
    }, 15000);

    return () => clearInterval(id);
  }, [data, hoverIndicador]);


 
  const formatDateOnly = (value) => {
    if (!value) return "";

    const s = String(value);

    // 1) Formato ISO: 2025-11-18...
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, ano, mes, dia] = m;
      return `${dia}/${mes}/${ano}`;
    }

    // 2) Formato tipo: "Fri, 14 Nov 2025 00:00:00 GMT"
    m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (m) {
      const [, diaStr, mesAbrev, ano] = m;
      const dia = diaStr.padStart(2, "0");

      const mapaMes = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };

      const mes = mapaMes[mesAbrev] || "01";
      return `${dia}/${mes}/${ano}`;
    }

    // Se não bater nenhum formato conhecido, devolve como veio
    return s;
  };

  // gera pontos de um gráfico usando coordenadas do viewBox (0..X_MAX no eixo X, 0..100 no eixo Y)
  const buildLineGeometry = (values) => {
    if (!values || values.length === 0) {
      return { pointsString: "", points: [] };
    }

    const vs = values.map((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : 0
    );
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const range = max - min || 1;

    const n = vs.length;

    // 🔹 margem lateral dentro do próprio viewBox, para não cortar os pontos da ponta
    const PADDING_X = 20; // você pode ajustar 10, 15, 20... se quiser mais ou menos espaço
    const usableWidth = X_MAX - 2 * PADDING_X;

    const points = vs.map((v, idx) => {
      // x distribuído de PADDING_X .. X_MAX - PADDING_X
      const x =
        n === 1
          ? X_MAX / 2
          : PADDING_X + (idx / (n - 1)) * usableWidth;

      const norm = (v - min) / range; // 0..1
      const y = 90 - norm * 70;       // 0..100 (invertido)
      return { x, y, value: v };
    });

    const pointsString = points.map((p) => `${p.x},${p.y}`).join(" ");
    return { pointsString, points };
  };

  // ------------------------------------------------------------
  // curva cúbica suave para o gráfico
  // ------------------------------------------------------------
  function buildSmoothPath(points) {
    if (!points || points.length === 0) return "";
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x},${p.y}`;
    }

    let d = `M ${points[0].x},${points[0].y}`;
    const smooth = 0.30; // suavização (pode ajustar depois)

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const cp1x = p0.x + (p1.x - p0.x) * smooth;
      const cp1y = p0.y;

      const cp2x = p1.x - (p1.x - p0.x) * smooth;
      const cp2y = p1.y;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }

    return d;
  }

// 🔹 suaviza a linha do gráfico usando curvas (Q/T)
function buildSmoothPath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x},${p.y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];

    const cp1x = p0.x + (p1.x - p0.x) * 0.4;
    const cp1y = p0.y;
    const cp2x = p1.x - (p1.x - p0.x) * 0.4;
    const cp2y = p1.y;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
  }

  return d;
}


  return (
    <div style={{ padding: 24 }}>
      {/* Cabeçalho igual ao da tela Tabelas */}
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          to="/"
          style={{
            background: "#096232",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, color: "#007344" }}>Menu</h1>
      </header>

      {loading && <p style={{ marginTop: 12 }}>Carregando…</p>}

      {!loading &&
        TABLES.map((t) => {
          const block = data[t.key] || {};
          const cols = block.columns || [];
          const rows = block.rows || [];

          // 🔹 BLOCO 1 – indicadores_mercado_ultima → cards
          if (t.key === "indicadores_mercado_ultima") {
            const hasData = !block.error && rows.length > 0;

            let atualizadoFmt = "";
            if (hasData) {
              const first = rows[0] || {};
              const atualizadoRaw =
                first.atualizado_em ?? first["atualizado_em"];
              atualizadoFmt = formatJfDateTime(atualizadoRaw);
            }

            return (
              <div
                key={t.key}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  boxShadow: "0 1px 8px rgba(0,0,0,.06)",
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                {/* Barra de título + atualizado em, na mesma altura */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid #eee",
                    gap: 8,
                  }}
                >
                  {/* Espaço à esquerda para manter o título centralizado */}
                  <div style={{ flex: 1 }} />

                  <h2
                    style={{
                      margin: 0,
                      color: "#007344",
                      fontSize: 16,
                      fontWeight: 600,
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    Cotação atual
                  </h2>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {hasData && (
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#e6f4ec",
                          fontSize: 13,
                        }}
                      >
                        <strong style={{ color: "#0b4d32" }}>
                          Atualizado em:
                        </strong>{" "}
                        <span>{atualizadoFmt}</span>
                      </span>
                    )}
                  </div>
                </div>

                {block.error ? (
                  <div style={{ padding: 12, color: "#b91c1c" }}>
                    Erro ao carregar: {block.error}
                  </div>
                ) : rows.length === 0 ? (
                  <div style={{ padding: 12 }}>Sem linhas.</div>
                ) : (
                  <div style={{ padding: 16 }}>
                    {/* Cards por indicador */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      {rows.map((r, idx) => {
                        const indicador = r.indicador ?? r["indicador"];
                        const valor = r.valor ?? r["valor"];
                        const unidade = r.unidade ?? r["unidade"];

                        const valorFmt =
                          valor === null || valor === undefined
                            ? ""
                            : Number(valor).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoverIndicador(indicador)}
                            onMouseLeave={() => setHoverIndicador(null)}
                            style={{
                              borderRadius: 16,
                              background: "#ffffff",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "stretch",
                              textAlign: "center",
                              minHeight: 150,
                              overflow: "hidden",
                            }}
                          >
                            {/* FAIXA VERDE NO TOPO, PREENCHENDO TODO O CARD */}
                            <div
                              style={{
                                width: "100%",
                                background: "#007344",
                                color: "#ffffff",
                                padding: "10px 0",
                                fontSize: 16,
                                fontWeight: 600,
                              }}
                            >
                              {indicador}
                            </div>

                            {/* CONTEÚDO DO CARD (VALOR + UNIDADE) */}
                            <div
                              style={{
                                padding: "20px 10px 12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 26,
                                  fontWeight: 700,
                                  marginBottom: 4,
                                  letterSpacing: 0.5,
                                  color: "#0b4d32",
                                }}
                              >
                                {valorFmt}
                              </div>

                              {unidade && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                  }}
                                >
                                  {unidade}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 🔹 BLOCO 2 – V_INDICADORES_MERCADO_DIARIO → GRÁFICO POR INDICADOR (SVG)
          if (t.key === "V_INDICADORES_MERCADO_DIARIO") {
            if (block.error) {
              return (
                <div
                  key={t.key}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 1px 8px rgba(0,0,0,.06)",
                    marginTop: 16,
                    overflow: "hidden",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      padding: "12px 16px",
                      fontSize: 16,
                      borderBottom: "1px solid #eee",
                      color: "#007344",
                    }}
                  >
                    {t.label}
                  </h2>
                  <div style={{ padding: 12, color: "#b91c1c" }}>
                    Erro ao carregar: {block.error}
                  </div>
                </div>
              );
            }

            if (rows.length === 0) {
              return (
                <div
                  key={t.key}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 1px 8px rgba(0,0,0,.06)",
                    marginTop: 16,
                    overflow: "hidden",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      padding: "12px 16px",
                      fontSize: 16,
                      borderBottom: "1px solid #eee",
                      color: "#007344",
                    }}
                  >
                    {t.label}
                  </h2>
                  <div style={{ padding: 12 }}>Sem linhas.</div>
                </div>
              );
            }

            // agrupa linhas por indicador
            const series = {};
            rows.forEach((r) => {
              const indicador = r.indicador ?? r["indicador"];
              if (!indicador) return;
              if (!series[indicador]) {
                series[indicador] = [];
              }
              series[indicador].push(r);
            });

            // todos os indicadores disponíveis
            const todosIndicadores = Object.keys(series).sort();

            // indicador atual:
            //  - se o mouse estiver em um card válido, usa ele
            //  - senão, usa rotação automática com autoIndex
            const indicadorAtual =
              hoverIndicador && series[hoverIndicador]
                ? hoverIndicador
                : (todosIndicadores.length
                    ? todosIndicadores[autoIndex % todosIndicadores.length]
                    : null);

            // lista final que será mapeada (apenas UM gráfico)
            const indicadores = indicadorAtual ? [indicadorAtual] : [];

            return (
              <div
                key={t.key}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  boxShadow: "0 1px 8px rgba(0,0,0,.06)",
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    padding: "12px 16px",
                    fontSize: 16,
                    borderBottom: "1px solid #eee",
                    color: "#007344",
                    textAlign: "center",
                  }}
                >
                  {t.label}
                </h2>

                <div style={{ padding: 16 }}>
                  {indicadores.map((ind) => {
                    const dadosBrutos = series[ind] || [];

                    // ordena por data_indicador (usando Date para garantir ordem cronológica)
                    const ordenados = [...dadosBrutos].sort((a, b) => {
                      const daRaw = a.data_indicador ?? a["data_indicador"];
                      const dbRaw = b.data_indicador ?? b["data_indicador"];

                      const da = daRaw ? new Date(daRaw).getTime() : 0;
                      const db = dbRaw ? new Date(dbRaw).getTime() : 0;

                      return da - db;
                    });

                    const dataChart = ordenados.map((r) => {

                      const rawData =
                        r.data_indicador ?? r["data_indicador"];
                      const valorNum = Number(r.valor ?? r["valor"] ?? 0);
                      return {
                        data: formatDateOnly(rawData),
                        valor: valorNum,
                      };
                    });

                    const valores = dataChart.map((d) => d.valor);
                    const { pointsString, points } = buildLineGeometry(valores);

                    const lastIdx = points.length > 0 ? points.length - 1 : null;
                    const lastPoint =
                      lastIdx !== null ? points[lastIdx] : null;
                    const lastValue =
                      lastIdx !== null ? dataChart[lastIdx]?.valor : null;

                    return (
                      <div
                        key={ind}
                        style={{
                          marginBottom: 24,
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          overflow: "hidden",
                        }}
                      >
                        {/* faixa verde preenchendo TODO o topo do card */}
                        <div
                          style={{
                            width: "100%",
                            background: "#007344",
                            color: "#ffffff",
                            padding: "10px 0",
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: "center",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          }}
                        >
                          {ind}
                        </div>

                        {/* conteúdo do gráfico com padding interno */}
                        <div style={{ padding: 16 }}>
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "4 / 1", // garante a mesma razão do viewBox (400:100)
                              position: "relative",
                            }}
                          >
                            <svg
                              viewBox={`0 0 ${X_MAX} 100`}
                              preserveAspectRatio="none"
                              style={{ width: "100%", height: "100%" }}
                            >
                              {/* linha principal (reta, bordas suaves) */}
                              <polyline
                                fill="none"
                                stroke="#007344"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={pointsString}
                              />

                              {/* pontos + rótulo em cima de cada ponto */}
                              {points.map((p, idx) => (
                                <React.Fragment key={idx}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={1.2} // ponto circular, delicado
                                    fill="#007344"
                                    style={{ cursor: "pointer" }}
                                    onMouseEnter={() =>
                                      setHover({ indicador: ind, index: idx })
                                    }
                                    onMouseLeave={() => setHover(null)}
                                  />

                                  <text
                                    x={p.x}
                                    y={p.y - 4} // bem perto da linha
                                    fontSize={8}
                                    textAnchor="middle"
                                    fill="#0b4d32"
                                    style={{
                                      paintOrder: "stroke",
                                      stroke: "#ffffff",
                                      strokeWidth: 1,
                                    }}
                                  >
                                    {dataChart[idx].valor.toLocaleString(
                                      "pt-BR",
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </text>
                                </React.Fragment>
                              ))}

                              {/* datas no eixo X, alinhadas com os pontos */}
                              {dataChart.map((d, idx) => {
                                const p = points[idx];
                                return (
                                  <text
                                    key={`x-${idx}`}
                                    x={p.x}
                                    y={98}
                                    fontSize={7}
                                    textAnchor="middle"
                                    fill="#6b7280"
                                  >
                                    {d.data}
                                  </text>
                                );
                              })}

                              {/* tooltip flutuante, desenhada dentro do SVG */}
                              {hover &&
                                hover.indicador === ind &&
                                points[hover.index] &&
                                dataChart[hover.index] &&
                                (() => {
                                  const p = points[hover.index];
                                  const d = dataChart[hover.index];

                                  const boxWidth = 80; // unidades do viewBox (400 de largura)
                                  const boxHeight = 26;

                                  // evita colar nas bordas (0..X_MAX)
                                  const boxX = Math.min(
                                    Math.max(p.x, boxWidth / 2),
                                    X_MAX - boxWidth / 2
                                  );
                                  const boxY = Math.max(p.y - 30, boxHeight);

                                  return (
                                    <g
                                      transform={`translate(${boxX}, ${boxY})`}
                                    >
                                      <rect
                                        x={-boxWidth / 2}
                                        y={-boxHeight}
                                        width={boxWidth}
                                        height={boxHeight}
                                        rx={3}
                                        ry={3}
                                        fill="#ffffff"
                                        stroke="#e5e7eb"
                                      />
                                      <text
                                        x={0}
                                        y={-boxHeight + 9}
                                        textAnchor="middle"
                                        fontSize={7}
                                        fill="#111827"
                                      >
                                        {d.data}
                                      </text>
                                      <text
                                        x={0}
                                        y={-6}
                                        textAnchor="middle"
                                        fontSize={8}
                                        fontWeight="bold"
                                        fill="#111827"
                                      >
                                        {d.valor.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </text>
                                    </g>
                                  );
                                })()}
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          // se aparecer outro t.key inesperado
          return null;
        })}
    </div>
  );
}
