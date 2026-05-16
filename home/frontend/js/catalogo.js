/**
 * js/catalogo.js - E-commerce SPA (Single Page Application)
 * Conectado ao banco Neon + Alinhado com as chaves Regia & Tinas Care
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let produtosNoEstoque = [];
let produtoAbertoAtualmente = null;

// ==========================================
// 1. UTILITÁRIOS (Preço e Favoritos Alinhados com a Home)
// ==========================================
function formatPrice(price) {
    const valor = parseFloat(price);
    if (isNaN(valor)) return 'Consulte';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// CORREÇÃO: Agora usa a mesma chave do home.js para sincronizar os corações!
function getFavorites() { return JSON.parse(localStorage.getItem('regia_tinas_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('regia_tinas_favorites', JSON.stringify(favs)); }

// ==========================================
// 2. CARREGAMENTO DA VITRINE PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', carregarVitrine);

async function carregarVitrine() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Erro de conexão");
        
        const data = await response.json();
        produtosNoEstoque = Array.isArray(data) ? data : (data.produtos || []);

        if (produtosNoEstoque.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 text-muted">
                    <i class="bi bi-box-seam" style="font-size: 4rem; color: #FE8697;"></i>
                    <h4 class="mt-3 fw-bold">Nenhum produto disponível no momento.</h4>
                </div>`;
            return;
        }

        container.innerHTML = produtosNoEstoque.map(p => {
            const id = p.id_produto || p.id;
            const nome = p.nome_produto || 'Produto sem nome';
            
            // CORREÇÃO: Caminho corrigido de ../img/ para img/ porque os ficheiros mudaram de pasta
            let img = p.url_imagem || 'img/logo_pequena4.png';
            if (img && !img.startsWith('http') && !img.startsWith('img/')) {
                img = 'img/' + img; 
            }
            
            const marca = p.marca || 'Regia & Tinas';
            
            const precoBase = parseFloat(p.preco) || 0;
            const precoPromo = parseFloat(p.preco_promocional);
            const temPromo = precoPromo && precoPromo < precoBase;
            const precoFinal = temPromo ? precoPromo : precoBase;

            let badgeEstoque = '';
            if (p.quantidade_estoque <= 0) badgeEstoque = '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Esgotado</span>';
            else if (p.quantidade_estoque < 5) badgeEstoque = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Últimas unidades!</span>';

            return `
                <div class="col-6 col-md-4 col-lg-3 mb-4">
                    <div class="product-card h-100 shadow-sm border-0 rounded-4 bg-white p-2" onclick="abrirDetalhesProduto('${id}')" style="cursor: pointer;">
                        <div class="position-relative text-center pt-3 img-container" style="height: 160px; display: flex; align-items: center; justify-content: center;">
                            <img src="${img}" class="product-img img-fluid" alt="${nome}" style="max-height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                            ${badgeEstoque}
                        </div>
                        <div class="card-body d-flex flex-column p-3">
                            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.6rem;">${marca}</small>
                            <h6 class="card-title fw-bold mb-2 text-truncate" title="${nome}" style="font-size: 0.9rem;">${nome}</h6>
                            <div class="mt-auto">
                                <div class="mb-2">
                                    ${temPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(precoBase)}</small>` : '<small class="text-white">&nbsp;</small>'}
                                    <div class="fs-5 fw-bold" style="color: #FE8697;">${formatPrice(precoFinal)}</div>
                                </div>
                                <button class="btn btn-sm w-100 rounded-pill fw-bold py-2 text-white" style="background-color: #FE8697;">VER DETALHES</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro na vitrine:", error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-wifi-off fs-1 text-muted"></i>
                <h5 class="mt-3 fw-bold">Não foi possível carregar os produtos.</h5>
                <button class="btn btn-outline-secondary btn-sm mt-2 rounded-pill" onclick="location.reload()">Tentar Novamente</button>
            </div>`;
    }
}

// ==========================================
// 3. LÓGICA DO MODAL DE DETALHES (SPA)
// ==========================================
window.abrirDetalhesProduto = (idStr) => {
    const produto = produtosNoEstoque.find(p => (p.id_produto || p.id).toString() === idStr.toString());
    if (!produto) return;
    
    produtoAbertoAtualmente = produto; 

    // CORREÇÃO: Caminho da imagem do modal corrigido
    let imgFinal = produto.url_imagem || 'img/logo_pequena4.png';
    if (!imgFinal.startsWith('http') && !imgFinal.startsWith('img/')) {
        imgFinal = 'img/' + imgFinal;
    }

    const precoBase = parseFloat(produto.preco) || 0;
    const precoPromo = parseFloat(produto.preco_promocional);
    const temPromo = precoPromo && precoPromo < precoBase;

    // Preenche a tela do Modal
    const modalImgElement = document.getElementById('modal-img');
    if (modalImgElement) modalImgElement.src = imgFinal;
    
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

    atualizarIconeFavorito(produto.id_produto || produto.id);

    // Mostra o Modal do Bootstrap
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
    const index = favs.indexOf(parseInt(id, 10));
    
    if (index > -1) favs.splice(index, 1);
    else favs.push(parseInt(id, 10));
    
    saveFavorites(favs);
    atualizarIconeFavorito(id);
};

function atualizarIconeFavorito(id) {
    const icon = document.getElementById('modal-fav-icon');
    if (!icon) return;
    const favs = getFavorites();
    icon.className = favs.includes(parseInt(id, 10)) ? 'bi bi-heart-fill text-danger fs-4' : 'bi bi-heart text-danger fs-4';
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
// 5. CARRINHO DE COMPRAS (Sincronizado globalmente)
// ==========================================
window.adicionarModalAoCarrinho = () => {
    if (!produtoAbertoAtualmente) return;
    
    const p = produtoAbertoAtualmente;
    
    // CORREÇÃO: Padronizado para usar a mesma chave 'regia_tinas_cart' do busca.js
    let carrinho = JSON.parse(localStorage.getItem('regia_tinas_cart')) || [];
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

    localStorage.setItem('regia_tinas_cart', JSON.stringify(carrinho));
    alert(`🛒 Sucesso! ${p.nome_produto} foi adicionado ao seu carrinho.`);
    
    // Dispara o evento global para a bolinha vermelha do menu atualizar na hora!
    window.dispatchEvent(new Event('cartUpdated'));
};