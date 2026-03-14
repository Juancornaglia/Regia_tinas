// js/redefinir_senha.js

// CAMINHO DE IMPORT CORRIGIDO (./ significa "mesma pasta")
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', function() {
    // Seleciona os elementos da página
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const section1 = document.getElementById('reset-section-1');
    const section2 = document.getElementById('reset-section-2');
    const backToStep1Button = document.getElementById('back-to-step1');

    // ==========================================================================
    // CAPTURA AS URLS CORRETAS VINDAS DO FLASK (data- attributes)
    // ==========================================================================
    const redirectToUrl = sendCodeForm?.dataset.redirectToUrl || (window.location.origin + window.location.pathname);
    const loginUrl = resetPasswordForm?.dataset.loginUrl || 'login.html';
    // ==========================================================================


    let recoveryToken = null;

    // --- LÓGICA DE CONTROLE DAS ETAPAS ---

    const showResetForm = () => {
        section1.style.display = 'none';
        section2.style.display = 'block';
    };

    const showRequestForm = () => {
        section1.style.display = 'block';
        section2.style.display = 'none';
    };

    if (window.location.hash.includes('access_token=')) {
        const params = new URLSearchParams(window.location.hash.substring(1)); // Remove o '#'
        recoveryToken = params.get('access_token');
        
        if (recoveryToken) {
            console.log('Token de recuperação encontrado.');
            showResetForm();
        }
    } else {
        showRequestForm();
    }

    // --- LÓGICA DOS FORMULÁRIOS ---

    // ETAPA 1: Enviar o link de recuperação
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'ENVIANDO...';

            try {
                // CAMINHO DE REDIRECIONAMENTO CORRIGIDO
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectToUrl, // Usa a URL completa vinda do Flask
                });

                if (error) throw error;

                alert("E-mail de recuperação enviado! Verifique sua caixa de entrada (e spam) e clique no link para redefinir sua senha.");
                
            } catch (error) {
                console.error('Erro ao enviar e-mail de recuperação:', error.message);
                alert(`Erro: ${error.message}`);
            } finally {
                button.disabled = false;
                button.textContent = 'ENVIAR LINK'; // Corrigido de CÓDIGO para LINK
            }
        });
    }

    // ETAPA 2: Redefinir a senha (após clicar no link do e-mail)
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('new_password').value;
            const confirmNewPassword = document.getElementById('confirm_new_password').value;
            const button = e.target.querySelector('button[type="submit"]');

            if (newPassword !== confirmNewPassword) {
                alert("As novas senhas não coincidem. Tente novamente.");
                return;
            }

            if (!recoveryToken) {
                alert("Token de recuperação inválido. Por favor, solicite um novo link.");
                showRequestForm(); // Volta para a etapa 1
                return;
            }

            button.disabled = true;
            button.textContent = 'SALVANDO...';

            try {
                const { error } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                alert("Senha redefinida com sucesso! Você já pode fazer o login.");
                
                // CAMINHO DE REDIRECIONAMENTO CORRIGIDO
                window.location.href = loginUrl; 

            } catch (error) {
                console.error('Erro ao redefinir senha:', error.message);
                alert(`Erro ao salvar nova senha: ${error.message}`);
                button.disabled = false;
                button.textContent = 'SALVAR SENHA';
            }
        });
    }

    // Lógica para o botão de voltar da Etapa 2 para a Etapa 1
    if (backToStep1Button) {
        backToStep1Button.addEventListener('click', function(e) {
            e.preventDefault();
            showRequestForm();
        });
    }
});