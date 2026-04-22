// 1. CONFIGURAÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    // 2. LÓGICA DO OLHINHO DE SENHA
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Verifica o tipo atual e inverte
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Troca o ícone (olho fechado / olho aberto)
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
            
            // Muda a cor do ícone para dar um feedback visual legal
            this.style.color = isPassword ? '#FE8697' : '#888';
        });
    }

    // 3. ENVIO DO FORMULÁRIO DE LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value; // Pega o valor independente do tipo (text/password)

            // Desativa botão para evitar duplo clique
            submitButton.disabled = true;
            submitButton.textContent = 'ACESSANDO...';

            try {
                // Rota da sua API Python de Autenticação
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.mensagem || data.error || "E-mail ou senha incorretos.");
                }

                // SALVAR SESSÃO (Cookies locais)
                localStorage.setItem('token', data.token || data.id); // O ideal é o backend retornar um JWT
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome_completo || data.nome);
                localStorage.setItem('usuario_role', data.role);

                // REDIRECIONAMENTO DE ACORDO COM O TIPO DE USUÁRIO
                if (data.role === 'admin') {
                    window.location.href = '../admin/dashboard.html';
                } else {
                    window.location.href = 'perfil.html';
                }

            } catch (error) {
                console.error('Erro no login:', error.message);
                alert(`Ops! ${error.message}`);
            } finally {
                // Reativa o botão em caso de erro
                submitButton.disabled = false;
                submitButton.textContent = 'ENTRAR';
            }
        });
    }
});