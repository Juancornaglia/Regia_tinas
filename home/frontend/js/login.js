// js/login.js - Código Definitivo e Completo
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => { 
    const loginForm = document.getElementById('loginForm'); 
    const togglePassword = document.getElementById('togglePassword'); // ID do olhinho no HTML
    const passwordInput = document.getElementById('senha'); 
    const emailInput = document.getElementById('email'); 
    const rememberCheckbox = document.getElementById('remember'); 
    
    // 1. LÓGICA DO OLHINHO (Visualização de Senha)
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
        });
    }

    // 2. LEMBRAR DE MIM
    if (localStorage.getItem('lembrar_email') && emailInput) { 
        emailInput.value = localStorage.getItem('lembrar_email'); 
        if (rememberCheckbox) rememberCheckbox.checked = true; 
    }

    // 3. ENVIO DO FORMULÁRIO
    if (loginForm) { 
        loginForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            
            const email = emailInput.value.trim(); 
            const password = passwordInput.value;
            const btn = loginForm.querySelector('button[type="submit"]');

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('lembrar_email', email);
            } else {
                localStorage.removeItem('lembrar_email');
            }

            btn.disabled = true; 
            btn.textContent = 'ACESSANDO...';

            try { 
                const response = await fetch(`${API_BASE_URL}/api/login`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ email, senha: password }) 
                });

                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error("Erro no servidor. Tente novamente mais tarde.");
                }

                if (!response.ok) {
                    throw new Error(data.error || "Credenciais inválidas");
                }

                // SUCESSO
                localStorage.clear(); 
                localStorage.setItem('usuario_id', data.id); 
                localStorage.setItem('usuario_nome', data.nome); 
                localStorage.setItem('usuario_role', data.role);

                // REDIRECIONAMENTO
                if (data.role === 'admin') window.location.href = '../admin/dashboard.html'; 
                else if (data.role === 'funcionario') window.location.href = '../admin/funcionario.html'; 
                else window.location.href = 'perfil.html'; 

            } catch (error) { 
                console.error('Erro:', error); 
                alert(error.message); 
            } finally { 
                btn.disabled = false; 
                btn.textContent = 'ENTRAR'; 
            } 
        }); 
    } 
});