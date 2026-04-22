// js/admin_auth.js - Proteção de rotas para o Painel Admin (Regia & Tinas Care)

// ATENÇÃO: Lembre-se de importar o utils.js no HTML do Admin antes deste script!

export async function checkAdminAuth() {
    const userId = localStorage.getItem('usuario_id');

    // 1. Verifica se sequer existe um ID salvo no navegador
    if (!userId) {
        console.warn("Acesso negado: Nenhum usuário logado.");
        window.location.href = '../usuario/login.html';
        return null;
    }

    // Garante que a URL base exista
    const baseUrl = window.API_BASE_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000" 
        : "https://regia-tinas.onrender.com");

    try {
        // 2. Pergunta ao Python se esse ID é de um Admin real
        const response = await fetch(`${baseUrl}/api/auth/verificar-admin/${userId}`);
        
        // CORREÇÃO: Verifica se o servidor respondeu OK antes de tentar ler o JSON
        if (!response.ok) {
            throw new Error("Falha ao validar permissões com o servidor.");
        }

        // Blindagem contra erro de JSON/HTML
        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            throw new Error("Resposta inválida do servidor.");
        }

        // 3. Valida se a API confirmou que é admin (aceita isAdmin ou role)
        if (data.isAdmin === true || data.role === 'admin') {
            console.log("Acesso concedido ao painel administrativo.");
            
            // Retorna os dados para a página do Dashboard usar (ex: exibir o nome)
            return { 
                id: userId, 
                nome: localStorage.getItem('usuario_nome') || 'Administrador' 
            };
        } else {
            // 4. Se for apenas um cliente curioso, apenas expulsa para a home
            console.error("Acesso negado: Usuário não possui privilégios de admin.");
            alert("Área restrita! Apenas administradores podem acessar o painel.");
            window.location.href = '../index.html'; 
            return null;
        }
        
    } catch (error) {
        console.error("Erro na verificação de segurança:", error);
        // Em caso de erro grave (servidor fora do ar), redireciona para o login por segurança
        window.location.href = '../usuario/login.html';
        return null;
    }
}