
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let userFavorites = []; // Variável global para armazenar os IDs favoritos

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica Estado de Login (O que parou de funcionar)
    verificarEstadoLogin();
    
    // 2. Carrega favoritos do banco
    await loadUserFavorites();
    
    // 3. Inicializa CMS, Menus e Vitrines
    initCMS();
    setupSidebar();
    setupMediaSliders();
    
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');
});

// --- FUNÇÕES DE LOGIN (Recuperadas) ---
function verificarEstadoLogin() {
    const userId = localStorage.getItem('usuario_id');
    const userName = localStorage.getItem('usuario_nome');
    const loginButton = document.getElementById('btn-login-header');

    if (loginButton && userId) {
        const primeiroNome = userName ? userName.split(' ')[0] : 'Conta';
        loginButton.innerHTML = `<i class="bi bi-person-check-fill me-1"></i> Olá, ${primeiroNome}`;
        loginButton.href = 'usuario/perfil.html'; 
        loginButton.style.fontWeight = '600';
    }
}

// --- SISTEMA DE FAVORITOS (Integrado e Blindado) ---
async function loadUserFavorites() {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) return; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/favoritos/${userId}`);
        if (response.ok) {
            const data = await response.json();
            userFavorites = data.map(p => parseInt(p.id_produto, 10));
            updateFavoriteButtons(); 
        }
    } catch (error) {
        console.error("Erro ao carregar favoritos do banco:", error);
    }
}

export async function toggleFavorite(productId) {
    const userId = localStorage.getItem('usuario_id');
    const productIdNum = parseInt(productId, 10);

    if (!userId) {
        alert("Ops! Faça login para salvar seus favoritos. 🐾");
        window.location.href = 'usuario/login.html';
        return;
    }

    const isFavorite = userFavorites.includes(productIdNum);
    const method = isFavorite ? 'DELETE' : 'POST';
    const endpoint = isFavorite ? `${API_BASE_URL}/api/favoritos/remover` : `${API_BASE_URL}/api/favoritos`;

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId, id_produto: productIdNum })
        });

        if (response.ok) {
            if (isFavorite) {
                userFavorites = userFavorites.filter(id => id !== productIdNum);
            } else {
                userFavorites.push(productIdNum);
            }
            updateFavoriteButtons();
        }
    } catch (error) {
        console.error("Erro ao atualizar favorito:", error);
    }
}

export function updateFavoriteButtons() {
    document.querySelectorAll('.btn-favorite').forEach(button => {
        const productId = parseInt(button.dataset.productId, 10);
        const isFav = userFavorites.includes(productId);
        button.classList.toggle('active', isFav);
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = isFav ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-danger';
        }
    });
}

// --- CMS E VITRINES (Mantidas) ---
async function initCMS() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cms/content`);
        if (response.ok) {
            const dadosCms = await response.json();
            const bannerItem = dadosCms.find(item => item.element_id === 'banner_principal_img');
            const imgBanner = document.getElementById('img-banner-principal');
            if (bannerItem && bannerItem.content_value && imgBanner) {
                imgBanner.src = bannerItem.content_value;
            }
        }
    } catch (error) { console.error("Erro CMS:", error); }
}

export function createProductCard(produto) {
    const idProduto = produto.id_produto || produto.id;
    if (!produto || !idProduto) return '';
    const originalPrice = parseFloat(produto.preco) || 0;
    const promoPrice = parseFloat(produto.preco_promocional);
    const isPromo = promoPrice && promoPrice < originalPrice;
    const displayPrice = isPromo ? promoPrice : originalPrice;
    const isFavorite = userFavorites.includes(parseInt(idProduto, 10));
    
    return `
        <div class="card h-100 product-card shadow-sm position-relative mx-2" style="min-width: 220px; max-width: 250px; border: none; border-radius: 12px;">
            <button class="btn btn-light rounded-circle shadow-sm btn-favorite position-absolute top-0 end-0 m-2 ${isFavorite ? 'active' : ''}" data-product-id="${idProduto}" style="z-index: 10;">
                <i class="${isFavorite ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-danger'}"></i>
            </button>
            <a href="busca.html?id=${idProduto}" class="d-block text-center pt-3">
                <img src="${produto.url_imagem || 'img/logo_pequena4.png'}" class="card-img-top p-2" style="height: 180px; object-fit: contain;" onerror="this.src='img/logo_pequena4.png'">
            </a>
            <div class="card-body d-flex flex-column text-center p-3">
                <h6 class="card-title fw-bold text-truncate">${produto.nome_produto || 'Produto'}</h6>
                <p class="card-text price fw-bold" style="color: #FE8697;">${formatPrice(displayPrice)}</p>
                <a href="busca.html?id=${idProduto}" class="btn w-100 text-white fw-bold rounded-pill" style="background-color: #FE8697;">Ver Lojas</a>
            </div>
        </div>
    `;
}

function formatPrice(p) { return p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const allProducts = await response.json();
        container.innerHTML = allProducts.map(createProductCard).join('');
        updateFavoriteButtons();
    } catch (e) { console.error(e); }
}

function setupSidebar() { /* Lógica do seu menu */ }
function setupMediaSliders() { /* Lógica dos seus sliders */ }

// Delegação de clique para os favoritos (importante para funcionar)
document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-favorite');
    if (btn) toggleFavorite(btn.dataset.productId);
});

// 4. CARREGAMENTO DOS PRODUTOS DA API PÚBLICA
function getSelectedStoreId() {
    const savedStore = localStorage.getItem(REGIA_TINAS_SELECTED_STORE_KEY);
    return savedStore ? parseInt(JSON.parse(savedStore).id, 10) : 1; 
}

async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="spinner-border text-primary mx-auto my-4" role="status"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        
        const allProducts = await response.json();
        
        // CORREÇÃO: Criar uma cópia isolada do array para que os filtros não interfiram uns com os outros
        let produtos = [...allProducts]; 

        if (filterType === 'ofertas') {
            produtos = produtos.filter(p => {
                const original = parseFloat(p.preco) || 0;
                const promo = parseFloat(p.preco_promocional) || 0;
                return promo > 0 && promo < original;
            });
        } else if (filterType === 'vendidos') {
            produtos.sort((a, b) => (b.quantidade_estoque || 0) - (a.quantidade_estoque || 0));
        } else if (filterType === 'novidades') {
            produtos.reverse(); 
        }

        if (produtos.length > 0) {
            container.classList.add('d-flex', 'flex-nowrap'); 
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

    window.addEventListener('regiaTinasStoreChanged', () => location.reload());
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