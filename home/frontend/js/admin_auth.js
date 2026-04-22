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

    try {
        // 2. Pergunta ao Python se esse ID é de um Admin real
        // Usando a variável global que definimos no utils.js
        const response = await fetch(`${window.API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        if (!response.ok) {
            throw new Error("Falha ao validar permissões com o servidor.");
        }

        const data = await response.json();

        // 3. Valida se a API confirmou que é admin (aceita isAdmin ou role)
        if (data.isAdmin === true || data.role === 'admin') {
            console.log("Acesso concedido ao painel administrativo.");
            
            // Retorna os dados para a página do Dashboard usar (ex: exibir o nome)
            return { 
                id: userId, 
                nome: localStorage.getItem('usuario_nome') || 'Administrador' 
            };
        } else {
            // 4. Se for apenas um cliente curioso, não apaga o login dele, apenas expulsa para a home
            console.error("Acesso negado: Usuário não possui privilégios de admin.");
            alert("Área restrita! Apenas administradores podem acessar o painel.");
            window.location.href = '../index.html'; 
            return null;
        }
        
    } catch (error) {
        console.error("Erro na verificação de segurança:", error);
        // Em caso de erro grave (servidor fora do ar), redireciona para o login
        window.location.href = '../usuario/login.html';
        return null;
    }
}