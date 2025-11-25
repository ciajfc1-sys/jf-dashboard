import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ajuste se seu Flask não estiver no 127.0.0.1:5000
const API_BASE = "http://127.0.0.1:5000";
const TABLES = ["FAT_ARMADILHA_PSILIDEO", "DIM_EMPERP", "DIM_TALHAO_PIMS"];

export default function Tabelas() {
  const [data, setData] = useState({});     // { TABELA: {columns:[], rows:[]}, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = {};
      for (const t of TABLES) {
        try {
          const r = await fetch(`${API_BASE}/api/top10?table=${encodeURIComponent(t)}`);
          const js = await r.json();
          out[t] = js;
        } catch (e) {
          out[t] = { error: String(e) };
        }
      }
      if (!cancelled) {
        setData(out);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: 24 }}>
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
        <h1 style={{ margin: 0, color: "#007344" }}>Tabelas disponíveis</h1>
      </header>

      {loading && <p style={{ marginTop: 12 }}>Carregando…</p>}

      {!loading &&
        TABLES.map((t) => {
          const block = data[t] || {};
          const cols = block.columns || [];
          const rows = block.rows || [];
          return (
            <div
              key={t}
              style={{
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 1px 8px rgba(0,0,0,.06)",
                marginTop: 16,
                overflow: "auto",
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
                {t}
              </h2>

              {block.error ? (
                <div style={{ padding: 12, color: "#b91c1c" }}>
                  Erro ao carregar: {block.error}
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 12 }}>Sem linhas.</div>
              ) : (
                <div style={{ padding: 12, overflow: "auto" }}>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        {cols.map((c) => (
                          <th
                            key={c}
                            style={{
                              border: "1px solid #eee",
                              padding: "8px 10px",
                              textAlign: "left",
                              position: "sticky",
                              top: 0,
                              background: "#eef7f0",
                              color: "#0b4d32",
                              fontWeight: 600,
                            }}
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 ? "#fafafa" : "transparent" }}>
                          {cols.map((c) => (
                            <td
                              key={c}
                              style={{ border: "1px solid #eee", padding: "8px 10px", whiteSpace: "nowrap" }}
                            >
                              {String(r[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
