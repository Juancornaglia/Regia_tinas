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

        // CORREÇÃO: Blindagem contra o erro de JSON/HTML
        if (!response.ok) {
            let errorMessage = "Falha ao criar conta.";
            try {
                const data = await response.json();
                errorMessage = data.mensagem || data.error || errorMessage;
            } catch (err) {
                if (response.status === 404) errorMessage = "Rota de cadastro não encontrada.";
                if (response.status === 500) errorMessage = "Erro interno no servidor.";
            }
            throw new Error(errorMessage);
        }

        // Se passou direto pelo if acima, deu tudo certo!
        const data = await response.json();
        alert("Conta criada com sucesso! Agora você pode fazer login.");
        window.location.href = 'login.html';

    } catch (error) {
        console.error("Erro na requisição:", error.message);
        alert(`Erro: ${error.message}`);
    } finally {
        // Garante que o botão sempre volte a funcionar
        if (btn) {
            btn.disabled = false;
            btn.innerText = "CRIAR CONTA";
        }
    }
});