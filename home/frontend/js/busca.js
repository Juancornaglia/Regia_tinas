// js/busca.js
const BUSCA_API_URL = window.API_BASE_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://regia-tinas.onrender.com"
);

let todosOsProdutos = [];
let produtoAtualModal = null;
let termoBuscaAtual = "";

// Resolve caminho padrão da logo independente se a página está na raiz ou subpasta
const LOGO_FALLBACK = window.location.pathname.includes('/usuario/') || window.location.pathname.includes('/servicos/')
    ? '../img/logo_pequena4.png'
    : 'img/logo_pequena4.png';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistema de Busca inicializando...");

    // 1. Lê parâmetros da URL (?q= e ?id=)
    const params = new URLSearchParams(window.location.search);
    termoBuscaAtual = (params.get('q') || '').trim();

    const searchInput = document.getElementById('search-input-page');
    if (searchInput) {
        if (termoBuscaAtual) {
            searchInput.value = termoBuscaAtual;
            atualizarTituloTermo(termoBuscaAtual);
        }

        // Busca em tempo real ao digitar na barra superior
        searchInput.addEventListener('input', (e) => {
            termoBuscaAtual = e.target.value.trim();
            atualizarTituloTermo(termoBuscaAtual);
            aplicarFiltros();
        });
    }

    // Intercepta o submit do form para filtrar sem precisar recarregar a página inteira
    const formBusca = document.getElementById('form-busca-navbar');
    if (formBusca) {
        formBusca.addEventListener('submit', (e) => {
            e.preventDefault();
            termoBuscaAtual = (searchInput?.value || '').trim();
            atualizarTituloTermo(termoBuscaAtual);
            aplicarFiltros();
        });
    }

    // 2. Inicializa Geolocalização (se existir no geolocator.js)
    if (typeof inicializarGeolocalizador === 'function') {
        try {
            await inicializarGeolocalizador();
        } catch (e) {
            console.warn("Geolocalização não pôde ser carregada, usando padrão.");
        }
    }

    // 3. Configura eventos de filtro
    const priceRange = document.getElementById('price-range');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            const val = document.getElementById('price-value');
            if (val) val.textContent = `R$ ${e.target.value}`;
            aplicarFiltros();
        });
    }

    const btnLimpar = document.getElementById('btn-limpar-filtros');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparTodosFiltros);
    }

    // 4. Carrega os produtos
    await loadProducts('search-results');

    // 5. Abre o modal automaticamente se o usuário clicou em um produto na Home (?id=...)
    const idDireto = params.get('id');
    if (idDireto) {
        window.abrirModalProduto(idDireto);
    }
});

function atualizarTituloTermo(termo) {
    const container = document.getElementById('term-display-container');
    const span = document.getElementById('term-display');
    if (!container || !span) return;

    if (termo) {
        span.textContent = `"${termo}"`;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// 1. CARREGAMENTO DOS PRODUTOS
async function loadProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-5 w-100"><div class="spinner-border" style="color: var(--brand-pink);" role="status"></div><p class="mt-3 text-muted fw-bold">Buscando produtos...</p></div>';

    try {
        const response = await fetch(`${BUSCA_API_URL}/api/produtos`);
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        
        const allProducts = await response.json();
        todosOsProdutos = Array.isArray(allProducts) ? allProducts : []; 
        
        popularFiltrosLaterais(todosOsProdutos);
        aplicarFiltros();
    } catch (e) { 
        console.error("❌ Erro ao carregar produtos:", e); 
        container.innerHTML = `<div class="col-12 text-center text-danger py-5 w-100">Erro ao comunicar com o servidor.</div>`;
    }
}

// Preenche Categorias, Marcas e Preço Máximo na barra lateral automaticamente
function popularFiltrosLaterais(produtos) {
    const catContainer = document.getElementById('category-filters');
    const brandContainer = document.getElementById('brand-filters');
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');

    const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))].sort();

    if (catContainer) {
        catContainer.innerHTML = categorias.length > 0
            ? categorias.map((cat, idx) => `
                <div class="form-check mb-1">
                    <input class="form-check-input filtro-categoria" type="checkbox" value="${cat}" id="cat-${idx}">
                    <label class="form-check-label" for="cat-${idx}">${cat}</label>
                </div>`).join('')
            : '<span class="text-muted">Nenhuma categoria</span>';

        catContainer.querySelectorAll('.filtro-categoria').forEach(cb => cb.addEventListener('change', aplicarFiltros));
    }

    if (brandContainer) {
        brandContainer.innerHTML = marcas.length > 0
            ? marcas.map((marca, idx) => `
                <div class="form-check mb-1">
                    <input class="form-check-input filtro-marca" type="checkbox" value="${marca}" id="marca-${idx}">
                    <label class="form-check-label" for="marca-${idx}">${marca}</label>
                </div>`).join('')
            : '<span class="text-muted">Nenhuma marca</span>';

        brandContainer.querySelectorAll('.filtro-marca').forEach(cb => cb.addEventListener('change', aplicarFiltros));
    }

    if (priceRange && produtos.length > 0) {
        const maiorPreco = Math.ceil(Math.max(...produtos.map(p => parseFloat(p.preco) || 0), 500) / 10) * 10;
        priceRange.max = maiorPreco;
        priceRange.value = maiorPreco;
        if (priceValue) priceValue.textContent = `R$ ${maiorPreco}`;
    }
}

function limparTodosFiltros() {
    document.querySelectorAll('.filtro-categoria, .filtro-marca').forEach(cb => cb.checked = false);
    const searchInput = document.getElementById('search-input-page');
    if (searchInput) searchInput.value = '';
    termoBuscaAtual = '';
    atualizarTituloTermo('');

    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    if (priceRange) {
        priceRange.value = priceRange.max;
        if (priceValue) priceValue.textContent = `R$ ${priceRange.max}`;
    }

    aplicarFiltros();
}

// 2. RENDERIZAÇÃO DA VITRINE
function renderizarVitrine(produtos) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');
    if (!container) return;
    
    if (resultsCount) resultsCount.textContent = `${produtos.length} produto(s) no catálogo`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 w-100">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 fw-bold text-muted">Nenhum produto encontrado.</h5>
            </div>`;
        return;
    }

    container.innerHTML = produtos.map(p => {
        const id = p.id_produto ?? p.id;
        return `
        <div class="col">
            <div class="product-card shadow-sm border position-relative">
                <div onclick="abrirModalProduto('${id}')" style="cursor: pointer;">
                    <div class="img-container">
                        <img src="${p.url_imagem || LOGO_FALLBACK}" alt="${p.nome_produto}" class="product-img" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}'">
                    </div>
                    <div class="card-body border-top">
                        <span class="badge bg-light text-secondary mb-2">${p.categoria || 'Geral'}</span>
                        <h6 class="fw-bold text-dark mb-1 text-truncate" title="${p.nome_produto}">${p.nome_produto}</h6>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="price-tag fw-bold" style="color: var(--brand-pink);">
                                R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}
                            </span>
                            <span class="badge bg-dark text-white rounded-pill"><i class="bi bi-geo-alt"></i> Lojas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// 3. FILTROS COMBINADOS (TEXTO + CATEGORIA + MARCA + PREÇO)
function aplicarFiltros() {
    const categoriasSelecionadas = Array.from(document.querySelectorAll('.filtro-categoria:checked')).map(cb => cb.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('.filtro-marca:checked')).map(cb => cb.value);
    const priceRange = document.getElementById('price-range');
    const precoMaximo = priceRange ? parseFloat(priceRange.value) : Infinity;
    const termo = termoBuscaAtual.toLowerCase();

    const produtosFiltrados = todosOsProdutos.filter(p => {
        const preco = parseFloat(p.preco) || 0;
        const nome = (p.nome_produto || '').toLowerCase();
        const cat = (p.categoria || '').toLowerCase();
        const marca = (p.marca || '').toLowerCase();

        const passaTexto = !termo || nome.includes(termo) || cat.includes(termo) || marca.includes(termo);
        const passaCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.categoria);
        const passaMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);
        const passaPreco = preco <= precoMaximo;

        return passaTexto && passaCategoria && passaMarca && passaPreco;
    });

    renderizarVitrine(produtosFiltrados);
}

// 4. MODAL
window.abrirModalProduto = async function(idProduto) {
    produtoAtualModal = todosOsProdutos.find(p => String(p.id_produto ?? p.id) === String(idProduto));
    if (!produtoAtualModal) return;

    document.getElementById('modal-img').src = produtoAtualModal.url_imagem || LOGO_FALLBACK;
    document.getElementById('modal-codigo').textContent = produtoAtualModal.id_produto ?? produtoAtualModal.id ?? '--';
    document.getElementById('modal-categoria').textContent = (produtoAtualModal.categoria || 'Geral').toUpperCase();
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto || 'Produto';
    document.getElementById('modal-marca').textContent = produtoAtualModal.marca || 'Marca própria';
    document.getElementById('modal-preco-box').textContent = `R$ ${parseFloat(produtoAtualModal.preco || 0).toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-descricao').textContent = produtoAtualModal.descricao || 'Sem descrição adicional cadastrada para este item.';

    const storeList = document.getElementById('modal-store-list');
    if (storeList) {
        const qtd = produtoAtualModal.quantidade_estoque ?? 0;
        storeList.innerHTML = qtd > 0
            ? `<li class="store-item p-2 mb-2 shadow-sm d-flex justify-content-between align-items-center">
                   <span><strong>Unidade Matriz</strong></span>
                   <span class="badge bg-success rounded-pill">${qtd} em estoque</span>
               </li>`
            : `<li class="text-muted small">Consulte disponibilidade na recepção da unidade.</li>`;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();
    
    if (typeof verificarEstoque === 'function') verificarEstoque(idProduto);
};