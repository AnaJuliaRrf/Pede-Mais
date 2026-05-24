const productsGrid = document.getElementById("productsGrid");

const products = [
  {
    nome: "Pizza Calabresa",
    categoria: "Pizzas",
    preco: "35,00",
    quantidade: 12
  },
  {
    nome: "X-Burger",
    categoria: "Lanches",
    preco: "22,00",
    quantidade: 4
  },
  {
    nome: "Refrigerante 2L",
    categoria: "Bebidas",
    preco: "9,00",
    quantidade: 0
  }
];

function renderProducts() {
  productsGrid.innerHTML = "";

  products.forEach(produto => {
    productsGrid.innerHTML += `
      <div class="product-card">
        <h3>${produto.nome}</h3>
        <p>Categoria: ${produto.categoria}</p>
        <p>Preço: R$ ${produto.preco}</p>
        <p>Estoque: ${produto.quantidade}</p>
      </div>
    `;
  });
}

renderProducts();