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

            // 1. Backdoor Admin Local (Mantido como você pediu)
            if (email === 'juancornaglia00@gmail.com' && password === 'teste123') {
                alert('Acesso ADMIN (LOCAL) concedido.');
                window.location.href = '../admin/dashboard.html';
                return; 
            }

            // Interface: Desativa botão enquanto processa
            submitButton.disabled = true;
            submitButton.textContent = 'ACESSANDO...';

            try {
                // 2. CHAMADA PARA O SEU BACKEND PYTHON
                const response = await fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.mensagem || "Erro ao realizar login");
                }

                // 3. SALVAR SESSÃO E REDIRECIONAR
                // Salvamos o ID retornado pelo Neon para usar nas telas de Pets e Agendamentos
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);

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
                submitButton.disabled = false;
                submitButton.textContent = 'ACESSAR';
            }
        });
    }

    // Lógica do olho (senha) - Mantida original
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bi-eye-fill');
            this.classList.toggle('bi-eye-slash-fill');
        });
    }

    // Nota: Login Social (Google/FB) exige configuração no Google Cloud/Meta 
    // e uma rota específica no seu Python para funcionar com o Neon.
});