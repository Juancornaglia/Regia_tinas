// 1. CONFIGURAÇÃO GERAL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

let todosProdutos = [];
let carrinho = JSON.parse(localStorage.getItem('cart_regia_tinas')) || [];

// 2. FUNÇÃO PARA CARREGAR PRODUTOS
async function carregarProdutos() {
    const container = document.getElementById('vitrine-produtos');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        // CORREÇÃO: Verifica o erro antes de converter para JSON!
        if (!response.ok) throw new Error("Erro ao buscar dados na API");

        const data = await response.json();
        todosProdutos = data;
        renderizarVitrine(todosProdutos);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="text-center p-5"><h5 class="text-danger">Erro ao conectar com o banco de dados. Tente atualizar a página.</h5></div>`;
    }
}

// 3. RENDERIZAR CARDS
function renderizarVitrine(lista) {
    const container = document.getElementById('vitrine-produtos');
    
    if (lista.length === 0) {
        container.innerHTML = `<div class="text-center p-5"><p class="text-muted">Nenhum produto encontrado.</p></div>`;
        return;
    }

    container.innerHTML = lista.map(p => {
        let imgUrl = p.url_imagem;
        if (imgUrl && !imgUrl.startsWith('http')) { imgUrl = `img/${p.url_imagem}`; }
        if (!imgUrl || imgUrl.trim() === "") { imgUrl = 'img/logo_pequena4.png'; }

        const preco = parseFloat(p.preco_promocional || p.preco || 0);

        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="product-card shadow-sm d-flex flex-column">
                    <div class="card-img-container">
                        <img src="${imgUrl}" alt="${p.nome_produto}" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                    </div>
                    <div class="p-3 text-center d-flex flex-column flex-grow-1">
                        <h6 class="fw-bold text-dark text-truncate mb-2">${p.nome_produto}</h6>
                        <p class="text-brand fw-bold fs-5 mb-3">R$ ${preco.toFixed(2).replace('.',',')}</p>
                        <button class="btn btn-brand w-100 py-2 mt-auto" onclick="window.adicionarAoCarrinho(${p.id_produto || p.id})">
                            <i class="bi bi-cart-plus me-2"></i>Adicionar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 4. LÓGICA DO CARRINHO
window.adicionarAoCarrinho = (id) => {
    const produto = todosProdutos.find(p => (p.id_produto || p.id) == id);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.id == id);
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            id: id,
            nome: produto.nome_produto,
            preco: parseFloat(produto.preco_promocional || produto.preco),
            quantidade: 1
        });
    }

    salvarCarrinho();
    mostrarToast(`${produto.nome_produto} adicionado!`);
    renderizarCarrinhoLateral();
};

function salvarCarrinho() {
    localStorage.setItem('cart_regia_tinas', JSON.stringify(carrinho));
    atualizarContador();
}

function atualizarContador() {
    const count = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const badge = document.getElementById('carrinho-count');
    if(badge) badge.innerText = count;
}

function renderizarCarrinhoLateral() {
    const container = document.getElementById('itens-carrinho');
    const totalEl = document.getElementById('carrinho-total');
    
    if (carrinho.length === 0) {
        container.innerHTML = `<p class="text-center text-muted mt-5">Seu carrinho está vazio.</p>`;
        totalEl.innerText = "R$ 0,00";
        return;
    }

    let total = 0;
    container.innerHTML = carrinho.map((item, index) => {
        total += item.preco * item.quantidade;
        return `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${item.nome}</h6>
                    <small class="text-muted">${item.quantidade}x R$ ${item.preco.toFixed(2)}</small>
                </div>
                <button class="btn btn-sm text-danger" onclick="window.removerDoCarrinho(${index})"><i class="bi bi-trash"></i></button>
            </div>
        `;
    }).join('');

    totalEl.innerText = `R$ ${total.toFixed(2).replace('.',',')}`;
}

window.removerDoCarrinho = (index) => {
    carrinho.splice(index, 1);
    salvarCarrinho();
    renderizarCarrinhoLateral();
};

window.finalizarCompra = () => {
    if(carrinho.length === 0) return alert("Seu carrinho está vazio!");
    alert("Pedido enviado! (Simulação TCC)");
    carrinho = [];
    salvarCarrinho();
    location.reload();
};

// 5. BUSCA EM TEMPO REAL
document.getElementById('input-busca-loja')?.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = todosProdutos.filter(p => 
        p.nome_produto.toLowerCase().includes(termo) || 
        (p.marca && p.marca.toLowerCase().includes(termo))
    );
    renderizarVitrine(filtrados);
});

function mostrarToast(msg) {
    document.getElementById('toast-mensagem').innerText = msg;
    const toast = new bootstrap.Toast(document.getElementById('liveToast'));
    toast.show();
}

// 6. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    atualizarContador();
    renderizarCarrinhoLateral();
});