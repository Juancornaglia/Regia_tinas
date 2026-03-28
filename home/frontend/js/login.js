
// 1. DEFINIÇÃO DA URL (Sempre no topo do arquivo)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE SEU LINK DO RENDER AQUI

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('senha').value;

            // 1. Backdoor Admin Local (Mantido conforme sua solicitação)
            if (email === 'juancornaglia00@gmail.com' && password === 'teste123') {
                alert('Acesso ADMIN (LOCAL) concedido.');
                window.location.href = '../admin/dashboard.html';
                return; 
            }

            // Interface: Desativa botão enquanto processa
            submitButton.disabled = true;
            submitButton.textContent = 'ACESSANDO...';

            try {
                // 2. CHAMADA PARA O SEU BACKEND PYTHON (Usando a variável dinâmica)
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.mensagem || "E-mail ou senha incorretos.");
                }

                // 3. SALVAR SESSÃO E REDIRECIONAR
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);
                localStorage.setItem('usuario_role', data.role); // Útil para proteger rotas no front

                if (data.role === 'admin') {
                    alert(`Bem-vindo, Administrador ${data.nome}!`);
                    window.location.href = '../admin/dashboard.html';
                } else {
                    alert(`Olá, ${data.nome}! Login realizado com sucesso.`);
                    window.location.href = '../usuario/perfil.html';
                }

            } catch (error) {
                console.error('Erro no login:', error.message);
                alert(`Erro: ${error.message}`);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'ACESSAR';
                }
            }
        });
    }

    // Lógica do olho (senha) - Corrigida para funcionar sempre
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Alterna as classes do ícone
            this.classList.toggle('bi-eye-fill');
            this.classList.toggle('bi-eye-slash-fill');
        });
    }
});