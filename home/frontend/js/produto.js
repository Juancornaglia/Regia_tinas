/**
 * js/produto.js - Motor de Exibição de Detalhes e Recomendações
 * Conectado ao Neon + LocalStorage
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// Auxiliares de Favoritos
function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('chateau_favorites', JSON.stringify(favs)); }

function formatPrice(price) { 
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

// 1. CARREGAR DETALHES DO PRODUTO
async function loadProductDetails() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) { 
        container.innerHTML = '<div class="col-12 text-center p-5 text-muted">ID do produto não informado.</div>'; 
        return; 
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Erro na API");
        
        const produtos = await response.json();
        const produto = produtos.find(p => (p.id_produto || p.id) == productId);
        
        if (!produto) {
            container.innerHTML = '<div class="col-12 text-center p-5"><h3>Produto esgotado ou removido.</h3></div>';
            return;
        }

        // Atualiza o Título da Aba
        document.title = `${produto.nome_produto} | Regia & Tinas`;

        // Preço e Promoção
        const precoOriginal = parseFloat(produto.preco) || 0;
        const precoPromo = parseFloat(produto.preco_promocional);
        const temPromo = precoPromo && precoPromo < precoOriginal;
        const precoFinal = temPromo ? precoPromo : precoOriginal;

        // Imagem
        let imgUrl = produto.url_imagem;
        if (imgUrl && !imgUrl.startsWith('http')) imgUrl = `img/${imgUrl}`;
        const finalImg = imgUrl || 'img/logo_pequena4.png';

        // Renderiza o miolo da página
        container.innerHTML = `
            <div class="col-md-5 text-center">
                <img src="${finalImg}" class="product-main-img shadow-sm" onerror="this.src='img/logo_pequena4.png'">
            </div>
            <div class="col-md-7 mt-4 mt-md-0">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="badge bg-light text-secondary border mb-2">Cód: #${produto.id_produto || produto.id}</span>
                        <h1 class="fw-bold text-dark h2">${produto.nome_produto}</h1>
                    </div>
                    <button class="btn btn-light rounded-circle shadow-sm" id="btn-fav-toggle">
                        <i class="bi bi-heart text-danger fs-4"></i>
                    </button>
                </div>
                
                <p class="text-muted mb-4">Marca: <strong class="text-dark">${produto.marca || 'Regia & Tinas'}</strong></p>
                
                <div class="price-box mb-4">
                    ${temPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(precoOriginal)}</small>` : ''}
                    <div class="display-5 fw-bold text-brand">${formatPrice(precoFinal)}</div>
                </div>

                <div class="bg-light p-3 rounded-4 border mb-4">
                    <h6 class="fw-bold small text-secondary"><i class="bi bi-shop me-2"></i>Disponível em:</h6>
                    <ul class="list-unstyled mb-0 small" id="store-list-detail">
                        <li><span class="spinner-border spinner-border-sm text-brand"></span> Checando estoque...</li>
                    </ul>
                </div>

                <div class="d-grid gap-3">
                    <button class="btn btn-brand btn-lg py-3 shadow-sm" onclick="window.adicionarAoCarrinhoLocal(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
                        <i class="bi bi-cart-plus-fill me-2"></i> ADICIONAR AO CARRINHO
                    </button>
                </div>
            </div>
        `;

        // Preenche Descrição no Accordion
        const accordion = document.getElementById('product-info-accordion');
        if (accordion) {
            accordion.innerHTML = `
                <div class="accordion-item border-0 rounded-4 overflow-hidden mb-3 shadow-sm">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDesc">
                            <i class="bi bi-justify-left me-2 text-brand"></i> Detalhes do Produto
                        </button>
                    </h2>
                    <div id="collapseDesc" class="accordion-collapse collapse show">
                        <div class="accordion-body text-muted" style="white-space: pre-wrap;">
                            ${produto.descricao || 'Nenhuma informação adicional disponível.'}
                        </div>
                    </div>
                </div>
            `;
        }

        // Dispara sub-cargas
        setupFavoriteButton(productId);
        carregarLojasDisponiveis();
        carregarRelacionados(produto.tipo_produto, productId);

    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Falha ao conectar com o banco Neon.</div>';
    }
}

// 2. LÓGICA DE FAVORITOS (CORAÇÃO)
function setupFavoriteButton(id) {
    const btn = document.getElementById('btn-fav-toggle');
    const icon = btn.querySelector('i');
    let favs = getFavorites();
    
    const atualizarIcone = (isFav) => {
        icon.className = isFav ? 'bi bi-heart-fill text-danger fs-4' : 'bi bi-heart text-danger fs-4';
    };

    atualizarIcone(favs.includes(parseInt(id)));

    btn.onclick = () => {
        favs = getFavorites();
        const index = favs.indexOf(parseInt(id));
        if (index > -1) {
            favs.splice(index, 1);
            atualizarIcone(false);
        } else {
            favs.push(parseInt(id));
            atualizarIcone(true);
        }
        saveFavorites(favs);
    };
}

// 3. CARREGAR LOJAS (CANAIS DE VENDA)
async function carregarLojasDisponiveis() {
    const list = document.getElementById('store-list-detail');
    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        const lojas = await response.json();
        
        list.innerHTML = lojas.slice(0, 3).map(l => `
            <li class="text-success"><i class="bi bi-check-circle-fill me-2"></i>Unidade ${l.nome_loja}</li>
        `).join('') || '<li>Apenas venda online</li>';
    } catch (e) { list.innerHTML = '<li>Consulte disponibilidade via WhatsApp</li>'; }
}

// 4. CARREGAR RELACIONADOS
async function carregarRelacionados(categoria, idAtual) {
    const container = document.getElementById('related-products-container');
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const todos = await response.json();
        
        // Filtra pela mesma categoria e remove o atual
        const similares = todos.filter(p => p.tipo_produto === categoria && (p.id_produto || p.id) != idAtual).slice(0, 4);

        if (similares.length === 0) {
            container.innerHTML = '<p class="small text-muted text-center w-100">Nenhum produto similar no momento.</p>';
            return;
        }

        container.innerHTML = similares.map(p => {
            let imgRel = p.url_imagem;
            if (imgRel && !imgRel.startsWith('http')) imgRel = `img/${imgRel}`;
            
            return `
                <div class="col">
                    <a href="produto_detalhe.html?id=${p.id_produto || p.id}" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm rounded-4 text-center p-3">
                            <img src="${imgRel || 'img/logo_pequena4.png'}" class="mx-auto mb-2" style="height:80px; object-fit:contain;">
                            <div class="small fw-bold text-dark text-truncate">${p.nome_produto}</div>
                            <div class="text-brand fw-bold">${formatPrice(parseFloat(p.preco))}</div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    } catch (e) { container.innerHTML = ''; }
}

// 5. CARRINHO (SINCRO COM A HOME)
window.adicionarAoCarrinhoLocal = (p) => {
    let carrinho = JSON.parse(localStorage.getItem('carrinho_regia')) || [];
    const id = p.id_produto || p.id;
    const existente = carrinho.find(item => item.id_produto == id);

    if (existente) {
        existente.quantidade += 1;
    } else {
        carrinho.push({
            id_produto: id,
            nome: p.nome_produto,
            preco: parseFloat(p.preco_promocional || p.preco),
            imagem: p.url_imagem,
            quantidade: 1
        });
    }

    localStorage.setItem('carrinho_regia', JSON.stringify(carrinho));
    alert(`🐾 Sucesso! ${p.nome_produto} já está no seu carrinho.`);
};

// Inicialização
document.addEventListener('DOMContentLoaded', loadProductDetails);