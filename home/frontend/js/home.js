// CONFIGURAÇÕES GERAIS
const API_URL = 'http://localhost:5000/api';
const CHATEAU_SELECTED_STORE_KEY = 'chateau_selected_store';

// ==========================================================================
// 1. SISTEMA DE FAVORITOS (LOCALSTORAGE)
// ==========================================================================
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
                icon.classList.toggle('bi-heart', !favorites.includes(productId));
                icon.classList.toggle('bi-heart-fill', favorites.includes(productId));
            }
        }
    });
}

// ==========================================================================
// 2. FORMATAÇÃO E CRIAÇÃO DE CARDS
// ==========================================================================
export function formatPrice(price) { 
    if (typeof price !== 'number') return 'Consulte';
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

export function createProductCard(produto) { 
    if (!produto || typeof produto.id_produto === 'undefined') { return ''; }
    
    const originalPrice = produto.preco;
    const promoPrice = produto.preco_promocional;
    const isPromo = promoPrice && promoPrice < originalPrice;
    const displayPrice = isPromo ? promoPrice : originalPrice;
    
    const favorites = getFavorites();
    const isFavorite = favorites.includes(parseInt(produto.id_produto, 10));
    const heartIconClass = isFavorite ? 'bi-heart-fill' : 'bi-heart';
    
    const productLink = `produto_detalhe.html?id=${produto.id_produto}`; 
    
    let imageUrl = produto.url_imagem;
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `img/${produto.url_imagem || 'placeholder.png'}`; 
    }
    if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/placeholder.png'; }
    
    return `
        <div class="card h-100 product-card shadow-sm position-relative">
            <button class="btn btn-outline-danger btn-favorite position-absolute top-0 end-0 m-2 ${isFavorite ? 'active' : ''}" data-product-id="${produto.id_produto}" style="z-index: 10;">
                <i class="bi ${heartIconClass}"></i>
            </button>
            <a href="${productLink}" class="d-block text-center pt-3">
                <img src="${imageUrl}" class="card-img-top" alt="${produto.nome_produto || 'Produto sem nome'}" onerror="this.src='img/placeholder.png'">
            </a>
            <div class="card-body d-flex flex-column text-center p-2">
                <h6 class="card-title flex-grow-1 card-title-limit fs-6 mb-1 text-truncate">
                    <a href="${productLink}" class="text-decoration-none text-dark">
                        ${produto.nome_produto || '(Sem Nome)'}
                    </a>
                </h6>
                <div class="price-container mt-auto mb-2">
                    ${isPromo ? `<p class="text-muted text-decoration-line-through small mb-0">${formatPrice(originalPrice)}</p>` : ''}
                    <p class="card-text price fs-5 fw-bold main-purple-text mb-0">${formatPrice(displayPrice)}</p>
                </div>
                <a href="${productLink}" class="btn btn-sm btn-custom mt-auto rounded-pill">
                   <i class="bi bi-search me-1"></i> Consultar
                </a>
            </div>
        </div>
    `;
}

// ==========================================================================
// 3. CARREGAMENTO VIA PYTHON (NEON)
// ==========================================================================
function getSelectedStoreId() {
    const savedStore = localStorage.getItem(CHATEAU_SELECTED_STORE_KEY);
    return savedStore ? parseInt(JSON.parse(savedStore).id, 10) : 1; 
}

async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="spinner-border text-primary mx-auto" role="status"></div>';

    const storeId = getSelectedStoreId();

    try {
        // Busca TODOS os produtos do servidor Python
        const response = await fetch(`${API_URL}/admin/produtos`);
        const allProducts = await response.json();

        // FILTRAGEM MANUAL (Substitui o que o Supabase fazia)
        let produtos = allProducts.filter(p => p.id_loja == storeId);

        if (filterType === 'ofertas') {
            produtos = produtos.filter(p => p.preco_promocional && p.preco_promocional < p.preco);
        } else if (filterType === 'vendidos') {
            produtos.sort((a, b) => b.quantidade_estoque - a.quantidade_estoque);
        } else if (filterType === 'novidades') {
            produtos.reverse(); // Assume que os últimos cadastrados estão no fim
        }

        if (produtos.length > 0) {
            container.innerHTML = produtos.slice(0, 8).map(createProductCard).join('');
            updateFavoriteButtons();
        } else {
            container.innerHTML = '<p class="text-center text-muted w-100">Nenhum produto nesta unidade.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Erro ao carregar vitrine.</p>';
    }
}

// ==========================================================================
// 4. INTERFACE (SIDEBAR, SLIDERS, VÍDEOS) - MANTIDO ORIGINAL
// ==========================================================================
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

// ==========================================================================
// 5. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    setupMediaSliders();
    
    // Carrega as vitrines chamando os tipos de filtro
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');

    // Listener para geolocalização
    window.addEventListener('chateauStoreChanged', () => location.reload());
});

// Listener Global para Favoritos
document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-favorite');
    if (btn) toggleFavorite(btn.dataset.productId);
});

// Slider Antes/Depois (Grooming)
const slider = document.getElementById('slider-range');
if (slider) {
    slider.oninput = (e) => {
        document.getElementById('before-img').style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
        document.getElementById('handle').style.left = `${e.target.value}%`;
    };
}