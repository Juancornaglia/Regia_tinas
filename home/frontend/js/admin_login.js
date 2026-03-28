// 1. CONFIGURAÇÃO DA URL (Sempre no topo do arquivo)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE SEU LINK DO RENDER AQUI

/**
 * Função interna para verificar se o usuário logado é admin via API
 */
async function verificarSeEhAdmin(userId) {
    if (!userId) return false;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.isAdmin; // O Flask deve retornar {"isAdmin": true}
    } catch (error) {
        console.error("Erro ao validar admin na API:", error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('usuario_id');
    
    console.log("Verificando credenciais de administrador para Regia & Tinas Care...");

    // 2. TENTA VALIDAR O ADMIN NO BACKEND
    const isAdmin = await verificarSeEhAdmin(userId);
    
    if (isAdmin) {
        // Se a API confirmou que é admin, manda para o dashboard
        console.log("Admin validado com sucesso. Redirecionando...");
        window.location.href = 'dashboard.html';
    } else {
        // Se não for admin, limpa resquícios e manda para o login principal
        console.warn("Acesso negado ou sessão expirada. Redirecionando para login...");
        // Opcional: localStorage.removeItem('usuario_id'); 
        window.location.href = '../usuario/login.html';
    }
});