const cards = document.querySelectorAll(".card");
const colunas = document.querySelectorAll(".coluna");

let cardArrastado = null;

/* =========================
   ARRASTAR CARD
========================= */

cards.forEach(card => {

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

/* =========================
   SOLTAR NA COLUNA
========================= */

colunas.forEach(coluna => {

  coluna.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  coluna.addEventListener("drop", () => {

    if(cardArrastado){

      coluna.appendChild(cardArrastado);

      atualizarContadores();

    }

  });

});

function atualizarContadores(){

  const colunas = document.querySelectorAll(".coluna");

  colunas.forEach(coluna => {

    const cards = coluna.querySelectorAll(".card");

    const contador = coluna.querySelector(".contador");

    contador.textContent = cards.length;

  });

}

atualizarContadores();