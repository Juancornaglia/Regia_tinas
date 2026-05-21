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
    const emailInput = document.getElementById('email'); 
    const rememberCheckbox = document.getElementById('remember'); 
    
    // Verificação de segurança para o botão
    const submitButton = loginForm?.querySelector('button[type="submit"]');

    // 2. LEMBRAR DE MIM
    if (localStorage.getItem('lembrar_email') && emailInput) { 
        emailInput.value = localStorage.getItem('lembrar_email'); 
        if (rememberCheckbox) rememberCheckbox.checked = true; 
    }

    // 3. LÓGICA DO OLHINHO DE SENHA
    if (togglePassword && passwordInput) { 
        togglePassword.addEventListener('click', function () { 
            const isPassword = passwordInput.type === 'password'; 
            passwordInput.type = isPassword ? 'text' : 'password'; 
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill'); 
            this.style.color = isPassword ? '#FE8697' : '#888'; 
        }); 
    }

    // 4. ENVIO DO FORMULÁRIO E REDIRECIONAMENTO POR CARGO
    if (loginForm) { 
        loginForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            
            const email = emailInput.value.trim(); 
            const password = passwordInput.value;

            // Salva ou remove o e-mail no navegador dependendo do checkbox
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('lembrar_email', email);
            } else {
                localStorage.removeItem('lembrar_email');
            }

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

                const data = await response.json().catch(() => null);

                // TRATAMENTO DE ERROS DO SERVIDOR (DSN, 500, 404)
                if (!response.ok) {
                    let errorMessage = "E-mail ou senha incorretos.";
                    
                    if (data && (data.mensagem || data.error)) {
                        errorMessage = data.mensagem || data.error;
                    } else if (response.status === 500) {
                        errorMessage = "Erro na conexão com o banco de dados. Verifique a URL no Render.";
                    } else if (response.status === 404) {
                        errorMessage = "Servidor não encontrado.";
                    }
                    throw new Error(errorMessage);
                }

                // SUCESSO: GRAVA A SESSÃO NO NAVEGADOR
                // (Sem 'token' vazio que causava a expulsão da página)
                localStorage.setItem('usuario_id', data.id); 
                localStorage.setItem('usuario_nome', data.nome); 
                localStorage.setItem('usuario_role', data.role);

                console.log("Login realizado com sucesso! Cargo:", data.role);

                // CATRACA INTELIGENTE (REDIRECIONAMENTO POR CARGO)
                if (data.role === 'admin') { 
                    window.location.href = '../admin/dashboard.html'; 
                } 
                else if (data.role === 'funcionario') { 
                    // Garante o envio do Carlos para a página operacional
                    window.location.href = '../admin/funcionario.html'; 
                } 
                else { 
                    // Clientes comuns
                    window.location.href = 'perfil.html'; 
                } 
            } catch (error) { 
                console.error('Erro de Autenticação:', error.message); 
                alert(`Ops! ${error.message}`); 
            } finally { 
                // Libera o botão novamente caso dê erro
                submitButton.disabled = false; 
                submitButton.textContent = 'ENTRAR'; 
            } 
        }); 
    } 
});