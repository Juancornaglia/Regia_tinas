// js/admin_redirect.js - Redirecionamento Automático Admin Regia & Tinas Care

// ATENÇÃO: O arquivo utils.js deve ser importado no seu HTML antes deste script!

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('usuario_id');
    
    console.log("Verificando credenciais de administrador...");

    // 1. Se nem logado a pessoa está, manda pro login na hora
    if (!userId) {
        console.warn("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = '../usuario/login.html';
        return;
    }

    try {
        // 2. Usa a função global que definimos no utils.js para perguntar ao Python
        // Adicionamos um fallback caso a função ainda não tenha sido carregada
        if (typeof window.verificarAdmin !== 'function') {
            throw new Error("Sistema de verificação não carregado.");
        }

        const isAdmin = await window.verificarAdmin(userId);
        
        if (isAdmin) {
            console.log("Admin validado com sucesso. Abrindo o painel...");
            window.location.href = 'dashboard.html';
        } else {
            console.warn("Acesso negado. Usuário logado não é administrador.");
            // Manda para a página inicial do site
            window.location.href = '../index.html'; 
        }

    } catch (error) {
        console.error("Erro crítico na verificação de acesso:", error);
        // Em caso de erro na API, por segurança, não deixa entrar e manda para o login
        alert("Sua sessão expirou ou ocorreu um erro de conexão. Por favor, faça login novamente.");
        localStorage.clear();
        window.location.href = '../usuario/login.html';
    }
});