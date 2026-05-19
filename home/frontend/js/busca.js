/**
 * js/busca.js - Lógica Unificada para a página de resultados, catálogo e vitrine de detalhes
 * Totalmente adaptado para o modelo de Vitrine Digital (Sem carrinho/compras online)
 * Alinhado com o catalogo.js e livre de caminhos órfãos (../)
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = []; // Cache global para os filtros funcionarem em tempo real

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idProduto = urlParams.get('id');
    const termo = urlParams.get('q') || '';

    // SE TIVER ?id= NA URL, ABRE O MODO DETALHE. SE NÃO, ABRE O MODO BUSCA/CATÁLOGO
    if (idProduto) {
        await carregarDetalhesProduto(idProduto);
    } else {
        alternarModoVisualizacao('busca');
        const termDisplay = document.getElementById('term-display');
        if (termDisplay) termDisplay.innerText = termo ? `"${termo}"` : "Todos os produtos";
        await inicializarCatalogoEBusca(termo);
    }
});

// ==========================================
// 1. UTILS (Sincronizados com o catalogo.js)
// ==========================================
function formatPrice(price) {
    const valor = parseFloat(price);
    if (isNaN(valor)) return 'Consulte';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getFavorites() { return JSON.parse(localStorage.getItem('regia_tinas_favorites')) || []; }
function saveFavorites(favs) { localStorage.setItem('regia_tinas_favorites', JSON.stringify(favs)); }

// ==========================================
// 2. MÓDULO: MOTOR DE FILTRAGEM COMBINADA
// ==========================================
async function inicializarCatalogoEBusca(termoInicial) {
    const container = document.getElementById('search-results');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border brand-pink" role="status"></div><p class="mt-2 text-muted small">Carregando pet-produtos...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        
        const data = await response.json();
        
        // Garante a captura da lista independente se o Python envelopou a resposta ou não
        todosOsProdutos = Array.isArray(data) ? data : (data.produtos || data.data || []);

        // Gera os filtros na barra lateral dinamicamente com os dados reais do Neon
        gerarFiltrosLaterais(todosOsProdutos);
        
        // Ativa os ouvintes de clique no slider de preço e nos checkboxes
        configurarOuvintesDeFiltros();

        // Executa a primeira filtragem baseada no termo digitado (ex: ?q=banana)
        executarFiltragem();

    } catch (e) {
        console.error("Erro ao carregar busca:", e);
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger">Erro ao processar catálogo de produtos.</p></div>';
    }
}

function configurarOuvintesDeFiltros() {
    const range = document.getElementById('price-range');
    const valueDisp = document.getElementById('price-value');
    
    if (range && valueDisp) {
        range.addEventListener('input', (e) => {
            valueDisp.innerText = `R$ ${e.target.value}`;
            executarFiltragem(); // Filtra na hora que arrasta o slider
        });
    }

    document.getElementById('category-filters')?.addEventListener('change', executarFiltragem);
    document.getElementById('brand-filters')?.addEventListener('change', executarFiltragem);
}

function executarFiltragem() {
    const container = document.getElementById('search-results');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const termoLower = (urlParams.get('q') || '').toLowerCase();

    const categoriasSelecionadas = Array.from(document.querySelectorAll('#category-filters input:checked')).map(i => i.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('#brand-filters input:checked')).map(i => i.value);
    
    const priceRange = document.getElementById('price-range');
    const precoMaximo = priceRange ? parseFloat(priceRange.value) : Infinity;

    const produtosFiltrados = todosOsProdutos.filter(p => {
        const matchTermo = !termoLower || 
            (p.nome_produto && p.nome_produto.toLowerCase().includes(termoLower)) || 
            (p.marca && p.marca.toLowerCase().includes(termoLower)) ||
            (p.tipo_produto && p.tipo_produto.toLowerCase().includes(termoLower));

        const matchCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.tipo_produto);
        const matchMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);

        const originalPrice = parseFloat(p.preco) || 0;
        const promoPrice = parseFloat(p.preco_promocional);
        const precoEfetivo = (promoPrice && promoPrice < originalPrice) ? promoPrice : originalPrice;
        const matchPreco = precoEfetivo <= precoMaximo;

        return matchTermo && matchCategoria && matchMarca && matchPreco;
    });

    const countDisplay = document.getElementById('results-count');
    if (countDisplay) countDisplay.innerText = `${produtosFiltrados.length} itens encontrados`;

    if (produtosFiltrados.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><h5>Nenhum pet-produto corresponde aos filtros. 🐾</h5></div>';
        return;
    }

    container.innerHTML = produtosFiltrados.map(p => {
        const id = p.id_produto || p.id;
        const nome = p.nome_produto || 'Produto';
        
        let img = p.url_imagem || 'img/logo_pequena4.png';
        if (img && !img.startsWith('http') && !img.startsWith('img/')) img = 'img/' + img;

        const originalPrice = parseFloat(p.preco) || 0;
        const promoPrice = parseFloat(p.preco_promocional);
        const isPromo = promoPrice && promoPrice < originalPrice;
        const displayPrice = isPromo ? promoPrice : originalPrice;

        return `
            <div class="col-md-4 col-sm-6 mb-4">
                <div class="product-card h-100 shadow-sm border-0 rounded-4 bg-white p-3 text-center" onclick="window.location.href='busca.html?id=${id}'" style="cursor: pointer; transition: 0.3s;">
                    <div class="img-container mb-3" style="height: 180px; display: flex; align-items: center; justify-content: center;">
                        <img src="${img}" class="product-img img-fluid" style="max-height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                    </div>
                    <div class="d-flex flex-column justify-content-between">
                        <h6 class="fw-bold text-dark mb-2 text-truncate">${nome}</h6>
                        <div class="price-container">
                            ${isPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(originalPrice)}</small><br>` : ''}
                            <div class="fs-5 fw-bold" style="color: #FE8697;">${formatPrice(displayPrice)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 3. MÓDULO: VISTA DE DETALHES (MODELO VITRINE)
// ==========================================
async function carregarDetalhesProduto(idProduto) {
    alternarModoVisualizacao('detalhe');
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center my-5"><div class="spinner-border brand-pink" role="status"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Falha ao ligar ao banco");
        const data = await response.json();
        const produtos = Array.isArray(data) ? data : (data.produtos || data.data || []);
        
        const produto = produtos.find(p => String(p.id_produto || p.id) === String(idProduto));

        if (!produto) {
            container.innerHTML = '<div class="alert alert-warning text-center">Pet-produto não localizado.</div>';
            return;
        }

        let imgFinal = produto.url_imagem || 'img/logo_pequena4.png';
        if (imgFinal && !imgFinal.startsWith('http') && !imgFinal.startsWith('img/')) imgFinal = 'img/' + imgFinal;

        const originalPrice = parseFloat(produto.preco) || 0;
        const promoPrice = parseFloat(produto.preco_promocional);
        const isPromo = promoPrice && promoPrice < originalPrice;
        const displayPrice = isPromo ? promoPrice : originalPrice;

        // CORREÇÃO: Modificada a área de ação para focar nas lojas da rede e retirada física
        container.innerHTML = `
            <div class="row g-4 align-items-center">
                <div class="col-md-6 text-center">
                    <img src="${imgFinal}" class="img-fluid rounded shadow-sm p-3 bg-white" style="max-height: 400px; object-fit: contain;" onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                </div>
                <div class="col-md-6">
                    <span class="badge mb-2 text-white" style="background-color: #FE8697;">${produto.tipo_produto || 'Geral'}</span>
                    <h2 class="fw-bold mb-1">${produto.nome_produto}</h2>
                    <p class="text-muted small mb-3">Marca: <span class="fw-bold">${produto.marca || 'Regia & Tinas'}</span></p>
                    
                    <div class="mb-4 p-3 rounded bg-light">
                        ${isPromo ? `<span class="text-muted text-decoration-line-through fs-6">De: ${formatPrice(originalPrice)}</span><br>` : ''}
                        <span class="fs-2 fw-bold" style="color: #FE8697;">Por: ${formatPrice(displayPrice)}</span>
                    </div>
                    
                    <p class="text-secondary mb-4">${produto.descricao || 'Nenhuma descrição detalhada fornecida pelo distribuidor.'}</p>
                    
                    <div class="p-3 rounded-4 bg-white border mb-4 shadow-sm">
                        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-geo-alt-fill me-2" style="color: #FE8697;"></i>Disponibilidade da Rede:</h6>
                        <ul class="ps-0 mb-0 small text-secondary" id="busca-store-list">
                            <li class="list-unstyled"><div class="spinner-border spinner-border-sm brand-pink me-2"></div>Consultando unidades...</li>
                        </ul>
                    </div>

                    <div class="d-grid gap-2">
                        <button class="btn btn-lg text-white rounded-pill fw-bold" style="background-color: #1e272e;" id="btn-consultar-unidades">
                            <i class="bi bi-info-circle me-2"></i> CONSULTAR DISPONIBILIDADE
                        </button>
                        <a href="busca.html" class="btn btn-outline-secondary rounded-pill btn-sm mt-2">
                            <i class="bi bi-arrow-left me-1"></i> Voltar para a Busca
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Ativa os eventos e a listagem de lojas locais
        document.getElementById('btn-consultar-unidades').onclick = () => {
            alert(`📍 Pronta Entrega!\n\nEste item faz parte do nosso catálogo físico. Você pode encontrá-lo e retirá-lo nas nossas unidades da Mooca, Tatuapé, São Caetano, Ipiranga e Santos.`);
        };

        carregarLojasBusca();

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="alert alert-danger">Erro de ligação ao carregar dados do produto.</div>';
    }
}

async function carregarLojasBusca() {
    const list = document.getElementById('busca-store-list');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        const lojas = await response.json();
        
        if (lojas && lojas.length > 0) {
            list.innerHTML = lojas.map(l => `
                <li class="list-unstyled mb-1 fw-medium text-dark d-flex align-items-center">
                    <i class="bi bi-check-circle-fill text-success me-2"></i> Unidade ${l.nome_loja}
                </li>
            `).join('');
        } else {
            list.innerHTML = '<li class="list-unstyled text-muted">Consultar no balcão da unidade mais próxima.</li>';
        }
    } catch (e) {
        // Fallback robusto se a API falhar
        list.innerHTML = `
            <li class="list-unstyled mb-1 text-dark"><i class="bi bi-dot brand-pink fs-5"></i> Mooca, Tatuapé e Ipiranga</li>
            <li class="list-unstyled text-dark"><i class="bi bi-dot brand-pink fs-5"></i> São Caetano e Santos</li>
        `;
    }
}

function alternarModoVisualizacao(modo) {
    const sectionBusca = document.getElementById('secao-busca-catalogo');
    const sectionDetalhe = document.getElementById('product-detail-container'); // Aponta direto para a div injetada

    if (modo === 'detalhe') {
        if (sectionBusca) sectionBusca.style.display = 'none';
        if (sectionDetalhe) sectionDetalhe.style.display = 'block';
    } else {
        if (sectionBusca) sectionBusca.style.display = 'block';
        if (sectionDetalhe) sectionDetalhe.style.display = 'none';
    }
}

function gerarFiltrosLaterais(produtos) {
    const catBox = document.getElementById('category-filters');
    const brandBox = document.getElementById('brand-filters');

    if (catBox) {
        const categorias = [...new Set(produtos.map(p => p.tipo_produto).filter(Boolean))];
        catBox.innerHTML = categorias.map(c => `
            <div class="form-check"><input class="form-check-input" type="checkbox" value="${c}"> <label class="form-check-label small text-secondary">${c}</label></div>
        `).join('');
    }
    if (brandBox) {
        const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))];
        brandBox.innerHTML = marcas.map(m => `
            <div class="form-check"><input class="form-check-input" type="checkbox" value="${m}"> <label class="form-check-label small text-secondary">${m}</label></div>
        `).join('');
    }
}