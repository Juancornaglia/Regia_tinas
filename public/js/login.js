// js/login.js
// VERSÃO CORRIGIDA

import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha');

    if (loginForm) {
        const submitButton = loginForm.querySelector('button[type="submit"]');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('senha').value;
            
            // Pega as URLs de redirecionamento do formulário logo no início
            const homeUrl = loginForm.dataset.homeUrl;
            const adminUrl = loginForm.dataset.adminDashboardUrl;

            // ==========================================================
            // INÍCIO DO CÓDIGO INSEGURO (APENAS PARA TESTE)
            if (email === 'juancornaglia00@gmail.com' && password === 'teste123') {
                alert('Acesso ADMIN (LOCAL) concedido.');
                
                // ****** ALTERAÇÃO 1 AQUI ******
                // Corrigido: Redireciona para a URL do Flask, e não para o arquivo .html
                window.location.href = adminUrl; 
                // ****** FIM DA ALTERAÇÃO 1 ******

                return; 
            }
            // FIM DO CÓDIGO INSEGURO
            // ==========================================================

            submitButton.disabled = true;
            submitButton.textContent = 'ACESSANDO...';

            try {
                // PASSO 1: AUTENTICAR
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (authError) { throw authError; }
                if (!authData.user) { throw new Error("Dados de usuário não retornados."); }

                // PASSO 2: AUTORIZAR
                const userId = authData.user.id;
                console.log("Usuário autenticado. Verificando perfil...");

                const { data: perfil, error: perfilError } = await supabase
                    .from('perfis')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (perfilError) {
                    console.error("Erro ao buscar perfil:", perfilError.message);
                    await supabase.auth.signOut();
                    throw new Error(`Erro ao buscar seu perfil no banco: ${perfilError.message}`);
                }
                if (!perfil) {
                    await supabase.auth.signOut();
                    throw new Error("Perfil de usuário não encontrado.");
                }

                // ==========================================================
                // PASSO 3: REDIRECIONAR
                // ****** ALTERAÇÃO 2 AQUI ******
                // As URLs agora são lidas das variáveis 'adminUrl' e 'homeUrl'
                // que pegamos do formulário no início.
                // ==========================================================
                if (perfil.role === 'admin') {
                    alert('Acesso de administrador concedido. Bem-vindo!');
                    window.location.href = adminUrl; // CORRIGIDO
                } else {
                    const redirectTo = localStorage.getItem('redirectAfterLogin') || homeUrl; // CORRIGIDO
                    localStorage.removeItem('redirectAfterLogin');
                    alert('Login bem-sucedido! Redirecionando...');
                    window.location.href = redirectTo;
                }
                // ****** FIM DA ALTERAÇÃO 2 ******

            } catch (error) {
                console.error('Erro no login:', error.message);
                if (error.message.includes("Invalid login credentials")) {
                    alert("Email ou senha incorretos. Tente novamente.");
                } else if (error.message.includes("Email not confirmed")) {
                    alert("Seu email ainda não foi confirmado. Verifique sua caixa de entrada.");
                } else {
                    alert(`Erro ao fazer login: ${error.message}`);
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'ACESSAR';
            }
        });
    }
    
    // Lógica para mostrar/esconder a senha
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bi-eye-fill');
            this.classList.toggle('bi-eye-slash-fill');
        });
    }
});