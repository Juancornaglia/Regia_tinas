// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; // <-- SEU LINK REAL

const CHATEAU_SELECTED_STORE_KEY = 'chateau_selected_store';

// 2. SISTEMA DE FAVORITOS
export function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favorites) { localStorage.setItem('chateau_favorites', JSON.stringify(favorites)); }

export function toggleFavorite(productId) { 
    let favorites = getFavorites();
    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) return;
    if (favorites.includes(productIdNum)) {
        favorites = favorites.filter(id => id !== productIdNum);
    } else {
        favorites.push(productIdNum);
    }
    saveFavorites(favorites);
    updateFavoriteButtons();
}

export function updateFavoriteButtons() { 
    const favorites = getFavorites();
    document.querySelectorAll('.btn-favorite').forEach(button => {
        const productId = parseInt(button.dataset.productId, 10);
        if (!isNaN(productId)) {
            button.classList.toggle('active', favorites.includes(productId));
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = favorites.includes(productId) ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-danger';
            }
        }
    });
}

// 3. CRIAÇÃO DOS CARDS DOS PRODUTOS
export function formatPrice(price) { 
    if (typeof price !== 'number') return 'Consulte';
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

export function createProductCard(produto) { 
    // Garante compatibilidade se o backend enviar 'id' em vez de 'id_produto'
    const idProduto = produto.id_produto || produto.id;
    if (!produto || !idProduto) return ''; 
    
    const originalPrice = parseFloat(produto.preco) || 0;
    const promoPrice = parseFloat(produto.preco_promocional);
    const isPromo = promoPrice && promoPrice < originalPrice;
    const displayPrice = isPromo ? promoPrice : originalPrice;
    
    const favorites = getFavorites();
    const isFavorite = favorites.includes(parseInt(idProduto, 10));
    const heartIconClass = isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart text-danger';
    
    const productLink = `produto_detalhe.html?id=${idProduto}`; 
    
    let imageUrl = produto.url_imagem;
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `img/${produto.url_imagem}`; 
    }
    // Usando a sua logo como imagem padrão caso o produto não tenha foto
    if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/logo_pequena4.png'; }
    
    // A MÁGICA ESTÁ AQUI: this.onerror=null impede o loop infinito de piscadas!
    return `
        <div class="card h-100 product-card shadow-sm position-relative mx-2" style="min-width: 220px; max-width: 250px; border: none; border-radius: 12px;">
            <button class="btn btn-light rounded-circle shadow-sm btn-favorite position-absolute top-0 end-0 m-2 ${isFavorite ? 'active' : ''}" data-product-id="${idProduto}" style="z-index: 10;">
                <i class="${heartIconClass}"></i>
            </button>
            <a href="${productLink}" class="d-block text-center pt-3">
                <img src="${imageUrl}" class="card-img-top p-2" alt="${produto.nome_produto}" style="height: 180px; object-fit: contain;" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
            </a>
            <div class="card-body d-flex flex-column text-center p-3">
                <h6 class="card-title flex-grow-1 text-truncate" style="font-size: 0.95rem;">
                    <a href="${productLink}" class="text-decoration-none text-dark fw-bold">
                        ${produto.nome_produto || '(Sem Nome)'}
                    </a>
                </h6>
                <div class="price-container mt-auto mb-3">
                    ${isPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(originalPrice)}</small>` : '<small class="text-muted">&nbsp;</small>'}
                    <p class="card-text price fs-5 fw-bold mb-0" style="color: #FE8697;">${formatPrice(displayPrice)}</p>
                </div>
                <a href="${productLink}" class="btn w-100 text-white fw-bold rounded-pill" style="background-color: #FE8697;">
                    <i class="bi bi-cart-plus me-1"></i> Comprar
                </a>
            </div>
        </div>
    `;
}

// 4. CARREGAMENTO DOS PRODUTOS DA API PÚBLICA
function getSelectedStoreId() {
    const savedStore = localStorage.getItem(CHATEAU_SELECTED_STORE_KEY);
    return savedStore ? parseInt(JSON.parse(savedStore).id, 10) : 1; 
}

async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="spinner-border text-primary mx-auto my-4" role="status"></div>';

    try {
        // CORREÇÃO: Usando API_BASE_URL e a rota PÚBLICA (/api/produtos) sem pedir senha
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const allProducts = await response.json();

        if (!response.ok) throw new Error("Erro na API");

        let produtos = allProducts; 

        if (filterType === 'ofertas') {
            produtos = produtos.filter(p => p.preco_promocional && p.preco_promocional < p.preco);
        } else if (filterType === 'vendidos') {
            produtos.sort((a, b) => (b.quantidade_estoque || 0) - (a.quantidade_estoque || 0));
        } else if (filterType === 'novidades') {
            produtos.reverse(); 
        }

        if (produtos.length > 0) {
            container.classList.add('d-flex', 'flex-nowrap'); // Para o carrossel funcionar
            container.innerHTML = produtos.slice(0, 8).map(createProductCard).join('');
            updateFavoriteButtons();
        } else {
            container.innerHTML = '<p class="text-center text-muted w-100 my-4">Nenhum produto cadastrado nesta seção.</p>';
        }
    } catch (error) {
        console.error("Erro na busca de produtos:", error);
        container.innerHTML = '<p class="text-center text-danger w-100 my-4">Erro ao carregar a vitrine.</p>';
    }
}

// 5. INTERFACE (SIDEBAR, SLIDERS, VÍDEOS)
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openButton = document.getElementById('button-menu');
    const closeButton = document.getElementById('close-sidebar');
    const submenuToggles = document.querySelectorAll('.submenu-toggle');

    if (!sidebar || !overlay || !openButton || !closeButton) return;

    openButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    closeButton.onclick = close;
    overlay.onclick = close;

    submenuToggles.forEach(btn => {
        btn.onclick = () => btn.closest('.menu-item')?.classList.toggle('open');
    });
}

function setupMediaSliders() {
    const setupSlider = (trackId, prevId, nextId) => {
        const track = document.getElementById(trackId);
        const prev = document.getElementById(prevId);
        const next = document.getElementById(nextId);
        if (track && prev && next) {
            next.onclick = () => track.scrollBy({ left: 300, behavior: 'smooth' });
            prev.onclick = () => track.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };
    setupSlider('videos-track', 'videos-prev', 'videos-next');
    setupSlider('mais-vendidos-track', 'mais-vendidos-prev', 'mais-vendidos-next');
    setupSlider('ofertas-track', 'ofertas-prev', 'ofertas-next');
    setupSlider('recomendados-track', 'recomendados-prev', 'recomendados-next');
    setupSlider('novidades-track', 'novidades-prev', 'novidades-next');
}

// 6. INICIALIZAÇÃO GERAL
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    setupMediaSliders();
    
    // Carrega as vitrines chamando os tipos de filtro
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');

    window.addEventListener('chateauStoreChanged', () => location.reload());
});

document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-favorite');
    if (btn) toggleFavorite(btn.dataset.productId);
});

const slider = document.getElementById('slider-range');
if (slider) {
    slider.oninput = (e) => {
        document.getElementById('before-img').style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
        document.getElementById('handle').style.left = `${e.target.value}%`;
    };
}