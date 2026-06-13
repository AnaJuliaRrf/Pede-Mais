const DASHBOARD_REFRESH_INTERVAL = 60000; // atualiza a cada 60 segundos

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("tabelaPedidos")) return;

  verificarAutenticacao();
  setTodayDate();
  carregarDashboard();
  setInterval(carregarDashboard, DASHBOARD_REFRESH_INTERVAL);
});

async function carregarDashboard() {
  try {
    const empresaId = localStorage.getItem("empresaId");
    const hoje = new Date().toISOString().slice(0, 10);

    const [pedidos, estoqueBaixo] = await Promise.all([
      apiRequest(
        `/empresas/${empresaId}/pedidos?data_inicio=${hoje}&data_fim=${hoje}`,
        "GET",
        null,
        true
      ),
      apiRequest(`/empresas/${empresaId}/estoque/baixo`, "GET", null, true)
    ]);

    const pedidosHoje = pedidos.length;
    const quantidadeEstoqueBaixo = estoqueBaixo.length;

    const faturamentoHoje = pedidos.reduce((total, pedido) => {
      return total + Number(pedido.valor_total || 0);
    }, 0);

    atualizarCards({
      pedidosHoje,
      estoqueBaixo: quantidadeEstoqueBaixo,
      faturamentoHoje
    });

    atualizarTabela(pedidos.slice(0, 5));

  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
  }
}

function atualizarCards(data) {
  document.getElementById("pedidosHoje").textContent =
    data.pedidosHoje;

  document.getElementById("estoqueBaixo").textContent =
    data.estoqueBaixo;

  const faturamentoText = `R$ ${Number(data.faturamentoHoje)
    .toFixed(2)
    .replace(".", ",")}`;

  document.getElementById("faturamentoHoje").textContent = faturamentoText;

  const faturamentoDiarioEl = document.getElementById("faturamentoDiario");
  if (faturamentoDiarioEl) {
    faturamentoDiarioEl.textContent = faturamentoText;
  }
}

function atualizarTabela(pedidos) {
  const tabela = document.getElementById("tabelaPedidos");
  tabela.innerHTML = "";

  if (!pedidos.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7">Nenhum pedido encontrado hoje.</td>
      </tr>
    `;
    return;
  }

  pedidos.forEach((pedido) => {
    tabela.innerHTML += `
      <tr>
        <td>#${pedido.id}</td>
        <td>${pedido.cliente_nome || "-"}</td>
        <td>${formatarItensPedido(pedido.itens)}</td>
        <td>${formatarTexto(pedido.forma_pagamento)}</td>
        <td>${formatarTexto(pedido.tipo_recebimento)}</td>
        <td>
          <span class="status">
            ${formatarStatusPedido(pedido.status)}
          </span>
        </td>
        <td>${formatarDataHora(pedido.criado_em)}</td>
      </tr>
    `;
  });
}

function setTodayDate() {
  if (!document.getElementById('todayDate')) return;

  const data = new Date();

  const opcoes = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };

  const dataFormatada = data.toLocaleDateString('pt-BR', opcoes);

  document.getElementById('todayDate').innerHTML =
    `Hoje, ${dataFormatada}`;

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
