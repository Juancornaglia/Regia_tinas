const API_URL = 'http://localhost:5000/api';

async function renderCart() {
    const listContainer = document.getElementById('cart-list-container');
    const summaryContainer = document.getElementById('summary-card-body');
    const cartData = getCartItems();

    if (!listContainer || cartData.length === 0) {
        listContainer.innerHTML = '<div class="text-center p-5">Seu carrinho está vazio.</div>';
        return;
    }

    try {
        // Busca os detalhes dos produtos no Python
        const response = await fetch(`${API_URL}/admin/produtos`);
        const allProducts = await response.json();
        
        // Filtra apenas os que estão no carrinho
        const productsInCart = allProducts.filter(p => cartData.some(item => item.id == p.id_produto));

        let subtotal = 0;
        listContainer.innerHTML = productsInCart.map(p => {
            const item = cartData.find(i => i.id == p.id_produto);
            subtotal += p.preco * item.quantidade;

            return `
                <div class="cart-item d-flex align-items-center mb-3 p-3 bg-white shadow-sm rounded">
                    <img src="${p.url_imagem || 'img/placeholder.png'}" style="width: 60px; height: 60px; object-fit: cover;">
                    <div class="ms-3 flex-grow-1">
                        <h6 class="mb-0">${p.nome_produto}</h6>
                        <small>R$ ${Number(p.preco).toFixed(2)}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-light" onclick="alterarQtd(${p.id_produto}, 'menos')">-</button>
                        <span class="px-2">${item.quantidade}</span>
                        <button class="btn btn-sm btn-light" onclick="alterarQtd(${p.id_produto}, 'mais')">+</button>
                    </div>
                    <div class="ms-3 text-end" style="min-width: 80px;">
                        <strong>R$ ${(p.preco * item.quantidade).toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }).join('');

        summaryContainer.innerHTML = `
            <h5 class="d-flex justify-content-between">Total: <span>R$ ${subtotal.toFixed(2)}</span></h5>
            <button class="btn btn-rosa w-100 mt-3" onclick="finalizarCompraServidor(${subtotal})">FINALIZAR COMPRA</button>
        `;

    } catch (e) {
        console.error("Erro ao renderizar carrinho:", e);
    }
}

// FINALIZAR COMPRA ENVIANDO PARA O NEON
window.finalizarCompraServidor = async (total) => {
    const idUsuario = localStorage.getItem('usuario_id');
    const itens = getCartItems();

    if (!idUsuario) {
        alert("Faça login para finalizar a compra!");
        window.location.href = 'login.html';
        return;
    }

    const payload = {
        id_usuario: idUsuario,
        itens: itens,
        total: total
    };

    try {
        const response = await fetch(`${API_URL}/finalizar-pedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Pedido realizado com sucesso! Verifique em 'Meus Pedidos'.");
            localStorage.removeItem('regia_cart');
            window.location.href = 'meus_pedidos.html';
        } else {
            alert("Erro ao processar pedido.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
};