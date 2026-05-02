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
            
            // Alterna ícones do Bootstrap Icons
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
            
            // Feedback visual
            this.style.color = isPassword ? '#FE8697' : '#888';
        });
    }

    // 3. ENVIO DO FORMULÁRIO
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value;

            // Bloqueio visual para evitar cliques múltiplos
            submitButton.disabled = true;
            submitButton.textContent = 'VALIDANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.mensagem || "Erro ao fazer login.");
                }

                // --- SUCESSO: GRAVA A SESSÃO NO NAVEGADOR ---
                // Importante: Estes nomes devem ser os mesmos que você usa no funcionario.js
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nome', data.nome);
                localStorage.setItem('usuario_role', data.role);

                console.log("Login realizado com sucesso! Cargo:", data.role);

                // --- 4. REDIRECIONAMENTO POR CARGO ---
                if (data.role === 'admin') {
                    window.location.href = '../admin/dashboard.html';
                } 
                else if (data.role === 'funcionario') {
                    // Aqui é onde o Carlos será enviado
                    window.location.href = '../admin/funcionario.html';
                } 
                else {
                    window.location.href = 'perfil.html';
                }

            } catch (error) {
                console.error('Erro de Autenticação:', error.message);
                alert(`Ops! ${error.message}`);
            } finally {
                // Libera o botão se algo der errado
                submitButton.disabled = false;
                submitButton.textContent = 'ENTRAR';
            }
        });
    }
});