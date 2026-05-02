export async function checkAdminAuth() {
    // 1. Mudamos: Agora buscamos o TOKEN, não mais o ID solto
    const token = localStorage.getItem('token_acesso');

    if (!token) {
        console.warn("Acesso negado: Nenhum token de autenticação encontrado.");
        window.location.href = '../usuario/login.html';
        return null;
    }

    const baseUrl = window.API_BASE_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000" 
        : "https://regia-tinas.onrender.com");

    try {
        // 2. Mudamos: A rota não precisa mais do ID na URL. Enviamos o token no Header.
        const response = await fetch(`${baseUrl}/api/auth/verificar-admin`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // O padrão de mercado para enviar tokens
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error("Falha ao validar permissões com o servidor.");
        }

        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            throw new Error("Resposta inválida do servidor.");
        }

        if (data.isAdmin === true || data.role === 'admin') {
            console.log("Acesso concedido ao painel administrativo.");
            // O backend seguro é quem deve nos devolver o nome e ID validados dentro do JSON
            return { 
                id: data.id, 
                nome: data.nome || 'Administrador' 
            };
        } else {
            console.error("Acesso negado: Usuário não possui privilégios de admin.");
            alert("Área restrita! Apenas administradores podem acessar o painel.");
            window.location.href = '../index.html'; 
            return null;
        }
        
    } catch (error) {
        console.error("Erro na verificação de segurança:", error);
        window.location.href = '../usuario/login.html';
        return null;
    }
}