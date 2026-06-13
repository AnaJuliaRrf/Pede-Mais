document.addEventListener("DOMContentLoaded", () => {
    if (typeof verificarAutenticacao === "function") {
        verificarAutenticacao();
    }

    if (!localStorage.getItem("token") || !localStorage.getItem("empresaId")) {
        return;
    }

    carregarEstoque();

});

async function carregarEstoque() {

    try {

        const empresaId =
            localStorage.getItem("empresaId");

        const produtos = await apiRequest(
            `/empresas/${empresaId}/estoque`,
            "GET",
            null,
            true
        );

        renderizarTabela(produtos);

    } catch (error) {

        console.error(
            "Erro ao carregar estoque:",
            error
        );

    }

}

function renderizarTabela(produtos) {

    const tabela =
        document.getElementById("tabelaEstoque");

    tabela.innerHTML = "";

    produtos.forEach((produto) => {

        let status = "";
        let statusClass = "";

        const quantidade = Number(produto.quantidade || 0);
        const estoqueMinimo = Number(produto.estoque_minimo || 0);

        if (quantidade <= 0) {

            status = "Sem estoque";
            statusClass = "danger";

        } else if (
            quantidade <= estoqueMinimo
        ) {

            status = "Baixo";
            statusClass = "warning";

        } else {

            status = "Em estoque";
            statusClass = "success";

        }

        tabela.innerHTML += `

            <tr>

                <td>${produto.nome}</td>

                <td>${produto.categoria}</td>

                <td>${quantidade}</td>

                <td>${estoqueMinimo}</td>

                <td>
                    <span class="status ${statusClass}">
                        ${status}
                    </span>
                </td>

                <td class="actions">

                    <button
                        class="edit-btn"
                        onclick="editarProduto(${produto.produto_id})"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletarProduto(${produto.produto_id})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            </tr>

        `;

    });

}

function editarProduto(id) {
    const linha = document
        .querySelector(`button[onclick="editarProduto(${id})"]`)
        ?.closest("tr");

    const quantidadeAtual = linha?.children[2]?.textContent || "0";
    const minimoAtual = linha?.children[3]?.textContent || "0";
    const quantidade = prompt("Informe a quantidade em estoque:", quantidadeAtual);

    if (quantidade === null) return;

    const estoqueMinimo = prompt("Informe o estoque minimo:", minimoAtual);

    if (estoqueMinimo === null) return;

    atualizarEstoque(id, {
        quantidade: Number(quantidade),
        estoque_minimo: Number(estoqueMinimo)
    });

}

async function atualizarEstoque(id, payload) {

    try {

        const empresaId =
            localStorage.getItem("empresaId");

        await apiRequest(
            `/empresas/${empresaId}/estoque/${id}`,
            "PATCH",
            payload,
            true
        );

        carregarEstoque();

    } catch (error) {

        console.error(
            "Erro ao atualizar estoque:",
            error
        );

        alert(error.message);

    }

}

async function deletarProduto(id) {

    const confirmar = confirm(
        "Deseja excluir esse produto?"
    );

    if (!confirmar) return;

    try {
        const empresaId =
            localStorage.getItem("empresaId");

        await apiRequest(
            `/empresas/${empresaId}/produtos/${id}`,
            "DELETE",
            null,
            true
        );

        carregarEstoque();

    } catch (error) {

        console.error(
            "Erro ao deletar produto:",
            error
        );

    }

}
