// js/carrinho.js - Gestão do Carrinho Regia & Tinas Care

// ATENÇÃO: Lembre-se de importar o utils.js no HTML antes deste arquivo!

// Função para ler o carrinho do LocalStorage
function getCartItems() {
    return JSON.parse(localStorage.getItem('cart_regia_tinas')) || [];
}

// Função para salvar o carrinho
function saveCartItems(items) {
    localStorage.setItem('cart_regia_tinas', JSON.stringify(items));
    renderCart(); // Recarrega a tela sempre que salva
    
    // Atualiza o badge do carrinho na navbar (se a função existir na página)
    if (window.atualizarContadorGlobal) window.atualizarContadorGlobal();
}

// RENDERIZAR CARRINHO E BUSCAR PREÇOS DO BANCO DE DADOS
async function renderCart() {
    const listContainer = document.getElementById('cart-list-container');
    const summaryContainer = document.getElementById('summary-card-body');
    
    if (!listContainer || !summaryContainer) return;
    
    const cartData = getCartItems();

    if (cartData.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center p-5 bg-white rounded-4 shadow-sm">
                <i class="bi bi-cart-x text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 text-muted">Seu carrinho está vazio.</h5>
                <a href="../loja.html" class="btn btn-outline-primary mt-3 rounded-pill">Ir para a Loja</a>
            </div>`;
        summaryContainer.innerHTML = `
            <div class="d-flex justify-content-between mb-3"><span>Subtotal</span><span>R$ 0,00</span></div>
            <h5 class="d-flex justify-content-between fw-bold">Total: <span class="text-danger">R$ 0,00</span></h5>
            <button class="btn btn-secondary w-100 mt-3 rounded-pill" disabled>FINALIZAR COMPRA</button>
        `;
        return;
    }

    try {
        listContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div><p class="mt-2 text-muted">Atualizando preços...</p></div>';

        // Busca os detalhes mais recentes dos produtos no seu banco Neon
        const response = await fetch(`${window.API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Falha ao buscar produtos");
        
        const allProducts = await response.json();
        
        // Filtra os produtos reais que o usuário colocou no carrinho
        const productsInCart = allProducts.filter(p => cartData.some(item => item.id == (p.id_produto || p.id)));

        let subtotal = 0;
        
        listContainer.innerHTML = productsInCart.map(p => {
            const item = cartData.find(i => i.id == (p.id_produto || p.id));
            // Usa o preço promocional se existir, senão o preço normal
            const precoReal = parseFloat(p.preco_promocional || p.preco);
            subtotal += precoReal * item.quantidade;

            // Proteção de Imagem
            let imgUrl = p.url_imagem;
            if (imgUrl && !imgUrl.startsWith('http')) { imgUrl = `../img/${p.url_imagem}`; }
            if (!imgUrl || imgUrl.trim() === "") { imgUrl = '../img/logo_pequena4.png'; }

            return `
                <div class="cart-item d-flex align-items-center mb-3 p-3 bg-white shadow-sm rounded-4 border">
                    <img src="${imgUrl}" onerror="this.onerror=null; this.src='../img/logo_pequena4.png'" class="rounded border p-1" style="width: 80px; height: 80px; object-fit: contain;">
                    <div class="ms-3 flex-grow-1">
                        <h6 class="mb-1 fw-bold text-dark">${p.nome_produto}</h6>
                        <small class="text-muted d-block mb-2">Unid: R$ ${precoReal.toFixed(2).replace('.',',')}</small>
                        
                        <div class="d-flex align-items-center">
                            <div class="btn-group btn-group-sm border rounded-pill overflow-hidden" role="group">
                                <button class="btn btn-light border-end" onclick="window.alterarQtd(${item.id}, 'menos')"><i class="bi bi-dash"></i></button>
                                <button class="btn btn-light bg-white text-dark fw-bold px-3" disabled>${item.quantidade}</button>
                                <button class="btn btn-light border-start" onclick="window.alterarQtd(${item.id}, 'mais')"><i class="bi bi-plus"></i></button>
                            </div>
                            <button class="btn btn-link text-danger ms-3 p-0" onclick="window.removerItem(${item.id})"><i class="bi bi-trash"></i> Remover</button>
                        </div>
                    </div>
                    <div class="ms-3 text-end">
                        <h5 class="fw-bold mb-0 text-danger" style="color: #FE8697 !important;">R$ ${(precoReal * item.quantidade).toFixed(2).replace('.',',')}</h5>
                    </div>
                </div>
            `;
        }).join('');

        summaryContainer.innerHTML = `
            <div class="d-flex justify-content-between mb-2 text-muted"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2).replace('.',',')}</span></div>
            <div class="d-flex justify-content-between mb-3 text-success small"><span>Descontos</span><span>R$ 0,00</span></div>
            <hr>
            <h5 class="d-flex justify-content-between fw-bold mb-4">Total: <span style="color: #FE8697;">R$ ${subtotal.toFixed(2).replace('.',',')}</span></h5>
            <button class="btn w-100 py-2 rounded-pill fw-bold text-white" style="background-color: #FE8697;" onclick="window.finalizarCompraServidor()">
                <i class="bi bi-check2-circle me-2"></i>FINALIZAR COMPRA
            </button>
            <div class="text-center mt-3">
                <a href="../loja.html" class="text-muted small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>Continuar comprando</a>
            </div>
        `;

    } catch (e) {
        console.error("Erro ao renderizar carrinho:", e);
        listContainer.innerHTML = '<div class="alert alert-danger m-3">Ocorreu um erro ao verificar os preços com o servidor. Tente novamente mais tarde.</div>';
    }
}

// ALTERAR QUANTIDADE
window.alterarQtd = (id, acao) => {
    let cart = getCartItems();
    const itemIndex = cart.findIndex(i => i.id == id);
    
    if (itemIndex > -1) {
        if (acao === 'mais') {
            cart[itemIndex].quantidade++;
        } else if (acao === 'menos') {
            cart[itemIndex].quantidade--;
            if (cart[itemIndex].quantidade <= 0) {
                cart.splice(itemIndex, 1);
            }
        }
        saveCartItems(cart);
    }
};

// REMOVER ITEM COMPLETO
window.removerItem = (id) => {
    let cart = getCartItems();
    cart = cart.filter(i => i.id != id);
    saveCartItems(cart);
};

// FINALIZAR COMPRA (ENVIA PARA O BACKEND)
window.finalizarCompraServidor = async () => {
    const idUsuario = localStorage.getItem('usuario_id');
    const itens = getCartItems();

    if (!idUsuario) {
        window.notificar("Faça login para finalizar a compra!", "aviso");
        setTimeout(() => { window.location.href = '../usuario/login.html'; }, 1500);
        return;
    }

    if (itens.length === 0) return;

    // Desativa botão
    const btnContainer = document.getElementById('summary-card-body');
    const btnFinalizar = btnContainer.querySelector('button');
    btnFinalizar.disabled = true;
    btnFinalizar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processando...';

    const payload = {
        id_usuario: idUsuario,
        itens: itens
    };

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/checkout/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            window.notificar(`Pedido #${result.id_pedido || 'realizado'} com sucesso! 🎉`, "sucesso");
            localStorage.removeItem('cart_regia_tinas');
            
            setTimeout(() => {
                window.location.href = '../usuario/meus_pedidos.html';
            }, 2000);
        } else {
            throw new Error(result.mensagem || result.error || "Erro ao processar o pedido.");
        }
    } catch (error) {
        console.error(error);
        window.notificar("Erro no pagamento: " + error.message, "erro");
        btnFinalizar.disabled = false;
        btnFinalizar.innerHTML = '<i class="bi bi-check2-circle me-2"></i>FINALIZAR COMPRA';
    }
};

// Inicializa a renderização ao carregar a página
document.addEventListener('DOMContentLoaded', renderCart);