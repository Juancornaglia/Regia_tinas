
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

// --- 1. CARREGAMENTO DOS PRODUTOS (COM DEBUG) --- //
async function carregarProdutos(termoBusca) {
    const container = document.getElementById('search-results');
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error('API não respondeu');
        
        const produtos = await response.json();
        console.log("DEBUG: Produtos recebidos da API:", produtos); // Olhe isso no Console!
        
        todosOsProdutos = produtos; 
        aplicarFiltros();
    } catch (error) {
        console.error("Erro na busca:", error);
    }
}

// --- 2. ESTOQUE (COM DEBUG) --- //
async function verificarEstoque(idProduto) {
    const storeList = document.getElementById('modal-store-list');
    storeList.innerHTML = `<li>Buscando...</li>`;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/produtos/${idProduto}/estoque`);
        const estoque = await res.json();
        
        // ESTA LINHA VAI TE SALVAR:
        console.log("DEBUG: O que o servidor enviou de estoque?", estoque); 

        if (estoque.length === 0) {
            storeList.innerHTML = `<li class="text-danger">Produto esgotado.</li>`;
            return;
        }

        storeList.innerHTML = estoque.map(e => {
            // VERIFIQUE SE O NOME DA COLUNA NO BANCO É 'nome_loja' OU 'nome'
            // O log acima vai te dizer exatamente qual é a chave correta
            return `<li class="p-2 border-bottom">${e.nome_loja || 'Loja'}: ${e.quantidade || 0} unid.</li>`;
        }).join('');
    } catch (error) {
        storeList.innerHTML = `<li class="text-muted">Sistema indisponível.</li>`;
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

    container.innerHTML = produtos.map(p => `
        <div class="col">
            <div class="product-card shadow-sm border position-relative">
                
                <button class="btn btn-light rounded-circle btn-favorite position-absolute top-0 end-0 m-2" 
                        onclick="event.stopPropagation(); toggleFavorito(${p.id_produto})" 
                        data-product-id="${p.id_produto}"
                        style="z-index: 10;">
                    <i class="bi bi-heart text-danger"></i>
                </button>

                <div onclick="abrirModalProduto(${p.id_produto})">
                    <div class="img-container">
                        <img src="${p.url_imagem || 'img/logo_pequena4.png'}" alt="${p.nome_produto}" class="product-img" onerror="this.src='img/logo_pequena4.png'">
                    </div>
                    <div class="card-body border-top">
                        <span class="badge bg-light text-secondary mb-2">${p.categoria || 'Geral'}</span>
                        <h6 class="fw-bold text-dark mb-1 text-truncate" title="${p.nome_produto}">${p.nome_produto}</h6>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            // Procure por esta linha dentro do .map() e altere para:
                        <span class="price-tag fw-bold" style="color: var(--brand-pink);">R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}<span>
                            <span class="badge bg-dark text-white rounded-pill"><i class="bi bi-geo-alt"></i> Lojas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
// --- Adicione ou substitua no seu js/busca.js ---

window.toggleFavorito = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    
    if (!userId) {
        alert("Ops! Faça login para salvar seus favoritos. 🐾");
        window.location.href = '../usuario/login.html';
        return;
    }

    // Seleciona o ícone pelo ID no modal (garanta que o ID seja esse no HTML)
    const icone = document.getElementById('modal-fav-icon');
    
    // Verifica se já está favoritado (pela classe do ícone)
    const isAdding = icone.classList.contains('bi-heart'); 

    try {
        const endpoint = isAdding ? `${API_BASE_URL}/api/favoritos` : `${API_BASE_URL}/api/favoritos/remover`;
        const method = isAdding ? 'POST' : 'DELETE';

        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario: userId,
                id_produto: idProduto
            })
        });

        if (response.ok) {
            if (isAdding) {
                icone.classList.remove('bi-heart');
                icone.classList.add('bi-heart-fill');
                alert("💖 Produto salvo nos favoritos!");
            } else {
                icone.classList.remove('bi-heart-fill');
                icone.classList.add('bi-heart');
                alert("💔 Produto removido dos favoritos.");
            }
        } else {
            alert("Erro ao atualizar favorito. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro ao favoritar:", error);
    }
};

// --- 3. MODAL E LÓGICA DE LOJAS (MATRIZ EM DESTAQUE) --- //
window.abrirModalProduto = async function(idProduto) {
    // 1. Localiza o produto no array global
    produtoAtualModal = todosOsProdutos.find(p => p.id_produto === idProduto);
    if (!produtoAtualModal) return;

    // 2. Preenche todos os campos do Modal
    document.getElementById('modal-img').src = produtoAtualModal.url_imagem || 'img/logo_pequena4.png';
    document.getElementById('modal-codigo').textContent = produtoAtualModal.id_produto;
    document.getElementById('modal-categoria').textContent = produtoAtualModal.categoria || 'Geral';
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto;
    document.getElementById('modal-marca').textContent = produtoAtualModal.marca || 'Não informada';
    document.getElementById('modal-descricao').textContent = produtoAtualModal.descricao || 'Nenhuma descrição disponível para este produto.';

    // 3. Aplica a correção do Preço (Prioriza 'preco', depois 'preco_venda', se não existir usa 0)
    const precoValido = parseFloat(produtoAtualModal.preco || produtoAtualModal.preco_venda || 0);
    document.getElementById('modal-preco-box').textContent = `R$ ${precoValido.toFixed(2).replace('.', ',')}`;

    // 4. Abre o Modal
    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();

    // 5. Busca o estoque atualizado
    verificarEstoque(idProduto);
};


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
window.toggleFavorito = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        alert("Ops! Faça login para salvar seus favoritos. 🐾");
        return;
    }

    try {
        // Envia o id como número
        const response = await fetch(`${API_BASE_URL}/api/favoritos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario: userId,
                id_produto: parseInt(idProduto, 10)
            })
        });

        if (response.ok) {
            alert("💖 Produto salvo nos favoritos!");
        } else {
            alert("Erro ao salvar favorito.");
        }
    } catch (error) {
        console.error("Erro ao favoritar:", error);
    }
};