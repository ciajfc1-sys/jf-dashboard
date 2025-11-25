import React from "react";
import { Link } from "react-router-dom";

export default function Menu() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100vh", gap:20, background:"#f7f8fa"
    }}>
      <h1 style={{ color:"#007344", margin:0 }}>JF Citrus · Menu</h1>
      <div style={{ display:"flex", gap:20 }}>
        <Link
          to="/tabelas"
          style={{ background:"#007344", color:"#fff", padding:"12px 20px",
                   borderRadius:10, textDecoration:"none", fontWeight:600 }}
        >
          Ver Tabelas Disponíveis
        </Link>

        <Link
          to="/dashboard"
          style={{ background:"#007344", color:"#fff", padding:"12px 20px",
                   borderRadius:10, textDecoration:"none", fontWeight:600 }}
        >
          Dashboard
        </Link>

        {/* 🔥 Novo botão Preço */}
        <Link
          to="/Preco"
          style={{ background:"#007344", color:"#fff", padding:"12px 20px",
                   borderRadius:10, textDecoration:"none", fontWeight:600 }}
        >
          Cotações
        </Link>
      </div>
    </div>
  );
}
