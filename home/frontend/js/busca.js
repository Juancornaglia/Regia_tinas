// js/busca.js
const BUSCA_API_URL = window.API_BASE_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? `http://${window.location.hostname}:${window.location.port || 5000}`
        : "https://regia-tinas.onrender.com"
);

let todosOsProdutos = [];
let produtoAtualModal = null;
let termoBuscaAtual = "";

const LOGO_FALLBACK = 'img/logo_pequena4.png';

function normalizarTexto(str) {
    return String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const SINONIMOS_BUSCA = {
    gato: ['gato', 'gatos'],
    gatos: ['gato', 'gatos'],
    cachorro: ['cachorro', 'cachorros', 'cao', 'caes'],
    cachorros: ['cachorro', 'cachorros', 'cao', 'caes'],
    cao: ['cachorro', 'cachorros', 'cao', 'caes'],
    caes: ['cachorro', 'cachorros', 'cao', 'caes'],
    racao: ['racao', 'racoes'],
    racoes: ['racao', 'racoes']
};

function expandirPalavraBusca(palavra) {
    if (SINONIMOS_BUSCA[palavra]) return SINONIMOS_BUSCA[palavra];
    return palavra.endsWith('s') ? [palavra, palavra.slice(0, -1)] : [palavra, `${palavra}s`];
}

function produtoCorrespondeBusca(produto, termo) {
    const palavras = normalizarTexto(termo).split(/\s+/).filter(Boolean);
    const palavrasChave = palavras.filter(palavra => !['de', 'da', 'do', 'das', 'dos'].includes(palavra));
    if (!palavrasChave.length) return true;

    const camposProduto = [
        produto.nome_produto,
        produto.categoria,
        produto.tipo_produto,
        produto.subcategoria,
        produto.descricao,
        produto.marca
    ];
    const palavrasProduto = new Set(
        camposProduto
            .map(normalizarTexto)
            .join(' ')
            .split(/[^a-z0-9]+/)
            .filter(Boolean)
    );

    return palavrasChave.every(palavra =>
        expandirPalavraBusca(palavra).some(variacao =>
            [...palavrasProduto].some(palavraProduto => palavraProduto.startsWith(variacao))
        )
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    termoBuscaAtual = (params.get('q') || '').trim();

    const searchInput = document.getElementById('search-input-page');
    if (searchInput) {
        if (termoBuscaAtual && !['ofertas', 'novidades', 'vendidos'].includes(termoBuscaAtual.toLowerCase())) {
            searchInput.value = termoBuscaAtual;
            atualizarTituloTermo(termoBuscaAtual);
        }

        searchInput.addEventListener('input', (e) => {
            termoBuscaAtual = e.target.value.trim();
            atualizarTituloTermo(termoBuscaAtual);
            aplicarFiltros();
        });
    }

    const formBusca = document.getElementById('form-busca-navbar');
    if (formBusca) {
        formBusca.addEventListener('submit', (e) => {
            e.preventDefault();
            termoBuscaAtual = (searchInput?.value || '').trim();
            atualizarTituloTermo(termoBuscaAtual);
            aplicarFiltros();
        });
    }

    // Eventos de ordenação e filtros de vendas
    document.getElementById('sort-select')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-apenas-promocao')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-apenas-estoque')?.addEventListener('change', aplicarFiltros);

    const priceRange = document.getElementById('price-range');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            const val = document.getElementById('price-value');
            if (val) val.textContent = `R$ ${e.target.value}`;
            aplicarFiltros();
        });
    }

    document.getElementById('btn-limpar-filtros')?.addEventListener('click', limparTodosFiltros);
    document.getElementById('mobileFiltersModal')?.addEventListener('show.bs.modal', sincronizarFiltrosMobile);
    document.getElementById('mobile-price-range')?.addEventListener('input', (event) => {
        const value = document.getElementById('mobile-price-value');
        if (value) value.textContent = `R$ ${event.target.value}`;
    });
    document.getElementById('mobile-clear-filters')?.addEventListener('click', () => {
        limparFiltrosMobile();
        aplicarFiltrosMobile();
        aplicarFiltros();
    });
    document.getElementById('mobile-apply-filters')?.addEventListener('click', () => {
        aplicarFiltrosMobile();
        aplicarFiltros();
    });

    // Atalhos vindos da Home (?q=ofertas, ?q=vendidos)
    if (normalizarTexto(termoBuscaAtual) === 'ofertas') {
        const promoCheck = document.getElementById('filtro-apenas-promocao');
        const sortSelect = document.getElementById('sort-select');
        if (promoCheck) promoCheck.checked = true;
        if (sortSelect) sortSelect.value = 'ofertas';
        termoBuscaAtual = '';
    } else if (normalizarTexto(termoBuscaAtual) === 'vendidos') {
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = 'destaques';
        termoBuscaAtual = '';
    }

    await loadProducts('search-results');

    // Abre modal direto se veio da Home (?id=...)
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

// Normaliza dados vindos do banco (remove códigos numéricos e marcas antigas mesmo antes do SQL)
function normalizarProduto(p) {
    const nomeLimpo = (p.nome_produto || 'Produto').replace(/^\d+\s*-\s*/, '').trim();
    let marcaLimpa = (p.marca || 'Regia & Tinas Care').trim();
    if (/chateau du pet/i.test(marcaLimpa)) {
        marcaLimpa = marcaLimpa.includes('/') ? marcaLimpa.split('/')[0].trim() : 'Regia & Tinas Care';
    }
    marcaLimpa = marcaLimpa.replace(/^Pet Treas/i, 'Pet Treats');

    let categoriaLimpa = (p.tipo_produto || p.categoria || 'Acessório').trim();
    if (categoriaLimpa === 'Biscoitos') categoriaLimpa = 'Biscoito';
    if (categoriaLimpa === 'Agrado') categoriaLimpa = 'Petisco';

    const precoOriginal = parseFloat(p.preco) || 0;
    const precoPromo = parseFloat(p.preco_promocional) || 0;
    const temPromocao = precoPromo > 0 && precoPromo < precoOriginal;

    return {
        ...p,
        nome_produto: nomeLimpo,
        marca: marcaLimpa,
        categoria: categoriaLimpa,
        preco_original: precoOriginal,
        preco_final: temPromocao ? precoPromo : precoOriginal,
        tem_promocao: temPromocao
    };
}

// 1. CARREGAMENTO DOS PRODUTOS (USA /api/busca QUE FILTRA ATIVOS, COM FALLBACK PARA /api/produtos)
async function loadProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        let response = await fetch(`${BUSCA_API_URL}/api/busca`);
        if (!response.ok) {
            response = await fetch(`${BUSCA_API_URL}/api/produtos`);
        }
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        
        const rawProducts = await response.json();
        const lista = Array.isArray(rawProducts) ? rawProducts : [];

        // Remove duplicados pelo nome normalizado e filtra apenas ativos
        const vistos = new Set();
        todosOsProdutos = lista
            .filter(p => p.ativo !== false && (p.status_produto || 'Ativo') === 'Ativo')
            .map(normalizarProduto)
            .filter(p => {
                const chave = p.nome_produto.toLowerCase();
                if (vistos.has(chave)) return false;
                vistos.add(chave);
                return true;
            });

        popularFiltrosLaterais(todosOsProdutos);
        aplicarFiltros();
    } catch (e) { 
        console.error("Erro ao carregar produtos:", e);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5 w-100">Erro ao comunicar com o servidor.</div>`;
    }
}

function popularFiltrosLaterais(produtos) {
    const catContainer = document.getElementById('category-filters');
    const mobileCatContainer = document.getElementById('mobile-category-filters');
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    const mobilePriceRange = document.getElementById('mobile-price-range');
    const mobilePriceValue = document.getElementById('mobile-price-value');

    const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    const categoryMarkup = categorias.length > 0
        ? categorias.map((cat, idx) => {
            const safeCategory = escaparHtml(cat);
            return `<div class="form-check mb-1">
                <input class="form-check-input filtro-categoria" type="checkbox" value="${safeCategory}" id="cat-${idx}">
                <label class="form-check-label" for="cat-${idx}">${safeCategory}</label>
            </div>`;
        }).join('')
        : '<span class="text-muted">Nenhuma categoria</span>';

    if (catContainer) {
        catContainer.innerHTML = categoryMarkup;

        catContainer.querySelectorAll('.filtro-categoria').forEach(cb => cb.addEventListener('change', aplicarFiltros));
    }
    if (mobileCatContainer) {
        mobileCatContainer.innerHTML = categorias.length > 0
            ? categorias.map((cat, idx) => {
                const safeCategory = escaparHtml(cat);
                return `<div class="form-check mb-1">
                    <input class="form-check-input mobile-filtro-categoria" type="checkbox" value="${safeCategory}" id="mobile-cat-${idx}">
                    <label class="form-check-label" for="mobile-cat-${idx}">${safeCategory}</label>
                </div>`;
            }).join('')
            : '<span class="text-muted">Nenhuma categoria</span>';
    }

    if (priceRange && produtos.length > 0) {
        const maiorPreco = Math.ceil(Math.max(...produtos.map(p => p.preco_final), 100) / 10) * 10;
        priceRange.max = maiorPreco;
        priceRange.value = maiorPreco;
        if (priceValue) priceValue.textContent = `R$ ${maiorPreco}`;
        if (mobilePriceRange) {
            mobilePriceRange.max = maiorPreco;
            mobilePriceRange.value = maiorPreco;
            if (mobilePriceValue) mobilePriceValue.textContent = `R$ ${maiorPreco}`;
        }
    }
}

function limparTodosFiltros() {
    document.querySelectorAll('.filtro-categoria').forEach(cb => cb.checked = false);
    const promoCb = document.getElementById('filtro-apenas-promocao');
    const estoqueCb = document.getElementById('filtro-apenas-estoque');
    const sortSelect = document.getElementById('sort-select');
    if (promoCb) promoCb.checked = false;
    if (estoqueCb) estoqueCb.checked = false;
    if (sortSelect) sortSelect.value = 'destaques';

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
    limparFiltrosMobile();

    aplicarFiltros();
}

function sincronizarFiltrosMobile() {
    const desktopSort = document.getElementById('sort-select');
    const mobileSort = document.getElementById('mobile-sort-select');
    if (desktopSort && mobileSort) mobileSort.value = desktopSort.value;

    const promo = document.getElementById('filtro-apenas-promocao');
    const mobilePromo = document.getElementById('mobile-filtro-apenas-promocao');
    if (promo && mobilePromo) mobilePromo.checked = promo.checked;

    const stock = document.getElementById('filtro-apenas-estoque');
    const mobileStock = document.getElementById('mobile-filtro-apenas-estoque');
    if (stock && mobileStock) mobileStock.checked = stock.checked;

    const selectedCategories = new Set(
        Array.from(document.querySelectorAll('#category-filters .filtro-categoria:checked')).map(input => input.value)
    );
    document.querySelectorAll('#mobile-category-filters .mobile-filtro-categoria').forEach(input => {
        input.checked = selectedCategories.has(input.value);
    });

    const price = document.getElementById('price-range');
    const mobilePrice = document.getElementById('mobile-price-range');
    const mobileValue = document.getElementById('mobile-price-value');
    if (price && mobilePrice) {
        mobilePrice.max = price.max;
        mobilePrice.value = price.value;
        if (mobileValue) mobileValue.textContent = `R$ ${mobilePrice.value}`;
    }
}

function aplicarFiltrosMobile() {
    const desktopSort = document.getElementById('sort-select');
    const mobileSort = document.getElementById('mobile-sort-select');
    if (desktopSort && mobileSort) desktopSort.value = mobileSort.value;

    const promo = document.getElementById('filtro-apenas-promocao');
    const mobilePromo = document.getElementById('mobile-filtro-apenas-promocao');
    if (promo && mobilePromo) promo.checked = mobilePromo.checked;

    const stock = document.getElementById('filtro-apenas-estoque');
    const mobileStock = document.getElementById('mobile-filtro-apenas-estoque');
    if (stock && mobileStock) stock.checked = mobileStock.checked;

    const selectedCategories = new Set(
        Array.from(document.querySelectorAll('#mobile-category-filters .mobile-filtro-categoria:checked')).map(input => input.value)
    );
    document.querySelectorAll('#category-filters .filtro-categoria').forEach(input => {
        input.checked = selectedCategories.has(input.value);
    });

    const price = document.getElementById('price-range');
    const mobilePrice = document.getElementById('mobile-price-range');
    const priceValue = document.getElementById('price-value');
    if (price && mobilePrice) {
        price.value = mobilePrice.value;
        if (priceValue) priceValue.textContent = `R$ ${price.value}`;
    }
}

function limparFiltrosMobile() {
    const mobilePromo = document.getElementById('mobile-filtro-apenas-promocao');
    const mobileStock = document.getElementById('mobile-filtro-apenas-estoque');
    const mobileSort = document.getElementById('mobile-sort-select');
    const mobilePrice = document.getElementById('mobile-price-range');
    const mobilePriceValue = document.getElementById('mobile-price-value');
    if (mobilePromo) mobilePromo.checked = false;
    if (mobileStock) mobileStock.checked = false;
    if (mobileSort) mobileSort.value = 'destaques';
    document.querySelectorAll('.mobile-filtro-categoria').forEach(input => input.checked = false);
    if (mobilePrice) {
        mobilePrice.value = mobilePrice.max;
        if (mobilePriceValue) mobilePriceValue.textContent = `R$ ${mobilePrice.max}`;
    }
}

function escaparHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

// 2. RENDERIZAÇÃO DA VITRINE (5 COLUNAS NO DESKTOP)
function renderizarVitrine(produtos) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');
    if (!container) return;
    
    if (resultsCount) resultsCount.textContent = `${produtos.length} produto(s) encontrado(s)`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 w-100">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 fw-bold text-muted">Nenhum produto encontrado com esses filtros.</h5>
            </div>`;
        return;
    }

    container.innerHTML = produtos.map(p => {
        const id = p.id_produto ?? p.id;
        const descontoPct = p.tem_promocao
            ? Math.round(((p.preco_original - p.preco_final) / p.preco_original) * 100)
            : 0;

        const precoHtml = p.tem_promocao
            ? `<div class="text-start">
                   <small class="text-muted text-decoration-line-through d-block" style="font-size: 0.72rem;">R$ ${p.preco_original.toFixed(2).replace('.', ',')}</small>
                   <span class="fw-bold" style="color: var(--brand-pink); font-size: 0.95rem;">R$ ${p.preco_final.toFixed(2).replace('.', ',')}</span>
               </div>`
            : `<span class="fw-bold" style="color: var(--brand-pink); font-size: 0.95rem;">R$ ${p.preco_final.toFixed(2).replace('.', ',')}</span>`;

        return `
        <div class="col d-flex">
            <div class="product-card shadow-sm" onclick="abrirModalProduto('${id}')">
                <div class="img-container">
                    ${p.tem_promocao ? `<span class="badge-promo">-${descontoPct}%</span>` : ''}
                    <img src="${p.url_imagem || LOGO_FALLBACK}" alt="${p.nome_produto}" class="product-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}'">
                </div>
                <div class="card-body border-top">
                    <div>
                        <span class="badge bg-light text-secondary mb-1 border" style="font-size: 0.7rem;">${p.categoria}</span>
                        <h6 class="fw-bold text-dark mb-2 product-title" title="${p.nome_produto}">${p.nome_produto}</h6>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                        ${precoHtml}
                        <span class="badge bg-dark text-white rounded-pill" style="font-size: 0.7rem;"><i class="bi bi-geo-alt"></i> Lojas</span>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// 3. FILTROS COMBINADOS + ORDENAÇÃO DE VENDAS
function aplicarFiltros() {
    const categoriasSelecionadas = Array.from(document.querySelectorAll('.filtro-categoria:checked')).map(cb => cb.value);
    const apenasPromocao = document.getElementById('filtro-apenas-promocao')?.checked || false;
    const apenasEstoque = document.getElementById('filtro-apenas-estoque')?.checked || false;
    const ordenacao = document.getElementById('sort-select')?.value || 'destaques';
    const priceRange = document.getElementById('price-range');
    const precoMaximo = priceRange ? parseFloat(priceRange.value) : Infinity;
    let filtrados = todosOsProdutos.filter(p => {
        const passaTexto = !normalizarTexto(termoBuscaAtual) || produtoCorrespondeBusca(p, termoBuscaAtual);
        const passaCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.categoria);
        const passaPreco = p.preco_final <= precoMaximo;
        const passaPromo = !apenasPromocao || p.tem_promocao;
        const passaEstoque = !apenasEstoque || (p.quantidade_estoque ?? 0) > 0;

        return passaTexto && passaCategoria && passaPreco && passaPromo && passaEstoque;
    });

    // Ordenação de vendas
    switch (ordenacao) {
        case 'menor_preco':
            filtrados.sort((a, b) => a.preco_final - b.preco_final);
            break;
        case 'maior_preco':
            filtrados.sort((a, b) => b.preco_final - a.preco_final);
            break;
        case 'ofertas':
            filtrados.sort((a, b) => (b.preco_original - b.preco_final) - (a.preco_original - a.preco_final));
            break;
        case 'az':
            filtrados.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
            break;
        default: // 'destaques' -> prioriza em estoque e mais vendidos
            filtrados.sort((a, b) => (b.quantidade_estoque || 0) - (a.quantidade_estoque || 0));
            break;
    }

    renderizarVitrine(filtrados);
}

// 4. MODAL + CONSULTA DE ESTOQUE NAS LOJAS FÍSICAS
window.abrirModalProduto = async function(idProduto) {
    produtoAtualModal = todosOsProdutos.find(p => String(p.id_produto ?? p.id) === String(idProduto));
    if (!produtoAtualModal) return;

    const modalImg = document.getElementById('modal-img');
    modalImg.setAttribute('referrerpolicy', 'no-referrer');
    modalImg.src = produtoAtualModal.url_imagem || LOGO_FALLBACK;

    document.getElementById('modal-codigo').textContent = produtoAtualModal.id_produto ?? produtoAtualModal.id ?? '--';
    document.getElementById('modal-categoria').textContent = produtoAtualModal.categoria.toUpperCase();
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto;
    document.getElementById('modal-marca').textContent = produtoAtualModal.marca;

    const precoBox = document.getElementById('modal-preco-box');
    precoBox.innerHTML = produtoAtualModal.tem_promocao
        ? `<span class="text-muted text-decoration-line-through fs-6 me-2">R$ ${produtoAtualModal.preco_original.toFixed(2).replace('.', ',')}</span>
           <span class="fs-3 fw-bold" style="color: var(--brand-pink);">R$ ${produtoAtualModal.preco_final.toFixed(2).replace('.', ',')}</span>`
        : `<span class="fs-3 fw-bold" style="color: var(--brand-pink);">R$ ${produtoAtualModal.preco_final.toFixed(2).replace('.', ',')}</span>`;

    document.getElementById('modal-descricao').textContent = produtoAtualModal.descricao || 'Sem descrição adicional cadastrada para este item.';

    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();

    // Consulta disponibilidade nas unidades físicas (/api/produtos/<id>/estoque)
    const storeList = document.getElementById('modal-store-list');
    if (storeList) {
        storeList.innerHTML = '<li><span class="spinner-border spinner-border-sm text-secondary"></span> Verificando unidades...</li>';
        try {
            const res = await fetch(`${BUSCA_API_URL}/api/produtos/${idProduto}/estoque`);
            const lojas = res.ok ? await res.json() : [];

            if (Array.isArray(lojas) && lojas.length > 0) {
                storeList.innerHTML = lojas.map(l => `
                    <li class="store-item p-2 mb-2 shadow-sm d-flex justify-content-between align-items-center">
                        <span><strong><i class="bi bi-shop me-1"></i>${l.nome_loja}</strong></span>
                        ${l.quantidade > 0
                            ? `<span class="badge bg-success rounded-pill">${l.quantidade} un. disponíveis</span>`
                            : `<span class="badge bg-secondary rounded-pill">Esgotado nesta unidade</span>`}
                    </li>
                `).join('');
            } else {
                const qtd = produtoAtualModal.quantidade_estoque ?? 0;
                storeList.innerHTML = qtd > 0
                    ? `<li class="store-item p-2 mb-2 shadow-sm d-flex justify-content-between align-items-center">
                           <span><strong>São Caetano do Sul (Matriz)</strong></span>
                           <span class="badge bg-success rounded-pill">${qtd} un. disponíveis</span>
                       </li>`
                    : `<li class="text-muted small">Indisponível no momento. Consulte a recepção para encomenda.</li>`;
            }
        } catch (err) {
            console.error("Erro ao consultar estoque:", err);
        }
    }
};