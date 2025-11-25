// src/utils/dates.js

export function formatJfDateTime(value) {
  if (!value) return "";

  // Tenta criar um Date com o valor que veio da API
  const d = new Date(value);

  // Se não der pra converter em data, devolve como veio
  if (isNaN(d.getTime())) {
    return String(value);
  }

  const pad = (n) => String(n).padStart(2, "0");

  // Usamos sempre UTC para NÃO aplicar fuso local
  const dia = pad(d.getUTCDate());
  const mes = pad(d.getUTCMonth() + 1);
  const ano = d.getUTCFullYear();

  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  // Formato final que você quer
  return `${dia}/${mes}/${ano} ${hh}:${mm}:${ss}`;
}
