/**
 * js/catalogo.js - Vitrine Digital e Catálogo SPA (Single Page Application)
 * Modelo focado em exibição de produtos e consulta de unidades físicas da rede
 * Conectado ao banco Neon + Alinhado com as chaves Regia & Tinas Care
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let produtosNoEstoque = [];
let produtoAbertoAtualmente = null;

// ==========================================
// 1. UTILITÁRIOS DE FORMATAÇÃO E FAVORITOS
// ==========================================
function formatPrice(price) {
    const valor = parseFloat(price);
    if (isNaN(valor)) return 'Consulte';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
        if (!response.ok) throw new Error("Erro de conexão com o servidor");
        
        const data = await response.json();
        
        // Garante a captura correta dos dados vindos do backend Python
        produtosNoEstoque = Array.isArray(data) ? data : (data.produtos || data.data || []);

        if (produtosNoEstoque.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 text-muted">
                    <i class="bi bi-box-seam" style="font-size: 4rem; color: #FE8697;"></i>
                    <h4 class="mt-3 fw-bold">Nenhum produto em exposição no momento.</h4>
                </div>`;
            return;
        }

        container.innerHTML = produtosNoEstoque.map(p => {
            const id = p.id_produto || p.id;
            const nome = p.nome_produto || 'Produto';
            
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
            if (p.quantidade_estoque <= 0) {
                badgeEstoque = '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Indisponível</span>';
            } else if (p.quantidade_estoque < 3) {
                badgeEstoque = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Baixo Estoque</span>';
            }

            return `
                <div class="col-6 col-md-4 col-lg-3 mb-4">
                    <div class="product-card h-100 shadow-sm border-0 rounded-4 bg-white p-2" onclick="abrirDetalhesProduto('${id}')" style="cursor: pointer; transition: 0.3s;">
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
                <h5 class="mt-3 fw-bold">Não foi possível carregar o catálogo de produtos.</h5>
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

    let imgFinal = produto.url_imagem || 'img/logo_pequena4.png';
    if (!imgFinal.startsWith('http') && !imgFinal.startsWith('img/')) {
        imgFinal = 'img/' + imgFinal;
    }

    const precoBase = parseFloat(produto.preco) || 0;
    const precoPromo = parseFloat(produto.preco_promocional);
    const temPromo = precoPromo && precoPromo < precoBase;

    // Preenche as informações textuais do Modal
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

    // AUTOMAÇÃO INTELIGENTE: Localiza o antigo botão de compra e altera o texto dinamicamente
    const botoesModal = document.querySelectorAll('#modalProduto button');
    botoesModal.forEach(btn => {
        // Se for o botão que chama a função de adicionar ao carrinho, altera a cara dele
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('adicionarModalAoCarrinho')) {
            btn.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i> VEJA AS UNIDADES DISPONÍVEIS';
            btn.style.backgroundColor = '#1e272e'; // Tom escuro profissional elegante
        }
    });

    // Abre o Modal do Bootstrap de forma limpa
    const modalElement = document.getElementById('modalProduto');
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modalInstance.show();
    }
    
    // Dispara a consulta de estoques locais no banco Neon
    carregarLojasDisponiveis();
};

// ==========================================
// 4. FAVORITOS E ESCALABILIDADE DE LOJAS
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

/**
 * Consulta a API de Lojas do Neon e lista onde o cliente pode encontrar o item
 */
async function carregarLojasDisponiveis() {
    const list = document.getElementById('modal-store-list');
    if (!list) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        const lojas = await response.json();
        
        // Mapeia todas as lojas ativas cadastradas no seu Neon (Mooca, Tatuapé, etc.)
        if (lojas && lojas.length > 0) {
            list.innerHTML = lojas.map(l => `
                <li class="text-dark mb-2 fw-medium list-unstyled">
                    <i class="bi bi-geo-alt-fill me-2" style="color: #FE8697;"></i>Unidade ${l.nome_loja} 
                    <span class="badge bg-success bg-opacity-10 text-success border border-success ms-2 small">Estoque Pronto</span>
                </li>
            `).join('');
        } else {
            list.innerHTML = '<li class="text-muted list-unstyled"><i class="bi bi-exclamation-circle me-2"></i>Disponível sob consulta no balcão</li>';
        }
    } catch (e) { 
        // Fallback elegante caso a rota do Render esteja offline no momento
        list.innerHTML = `
            <li class="text-secondary list-unstyled mb-1"><i class="bi bi-geo-alt me-2"></i>Disponível nas unidades: Mooca, Tatuapé, São Caetano, Ipiranga e Santos.</li>
            <li class="text-muted small list-unstyled mt-2"><i class="bi bi-info-circle me-1"></i>Consulte a quantidade exata via WhatsApp da unidade escolhida.</li>
        `; 
    }
}

// ==========================================
// 5. REDIRECIONAMENTO COMPATÍVEL DA RETIRADA
// ==========================================
window.adicionarModalAoCarrinho = () => {
    if (!produtoAbertoAtualmente) return;
    
    // Quando o usuário clicar no botão principal, ele avisa que é para retirada física e foca a lista
    alert(`📍 Retirada Física Disponível!\n\nEste produto está em exposição e disponível para pronta entrega nas nossas unidades físicas (Mooca, Tatuapé, São Caetano, Ipiranga e Santos).\n\nConfira os detalhes de contato na aba de unidades abaixo.`);
    
    const listSection = document.getElementById('modal-store-list');
    if (listSection) {
        listSection.scrollIntoView({ behavior: 'smooth' }); // Faz um scroll suave até a lista de lojas dentro do modal
    }
};