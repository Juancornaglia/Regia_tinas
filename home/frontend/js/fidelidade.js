// 1. CONFIGURAÇÃO DA URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; // <-- Seu link real já está aqui!

// 2. FUNÇÃO DE VERIFICAR ADMIN
async function verificarAdmin(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        // BLINDAGEM: Verifica se o servidor respondeu certo antes de ler o JSON
        if (!response.ok) throw new Error("Erro na API ao verificar admin");
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false; // Retorna falso por segurança para bloquear acessos indevidos
    }
}

/**
 * Envia os dados para o servidor Python calcular e salvar os pontos
 */
export async function adicionarPontosFidelidade(id_cliente, valor_gasto, id_referencia, tipo) {
    try {
        // CORREÇÃO: Usando a variável API_BASE_URL certa e a rota /api/fidelidade
        const response = await fetch(`${API_BASE_URL}/api/fidelidade/adicionar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cliente: id_cliente,
                valor_gasto: valor_gasto,
                id_referencia: id_referencia,
                tipo: tipo
            })
        });

        // BLINDAGEM HÍBRIDA: Cuidado extra para não dar o erro do '<'
        if (!response.ok) {
            let errorMessage = "Erro ao adicionar pontos de fidelidade.";
            try {
                const errorData = await response.json();
                errorMessage = errorData.mensagem || errorData.error || errorMessage;
            } catch (err) {
                if (response.status === 404) errorMessage = "Rota de fidelidade não encontrada no servidor.";
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`🎉 Sucesso! O cliente ganhou ${result.pontos_ganhos} pontos.`);
        return result.pontos_ganhos;
        
    } catch (error) {
        console.error("Erro ao processar fidelidade:", error);
        return 0; // Se der erro, retorna 0 pontos para a tela de finalizar compra não travar
    }
}