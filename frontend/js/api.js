const API_URL = window.API_URL || "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token");
}

function getEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    throw new Error("Empresa nao encontrada na sessao.");
  }

  return empresaId;
}

async function apiRequest(endpoint, method = "GET", data = null, auth = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();

    if (!token) {
      throw new Error("Sessao expirada. Faca login novamente.");
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("empresaId");
    }

    throw new Error(payload?.error || "Erro na requisicao");
  }

  return payload;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarItensPedido(itens = []) {
  if (!itens.length) return "-";

  return itens
    .map((item) => `${Number(item.quantidade)}x ${item.produto_nome}`)
    .join(", ");
}

function formatarStatusPedido(status = "") {
  const labels = {
    pendente: "Pendente",
    em_preparo: "Em preparo",
    saiu_para_entrega: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  return labels[status] || "-";
}

function formatarTexto(value = "") {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatarDataHora(value) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHoraPedido(value) {
  if (!value) return "-";

  const data = new Date(value);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dia}/${mes} - ${hora}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
