const STATUS_COLUNAS = {
  pendente: "pendente",
  em_preparo: "preparo",
  saiu_para_entrega: "entrega",
  entregue: "entregue",
};

const COLUNAS_STATUS = Object.fromEntries(
  Object.entries(STATUS_COLUNAS).map(([status, coluna]) => [coluna, status]),
);

let cardArrastado = null;
let pedidosState = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".kanban")) return;

  verificarAutenticacao();
  bindKanbanEventos();
  carregarPedidos();
});

function bindKanbanEventos() {
  document.querySelectorAll(".coluna").forEach((coluna) => {
    coluna.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    coluna.addEventListener("drop", async () => {
      if (!cardArrastado) return;

      const pedidoId = cardArrastado.dataset.id;
      const novoStatus = COLUNAS_STATUS[coluna.id];
      const statusAtual = cardArrastado.dataset.status;

      if (!novoStatus || novoStatus === statusAtual) return;

      try {
        await apiRequest(
          `/empresas/${getEmpresaId()}/pedidos/${pedidoId}/status`,
          "PATCH",
          { status: novoStatus },
          true,
        );
        await carregarPedidos();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert(error.message);
        await carregarPedidos();
      }
    });
  });
}

async function carregarPedidos() {
  try {
    limparKanban();
    pedidosState = await apiRequest(
      `/empresas/${getEmpresaId()}/pedidos`,
      "GET",
      null,
      true,
    );
    renderizarKanban();
  } catch (error) {
    console.error("Erro ao carregar pedidos:", error);
    pedidosState = [];
    limparKanban();
    alert(error.message);
  }
}

function renderizarKanban() {
  limparKanban();

  pedidosState.forEach((pedido) => {
    const colunaId = STATUS_COLUNAS[pedido.status];
    const coluna = colunaId ? document.getElementById(colunaId) : null;
    if (!coluna) return;

    coluna.insertAdjacentHTML("beforeend", criarCardPedido(pedido));
  });

  document.querySelectorAll(".card").forEach((card) => {
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
  });

  atualizarContadores();
}

function limparKanban() {
  document.querySelectorAll(".coluna").forEach((coluna) => {
    coluna.querySelectorAll(".card").forEach((card) => card.remove());
  });

  atualizarContadores();
}

function criarCardPedido(pedido) {
  const itens = formatarItensPedido(pedido.itens);
  const tipo = formatarTexto(pedido.tipo_recebimento);
  const pagamento = formatarTexto(pedido.forma_pagamento);
  const hora = formatarDataHoraPedido(pedido.criado_em);

  return `
    <div class="card" draggable="true"
      data-id="${pedido.id}"
      data-status="${pedido.status}"
      data-pedido="#${pedido.id}"
      data-cliente="${escapeHtml(pedido.cliente_nome || "-")}"
      data-produto="${escapeHtml(itens)}"
      data-tipo="${escapeHtml(tipo)}"
      data-pagamento="${escapeHtml(pagamento)}"
      data-hora="${escapeHtml(hora)}">
      <div class="pedido">#${pedido.id}</div>
      <div class="cliente">${escapeHtml(pedido.cliente_nome || "-")}</div>
      <div class="info">${escapeHtml(itens)}</div>
      <div class="info">${escapeHtml(tipo)}</div>
      <div class="info">${escapeHtml(pagamento)}</div>
      <div class="hora">${escapeHtml(hora)}</div>
      <div class="menu-pedidos">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </div>
    </div>
  `;
}

function atualizarContadores() {
  document.querySelectorAll(".coluna").forEach((coluna) => {
    const cards = coluna.querySelectorAll(".card");
    const contador = coluna.querySelector(".contador");
    if (contador) contador.textContent = cards.length;
  });
}

function buscarPedidoPorId(id) {
  return pedidosState.find((pedido) => Number(pedido.id) === Number(id));
}
