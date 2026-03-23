const API_URL = 'http://localhost:5000/api';

// Funções de Favoritos (Mantidas no LocalStorage para rapidez)
function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('chateau_favorites', JSON.stringify(favs)); }

function formatPrice(price) { 
    if (typeof price !== 'number') return 'Preço a consultar'; 
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

async function loadProductDetails() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) { 
        container.innerHTML = '<h1 class="p-5 text-center">Produto não encontrado.</h1>'; 
        return; 
    }

    try {
        // 1. Busca os detalhes do produto no Python
        const response = await fetch(`${API_URL}/admin/produtos`);
        const produtos = await response.json();
        const produto = produtos.find(p => p.id_produto == productId);
        
        if (!produto) throw new Error("Produto sumiu do estoque.");

        document.title = produto.nome_produto;
        
        // Lógica de Preço
        let priceHtml = `<p class="fs-2 fw-bold text-primary mb-1">${formatPrice(produto.preco)}</p>`;
        
        // Favoritos
        const favorites = getFavorites();
        const isFavorite = favorites.includes(parseInt(productId));

        // 2. Monta o HTML Principal
        container.innerHTML = `
            <div class="col-md-6 text-center">
                <img src="${produto.url_imagem || 'img/placeholder.png'}" class="img-fluid rounded shadow-sm" style="max-height: 400px;">
            </div>
            <div class="col-md-6 position-relative">
                <button class="btn btn-outline-danger btn-favorite position-absolute top-0 end-0 m-2 ${isFavorite ? 'active' : ''}" id="fav-btn">
                    <i class="bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}"></i>
                </button>
                <h1 class="h2 fw-bold">${produto.nome_produto}</h1>
                <p class="text-muted small">Marca: ${produto.marca || 'Própria'} | SKU: ${produto.id_produto}</p>
                ${priceHtml}
                
                <div class="mt-4 p-3 bg-light rounded">
                    <h6><i class="bi bi-shop me-2"></i>Disponibilidade</h6>
                    <ul class="list-unstyled mb-0" id="store-list">
                        <li><span class="spinner-border spinner-border-sm"></span> Consultando lojas...</li>
                    </ul>
                </div>

                <button class="btn btn-primary btn-lg w-100 mt-4 rounded-pill" onclick="adicionarAoCarrinho(${produto.id_produto})">
                    <i class="bi bi-cart-plus me-2"></i> Adicionar ao Carrinho
                </button>
            </div>
        `;

        // 3. Preenche o Accordion de Informações
        document.getElementById('product-info-accordion').innerHTML = `
            <div class="accordion-item">
                <h2 class="accordion-header"><button class="accordion-button" data-bs-toggle="collapse" data-bs-target="#desc">Descrição</button></h2>
                <div id="desc" class="accordion-collapse collapse show"><div class="accordion-body">${produto.descricao || 'Produto de alta qualidade para o seu pet.'}</div></div>
            </div>
        `;

        // 4. Carrega Loja e Relacionados
        carregarLojasDisponiveis();
        carregarRelacionados(produto.tipo_produto, produto.id_produto);

        // Evento do Coração
        document.getElementById('fav-btn').addEventListener('click', () => {
            let favs = getFavorites();
            if (favs.includes(parseInt(productId))) {
                favs = favs.filter(id => id !== parseInt(productId));
            } else {
                favs.push(parseInt(productId));
            }
            saveFavorites(favs);
            location.reload(); // Recarrega para atualizar o ícone
        });

    } catch (error) {
        container.innerHTML = `<h1 class="p-5 text-center text-danger">Erro ao carregar produto.</h1>`;
    }
}

async function carregarLojasDisponiveis() {
    try {
        const response = await fetch(`${API_URL}/admin/lojas`);
        const lojas = await response.json();
        const storeList = document.getElementById('store-list');
        
        storeList.innerHTML = lojas.map(l => `
            <li class="small"><i class="bi bi-check2-circle text-success me-2"></i>Disponível em: <strong>${l.nome_loja}</strong></li>
        `).join('');
    } catch (e) {
        document.getElementById('store-list').innerHTML = '<li>Erro ao verificar lojas.</li>';
    }
}

async function carregarRelacionados(categoria, idAtual) {
    const container = document.getElementById('related-products-container');
    try {
        const response = await fetch(`${API_URL}/admin/produtos`);
        const todos = await response.json();
        
        // Filtra por mesma categoria, mas exclui o que já estamos vendo
        const relacionados = todos.filter(p => p.tipo_produto === categoria && p.id_produto != idAtual).slice(0, 4);

        if (relacionados.length === 0) {
            container.innerHTML = '<p class="text-muted">Busque mais itens na nossa loja!</p>';
            return;
        }

        container.innerHTML = relacionados.map(p => `
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm">
                    <img src="${p.url_imagem || 'img/placeholder.png'}" class="card-img-top p-2" style="height:120px; object-fit:contain">
                    <div class="card-body p-2 text-center">
                        <a href="produto.html?id=${p.id_produto}" class="stretched-link text-decoration-none text-dark small fw-bold">${p.nome_produto}</a>
                        <p class="text-primary small mb-0">${formatPrice(p.preco)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', loadProductDetails);