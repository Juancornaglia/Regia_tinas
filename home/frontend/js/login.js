/**
 * js/login.js - Sistema de Autenticação Regia & Tinas Care
 * Gerencia o acesso diferenciado por cargos (Admin, Funcionário, Cliente)
 * Integrado com Rastreabilidade de Rotas para fluxo de Agendamentos
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

    // 3. ENVIO DO FORMULÁRIO COM VALIDAÇÃO NEON
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

                // --- SUCESSO: GRAVA A SESSÃO LOCAL NO NAVEGADOR ---
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);
                
                const userRole = data.role ? data.role.toLowerCase() : 'cliente';
                localStorage.setItem('usuario_role', userRole);

                console.log("Login realizado com sucesso! Cargo detectado:", userRole);

                // --- 4. REDIRECIONAMENTO INTELIGENTE POR CARGO ---
                if (userRole === 'admin') {
                    console.log("Redirecionando para Dashboard Admin...");
                    window.location.href = '../admin/dashboard.html';
                } 
                else if (userRole === 'funcionario') {
                    console.log("Redirecionando para Painel Operacional...");
                    window.location.href = '../funcionario/dash_funcionario.html';
                } 
                else {
                    console.log("Detectado papel de Cliente. Verificando retorno pendente...");
                    
                    // CORREÇÃO MÁXIMA: Verifica se o utilizador possui um link de agendamento salvo na memória
                    const urlRetorno = sessionStorage.getItem('url_retorno_agendamento');

                    if (urlRetorno) {
                        console.log("Retorno de agendamento localizado! Devolvendo usuário ao fluxo...");
                        sessionStorage.removeItem('url_retorno_agendamento'); // Limpa a memória por segurança de sessão
                        window.location.href = urlRetorno; // Redireciona de volta para a tela de agendamento!
                    } else {
                        console.log("Nenhum agendamento pendente detectado. Redirecionando para o Perfil...");
                        window.location.href = 'perfil.html'; // Fluxo padrão se ele entrou de forma direta
                    }
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