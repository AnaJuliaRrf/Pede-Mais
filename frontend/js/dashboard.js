document.addEventListener("DOMContentLoaded", () => {
  verificarAutenticacao();
  carregarDashboard();
});

async function carregarDashboard() {
  try {
    const empresaId = localStorage.getItem("empresaId");

    const [pedidos, estoqueBaixo] = await Promise.all([
      apiRequest(`/empresas/${empresaId}/pedidos`, "GET", null, true),
      apiRequest(`/empresas/${empresaId}/estoque/baixo`, "GET", null, true)
    ]);

    const pedidosHoje = pedidos.length;
    const quantidadeEstoqueBaixo = estoqueBaixo.length;

    const faturamentoHoje = pedidos.reduce((total, pedido) => {
      return total + Number(pedido.total || 0);
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

  document.getElementById("faturamentoHoje").textContent =
    `R$ ${Number(data.faturamentoHoje)
      .toFixed(2)
      .replace(".", ",")}`;
}

function atualizarTabela(pedidos) {
  const tabela = document.getElementById("tabelaPedidos");
  tabela.innerHTML = "";

  pedidos.forEach((pedido) => {
    tabela.innerHTML += `
      <tr>
        <td>#${pedido.id}</td>
        <td>${pedido.cliente || "-"}</td>
        <td>${pedido.itens || "-"}</td>
        <td>${pedido.pagamento || "-"}</td>
        <td>${pedido.entrega || "-"}</td>
        <td>
          <span class="status">
            ${pedido.status || "-"}
          </span>
        </td>
        <td>${pedido.horario || "-"}</td>
      </tr>
    `;
  });
}