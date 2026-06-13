document.addEventListener("DOMContentLoaded", () => {
  const painel = document.getElementById("painelDetalhes");
  const fechar = document.getElementById("fecharPainel");
  const overlay = document.getElementById("overlay");

  if (!painel || !fechar || !overlay) return;

  document.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (!card || !card.closest(".kanban")) return;

    document.querySelectorAll(".card").forEach((item) => {
      item.classList.remove("selecionado");
    });

    card.classList.add("selecionado");
    preencherPainelPedido(card);
    painel.classList.add("ativo");
    overlay.classList.add("ativo");
  });

  function fecharPainel() {
    painel.classList.remove("ativo");
    overlay.classList.remove("ativo");

    document.querySelectorAll(".card").forEach((card) => {
      card.classList.remove("selecionado");
    });
  }

  fechar.addEventListener("click", fecharPainel);
  overlay.addEventListener("click", fecharPainel);
});

function preencherPainelPedido(card) {
  const pedido = typeof buscarPedidoPorId === "function"
    ? buscarPedidoPorId(card.dataset.id)
    : null;

  document.getElementById("detalhePedido").innerText = card.dataset.pedido;
  document.getElementById("detalheCliente").innerText = card.dataset.cliente;
  document.getElementById("detalheProduto").innerText = card.dataset.produto;
  document.getElementById("detalheTipo").innerText = card.dataset.tipo;
  document.getElementById("detalhePagamento").innerText = card.dataset.pagamento;
  document.getElementById("detalheHora").innerText = card.dataset.hora;

  renderizarStatusPainel(card.dataset.status);
  renderizarItensPainel(pedido);
  renderizarEntregaPainel(pedido);
}

function renderizarStatusPainel(status) {
  const statusBadge = document.getElementById("statusBadge");
  const statusClass = {
    pendente: "pendente",
    em_preparo: "preparo",
    saiu_para_entrega: "entrega",
    entregue: "entregue",
  }[status] || "pendente";

  statusBadge.classList.remove("pendente", "preparo", "entrega", "entregue");
  statusBadge.classList.add(statusClass);
  statusBadge.innerHTML = `
    <i class="fa-solid fa-circle"></i>
    ${formatarStatusPedido(status)}
  `;

  const historico = {
    histRecebido: true,
    histPreparo: ["em_preparo", "saiu_para_entrega", "entregue"].includes(status),
    histEntrega: ["saiu_para_entrega", "entregue"].includes(status),
    histEntregue: status === "entregue",
  };

  Object.entries(historico).forEach(([id, ativo]) => {
    document.getElementById(id)?.classList.toggle("ativo", ativo);
  });
}

function renderizarItensPainel(pedido) {
  const tbody = document.querySelector("#painelDetalhes table tbody");
  const subtotal = document.querySelector("#painelDetalhes .subtotal strong");

  if (!tbody || !pedido) return;

  tbody.innerHTML = pedido.itens
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.produto_nome || "-")}</td>
        <td>${Number(item.quantidade)}x</td>
        <td>${formatCurrency(item.subtotal)}</td>
      </tr>
    `)
    .join("");

  if (subtotal) {
    subtotal.textContent = formatCurrency(pedido.valor_total);
  }
}

function renderizarEntregaPainel(pedido) {
  const entregaGrid = document.querySelector("#painelDetalhes .entrega-grid");
  if (!entregaGrid || !pedido) return;

  entregaGrid.innerHTML = `
    <div>
      <span>Endereco</span>
      <strong>${escapeHtml(pedido.endereco || "Retirada no local")}</strong>
    </div>
    <div>
      <span>Telefone</span>
      <strong>${escapeHtml(pedido.telefone || "-")}</strong>
    </div>
    <div>
      <span>Total</span>
      <strong>${formatCurrency(pedido.valor_total)}</strong>
    </div>
  `;
}
