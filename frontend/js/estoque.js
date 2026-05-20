document.addEventListener("DOMContentLoaded", () => {

    carregarEstoque();

});

async function carregarEstoque() {

    try {

        const empresaId =
            localStorage.getItem("empresaId");

        const produtos = await apiRequest(
            `/empresas/${empresaId}/produtos`,
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

        if (produto.estoque <= 0) {

            status = "Sem estoque";
            statusClass = "danger";

        } else if (
            produto.estoque <= produto.minimo
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

                <td>${produto.estoque}</td>

                <td>${produto.minimo}</td>

                <td>
                    <span class="status ${statusClass}">
                        ${status}
                    </span>
                </td>

                <td class="actions">

                    <button
                        class="edit-btn"
                        onclick="editarProduto(${produto.id})"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletarProduto(${produto.id})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            </tr>

        `;

    });

}

function editarProduto(id) {

    console.log(
        "Editar produto:",
        id
    );

}

async function deletarProduto(id) {

    const confirmar = confirm(
        "Deseja excluir esse produto?"
    );

    if (!confirmar) return;

    try {

        await apiRequest(
            `/produtos/${id}`,
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