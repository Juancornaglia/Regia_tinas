/**
 * js/busca.js - Lógica Unificada para a página de resultados, catálogo e detalhes do produto
 * Totalmente alinhado com o catalogo.js e livre de caminhos órfãos (../)
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = []; // Cache para os filtros funcionarem perfeitamente

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
        await carregarBusca(termo);
        configurarFiltroPreco();
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

// ==========================================
// 2. MÓDULO: RENDERIZAR TELA DE BUSCA / CATÁLOGO
// ==========================================
async function carregarBusca(termo) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const termoLower = termo.toLowerCase();
    container.innerHTML = '<div class="spinner-border text-primary mx-auto my-4" role="status"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        
        todosOsProdutos = await response.json();

        // Filtro inteligente
        const filtrados = todosOsProdutos.filter(p => 
            (p.nome_produto && p.nome_produto.toLowerCase().includes(termoLower)) || 
            (p.marca && p.marca.toLowerCase().includes(termoLower)) ||
            (p.tipo_produto && p.tipo_produto.toLowerCase().includes(termoLower))
        );

        const countDisplay = document.getElementById('results-count');
        if (countDisplay) countDisplay.innerText = `${filtrados.length} itens encontrados`;

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h5>Nenhum pet-produto encontrado. 🐾</h5></div>';
            return;
        }

        // Renderiza a grelha de cards (Aponta para busca.html?id= ao clicar)
        container.innerHTML = filtrados.map(p => {
            const id = p.id_produto || p.id;
            const nome = p.nome_produto || 'Produto sem nome';
            
            // CORREÇÃO: Caminho da imagem limpo de "../img/" para "img/"
            let img = p.url_imagem || 'img/logo_pequena4.png';
            if (img && !img.startsWith('http') && !img.startsWith('img/')) img = 'img/' + img;

            const originalPrice = parseFloat(p.preco) || 0;
            const promoPrice = parseFloat(p.preco_promocional);
            const isPromo = promoPrice && promoPrice < originalPrice;
            const displayPrice = isPromo ? promoPrice : originalPrice;

            return `
                <div class="col-md-4 col-sm-6 mb-4">
                    <div class="product-card h-100 shadow-sm border-0 rounded-4 bg-white p-3 text-center" onclick="window.location.href='busca.html?id=${id}'" style="cursor: pointer;">
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

        gerarFiltrosLaterais(todosOsProdutos);

    } catch (e) {
        console.error("Erro ao carregar busca:", e);
        container.innerHTML = '<p class="text-danger text-center w-100">Erro ao processar catálogo.</p>';
    }
}

// ==========================================
// 3. MÓDULO: VISTA DE DETALHES (SUBSTITUTO DO PRODUTO_DETALHE.HTML)
// ==========================================
async function carregarDetalhesProduto(idProduto) {
    alternarModoVisualizacao('detalhe');
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-border text-primary mx-auto my-5" role="status"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Falha ao ligar ao banco");
        const produtos = await response.json();
        
        const produto = produtos.find(p => String(p.id_produto || p.id) === String(idProduto));

        if (!produto) {
            container.innerHTML = '<div class="alert alert-warning text-center">Pet-produto não localizado.</div>';
            return;
        }

        // Ajuste de imagem e preço
        let imgFinal = produto.url_imagem || 'img/logo_pequena4.png';
        if (imgFinal && !imgFinal.startsWith('http') && !imgFinal.startsWith('img/')) imgFinal = 'img/' + imgFinal;

        const originalPrice = parseFloat(produto.preco) || 0;
        const promoPrice = parseFloat(produto.preco_promocional);
        const isPromo = promoPrice && promoPrice < originalPrice;
        const displayPrice = isPromo ? promoPrice : originalPrice;

        // Injeta a estrutura de página de produto dentro da div limpa
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
                    
                    <div class="d-grid gap-2">
                        <button class="btn btn-lg text-white rounded-pill fw-bold" style="background-color: #FE8697;" id="btn-add-carrinho-unificado">
                            <i class="bi bi-cart-plus-fill me-2"></i> Adicionar ao Carrinho
                        </button>
                        <a href="busca.html" class="btn btn-outline-secondary rounded-pill btn-sm mt-2">
                            <i class="bi bi-arrow-left me-1"></i> Voltar ao Catálogo
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Atribui evento ao botão gerado dinamicamente
        document.getElementById('btn-add-carrinho-unificado').onclick = () => {
            adicionarAoCarrinhoUnificado(produto, displayPrice, imgFinal);
        };

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="alert alert-danger">Erro de ligação ao carregar dados do produto.</div>';
    }
}

// ==========================================
// 4. MÓDULO: COMPORTAMENTO SPA (ESCONDER / MOSTRAR)
// ==========================================
function alternarModoVisualizacao(modo) {
    const sectionBusca = document.getElementById('secao-busca-catalogo');
    const sectionDetalhe = document.getElementById('secao-detalhe-produto');

    if (modo === 'detalhe') {
        if (sectionBusca) sectionBusca.style.display = 'none';
        if (sectionDetalhe) sectionDetalhe.style.display = 'block';
    } else {
        if (sectionBusca) sectionBusca.style.display = 'block';
        if (sectionDetalhe) sectionDetalhe.style.display = 'none';
    }
}

// ==========================================
// 5. COMPATIBILIDADE TOTAL DO CARRINHO
// ==========================================
function adicionarAoCarrinhoUnificado(produto, precoFinal, imagemFinal) {
    let carrinho = JSON.parse(localStorage.getItem('regia_tinas_cart')) || [];
    const id = produto.id_produto || produto.id;
    
    const existente = carrinho.find(item => item.id_produto == id);

    if (existente) {
        existente.quantidade += 1;
    } else {
        // CORREÇÃO MÁXIMA: Estrutura idêntica à do catalogo.js para não quebrar a base de dados!
        carrinho.push({
            id_produto: id,
            nome: produto.nome_produto,
            preco: parseFloat(precoFinal),
            imagem: imagemFinal,
            quantidade: 1
        });
    }

    localStorage.setItem('regia_tinas_cart', JSON.stringify(carrinho));
    alert(`🛒 Sucesso! ${produto.nome_produto} adicionado ao carrinho!`);
    
    window.dispatchEvent(new Event('cartUpdated'));
}

// ==========================================
// 6. FILTROS E ADICIONAIS
// ==========================================
function configurarFiltroPreco() {
    const range = document.getElementById('price-range');
    const valueDisp = document.getElementById('price-value');
    if (range && valueDisp) {
        range.addEventListener('input', (e) => {
            valueDisp.innerText = `R$ ${e.target.value}`;
        });
    }
}

function gerarFiltrosLaterais(produtos) {
    const catBox = document.getElementById('category-filters');
    const brandBox = document.getElementById('brand-filters');

    if (catBox) {
        const categorias = [...new Set(produtos.map(p => p.tipo_produto).filter(Boolean))];
        catBox.innerHTML = categorias.map(c => `
            <div class="form-check"><input class="form-check-input" type="checkbox" value="${c}"> <label class="form-check-label">${c}</label></div>
        `).join('');
    }
    if (brandBox) {
        const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))];
        brandBox.innerHTML = marcas.map(m => `
            <div class="form-check"><input class="form-check-input" type="checkbox" value="${m}"> <label class="form-check-label">${m}</label></div>
        `).join('');
    }
}