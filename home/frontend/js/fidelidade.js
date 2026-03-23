const API_URL = 'http://localhost:5000/api';

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