// src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import Menu from "./pages/Menu.jsx";
import Tabelas from "./pages/Tabelas.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Preco from "./pages/Preco";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/tabelas" element={<Tabelas />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/preco" element={<Preco />} />

      <Route
        path="*"
        element={
          <div style={{ padding: 20 }}>
            <p>Rota não encontrada.</p>
            <Link to="/">Voltar ao menu</Link>
          </div>
        }
      />
    </Routes>
  );
}
