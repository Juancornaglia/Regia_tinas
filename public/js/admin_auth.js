// js/admin_auth.js
// Este é o "Segurança" que vai proteger todas as suas páginas de admin.
// Esta versão foi corrigida para ler a URL de login do HTML.

// O caminho './supabaseClient.js' está CORRETO, pois está na mesma pasta.
import { supabase } from './supabaseClient.js';

/**
 * Pega a URL de login do atributo 'data-login-url' no botão de logout do HTML.
 * Isso garante que o Flask sempre forneça o link correto.
 * @returns {string} A URL de login correta (ex: /usuario/login).
 */
function getLoginUrl() {
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton && logoutButton.dataset.loginUrl) {
        // Retorna a URL fornecida pelo Flask no HTML
        return logoutButton.dataset.loginUrl;
    } else {
        console.error("ERRO CRÍTICO: 'data-login-url' não encontrado no '#logout-button'. O redirecionamento de auth vai falhar. Verifique seu HTML.");
        // Retorna um palpite de fallback apenas para evitar que o site quebre totalmente.
        return '/usuario/login'; 
    }
}

/**
 * Verifica se o usuário logado é um 'admin'.
 * Se não for, ele expulsa o usuário para a tela de login.
 */
export async function checkAdminAuth() {
    // Pega a URL de login dinâmica do HTML
    const loginUrl = getLoginUrl(); 

    // 1. Verifica se há uma sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error('Erro ao pegar sessão:', sessionError);
        window.location.href = loginUrl; // Redireciona para o login
        return null;
    }

    if (!session) {
        console.log("Nenhum usuário logado. Redirecionando...");
        window.location.href = loginUrl; // Redireciona para o login
        return null;
    }

    const userId = session.user.id;

    // 2. Busca o perfil do usuário logado para checar o "role"
    const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', userId)
        .single();

    if (perfilError) {
        console.error('Erro ao buscar perfil do admin:', perfilError);
        alert('Erro: Não foi possível verificar seu perfil. Você será deslogado.');
        await supabase.auth.signOut();
        window.location.href = loginUrl; // Redireciona para o login
        return null;
    }

    // 3. Verifica o "role"
    if (perfil && perfil.role === 'admin') {
        // SUCESSO! É um admin.
        console.log('Acesso de admin verificado.');
        return session.user; // Retorna os dados do usuário admin
    } else {
        // NÃO É ADMIN! Expulsa.
        console.warn('Acesso negado: Usuário não é admin.');
        alert('Acesso negado. Esta área é restrita para administradores.');
        await supabase.auth.signOut();
        window.location.href = loginUrl; // Redireciona para o login
        return null;
    }
}