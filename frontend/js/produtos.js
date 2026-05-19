async function carregarProdutos() {
    const empresaId = localStorage.getItem('empresaId');

    const produtos = await apiRequest(
        `/empresas/${empresaId}/produtos`
    );

    const lista = document.getElementById('listaProdutos');
    lista.innerHTML = '';

    produtos.forEach(produto => {
        lista.innerHTML += `
            <li>${produto.nome} - R$ ${produto.preco}</li>
        `;
    });
}