/**
 * js/catalogo.js - E-commerce SPA (Single Page Application)
 * Conectado ao banco Neon + Funcionalidade de Favoritos e Carrinho
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let produtosNoEstoque = [];
let produtoAbertoAtualmente = null;

// ==========================================
// 1. UTILITÁRIOS (Preço e Favoritos)
// ==========================================
function formatPrice(price) {
    const valor = parseFloat(price);
    if (isNaN(valor)) return 'Consulte';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getFavorites() { return JSON.parse(localStorage.getItem('chateau_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('chateau_favorites', JSON.stringify(favs)); }

// ==========================================
// 2. CARREGAMENTO DA VITRINE PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', carregarVitrine);

async function carregarVitrine() {
    const container = document.getElementById('vitrine-produtos');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Erro de conexão");
        
        const data = await response.json();
        produtosNoEstoque = Array.isArray(data) ? data : (data.produtos || []);

        if (produtosNoEstoque.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 text-muted">
                    <i class="bi bi-box-seam" style="font-size: 4rem; color: var(--brand-pink);"></i>
                    <h4 class="mt-3 fw-bold">Nenhum produto disponível no momento.</h4>
                </div>`;
            return;
        }

        container.innerHTML = produtosNoEstoque.map(p => {
            const id = p.id_produto || p.id;
            const nome = p.nome_produto || 'Produto sem nome';
            let img = p.url_imagem || 'img/logo_pequena4.png';
            if (img && !img.startsWith('http')) img = '../img/' + img; // Ajuste de rota
            const marca = p.marca || 'Regia & Tinas';
            
            const precoBase = parseFloat(p.preco) || 0;
            const precoPromo = parseFloat(p.preco_promocional);
            const temPromo = precoPromo && precoPromo < precoBase;
            const precoFinal = temPromo ? precoPromo : precoBase;

            let badgeEstoque = '';
            if (p.quantidade_estoque <= 0) badgeEstoque = '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Esgotado</span>';
            else if (p.quantidade_estoque < 5) badgeEstoque = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Últimas unidades!</span>';

            return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="product-card shadow-sm border-0 rounded-4" onclick="abrirDetalhesProduto('${id}')">
                        <div class="position-relative text-center bg-white pt-3 img-container">
                            <img src="${img}" class="product-img" alt="${nome}" onerror="this.src='../img/logo_pequena4.png'">
                            ${badgeEstoque}
                        </div>
                        <div class="card-body d-flex flex-column p-3">
                            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.6rem;">${marca}</small>
                            <h6 class="card-title fw-bold mb-2 text-truncate" title="${nome}">${nome}</h6>
                            <div class="mt-auto">
                                <div class="mb-2">
                                    ${temPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(precoBase)}</small>` : '<small class="text-white">&nbsp;</small>'}
                                    <div class="fs-5 fw-bold" style="color: var(--brand-pink);">${formatPrice(precoFinal)}</div>
                                </div>
                                <button class="btn btn-brand w-100 rounded-pill btn-sm fw-bold py-2">VER DETALHES</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-wifi-off fs-1 text-muted"></i>
                <h5 class="mt-3 fw-bold">Não foi possível carregar os produtos.</h5>
                <button class="btn btn-outline-brand btn-sm mt-2 rounded-pill" onclick="location.reload()">Tentar Novamente</button>
            </div>`;
    }
}

// ==========================================
// 3. LÓGICA DO MODAL DE DETALHES (SPA)
// ==========================================
window.abrirDetalhesProduto = (idStr) => {
    const produto = produtosNoEstoque.find(p => (p.id_produto || p.id).toString() === idStr.toString());
    if (!produto) return;
    
    produtoAbertoAtualmente = produto; // Salva para o botão de carrinho

    // Ajusta Imagem
    let imgFinal = produto.url_imagem || 'img/logo_pequena4.png';
    if (!imgFinal.startsWith('http')) imgFinal = '../img/' + imgFinal;

    // Ajusta Preços
    const precoBase = parseFloat(produto.preco) || 0;
    const precoPromo = parseFloat(produto.preco_promocional);
    const temPromo = precoPromo && precoPromo < precoBase;

    // Preenche a tela do Modal
    document.getElementById('modal-img').src = imgFinal;
    document.getElementById('modal-categoria').innerText = produto.tipo_produto || 'Geral';
    document.getElementById('modal-codigo').innerText = produto.id_produto || produto.id;
    document.getElementById('modal-nome').innerText = produto.nome_produto;
    document.getElementById('modal-marca').innerText = produto.marca || 'Regia & Tinas';
    
    const priceBox = document.getElementById('modal-preco-box');
    if (priceBox) {
        priceBox.innerHTML = temPromo 
            ? `<small class="text-muted text-decoration-line-through d-block fs-6">${formatPrice(precoBase)}</small>${formatPrice(precoPromo)}` 
            : formatPrice(precoBase);
    }
        
    const descBox = document.getElementById('modal-descricao');
    if (descBox) {
        descBox.innerHTML = produto.descricao || 'Nenhuma informação adicional disponível para este produto.';
    }

    // Botão de Favorito (Coração)
    atualizarIconeFavorito(produto.id_produto || produto.id);

    // Mostra o Modal
    const modalElement = document.getElementById('modalProduto');
    if (modalElement) {
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    }
    
    carregarLojasDisponiveis();
};

// ==========================================
// 4. FAVORITOS E LOJAS (DENTRO DO MODAL)
// ==========================================
window.toggleFavorito = () => {
    if (!produtoAbertoAtualmente) return;
    const id = produtoAbertoAtualmente.id_produto || produtoAbertoAtualmente.id;
    
    let favs = getFavorites();
    const index = favs.indexOf(parseInt(id));
    
    if (index > -1) favs.splice(index, 1);
    else favs.push(parseInt(id));
    
    saveFavorites(favs);
    atualizarIconeFavorito(id);
};

function atualizarIconeFavorito(id) {
    const icon = document.getElementById('modal-fav-icon');
    if (!icon) return;
    const favs = getFavorites();
    icon.className = favs.includes(parseInt(id)) ? 'bi bi-heart-fill text-danger fs-4' : 'bi bi-heart text-danger fs-4';
}

async function carregarLojasDisponiveis() {
    const list = document.getElementById('modal-store-list');
    if (!list) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        const lojas = await response.json();
        list.innerHTML = lojas.slice(0, 3).map(l => `<li class="text-success"><i class="bi bi-check-circle-fill me-2"></i>Unidade ${l.nome_loja}</li>`).join('') || '<li>Apenas venda online</li>';
    } catch (e) { list.innerHTML = '<li>Consulte disponibilidade via WhatsApp</li>'; }
}

// ==========================================
// 5. CARRINHO DE COMPRAS
// ==========================================
window.adicionarModalAoCarrinho = () => {
    if (!produtoAbertoAtualmente) return;
    
    const p = produtoAbertoAtualmente;
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
    alert(`🛒 Sucesso! ${p.nome_produto} foi adicionado ao seu carrinho.`);
};