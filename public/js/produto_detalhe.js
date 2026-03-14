// static/js/produto_detalhe.js (VERSÃO COMPLETA E CORRIGIDA)

// Importa o cliente Supabase
import { supabase } from './supabaseClient.js';
// Importa as funções de favoritos para o botão de coração
import { getFavorites, toggleFavorite } from './home.js';

function formatPrice(price) { 
    if (typeof price !== 'number') return 'Preço a consultar'; 
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

// (Função copiada do home.js para funcionar aqui)
function updateFavoriteButtons() { 
    const favorites = getFavorites();
    document.querySelectorAll('.btn-favorite').forEach(button => {
        const productId = parseInt(button.dataset.productId, 10);
        if (!isNaN(productId)) {
            button.classList.toggle('active', favorites.includes(productId));
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-heart', !favorites.includes(productId));
                icon.classList.toggle('bi-heart-fill', favorites.includes(productId));
            }
        }
    });
}

async function loadProductDetails() {
    // Seleciona os elementos da página (DO 'produto_detalhe.html')
    const loading = document.getElementById('loading-product');
    const notFound = document.getElementById('product-not-found');
    const productDataEl = document.getElementById('product-data');
    const productDetailContent = document.getElementById('product-detail-content');
    
    // --- 1. Pegar o ID da URL ---
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    // LÊ OS CAMINHOS DO FLASK (data- attributes) DO HTML
    const baseStaticImgPath = productDetailContent?.dataset.staticImgPath || '/static/img/';
    const placeholderImg = productDetailContent?.dataset.placeholderImg || (baseStaticImgPath + 'placeholder.png');

    if (!productId) { 
        loading.style.display = 'none';
        notFound.style.display = 'block';
        return; 
    }

    try {
        // 1. Busca os dados do produto
        const { data: produto, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id_produto', productId)
            .single();
        
        if (error || !produto) { 
            throw new Error('Produto não encontrado.'); 
        }
        
        // --- 3. Preencher a página com os dados ---
        loading.style.display = 'none';
        
        document.title = produto.nome_produto;
        
        // Constrói o HTML do preço
        let priceHtml = `<h2 id="product-price" class="main-purple-text my-3">${formatPrice(produto.preco)}</h2>`;
        if (produto.preco_promocional && produto.preco_promocional < produto.preco) { 
            priceHtml = `
                <p class="price-original text-muted text-decoration-line-through mb-0">${formatPrice(produto.preco)}</p>
                <h2 id="product-price" class="main-purple-text my-0">${formatPrice(produto.preco_promocional)}</h2>
            `;
        }
        
        // Pega o status dos favoritos
        const favorites = getFavorites();
        const isFavorite = favorites.includes(parseInt(produto.id_produto, 10));
        const heartIconClass = isFavorite ? 'bi-heart-fill' : 'bi-heart';

        // Constrói o caminho da imagem (Corrigido para Flask)
        let imageUrl = produto.url_imagem;
        if (!imageUrl || imageUrl.trim() === "" || imageUrl.endsWith('null')) {
            imageUrl = placeholderImg;
        } else if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseStaticImgPath}${imageUrl}`;
        }

        // 2. Preenche o HTML principal (o 'product-data')
        document.getElementById('product-image').src = imageUrl;
        document.getElementById('product-image').alt = produto.nome_produto;
        document.getElementById('product-name').textContent = produto.nome_produto;
        document.getElementById('product-brand').textContent = produto.marca || 'Não informada';
        document.getElementById('product-id').textContent = produto.id_produto;

        // Adiciona o preço
        const priceContainer = document.getElementById('price-container');
        if (priceContainer) priceContainer.innerHTML = priceHtml;

        // Adiciona o botão de favorito
        const favButtonHtml = `
            <button class="btn btn-outline-danger btn-favorite position-absolute top-0 end-0 m-3 ${isFavorite ? 'active' : ''}" data-product-id="${produto.id_produto}" style="z-index: 10;">
                <i class="bi ${heartIconClass}"></i>
            </button>
        `;
        productDataEl.insertAdjacentHTML('afterbegin', favButtonHtml);

        // 3. Preenche o Accordion (Detalhes)
        document.getElementById('product-description').textContent = produto.descricao || 'Este produto não possui descrição detalhada.';
        
        // Preenche a Ficha Técnica
        const fichaTecnicaBody = document.getElementById('product-specs');
        if (fichaTecnicaBody) {
            fichaTecnicaBody.innerHTML = `
                <ul class="list-group list-group-flush">
                    <li class="list-group-item"><strong>Marca:</strong> ${produto.marca || 'N/A'}</li>
                    <li class="list-group-item"><strong>Categoria:</strong> ${produto.tipo_produto || 'N/A'}</li>
                    <li class="list-group-item"><strong>Peso/Medida:</strong> ${produto.tamanho_medida || 'N/A'}</li>
                </ul>
            `;
        }

        // Mostra o conteúdo do produto
        productDataEl.style.display = 'flex';
        
        // 4. Carrega a disponibilidade e os produtos relacionados
        loadStoreAvailability(productId);
        loadRelatedProducts(produto.tipo_produto, produto.id_produto);
        
        // 5. Adiciona o listener para o botão de favorito
        document.querySelector('.btn-favorite').addEventListener('click', (event) => {
            const favoriteButton = event.currentTarget;
            const productId = favoriteButton.dataset.productId;
            if (productId) { 
                toggleFavorite(productId); 
                updateFavoriteButtons(); // Atualiza o ícone
            }
        });

    } catch (error) {
        console.error('Erro ao carregar detalhes do produto:', error.message);
        loading.style.display = 'none';
        notFound.style.display = 'block';
    }
}

// ======================================================
// FUNÇÃO: Buscar Lojas para este Produto (do código antigo)
// ======================================================
async function loadStoreAvailability(productId) {
    const storeListEl = document.getElementById('store-list');
    if (!storeListEl) return;

    try {
        // ASSUMINDO QUE TODOS OS PRODUTOS ESTÃO EM TODAS AS LOJAS
        const { data: lojas, error } = await supabase.from('lojas').select('nome_loja');

        if (error) throw error;

        if (lojas && lojas.length > 0) {
            storeListEl.innerHTML = lojas.map(loja => 
                `<li><i class="bi bi-check-circle-fill"></i>${loja.nome_loja}</li>`
            ).join('');
        } else {
            storeListEl.innerHTML = `<li><i class="bi bi-x-circle-fill"></i>Nenhuma loja encontrada.</li>`;
        }

    } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
        storeListEl.innerHTML = `<li><i class="bi bi-x-circle-fill"></i>Erro ao consultar disponibilidade.</li>`;
    }
}

// ======================================================
// FUNÇÃO: Buscar Produtos Relacionados (do código antigo)
// ======================================================
async function loadRelatedProducts(tipo_produto, currentProductId) {
    const container = document.getElementById('related-products-container');
    if (!tipo_produto) { if(container) container.style.display = 'none'; return; }
    
    const { data: related, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('tipo_produto', tipo_produto)
        .not('id_produto', 'eq', currentProductId)
        .limit(4);
        
    if (error || !related || related.length === 0) { 
        if(container) container.innerHTML = '<p class="text-muted">Nenhum produto relacionado encontrado.</p>'; 
        return; 
    }
    
    // Pega os caminhos do Flask do container principal
    const mainContainer = document.getElementById('product-detail-content');
    const baseStaticImgPath = mainContainer?.dataset.staticImgPath || '/static/img/';
    const placeholderImg = mainContainer?.dataset.placeholderImg || (baseStaticImgPath + 'placeholder.png');

    container.innerHTML = '';
    related.forEach(produto => {
        const isPromo = produto.preco_promocional && produto.preco_promocional < produto.preco;
        const displayPrice = isPromo ? formatPrice(produto.preco_promocional) : formatPrice(produto.preco);
        
        // CORRIGIDO: Usa a rota correta do Flask
        const productLink = `produto_detalhe?id=${produto.id_produto}`;
        
        // CORRIGIDO: Usa o caminho estático correto
        let imageUrl = produto.url_imagem;
        if (!imageUrl || imageUrl.trim() === "" || imageUrl.endsWith('null')) {
            imageUrl = placeholderImg;
        } else if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseStaticImgPath}${imageUrl}`;
        }

        container.innerHTML += `
            <div class="col">
                <div class="card h-100 product-card shadow-sm">
                    <a href="${productLink}">
                        <img src="${imageUrl}" class="card-img-top" alt="${produto.nome_produto}">
                    </a>
                    <div class="card-body">
                        <h5 class="card-title fs-6">
                            <a href="${productLink}" class="stretched-link text-decoration-none text-dark">${produto.nome_produto}</a>
                        </h5>
                        <p class="card-text price">${displayPrice}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Inicia o carregamento quando a página estiver pronta
document.addEventListener('DOMContentLoaded', loadProductDetails);