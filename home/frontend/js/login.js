/**
 * js/login.js - Sistema de Autenticação Regia & Tinas Care
 * Gerencia o acesso diferenciado por cargos (Admin, Funcionário, Cliente)
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember');
    
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    // 1. LEMBRAR DE MIM
    if (localStorage.getItem('lembrar_email') && emailInput) {
        emailInput.value = localStorage.getItem('lembrar_email');
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // 2. OLHINHO DE SENHA
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
            this.style.color = isPassword ? '#FE8697' : '#888';
        });
    }

    // 3. ENVIO DO FORMULÁRIO
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('lembrar_email', email);
            } else {
                localStorage.removeItem('lembrar_email');
            }

            submitButton.disabled = true;
            submitButton.textContent = 'VALIDANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                const data = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error((data && (data.error || data.mensagem)) || "Credenciais inválidas.");
                }

                // --- SUCESSO: GRAVA A SESSÃO ---
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);
                
                const userRole = data.role ? data.role.toLowerCase() : 'cliente';
                localStorage.setItem('usuario_role', userRole);

                console.log("Login realizado! Cargo detectado:", userRole);

                // --- 4. REDIRECIONAMENTO POR CARGO (CAMINHOS CORRIGIDOS) ---
                // Saímos da pasta /auth/ para entrar na pasta correta
                
                if (userRole === 'admin') {
                    console.log("Redirecionando para Dashboard Admin...");
                    window.location.href = '../admin/dashboard.html';
                } 
                else if (userRole === 'funcionario') {
                    console.log("Redirecionando para Painel Operacional...");
                    // Corrigido para a sua nova pasta funcionario/
                    window.location.href = '../funcionario/dash_funcionario.html';
                } 
                else {
                    console.log("Redirecionando para E-commerce...");
                    // Clientes voltam para a vitrine principal
                    window.location.href = '../ecommerce/index1.html';
                }

            } catch (error) {
                console.error('Erro de Autenticação:', error.message);
                alert(`Ops! ${error.message}`);
                submitButton.disabled = false;
                submitButton.textContent = 'ENTRAR';
            }
        });
    }
});