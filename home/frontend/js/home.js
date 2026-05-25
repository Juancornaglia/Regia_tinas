// ========================================================
// HOME.JS - CÉREBRO INTEGRADO (Login + CMS + Favoritos + Vitrines + UI)
// ========================================================

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let userFavorites = [];

document.addEventListener('DOMContentLoaded', async () => {
    verificarEstadoLogin();
    await loadUserFavorites();
    initCMS();
    
    // Agora essas funções estão completas!
    setupSidebar();
    setupMediaSliders();
    
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');
});

// --- 1. LOGIN ---
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

// --- 2. FAVORITOS ---
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
    } catch (error) { console.error("Erro ao carregar favoritos:", error); }
}

window.toggleFavorite = async function (productId) {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        alert("Ops! Faça login para salvar seus favoritos. 🐾");
        window.location.href = 'usuario/login.html';
        return;
    }
    const productIdNum = parseInt(productId, 10);
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
            userFavorites = isFavorite ? userFavorites.filter(id => id !== productIdNum) : [...userFavorites, productIdNum];
            updateFavoriteButtons();
        }
    } catch (error) { console.error("Erro ao atualizar favorito:", error); }
};

function updateFavoriteButtons() {
    document.querySelectorAll('.btn-favorite').forEach(button => {
        const productId = parseInt(button.dataset.productId, 10);
        const isFav = userFavorites.includes(productId);
        button.classList.toggle('active', isFav);
        const icon = button.querySelector('i');
        if (icon) icon.className = isFav ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-danger';
    });
}

// --- 3. INTERFACE (SIDEBAR E SLIDERS) ---
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openButton = document.getElementById('button-menu');
    const closeButton = document.getElementById('close-sidebar');
    const submenuToggles = document.querySelectorAll('.submenu-toggle');

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

    submenuToggles.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            btn.closest('.menu-item')?.classList.toggle('open');
        };
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
    setupSlider('ofertas-track', 'ofertas-prev', 'ofertas-next');
    setupSlider('recomendados-track', 'recomendados-prev', 'recomendados-next');
    setupSlider('mais-vendidos-track', 'mais-vendidos-prev', 'mais-vendidos-next');
    setupSlider('novidades-track', 'novidades-prev', 'novidades-next');
}

// --- 4. CMS E CARDS ---
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

function formatPrice(p) { return p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function createProductCard(produto) {
    const id = produto.id_produto || produto.id;
    const isFavorite = userFavorites.includes(parseInt(id, 10));
    const displayPrice = parseFloat(produto.preco_promocional) || parseFloat(produto.preco) || 0;
    
    return `
        <div class="card h-100 product-card shadow-sm mx-2" style="min-width: 220px; max-width: 250px;">
            <button class="btn btn-light rounded-circle btn-favorite position-absolute m-2" data-product-id="${id}" onclick="toggleFavorite(${id})">
                <i class="${isFavorite ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-danger'}"></i>
            </button>
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
    if (!container) {
        console.warn(`[REGIA-TINAS] O container com ID '${containerId}' não foi encontrado no HTML.`);
        return;
    }

    // Mostra o spinner
    container.innerHTML = '<div class="spinner-border text-pink" role="status"><span class="visually-hidden">Carregando...</span></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        // 1. Verifica se a API respondeu com sucesso
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }
        
        const allProducts = await response.json();
        console.log("DEBUG: Produtos carregados:", allProducts); // Isso vai aparecer no F12 > Console

        // 2. Verifica se o que veio é realmente uma lista (array)
        if (!Array.isArray(allProducts)) {
            throw new Error("A API não retornou uma lista de produtos.");
        }

        // 3. Renderiza
        container.innerHTML = allProducts.map(createProductCard).join('');
        
        // Garante que a função de favoritos existe antes de chamar
        if (typeof updateFavoriteButtons === 'function') {
            updateFavoriteButtons();
        }
        
    } catch (e) { 
        console.error("❌ Erro ao carregar produtos:", e); 
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-danger fw-bold">Erro ao carregar a vitrine.</p>
                <small class="text-muted">${e.message}</small>
            </div>`;
    }
}