// js/checkout.js (ou finalizacao.js)

export async function processarCompraFinal() {
    const tutorId = localStorage.getItem('usuario_id');
    
    // ATENÇÃO: Usando a mesma chave de carrinho que definimos no arquivo loja.js
    const carrinho = JSON.parse(localStorage.getItem('cart_regia_tinas')) || [];

    // Verificação de segurança
    if (!tutorId) {
        window.notificar("Por favor, faça login para finalizar a compra!", "aviso");
        setTimeout(() => { window.location.href = '../usuario/login.html'; }, 1500);
        return;
    }
    
    if (carrinho.length === 0) {
        window.notificar("Seu carrinho está vazio!", "aviso");
        return;
    }

    try {
        // Chamada para o seu backend Python
        const response = await fetch(`${window.API_BASE_URL}/api/checkout/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_usuario: tutorId, 
                itens: carrinho 
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Notificação de sucesso usando a função global do utils.js
            window.notificar(`Pedido #${result.id_pedido || 'concluído'}! Você ganhou ${result.pontos || 0} pontos! 🎉`, "sucesso");
            
            // Limpa o carrinho após a compra
            localStorage.removeItem('cart_regia_tinas');
            
            // Redireciona para a página de pedidos do cliente
            setTimeout(() => {
                window.location.href = '../usuario/meus_pedidos.html';
            }, 2500);
            
        } else {
            throw new Error(result.mensagem || result.error || "Erro ao processar a compra.");
        }

    } catch (error) {
        console.error("Erro no checkout:", error);
        window.notificar("Ops! " + error.message, "erro");
    }
}