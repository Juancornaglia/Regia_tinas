/**
 * js/busca.js - Cérebro Unificado (Catálogo + Busca + Detalhes do Produto)
 * Controla a listagem completa e os filtros sem necessidade de ficheiros duplicados.
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = [];
let produtoAtualModal = null; // Guarda o produto que está aberto no modal

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const termoBusca = urlParams.get('q') ? urlParams.get('q').toLowerCase() : '';

    // Atualiza o título se houver uma pesquisa
    const termDisplayContainer = document.getElementById('term-display-container');
    const termDisplay = document.getElementById('term-display');
    
    if (termoBusca) {
        if(termDisplayContainer) termDisplayContainer.style.display = 'block';
        if(termDisplay) termDisplay.textContent = urlParams.get('q');
    }

    // Configura o evento do filtro de preço em tempo real
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', (e) => {
            priceValue.textContent = `R$ ${e.target.value}`;
            aplicarFiltros();
        });
    }

    // Carrega os produtos do banco Neon
    await carregarProdutos(termoBusca);
});

// --- 1. BUSCA E RENDERIZAÇÃO PRINCIPAL --- //
async function carregarProdutos(termoBusca) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error('Falha ao carregar produtos');
        
        const produtos = await response.json();
        
        // Filtra inicialmente pela busca da URL (se existir)
        if (termoBusca) {
            todosOsProdutos = produtos.filter(p => 
                (p.nome_produto && p.nome_produto.toLowerCase().includes(termoBusca)) ||
                (p.descricao && p.descricao.toLowerCase().includes(termoBusca)) ||
                (p.marca && p.marca.toLowerCase().includes(termoBusca))
            );
        } else {
            todosOsProdutos = produtos; // Se não houver busca, é o catálogo completo
        }

        gerarFiltrosLaterais(todosOsProdutos);
        aplicarFiltros(); // Renderiza a tela

    } catch (error) {
        console.error("Erro na busca:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <i class="bi bi-exclamation-triangle fs-1"></i>
            <p class="mt-3 fw-bold">Erro ao carregar o catálogo. Tenta novamente mais tarde.</p>
        </div>`;
        resultsCount.textContent = "0 produtos encontrados";
    }
}

// --- 2. FILTROS LATERAIS DINÂMICOS --- //
function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
    const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))];
    
    const catContainer = document.getElementById('category-filters');
    const brandContainer = document.getElementById('brand-filters');
    const priceRange = document.getElementById('price-range');

    // Define o preço máximo dinamicamente com base nos produtos
    if (produtos.length > 0 && priceRange) {
        const maxPreco = Math.max(...produtos.map(p => parseFloat(p.preco_venda) || 0));
        priceRange.max = Math.ceil(maxPreco);
        priceRange.value = Math.ceil(maxPreco);
        document.getElementById('price-value').textContent = `R$ ${priceRange.value}`;
    }

    if (catContainer) {
        catContainer.innerHTML = categorias.map(c => `
            <div class="form-check mb-2">
                <input class="form-check-input filtro-categoria" type="checkbox" value="${c}" id="cat-${c}" onchange="aplicarFiltros()">
                <label class="form-check-label text-dark" for="cat-${c}">${c}</label>
            </div>
        `).join('');
    }

    if (brandContainer) {
        brandContainer.innerHTML = marcas.map(m => `
            <div class="form-check mb-2">
                <input class="form-check-input filtro-marca" type="checkbox" value="${m}" id="marca-${m}" onchange="aplicarFiltros()">
                <label class="form-check-label text-dark" for="marca-${m}">${m}</label>
            </div>
        `).join('');
    }
}

function aplicarFiltros() {
    const categoriasSelecionadas = Array.from(document.querySelectorAll('.filtro-categoria:checked')).map(cb => cb.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('.filtro-marca:checked')).map(cb => cb.value);
    const precoMaximo = document.getElementById('price-range') ? parseFloat(document.getElementById('price-range').value) : Infinity;

    const produtosFiltrados = todosOsProdutos.filter(p => {
        const preco = parseFloat(p.preco_venda) || 0;
        const passaCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.categoria);
        const passaMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);
        const passaPreco = preco <= precoMaximo;

        return passaCategoria && passaMarca && passaPreco;
    });

    renderizarVitrine(produtosFiltrados);
}

function renderizarVitrine(produtos) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');
    
    if(resultsCount) resultsCount.textContent = `${produtos.length} produto(s) encontrado(s)`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 fw-bold text-muted">Nenhum produto encontrado.</h5>
                <p class="text-muted small">Tenta ajustar os filtros na barra lateral.</p>
            </div>`;
        return;
    }

    container.innerHTML = produtos.map(p => `
        <div class="col">
            <div class="product-card shadow-sm border" onclick="abrirModalProduto(${p.id_produto})">
                <div class="img-container">
                    <img src="${p.url_imagem || 'img/logo_pequena4.png'}" alt="${p.nome_produto}" class="product-img" onerror="this.src='img/logo_pequena4.png'">
                </div>
                <div class="card-body border-top">
                    <span class="badge bg-light text-secondary mb-2">${p.categoria || 'Geral'}</span>
                    <h6 class="fw-bold text-dark mb-1 text-truncate" title="${p.nome_produto}">${p.nome_produto}</h6>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="price-tag">R$ ${parseFloat(p.preco_venda).toFixed(2).replace('.', ',')}</span>
                        <button class="btn btn-sm btn-brand rounded-circle"><i class="bi bi-bag-plus"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 3. LÓGICA DO MODAL DE DETALHES --- //
window.abrirModalProduto = async function(idProduto) {
    produtoAtualModal = todosOsProdutos.find(p => p.id_produto === idProduto);
    if (!produtoAtualModal) return;

    // Preenche os dados básicos no Modal HTML
    document.getElementById('modal-img').src = produtoAtualModal.url_imagem || 'img/logo_pequena4.png';
    document.getElementById('modal-codigo').textContent = produtoAtualModal.id_produto;
    document.getElementById('modal-categoria').textContent = produtoAtualModal.categoria || 'Geral';
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto;
    document.getElementById('modal-marca').textContent = produtoAtualModal.marca || 'Não informada';
    document.getElementById('modal-preco-box').textContent = `R$ ${parseFloat(produtoAtualModal.preco_venda).toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-descricao').textContent = produtoAtualModal.descricao || 'Nenhuma descrição disponível para este produto.';

    // Abre o modal do Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();

    // Busca o stock em tempo real
    verificarEstoque(idProduto);
};

async function verificarEstoque(idProduto) {
    const storeList = document.getElementById('modal-store-list');
    storeList.innerHTML = `<li><span class="spinner-border spinner-border-sm text-secondary"></span> Verificando unidades...</li>`;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/produtos/${idProduto}/estoque`);
        if (!res.ok) throw new Error();
        
        const estoque = await res.json();
        if (estoque.length === 0) {
            storeList.innerHTML = `<li class="text-danger"><i class="bi bi-x-circle me-1"></i> Produto esgotado no momento.</li>`;
            return;
        }

        storeList.innerHTML = estoque.map(e => 
            `<li class="mb-1"><i class="bi bi-check-circle-fill text-success me-1"></i> <b>${e.nome_loja}</b>: ${e.quantidade} unid.</li>`
        ).join('');

    } catch (error) {
        storeList.innerHTML = `<li class="text-muted"><i class="bi bi-info-circle me-1"></i> Indisponível para consulta online.</li>`;
    }
}

// --- 4. FUNÇÕES DE CARRINHO E FAVORITOS (ESCOPO GLOBAL) --- //
window.adicionarModalAoCarrinho = function() {
    if (!produtoAtualModal) return;
    
    // Recupera o carrinho do localStorage ou cria um array vazio
    let carrinho = JSON.parse(localStorage.getItem('carrinhoRegiaTinas')) || [];
    
    // Verifica se já existe
    const index = carrinho.findIndex(item => item.id_produto === produtoAtualModal.id_produto);
    
    if (index > -1) {
        carrinho[index].quantidade += 1;
    } else {
        carrinho.push({
            id_produto: produtoAtualModal.id_produto,
            nome: produtoAtualModal.nome_produto,
            preco: parseFloat(produtoAtualModal.preco_venda),
            imagem: produtoAtualModal.url_imagem,
            quantidade: 1
        });
    }

    localStorage.setItem('carrinhoRegiaTinas', JSON.stringify(carrinho));
    alert(`🛒 "${produtoAtualModal.nome_produto}" adicionado ao carrinho com sucesso!`);
    
    // Atualiza a bolinha vermelha se a função existir no menu
    if(typeof atualizarBadgeCarrinho === 'function') atualizarBadgeCarrinho();
};

window.toggleFavorito = function() {
    const icone = document.getElementById('modal-fav-icon');
    
    if (icone.classList.contains('bi-heart')) {
        icone.classList.remove('bi-heart');
        icone.classList.add('bi-heart-fill');
        // Aqui podes colocar a lógica de fetch POST para salvar nos favoritos do Neon DB
        console.log("Adicionado aos favoritos:", produtoAtualModal.id_produto);
    } else {
        icone.classList.remove('bi-heart-fill');
        icone.classList.add('bi-heart');
        // Aqui a lógica de DELETE para remover dos favoritos do Neon DB
        console.log("Removido dos favoritos:", produtoAtualModal.id_produto);
    }
};