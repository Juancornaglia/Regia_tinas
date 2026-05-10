/**
 * REGIA & TINAS STORE - Motor do E-commerce
 * Funcionalidades: Vitrine Dinâmica, Busca, Carrinho e LocalStorage
 */

// 1. CONFIGURAÇÃO DE ENDEREÇO DA API
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// 2. ESTADO GLOBAL DA LOJA
let todosProdutos = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho_regia')) || [];

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    atualizarBadgeCarrinho();
    configurarBusca();
    renderizarCarrinhoLateral();
});

// --- 3. BUSCA DE DADOS ---
async function carregarProdutos() {
    const vitrine = document.getElementById('vitrine-produtos');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        todosProdutos = await response.json();
        
        renderizarVitrine(todosProdutos);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        vitrine.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
                <p class="mt-3">Não conseguimos carregar os produtos. Tente novamente mais tarde.</p>
            </div>`;
    }
}

// --- 4. RENDERIZAÇÃO DA VITRINE ---
function renderizarVitrine(lista) {
    const vitrine = document.getElementById('vitrine-produtos');
    
    if (lista.length === 0) {
        vitrine.innerHTML = '<div class="text-center p-5"><p class="text-muted">Nenhum produto encontrado.</p></div>';
        return;
    }

    vitrine.innerHTML = lista.map(p => {
        // Lógica de Preço Promocional
        const temPromo = p.preco_promocional && p.preco_promocional < p.preco;
        const precoExibicao = temPromo ? p.preco_promocional : p.preco;

        return `
            <div class="col-6 col-md-4 col-lg-3 mb-4">
                <div class="product-card shadow-sm">
                    <div class="card-img-container">
                        <img src="${p.url_imagem || 'img/placeholder-pet.png'}" alt="${p.nome_produto}">
                    </div>
                    <div class="p-3">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">${p.marca || 'Regia & Tinas'}</small>
                        <h6 class="fw-bold mb-2 text-truncate">${p.nome_produto}</h6>
                        
                        <div class="mb-3">
                            ${temPromo ? `<span class="text-decoration-line-through text-muted small">R$ ${p.preco}</span>` : ''}
                            <div class="fs-5 fw-bold text-brand">R$ ${precoExibicao.toFixed(2)}</div>
                        </div>

                        <button class="btn btn-brand w-100 btn-sm" onclick="adicionarAoCarrinho(${p.id_produto})">
                            <i class="bi bi-plus-lg me-1"></i> Comprar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 5. LÓGICA DO CARRINHO (LocalStorage) ---
window.adicionarAoCarrinho = (id) => {
    const produto = todosProdutos.find(p => p.id_produto === id);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.id_produto === id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            id_produto: produto.id_produto,
            nome: produto.nome_produto,
            preco: produto.preco_promocional || produto.preco,
            imagem: produto.url_imagem,
            quantidade: 1
        });
    }

    salvarCarrinho();
    mostrarToast(`${produto.nome_produto} adicionado!`);
};

function salvarCarrinho() {
    localStorage.setItem('carrinho_regia', JSON.stringify(carrinho));
    atualizarBadgeCarrinho();
    renderizarCarrinhoLateral();
}

function atualizarBadgeCarrinho() {
    const badge = document.getElementById('carrinho-count');
    const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    badge.innerText = totalItens;
    badge.style.display = totalItens > 0 ? 'block' : 'none';
}

// --- 6. RENDERIZAR CARRINHO LATERAL (OFFCANVAS) ---
function renderizarCarrinhoLateral() {
    const container = document.getElementById('itens-carrinho');
    const totalEl = document.getElementById('carrinho-total');

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="text-center text-muted mt-5">Seu carrinho está vazio.</p>';
        totalEl.innerText = 'R$ 0,00';
        return;
    }

    let totalGeral = 0;

    container.innerHTML = carrinho.map(item => {
        const subtotal = item.preco * item.quantidade;
        totalGeral += subtotal;

        return `
            <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                <img src="${item.imagem}" width="50" height="50" class="rounded me-3" style="object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${item.nome}</h6>
                    <small class="text-muted">${item.quantidade}x R$ ${item.preco.toFixed(2)}</small>
                </div>
                <div class="text-end">
                    <button class="btn btn-sm text-danger" onclick="removerItem(${item.id_produto})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = `R$ ${totalGeral.toFixed(2)}`;
}

window.removerItem = (id) => {
    carrinho = carrinho.filter(item => item.id_produto !== id);
    salvarCarrinho();
};

// --- 7. BUSCA E FILTROS ---
function configurarBusca() {
    const inputBusca = document.getElementById('input-busca-loja');
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrados = todosProdutos.filter(p => 
            p.nome_produto.toLowerCase().includes(termo) || 
            (p.marca && p.marca.toLowerCase().includes(termo))
        );
        renderizarVitrine(filtrados);
    });
}

// --- 8. FINALIZAÇÃO ---
window.finalizarCompra = () => {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }
    // Redireciona para a página de checkout (que faremos a seguir)
    window.location.href = 'checkout.html';
};

// Utilitário para Feedback
function mostrarToast(msg) {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-mensagem');
    toastMsg.innerText = msg;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}