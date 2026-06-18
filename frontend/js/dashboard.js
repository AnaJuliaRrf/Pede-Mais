const DASHBOARD_REFRESH_INTERVAL = 60000; // atualiza a cada 60 segundos

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAutenticacao()) {
    return;
  }

  setTodayDate();

  if (!document.getElementById("tabelaPedidos")) {
    return;
  }

  carregarDashboard();
  setInterval(carregarDashboard, DASHBOARD_REFRESH_INTERVAL);
});

async function carregarDashboard() {
  try {
    const empresaId = localStorage.getItem("empresaId");

    const [pedidos, estoqueBaixo] = await Promise.all([
      apiRequest(`/empresas/${empresaId}/pedidos`, "GET", null, true),
      apiRequest(`/empresas/${empresaId}/estoque/baixo`, "GET", null, true)
    ]);

    const pedidosHojeLista = pedidos.filter(isPedidoDeHoje);
    const pedidosBase = pedidosHojeLista.length ? pedidosHojeLista : pedidos;
    const pedidosHoje = pedidosBase.length;
    const quantidadeEstoqueBaixo = estoqueBaixo.length;

    const faturamentoHoje = pedidosBase.reduce((total, pedido) => {
      if (pedido.status === "cancelado") {
        return total;
      }

      return total + Number(pedido.valor_total || 0);
    }, 0);

    atualizarCards({
      pedidosHoje,
      estoqueBaixo: quantidadeEstoqueBaixo,
      faturamentoHoje
    });

    atualizarGraficos(pedidosBase);
    atualizarTabela(pedidosBase.slice(0, 10));

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

  const miniCharts = document.querySelectorAll(".chart-circle");
  aplicarGraficoRosca(
    miniCharts[0],
    [{ value: Math.max(data.pedidosHoje, 1), color: "#ef4444" }],
    `${data.pedidosHoje}`
  );
  aplicarGraficoRosca(
    miniCharts[1],
    [{ value: Math.max(data.estoqueBaixo, 1), color: "#f59e0b" }],
    `${data.estoqueBaixo}`
  );
  aplicarGraficoRosca(
    miniCharts[2],
    [{ value: Math.max(data.faturamentoHoje, 1), color: "#008000" }],
    "R$"
  );
}

function atualizarTabela(pedidos) {
  const tabela = document.getElementById("tabelaPedidos");
  tabela.innerHTML = "";

  pedidos.forEach((pedido) => {
    tabela.innerHTML += `
      <tr>
        <td>#${pedido.id}</td>
        <td>${pedido.cliente_nome || "-"}</td>
        <td>${formatarItens(pedido.itens)}</td>
        <td>${formatarPagamento(pedido.forma_pagamento)}</td>
        <td>${formatarRecebimento(pedido)}</td>
        <td>
          <span class="status ${getStatusClass(pedido.status)}">
            ${formatarStatus(pedido.status)}
          </span>
        </td>
        <td>${formatarHorario(pedido.criado_em)}</td>
      </tr>
    `;
  });
}

function atualizarGraficos(pedidos) {
  const statusCounts = {
    cancelado: 0,
    pendente: 0,
    em_preparo: 0,
    saiu_para_entrega: 0,
    entregue: 0
  };

  const pagamentoTotais = {
    pix: 0,
    cartao: 0,
    dinheiro: 0
  };

  pedidos.forEach((pedido) => {
    if (Object.prototype.hasOwnProperty.call(statusCounts, pedido.status)) {
      statusCounts[pedido.status] += 1;
    }

    if (pedido.status !== "cancelado" && pagamentoTotais[pedido.forma_pagamento] != null) {
      pagamentoTotais[pedido.forma_pagamento] += Number(pedido.valor_total || 0);
    }
  });

  aplicarGraficoRosca(
    document.querySelector(".big-chart"),
    [
      { value: statusCounts.cancelado, color: "#ef4444" },
      { value: statusCounts.pendente, color: "#f59e0b" },
      { value: statusCounts.em_preparo, color: "#2f6bff" },
      { value: statusCounts.saiu_para_entrega, color: "#44d66c" },
      { value: statusCounts.entregue, color: "#008000" }
    ],
    `${pedidos.length} pedidos`
  );

  aplicarGraficoRosca(
    document.querySelector(".money-chart"),
    [
      { value: pagamentoTotais.pix, color: "#008000" },
      { value: pagamentoTotais.cartao, color: "#111111" },
      { value: pagamentoTotais.dinheiro, color: "#355e2b" }
    ],
    formatarMoeda(Object.values(pagamentoTotais).reduce((total, valor) => total + valor, 0))
  );
}

function aplicarGraficoRosca(element, segments, label) {
  if (!element) {
    return;
  }

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) {
    element.style.background = "";
    element.textContent = label;
    return;
  }

  let cursor = 0;
  const gradient = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  element.style.background = `conic-gradient(${gradient})`;
  element.innerHTML = `<span>${label}</span>`;
}

function isPedidoDeHoje(pedido) {
  if (!pedido.criado_em) {
    return false;
  }

  const pedidoDate = new Date(pedido.criado_em);
  const hoje = new Date();

  return pedidoDate.toLocaleDateString("pt-BR") === hoje.toLocaleDateString("pt-BR");
}

function formatarMoeda(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarItens(itens = []) {
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
    dinheiro: "Dinheiro"
  };

  return labels[value] || "-";
}

function formatarRecebimento(pedido) {
  if (pedido.tipo_recebimento === "entrega") {
    return "Entrega";
  }

  if (pedido.tipo_recebimento === "retirada") {
    return "Retirada";
  }

  return "-";
}

function formatarStatus(status) {
  const labels = {
    pendente: "Pendente",
    em_preparo: "Em preparo",
    saiu_para_entrega: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado"
  };

  return labels[status] || "-";
}

function getStatusClass(status) {
  const classes = {
    pendente: "pending",
    em_preparo: "preparing",
    saiu_para_entrega: "delivery",
    entregue: "delivered",
    cancelado: "canceled"
  };

  return classes[status] || "";
}

function formatarHorario(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setTodayDate() {

  const data = new Date();
  const todayDate = document.getElementById('todayDate');

  if (!todayDate) {
    return;
  }

  const opcoes = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };

  const dataFormatada = data.toLocaleDateString('pt-BR', opcoes);

  todayDate.innerHTML = `Hoje, ${dataFormatada}`;

}
