// js/auth_guard.js - Proteção de Rotas Regia & Tinas Care

/**
 * Verifica se o usuário tem a permissão necessária (role) para estar na página atual.
 * @param {string} roleNecessaria - 'admin' para painel gerencial, 'cliente' para área do usuário.
 */
export async function verificarAcesso(roleNecessaria) {
    // 1. Pega o ID salvo no navegador
    const userId = localStorage.getItem('usuario_id');

    // 2. Se não houver ID, expulsa direto para o login
    if (!userId) {
        console.warn("Acesso negado: Usuário não autenticado.");
        window.location.href = '../usuario/login.html';
        return false;
    }

    try {
        // 3. Pergunta ao servidor Python qual é o cargo real desse usuário (evita fraudes no localStorage)
        const response = await fetch(`${window.API_BASE_URL}/api/auth/verificar-role/${userId}`);
        
        if (!response.ok) {
            throw new Error("Sessão inválida ou expirada.");
        }

        const data = await response.json(); // Ex: { "role": "admin" } ou { "role": "cliente" }

        // 4. Validação rigorosa de permissão
        if (roleNecessaria === 'admin' && data.role !== 'admin') {
            alert("Acesso Negado: Esta área é exclusiva para administradores da Regia & Tinas Care.");
            window.location.href = '../index.html'; // Chuta para a home
            return false;
        }

        // Se chegou até aqui, está tudo certo! O usuário tem permissão.
        return true;

    } catch (error) {
        console.error("Erro crítico de segurança:", error);
        
        // Em caso de erro na API ou tentativa de invasão, limpa os dados falsos e manda pro login
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_role');
        localStorage.removeItem('token');
        
        window.location.href = '../usuario/login.html';
        return false;
    }
}