// js/admin_auth.js
// Proteção de rotas para o ambiente Neon + Python

export async function checkAdminAuth() {
    const userId = localStorage.getItem('usuario_id');

    // 1. Verifica se sequer existe um ID no navegador
    if (!userId) {
        console.warn("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = '../usuario/login.html';
        return null;
    }

    try {
        // 2. Pergunta ao Python se esse ID é de um Admin real no Neon
        // 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}
        const data = await response.json();

        if (response.ok && data.status === 'autorizado') {
            console.log(`Acesso concedido para o admin: ${data.nome}`);
            return { id: userId, nome: data.nome };
        } else {
            // 3. Se não for admin, limpa tudo e expulsa
            console.error("Acesso negado: Usuário não possui privilégios de admin.");
            alert("Área restrita! Apenas administradores podem acessar esta página.");
            localStorage.clear();
            window.location.href = '../usuario/login.html';
            return null;
        }
    } catch (error) {
        console.error("Erro na verificação de segurança:", error);
        // Em caso de erro de servidor, por segurança, redireciona
        window.location.href = '../usuario/login.html';
        return null;
    }
}