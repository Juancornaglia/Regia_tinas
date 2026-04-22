// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// Funções de Favoritos
function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('chateau_favorites', JSON.stringify(favs)); }

function formatPrice(price) { 
    if (typeof price !== 'number') return 'Preço a consultar'; 
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

// 2. CARREGAR DETALHES DO PRODUTO
async function loadProductDetails() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) { 
        container.innerHTML = '<h3 class="p-5 text-center text-muted w-100">Produto não encontrado na URL.</h3>'; 
        return; 
    }

    try {
        // CORREÇÃO: Usando API_BASE_URL e a rota PÚBLICA /api/produtos
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const produtos = await response.json();
        
        if (!response.ok) throw new Error("Erro na API");

        const produto = produtos.find(p => (p.id_produto || p.id) == productId);
        
        if (!produto) {
            container.innerHTML = '<h3 class="p-5 text-center text-muted w-100">O produto que você procura esgotou ou foi removido.</h3>';
            return;
        }

        document.title = `${produto.nome_produto} - Regia & Tinas Care`;
        
        // Lógica de Preço
        const originalPrice = parseFloat(produto.preco) || 0;
        const promoPrice = parseFloat(produto.preco_promocional);
        const isPromo = promoPrice && promoPrice < originalPrice;
        const displayPrice = isPromo ? promoPrice : originalPrice;
        
        let priceHtml = `
            ${isPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(originalPrice)}</small>` : ''}
            <p class="display-6 fw-bold text-brand mb-1">${formatPrice(displayPrice)}</p>
        `;
        
        // Favoritos
        const favorites = getFavorites();
        const isFavorite = favorites.includes(parseInt(productId));

        // Ajuste de Imagem com proteção contra loop (onerror)
        let imageUrl = produto.url_imagem;
        if (imageUrl && !imageUrl.startsWith('http')) { imageUrl = `img/${produto.url_imagem}`; }
        if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/logo_pequena4.png'; }

        // Monta o HTML Principal
        container.innerHTML = `
            <div class="col-md-5 text-center mb-4 mb-md-0">
                <img src="${imageUrl}" class="product-main-img shadow-sm border" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
            </div>
            <div class="col-md-7 position-relative px-md-4">
                <button class="btn btn-light rounded-circle shadow-sm position-absolute top-0 end-0 m-2 ${isFavorite ? 'active' : ''}" id="fav-btn">
                    <i class="bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart text-danger'} fs-5"></i>
                </button>
                <span class="badge bg-light text-secondary border mb-2">Cód: #${produto.id_produto || produto.id}</span>
                <h1 class="h2 fw-bold text-dark mb-1">${produto.nome_produto}</h1>
                <p class="text-muted small mb-4">Marca: <strong class="text-dark">${produto.marca || 'Própria'}</strong></p>
                
                ${priceHtml}
                
                <div class="mt-4 p-3 bg-light rounded-3 border">
                    <h6 class="fw-bold text-secondary mb-2"><i class="bi bi-shop me-2"></i>Disponibilidade nas lojas:</h6>
                    <ul class="list-unstyled mb-0 text-muted" id="store-list">
                        <li><span class="spinner-border spinner-border-sm text-brand"></span> Consultando...</li>
                    </ul>
                </div>

                <div class="d-flex gap-3 mt-4">
                    <button class="btn btn-brand btn-lg w-100 rounded-pill" onclick="window.adicionarAoCarrinho(${produto.id_produto || produto.id})">
                        <i class="bi bi-cart-plus me-2"></i> Comprar
                    </button>
                </div>
            </div>
        `;

        // Preenche o Accordion de Informações
        document.getElementById('product-info-accordion').innerHTML = `
            <div class="accordion-item border-0 shadow-sm rounded-3 overflow-hidden">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-bold bg-light text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#desc">
                        <i class="bi bi-card-text me-2 text-brand"></i> Descrição do Produto
                    </button>
                </h2>
                <div id="desc" class="accordion-collapse collapse show">
                    <div class="accordion-body text-muted" style="white-space: pre-wrap;">
                        ${produto.descricao || 'Nenhuma descrição detalhada disponível no momento.'}
                    </div>
                </div>
            </div>
        `;

        // Carrega Loja e Relacionados
        carregarLojasDisponiveis();
        carregarRelacionados(produto.tipo_produto, produto.id_produto || produto.id);

        // Evento do Coração
        document.getElementById('fav-btn').addEventListener('click', () => {
            let favs = getFavorites();
            if (favs.includes(parseInt(productId))) {
                favs = favs.filter(id => id !== parseInt(productId));
            } else {
                favs.push(parseInt(productId));
            }
            saveFavorites(favs);
            location.reload(); 
        });

    } catch (error) {
        container.innerHTML = `<h3 class="p-5 text-center text-danger w-100">Erro ao carregar os dados do servidor.</h3>`;
    }
}

// 3. CARREGAR LOJAS
async function carregarLojasDisponiveis() {
    try {
        // CORREÇÃO: Rota PÚBLICA para consultar lojas
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        const lojas = await response.json();
        const storeList = document.getElementById('store-list');
        
        if (response.ok && lojas.length > 0) {
            storeList.innerHTML = lojas.map(l => `
                <li class="small mb-1"><i class="bi bi-check2-circle text-success me-2"></i><strong>${l.nome_loja}</strong></li>
            `).join('');
        } else {
            storeList.innerHTML = '<li class="small text-warning"><i class="bi bi-exclamation-circle me-2"></i>Indisponível no momento.</li>';
        }
    } catch (e) {
        document.getElementById('store-list').innerHTML = '<li class="small text-danger">Erro ao verificar lojas.</li>';
    }
}

// 4. CARREGAR RELACIONADOS
async function carregarRelacionados(categoria, idAtual) {
    const container = document.getElementById('related-products-container');
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const todos = await response.json();
        
        const relacionados = todos.filter(p => p.tipo_produto === categoria && (p.id_produto || p.id) != idAtual).slice(0, 4);

        if (relacionados.length === 0) {
            container.innerHTML = '<p class="text-muted w-100 text-center mt-3">Não encontramos produtos similares.</p>';
            return;
        }

        container.innerHTML = relacionados.map(p => {
            let imgRel = p.url_imagem;
            if (imgRel && !imgRel.startsWith('http')) { imgRel = `img/${p.url_imagem}`; }
            if (!imgRel || imgRel.trim() === "") { imgRel = 'img/logo_pequena4.png'; }

            return `
            <div class="col-6 col-md-3">
                <div class="card h-100 border-0 shadow-sm text-center rounded-4 overflow-hidden">
                    <div class="p-3 bg-white">
                        <img src="${imgRel}" class="card-img-top" style="height:120px; object-fit:contain" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                    </div>
                    <div class="card-body p-3 bg-light d-flex flex-column">
                        <a href="produto.html?id=${p.id_produto || p.id}" class="stretched-link text-decoration-none text-dark small fw-bold mb-2 flex-grow-1">${p.nome_produto}</a>
                        <p class="text-brand fw-bold mb-0">${formatPrice(parseFloat(p.preco))}</p>
                    </div>
                </div>
            </div>
        `}).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-danger w-100 text-center">Erro ao carregar recomendados.</p>';
    }
}

// Função global para evitar erro no botão de carrinho
window.adicionarAoCarrinho = (id) => {
    alert(`Produto #${id} adicionado ao carrinho! (Simulação para o TCC)`);
};

// 5. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', loadProductDetails);