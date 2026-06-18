const PEDIDOS_REFRESH_INTERVAL = 60000;
const STATUS_COLUMNS = {
  pendente: "pendente",
  em_preparo: "preparo",
  saiu_para_entrega: "entrega",
  entregue: "entregue",
  cancelado: "cancelado",
};

const STATUS_LABELS = {
  pendente: "Pendente",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

let pedidosCache = new Map();
let cardArrastado = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAutenticacao()) {
    return;
  }

  setTodayDate();
  configurarPainel();
  carregarPedidos();
  setInterval(carregarPedidos, PEDIDOS_REFRESH_INTERVAL);
});

async function carregarPedidos() {
  const empresaId = localStorage.getItem("empresaId");

  try {
    const pedidos = await apiRequest(
      `/empresas/${empresaId}/pedidos`,
      "GET",
      null,
      true,
    );

    pedidosCache = new Map(pedidos.map((pedido) => [String(pedido.id), pedido]));
    renderizarPedidos(pedidos);
  } catch (error) {
    console.error("Erro ao carregar pedidos:", error);
  }
}

function renderizarPedidos(pedidos) {
  document.querySelectorAll(".coluna").forEach((coluna) => {
    coluna.querySelectorAll(".card").forEach((card) => card.remove());
  });

  pedidos.forEach((pedido) => {
    const columnId = STATUS_COLUMNS[pedido.status];
    const coluna = document.getElementById(columnId);

    if (!coluna) {
      return;
    }

    coluna.appendChild(criarCardPedido(pedido));
  });

  atualizarContadoresPedidos();
}

function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = pedido.id;

  card.innerHTML = `
    <div class="pedido">#${pedido.id}</div>
    <div class="cliente">${pedido.cliente_nome}</div>
    <div class="info">${formatarItensResumo(pedido.itens)}</div>
    <div class="info">${formatarRecebimento(pedido)}</div>
    <div class="info">${formatarPagamento(pedido.forma_pagamento)}</div>
    <div class="hora">${formatarDataHora(pedido.criado_em)}</div>
    <div class="menu-pedidos">
      <i class="fa-solid fa-ellipsis-vertical"></i>
    </div>
  `;

  card.addEventListener("click", () => abrirPainelPedido(pedido.id));
  card.addEventListener("dragstart", () => {
    cardArrastado = card;
    setTimeout(() => {
      card.style.opacity = "0.5";
    }, 0);
  });
  card.addEventListener("dragend", () => {
    card.style.opacity = "1";
    cardArrastado = null;
  });

  return card;
}

function configurarPainel() {
  const painel = document.getElementById("painelDetalhes");
  const fechar = document.getElementById("fecharPainel");
  const overlay = document.getElementById("overlay");

  if (!painel || !fechar || !overlay) {
    return;
  }

  fechar.addEventListener("click", fecharPainel);
  overlay.addEventListener("click", fecharPainel);

  document.querySelectorAll(".coluna").forEach((coluna) => {
    coluna.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    coluna.addEventListener("drop", () => {
      if (!cardArrastado) {
        return;
      }

      coluna.appendChild(cardArrastado);
      atualizarContadoresPedidos();
    });
  });
}

function abrirPainelPedido(pedidoId) {
  const pedido = pedidosCache.get(String(pedidoId));
  const painel = document.getElementById("painelDetalhes");
  const overlay = document.getElementById("overlay");

  if (!pedido || !painel || !overlay) {
    return;
  }

  document.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle("selecionado", card.dataset.id === String(pedidoId));
  });

  document.getElementById("detalhePedido").innerText = `#${pedido.id}`;
  document.getElementById("detalheCliente").innerText = pedido.cliente_nome;
  document.getElementById("detalheTipo").innerText = formatarRecebimento(pedido);
  document.getElementById("detalhePagamento").innerText = formatarPagamento(
    pedido.forma_pagamento,
  );
  document.getElementById("detalheHora").innerText = formatarHorario(
    pedido.criado_em,
  );
  document.getElementById("detalheData").innerText = formatarData(
    pedido.criado_em,
  );
  document.getElementById("detalheEndereco").innerText =
    pedido.endereco || "Retirada no balcao";
  document.getElementById("detalheBairro").innerText =
    pedido.tipo_recebimento === "entrega" ? "Conforme endereco" : "Loja";
  document.getElementById("detalheCidade").innerText = "Sao Paulo - SP";

  renderizarItensDetalhe(pedido);
  atualizarStatusDetalhe(pedido.status);

  painel.classList.add("ativo");
  overlay.classList.add("ativo");
}

function renderizarItensDetalhe(pedido) {
  const tbody = document.getElementById("detalheItens");
  const subtotal = document.getElementById("detalheSubtotal");

  tbody.innerHTML = "";

  pedido.itens.forEach((item) => {
    const totalItem = Number(item.preco_unitario || 0) * Number(item.quantidade);

    tbody.innerHTML += `
      <tr>
        <td>${item.produto_nome}</td>
        <td>${item.quantidade}x</td>
        <td>${formatarMoeda(totalItem)}</td>
      </tr>
    `;
  });

  subtotal.innerText = formatarMoeda(pedido.valor_total);
}

function atualizarStatusDetalhe(status) {
  const statusBadge = document.getElementById("statusBadge");
  statusBadge.classList.remove(
    "pendente",
    "preparo",
    "entrega",
    "entregue",
    "cancelado",
  );

  const className = STATUS_COLUMNS[status] || "pendente";
  statusBadge.classList.add(className);
  statusBadge.innerHTML = `
    <i class="fa-solid fa-circle"></i>
    ${STATUS_LABELS[status] || "Pendente"}
  `;

  const histRecebido = document.getElementById("histRecebido");
  const histPreparo = document.getElementById("histPreparo");
  const histEntrega = document.getElementById("histEntrega");
  const histEntregue = document.getElementById("histEntregue");

  [histRecebido, histPreparo, histEntrega, histEntregue].forEach((item) => {
    item.classList.remove("ativo");
  });

  histRecebido.classList.add("ativo");

  if (["em_preparo", "saiu_para_entrega", "entregue"].includes(status)) {
    histPreparo.classList.add("ativo");
  }

  if (["saiu_para_entrega", "entregue"].includes(status)) {
    histEntrega.classList.add("ativo");
  }

  if (status === "entregue") {
    histEntregue.classList.add("ativo");
  }
}

function fecharPainel() {
  document.getElementById("painelDetalhes").classList.remove("ativo");
  document.getElementById("overlay").classList.remove("ativo");

  document.querySelectorAll(".card").forEach((card) => {
    card.classList.remove("selecionado");
  });
}

function atualizarContadoresPedidos() {
  document.querySelectorAll(".coluna").forEach((coluna) => {
    const contador = coluna.querySelector(".contador");
    contador.textContent = coluna.querySelectorAll(".card").length;
  });
}

function formatarItensResumo(itens = []) {
  if (!Array.isArray(itens) || !itens.length) {
    return "-";
  }

  return itens
    .map((item) => `${item.quantidade}x ${item.produto_nome}`)
    .join(", ");
}

function formatarPagamento(value) {
  const labels = {
    pix: "PIX",
    cartao: "Cartao",
    dinheiro: "Dinheiro",
  };

  return labels[value] || "-";
}

function formatarRecebimento(pedido) {
  return pedido.tipo_recebimento === "retirada" ? "Retirada" : "Entrega";
}

function formatarDataHora(value) {
  const date = new Date(value);
  return `${formatarData(value)} - ${formatarHorario(value)}`;
}

function formatarData(value) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHorario(value) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarMoeda(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function setTodayDate() {
  const todayDate = document.getElementById("todayDate");
  if (!todayDate) {
    return;
  }

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  todayDate.innerHTML = `Hoje, ${dataFormatada}`;
}
