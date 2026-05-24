document.addEventListener("DOMContentLoaded", () => {

  const cards = document.querySelectorAll(".card");

  const painel = document.getElementById("painelDetalhes");

  const fechar = document.getElementById("fecharPainel");

  const overlay = document.getElementById("overlay");

  cards.forEach(card => {

    card.addEventListener("click", () => {

      // REMOVE seleção anterior
      cards.forEach(c => {
        c.classList.remove("selecionado");
      });

      // ADICIONA seleção atual
      card.classList.add("selecionado");

      // DADOS
      document.getElementById("detalhePedido").innerText =
        card.dataset.pedido;

      document.getElementById("detalheCliente").innerText =
        card.dataset.cliente;

      document.getElementById("detalheProduto").innerText =
        card.dataset.produto;

      document.getElementById("detalheTipo").innerText =
        card.dataset.tipo;

      document.getElementById("detalhePagamento").innerText =
        card.dataset.pagamento;

      document.getElementById("detalheHora").innerText =
        card.dataset.hora;

      // =========================
      // STATUS DINÂMICO
      // =========================

      const coluna = card.closest(".coluna").id;

      const statusBadge =
        document.getElementById("statusBadge");

      // REMOVE classes antigas
      statusBadge.classList.remove(
        "pendente",
        "preparo",
        "entrega",
        "entregue"
      );

      // =========================
      // HISTÓRICO DINÂMICO
      // =========================

      const histRecebido =
        document.getElementById("histRecebido");

      const histPreparo =
        document.getElementById("histPreparo");

      const histEntrega =
        document.getElementById("histEntrega");

      const histEntregue =
        document.getElementById("histEntregue");

      // LIMPA
      histRecebido.classList.remove("ativo");
      histPreparo.classList.remove("ativo");
      histEntrega.classList.remove("ativo");
      histEntregue.classList.remove("ativo");

      // SEMPRE ATIVO
      histRecebido.classList.add("ativo");

      // =========================
      // PENDENTE
      // =========================

      if(coluna === "pendente"){

        statusBadge.innerHTML = `
          <i class="fa-solid fa-circle"></i>
          Pendente
        `;

        statusBadge.classList.add("pendente");

      }

      // =========================
      // PREPARO
      // =========================

      if(coluna === "preparo"){

        statusBadge.innerHTML = `
          <i class="fa-solid fa-circle"></i>
          Em preparo
        `;

        statusBadge.classList.add("preparo");

        histPreparo.classList.add("ativo");

      }

      // =========================
      // ENTREGA
      // =========================

      if(coluna === "entrega"){

        statusBadge.innerHTML = `
          <i class="fa-solid fa-circle"></i>
          Saiu para entrega
        `;

        statusBadge.classList.add("entrega");

        histPreparo.classList.add("ativo");

        histEntrega.classList.add("ativo");

      }

      // =========================
      // ENTREGUE
      // =========================

      if(coluna === "entregue"){

        statusBadge.innerHTML = `
          <i class="fa-solid fa-circle"></i>
          Entregue
        `;

        statusBadge.classList.add("entregue");

        histPreparo.classList.add("ativo");

        histEntrega.classList.add("ativo");

        histEntregue.classList.add("ativo");

      }

      // ABRIR
      painel.classList.add("ativo");

      overlay.classList.add("ativo");

    });

  });

  // FECHAR
  function fecharPainel(){

    painel.classList.remove("ativo");

    overlay.classList.remove("ativo");

    cards.forEach(card => {
      card.classList.remove("selecionado");
    });

  }

  fechar.addEventListener("click", fecharPainel);

  overlay.addEventListener("click", fecharPainel);

});

function setTodayDate() {

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