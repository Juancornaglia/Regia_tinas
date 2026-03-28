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
// --- FUNÇÃO DE NOTIFICAÇÃO (MANTIDA ORIGINAL) ---
window.notificar = (mensagem, tipo = 'sucesso') => {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-mensagem');
    if (!toastEl || !msgEl) {
        alert(mensagem); // Fallback se não houver o elemento do Toast
        return;
    }
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(tipo === 'sucesso' ? 'bg-success' : 'bg-danger');
    msgEl.innerText = mensagem;
    new bootstrap.Toast(toastEl).show();
};

export async function processarCompraFinal() {
    const tutorId = localStorage.getItem('usuario_id');
    const carrinho = JSON.parse(localStorage.getItem('regia_cart')) || [];

    if (!tutorId) {
        notificar("Por favor, faça login para comprar!", "erro");
        return;
    }
    if (carrinho.length === 0) {
        notificar("Seu carrinho está vazio!", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/checkout/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: tutorId, itens: carrinho })
        });

        const result = await response.json();

        if (response.ok) {
            notificar(`Compra realizada! Pedido #${result.id_pedido}. Você ganhou ${result.pontos} pontos! 🎉`, "sucesso");
            
            localStorage.removeItem('regia_cart');
            
            setTimeout(() => {
                window.location.href = 'perfil.html';
            }, 2500);
        } else {
            throw new Error(result.error || "Erro ao processar compra");
        }

    } catch (error) {
        console.error(error);
        notificar("Erro no checkout: " + error.message, "erro");
    }
}