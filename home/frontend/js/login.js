/**
 * js/login.js - Sistema de Autenticação Regia & Tinas Care
 * Gerencia o acesso diferenciado por cargos (Admin, Funcionário, Cliente)
 */

// 1. CONFIGURAÇÃO DA URL DINÂMICA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    // 2. LÓGICA DO OLHINHO DE SENHA (VISIBILIDADE)
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Troca o ícone (olho fechado / olho aberto)
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
            
            // Feedback visual com a cor da marca
            this.style.color = isPassword ? '#FE8697' : '#888';
        });
    }

    // 3. ENVIO DO FORMULÁRIO E REDIRECIONAMENTO POR CARGO
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value;

            // Interface: Bloqueia o botão para evitar cliques duplos
            submitButton.disabled = true;
            submitButton.textContent = 'ACESSANDO...';

            try {
                // Envia os dados para o app.py no Render ou Localhost
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                // TRATAMENTO DE ERROS DO SERVIDOR (DSN, 500, 404)
                if (!response.ok) {
                    let errorMessage = "E-mail ou senha incorretos.";
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.mensagem || errorData.error || errorMessage;
                    } catch (err) {
                        // Se o Python devolver um erro 500 (como o Invalid DSN), cai aqui
                        if (response.status === 500) errorMessage = "Erro na conexão com o banco de dados. Verifique a URL no Render.";
                        if (response.status === 404) errorMessage = "Servidor não encontrado.";
                    }
                    throw new Error(errorMessage);
                }

                // SUCESSO: Recebe os dados do usuário e a ROLE (Cargo)
                const data = await response.json();

                // GRAVA A SESSÃO NO NAVEGADOR
                localStorage.setItem('token_acesso', data.token); 
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);
                localStorage.setItem('usuario_role', data.role); // Crucial para os protetores de rota

                // 4. CATRACA INTELIGENTE (REDIRECIONAMENTO POR CARGO)
                if (data.role === 'admin') {
                    // Se for você, vai para o painel completo
                    window.location.href = '../admin/dashboard.html';
                } 
                else if (data.role === 'funcionario') {
                    // Se for o Carlos, vai para a página curta de equipe
                    window.location.href = '../admin/funcionario.html';
                } 
                else {
                    // Clientes comuns vão para a página de perfil
                    window.location.href = 'perfil.html';
                }

            } catch (error) {
                console.error('Falha na autenticação:', error.message);
                alert(`Atenção: ${error.message}`);
            } finally {
                // Libera o botão novamente
                submitButton.disabled = false;
                submitButton.textContent = 'ENTRAR';
            }
        });
    }
});