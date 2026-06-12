const cadastroForm = document.getElementById("cadastroForm");

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

cadastroForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nome: getValue("nome"),
    cpf: getValue("cpf"),
    nascimento: getValue("nascimento"),
    telefone: getValue("telefone"),
    endereco: getValue("endereco"),
    cep: getValue("cep"),
    email: getValue("email"),
    senha: getValue("senha"),
    empresa: {
      nome: getValue("empresaNome"),
      cidade: getValue("empresaCidade"),
      endereco: getValue("empresaEndereco"),
      numero: getValue("empresaNumero"),
      documento: getValue("empresaDocumento"),
      cep: getValue("empresaCep"),
      foco: getValue("empresaFoco"),
      telefone: getValue("empresaTelefone"),
      email: getValue("empresaEmail"),
    },
  };

  if (!payload.nome || !payload.email || !payload.senha || !payload.empresa.nome) {
    alert("Preencha nome, email, senha e nome da empresa.");
    return;
  }

  try {
    await apiRequest("/auth/cadastro", "POST", payload);
    window.location.href = "cadastrorealizado.html";
  } catch (error) {
    console.error("Erro no cadastro:", error);
    alert(error.message || "Não foi possível realizar o cadastro.");
  }
});
