
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = [];
let produtoAtualModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const termoBusca = urlParams.get('q') ? urlParams.get('q').toLowerCase() : '';

    const termDisplayContainer = document.getElementById('term-display-container');
    const termDisplay = document.getElementById('term-display');
    
    if (termoBusca) {
        if(termDisplayContainer) termDisplayContainer.style.display = 'block';
        if(termDisplay) termDisplay.textContent = urlParams.get('q');
    }

    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', (e) => {
            priceValue.textContent = `R$ ${e.target.value}`;
            aplicarFiltros();
        });
    }

    await carregarProdutos(termoBusca);
});

// --- 1. CARREGAMENTO DOS PRODUTOS --- //
async function carregarProdutos(termoBusca) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error('Falha ao carregar produtos');
        
        const produtos = await response.json();
        
        if (termoBusca) {
            todosOsProdutos = produtos.filter(p => 
                (p.nome_produto && p.nome_produto.toLowerCase().includes(termoBusca)) ||
                (p.descricao && p.descricao.toLowerCase().includes(termoBusca)) ||
                (p.marca && p.marca.toLowerCase().includes(termoBusca))
            );
        } else {
            todosOsProdutos = produtos; 
        }

        gerarFiltrosLaterais(todosOsProdutos);
        aplicarFiltros();

    } catch (error) {
        console.error("Erro na busca:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <i class="bi bi-exclamation-triangle fs-1"></i>
            <p class="mt-3 fw-bold">Erro ao carregar a vitrine. Tenta novamente mais tarde.</p>
        </div>`;
        resultsCount.textContent = "0 produtos encontrados";
    }
}

// --- 2. FILTROS --- //
function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
    const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))];
    
    const catContainer = document.getElementById('category-filters');
    const brandContainer = document.getElementById('brand-filters');
    const priceRange = document.getElementById('price-range');

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
    
    if(resultsCount) resultsCount.textContent = `${produtos.length} produto(s) no catálogo`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 fw-bold text-muted">Nenhum produto encontrado.</h5>
                <p class="text-muted small">Tente ajustar os filtros na barra lateral.</p>
            </div>`;
        return;
    }

    // Nota: Removido o botão de carrinho. Agora o card inteiro convida a ver as lojas.
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
                        <span class="price-tag fw-bold" style="color: var(--brand-pink);">R$ ${parseFloat(p.preco_venda).toFixed(2).replace('.', ',')}</span>
                        <span class="badge bg-dark text-white rounded-pill"><i class="bi bi-geo-alt"></i> Lojas</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 3. MODAL E LÓGICA DE LOJAS (MATRIZ EM DESTAQUE) --- //
window.abrirModalProduto = async function(idProduto) {
    produtoAtualModal = todosOsProdutos.find(p => p.id_produto === idProduto);
    if (!produtoAtualModal) return;

    document.getElementById('modal-img').src = produtoAtualModal.url_imagem || 'img/logo_pequena4.png';
    document.getElementById('modal-codigo').textContent = produtoAtualModal.id_produto;
    document.getElementById('modal-categoria').textContent = produtoAtualModal.categoria || 'Geral';
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto;
    document.getElementById('modal-marca').textContent = produtoAtualModal.marca || 'Não informada';
    document.getElementById('modal-preco-box').textContent = `R$ ${parseFloat(produtoAtualModal.preco_venda).toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-descricao').textContent = produtoAtualModal.descricao || 'Nenhuma descrição disponível para este produto.';

    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();

    verificarEstoque(idProduto);
};

async function verificarEstoque(idProduto) {
    const storeList = document.getElementById('modal-store-list');
    storeList.innerHTML = `<li><span class="spinner-border spinner-border-sm text-secondary"></span> Buscando no sistema...</li>`;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/produtos/${idProduto}/estoque`);
        if (!res.ok) throw new Error();
        
        const estoque = await res.json();
        if (estoque.length === 0) {
            storeList.innerHTML = `<li class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i> Produto temporariamente esgotado em todas as lojas.</li>`;
            return;
        }

        // Renderiza a lista de lojas, destacando a principal
        storeList.innerHTML = estoque.map(e => {
            // Verifica se o nome da loja é exatamente a principal (ou ID 1 se for Mooca)
            const nomeLoja = e.nome_loja.trim();
            const isMatriz = nomeLoja.toLowerCase() === "regia & tinas care" || nomeLoja.toLowerCase() === "mooca";
            
            const destaqueHtml = isMatriz 
                ? `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-star-fill"></i> Matriz</span>` 
                : '';

            return `
            <li class="store-item p-3 mb-2 shadow-sm d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1 text-dark fw-bold">${nomeLoja} ${destaqueHtml}</h6>
                    <small class="text-muted"><i class="bi bi-box-seam me-1"></i> ${e.quantidade} unidades disponíveis</small>
                </div>
            </li>`;
        }).join('');

    } catch (error) {
        storeList.innerHTML = `<li class="text-muted"><i class="bi bi-info-circle me-1"></i> Sistema de estoque offline no momento. Tente novamente ou ligue para a loja.</li>`;
    }
}

// --- 4. FAVORITOS (CONECTADO AO BANCO) --- //
window.toggleFavorito = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    
    // Verifica se está logado
    if (!userId) {
        alert("Ops! Faça login para salvar seus favoritos. 🐾");
        window.location.href = '../usuario/login.html';
        return;
    }

    const icone = document.getElementById('modal-fav-icon');
    const isAdding = icone.classList.contains('bi-heart'); // Verifica se vai adicionar

    try {
        if (isAdding) {
            // ENVIA PARA O BANCO
            const response = await fetch(`${API_BASE_URL}/api/favoritos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: userId,
                    id_produto: idProduto
                })
            });

            if (response.ok) {
                icone.classList.remove('bi-heart');
                icone.classList.add('bi-heart-fill');
                alert("💖 Produto salvo nos favoritos!");
            }
        } else {
            // REMOVE DO BANCO
            const response = await fetch(`${API_BASE_URL}/api/favoritos/remover`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: userId,
                    id_produto: idProduto
                })
            });

            if (response.ok) {
                icone.classList.remove('bi-heart-fill');
                icone.classList.add('bi-heart');
            }
        }
    } catch (error) {
        console.error("Erro ao favoritar:", error);
    }
};