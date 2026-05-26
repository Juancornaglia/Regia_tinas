// ========================================================
// HOME.JS - CÉREBRO INTEGRADO
// ========================================================

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    verificarEstadoLogin();
    initCMS();
    
    setupSidebar();
    setupMediaSliders();
    
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');
});

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

function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openButton = document.getElementById('button-menu');
    const closeButton = document.getElementById('close-sidebar');

    if (!sidebar || !overlay || !openButton || !closeButton) return;

    openButton.onclick = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    };

    const close = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    closeButton.onclick = close;
    overlay.onclick = close;
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
    setupSlider('ofertas-track', 'ofertas-prev', 'ofertas-next');
    setupSlider('recomendados-track', 'recomendados-prev', 'recomendados-next');
    setupSlider('mais-vendidos-track', 'mais-vendidos-prev', 'mais-vendidos-next');
    setupSlider('novidades-track', 'novidades-prev', 'novidades-next');
}

async function initCMS() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cms/content`);
        if (response.ok) {
            const data = await response.json();
            const bannerItem = data.find(item => item.element_id === 'banner_principal_img');
            const imgBanner = document.getElementById('img-banner-principal');
            if (bannerItem && imgBanner) imgBanner.src = bannerItem.content_value;
        }
    } catch (e) { console.error("Erro CMS:", e); }
}

function createProductCard(produto) {
    const id = produto.id_produto || produto.id;
    const displayPrice = parseFloat(produto.preco_promocional) || parseFloat(produto.preco) || 0;
    
    return `
        <div class="card h-100 product-card shadow-sm mx-2" style="min-width: 220px; max-width: 250px;">
            <a href="busca.html?id=${id}"><img src="${produto.url_imagem || 'img/logo_pequena4.png'}" class="card-img-top" style="height: 180px; object-fit: contain;" onerror="this.src='img/logo_pequena4.png'"></a>
            <div class="card-body text-center">
                <h6 class="fw-bold">${produto.nome_produto || 'Produto'}</h6>
                <p class="text-brand fw-bold">R$ ${displayPrice.toFixed(2).replace('.', ',')}</p>
                <a href="busca.html?id=${id}" class="btn w-100 text-white rounded-pill" style="background-color: #FE8697;">Ver Lojas</a>
            </div>
        </div>
    `;
}

async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const allProducts = await response.json();
        container.classList.add('d-flex', 'flex-nowrap');
        container.innerHTML = allProducts.map(createProductCard).join('');
    } catch (e) { 
        console.error("Erro ao carregar produtos:", e); 
    }
}