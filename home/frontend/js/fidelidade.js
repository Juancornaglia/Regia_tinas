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

/**
 * Envia os dados para o servidor Python calcular e salvar os pontos
 */
export async function adicionarPontosFidelidade(id_cliente, valor_gasto, id_referencia, tipo) {
    try {
        const response = await fetch(`${API_URL}/fidelidade/adicionar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cliente: id_cliente,
                valor_gasto: valor_gasto,
                id_referencia: id_referencia,
                tipo: tipo
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`🎉 Sucesso! O cliente ganhou ${result.pontos_ganhos} pontos.`);
            return result.pontos_ganhos;
        } else {
            throw new Error(result.mensagem);
        }
    } catch (error) {
        console.error("Erro ao processar fidelidade:", error);
    }
}