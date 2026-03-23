document.addEventListener('DOMContentLoaded', () => {
    const criarContaForm = document.getElementById('criarContaForm');
    const submitButton = criarContaForm?.querySelector('button[type="submit"]');

    if (criarContaForm) {
        criarContaForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmar_senha').value;

            // Validações Básicas
            if (senha !== confirmarSenha) return alert("As senhas não coincidem!");
            if (senha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
            if (!nome) return alert("Por favor, preencha seu nome completo.");

            submitButton.disabled = true;
            submitButton.textContent = 'CRIANDO CONTA...';

            try {
                const response = await fetch('http://localhost:5000/api/usuario/cadastrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha })
                });

                const result = await response.json();

                if (response.ok && result.status === "sucesso") {
                    alert("Conta criada com sucesso! Você já pode fazer login.");
                    window.location.href = 'login.html';
                } else {
                    alert("Erro: " + result.mensagem);
                }
            } catch (error) {
                console.error("Erro na requisição:", error);
                alert("Não foi possível conectar ao servidor.");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'CRIAR CONTA';
            }
        });
    }

    // Lógica do olho (senha) - Mantida original
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('bi-eye-fill');
            this.classList.toggle('bi-eye-slash-fill');
        });
    }
});