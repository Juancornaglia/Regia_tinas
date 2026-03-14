// static/js/perfil.js (Versão com Spinner)

import { supabase } from './supabaseClient.js';

// Seleciona os elementos do formulário E O SPINNER
const profileForm = document.getElementById('profile-form');
const loadingSpinner = document.getElementById('loading-profile'); // <-- NOVO
const saveButton = document.getElementById('save-profile-button');
const logoutButton = document.getElementById('logout-button');
const emailInput = document.getElementById('email');
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');

let currentUserId = null;

// Função para carregar os dados do perfil
async function loadProfileData() {
    // 1. Pega o usuário logado no Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('Erro ao buscar usuário ou usuário não logado:', authError?.message);
        alert('Você não está logado. Redirecionando para o login.');
        const loginUrl = logoutButton.dataset.loginUrl || '/'; 
        window.location.href = loginUrl;
        return;
    }

    currentUserId = user.id;
    emailInput.value = user.email;

    // 2. Busca os dados da tabela 'perfis'
    try {
        const { data: perfil, error: profileError } = await supabase
            .from('perfis')
            .select('nome, telefone') 
            .eq('id', currentUserId)
            .single(); 

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        if (perfil) {
            nomeInput.value = perfil.nome || '';
            telefoneInput.value = perfil.telefone || '';
        }

    } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error.message);
        alert('Erro ao carregar seu perfil.');
    } finally {
        // ======================================================
        // == AQUI ESTÁ A MUDANÇA VISUAL ==
        // ======================================================
        loadingSpinner.style.display = 'none'; // Esconde o spinner
        profileForm.style.display = 'block';   // Mostra o formulário
    }
}

// Função para salvar os dados do perfil
async function saveProfileData(event) {
    event.preventDefault(); 
    if (!currentUserId) {
        alert('Erro: ID do usuário não encontrado.');
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Salvando...';

    const novoNome = nomeInput.value;
    const novoTelefone = telefoneInput.value;

    try {
        const { error } = await supabase
            .from('perfis')
            .update({
                nome: novoNome,
                telefone: novoTelefone,
                updated_at: new Date() 
            })
            .eq('id', currentUserId); 

        if (error) {
            throw error;
        }

        alert('Perfil atualizado com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar dados do perfil:', error.message);
        alert('Erro ao salvar seu perfil: ' + error.message);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Salvar Alterações';
    }
}

// Função de Logout
async function handleLogout() {
    if (!confirm('Tem certeza que deseja sair?')) {
        return;
    }

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        const loginUrl = logoutButton.dataset.loginUrl || '/';
        window.location.href = loginUrl;
    } catch (error) {
        console.error('Erro ao fazer logout:', error.message);
        alert('Erro ao sair: ' + error.message);
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', loadProfileData);
profileForm.addEventListener('submit', saveProfileData);
logoutButton.addEventListener('click', handleLogout);