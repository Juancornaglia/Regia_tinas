// js/admin_redirect.js - Redirecionamento Automático Admin Regia & Tinas Care

// ATENÇÃO: O arquivo utils.js deve ser importado no seu HTML antes deste script!

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('usuario_id');
    
    console.log("Verificando credenciais de administrador...");

    // Se nem logado a pessoa está, manda pro login na hora
    if (!userId) {
        console.warn("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = '../usuario/login.html';
        return;
    }

    // Usa a função global que definimos no utils.js para perguntar ao Python
    const isAdmin = await window.verificarAdmin(userId);
    
    if (isAdmin) {
        console.log("Admin validado com sucesso. Abrindo o painel...");
        window.location.href = 'dashboard.html';
    } else {
        console.warn("Acesso negado. Usuário logado não é administrador.");
        // Manda para a página inicial do site em vez do login, 
        // pois pode ser apenas um cliente curioso logado tentando acessar o painel
        window.location.href = '../index.html'; 
    }
});