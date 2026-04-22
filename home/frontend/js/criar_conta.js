// 1. CONFIGURAÇÃO DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.getElementById('criarContaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar_senha').value;
    const btn = e.target.querySelector('button');

    // 2. VALIDAÇÃO BÁSICA
    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    // Bloqueia o botão para evitar cliques duplos
    btn.disabled = true;
    btn.innerText = "CRIANDO CONTA...";

    try {
        // 3. ENVIO PARA O PYTHON
        const response = await fetch(`${API_BASE_URL}/api/auth/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_completo: nome,
                email: email,
                senha: senha
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Conta criada com sucesso! Agora você pode fazer login.");
            window.location.href = 'login.html';
        } else {
            alert("Erro: " + (data.mensagem || "Falha ao criar conta."));
            btn.disabled = false;
            btn.innerText = "CRIAR CONTA";
        }

    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor. Tente novamente.");
        btn.disabled = false;
        btn.innerText = "CRIAR CONTA";
    }
});