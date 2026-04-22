// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) { return 'Consulte'; }
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 2. FUNÇÃO PRINCIPAL DA BUSCA
async function inicializarBusca() {
    const urlParams = new URLSearchParams(window.location.search);
    const termoBusca = urlParams.get('q') || '';
    
    const displayTermo = document.getElementById('search-term-display');
    if (displayTermo) displayTermo.textContent = termoBusca ? `"${termoBusca}"` : 'Todos os Produtos';
    
    const searchInputBar = document.getElementById('search-input-bar');
    if(searchInputBar) searchInputBar.value = termoBusca;

    const container = document.getElementById('search-results-container');

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`); 
        
        // CORREÇÃO: Verifica se o servidor respondeu OK antes de tentar ler o JSON
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const produtos = await response.json();

        // Lógica de Filtragem (Busca pelo termo no nome, marca ou descrição)
        let resultadosFiltrados = produtos;
        
        if (termoBusca.trim() !== '') {
            const termoLower = termoBusca.toLowerCase();
            resultadosFiltrados = produtos.filter(p => 
                (p.nome_produto && p.nome_produto.toLowerCase().includes(termoLower)) ||
                (p.descricao && p.descricao.toLowerCase().includes(termoLower)) ||
                (p.marca && p.marca.toLowerCase().includes(termoLower)) ||
                (p.tipo_produto && p.tipo_produto.toLowerCase().includes(termoLower))
            );
        }

        // Renderiza na tela
        renderizarProdutos(resultadosFiltrados, container);
        gerarFiltrosLaterais(resultadosFiltrados);

        // Atualiza o contador
        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = `${resultadosFiltrados.length} ${resultadosFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
        }

    } catch (error) {
        console.error('Erro na busca:', error);
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
                    <h4 class="mt-3 fw-bold">Não conseguimos carregar os produtos.</h4>
                    <p class="text-muted">Verifique a conexão com o servidor ou tente atualizar a página.</p>
                </div>
            `;
        }
    }
}

// 3. RENDERIZAR OS CARDS DOS RESULTADOS
function renderizarProdutos(lista, container) {
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search mb-3" style="font-size: 3rem; color: #ccc;"></i>
                <h3 class="text-muted fw-bold">Nenhum resultado encontrado.</h3>
                <p>Tente buscar por palavras mais genéricas como "Ração", "Brinquedo", etc.</p>
                <a href="produtos.html" class="btn btn-outline-secondary rounded-pill mt-2">Ver todo o catálogo</a>
            </div>`;
        return;
    }

    container.innerHTML = lista.map(p => {
        let imageUrl = p.url_imagem;
        if (imageUrl && !imageUrl.startsWith('http')) { imageUrl = `img/${p.url_imagem}`; }
        if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/logo_pequena4.png'; }

        const precoAtual = p.preco_promocional && parseFloat(p.preco_promocional) < parseFloat(p.preco) 
            ? parseFloat(p.preco_promocional) 
            : parseFloat(p.preco);

        return `
        <div class="col">
            <div class="card h-100 product-card border-0 shadow-sm overflow-hidden">
                <div class="card-img-container bg-white position-relative">
                    <img src="${imageUrl}" 
                         class="card-img-top p-3" 
                         alt="${p.nome_produto}"
                         style="height: 180px; object-fit: contain;"
                         onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                    ${p.quantidade_estoque == 0 ? '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Esgotado</span>' : ''}
                </div>
                <div class="card-body d-flex flex-column bg-light text-center border-top">
                    <h5 class="card-title text-dark mb-2 fw-bold" style="font-size: 1rem;">${p.nome_produto}</h5>
                    <p class="text-muted small mb-3 flex-grow-1">${p.marca || 'Sem marca'}</p>
                    <div class="mt-auto">
                        <p class="card-text fs-5 fw-bold mb-3" style="color: #FE8697">${formatPrice(precoAtual)}</p>
                        <a href="produto_detalhe.html?id=${p.id_produto || p.id}" class="btn btn-brand w-100 py-2 rounded-pill text-white fw-bold" style="background-color: #FE8697;">
                            Ver Detalhes
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// 4. GERAR FILTROS LATERAIS
function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.tipo_produto))].filter(Boolean);
    const marcas = [...new Set(produtos.map(p => p.marca))].filter(Boolean);

    const catContainer = document.getElementById('category-filters');
    if(catContainer) {
        catContainer.innerHTML = categorias.map(c => `
            <div class="form-check mb-2">
                <input class="form-check-input filter-check" type="checkbox" value="${c}" id="cat-${c.replace(/\s+/g, '')}">
                <label class="form-check-label small text-muted fw-bold" for="cat-${c.replace(/\s+/g, '')}">${c}</label>
            </div>
        `).join('') || '<p class="small text-muted">Sem categorias</p>';
    }

    const brandContainer = document.getElementById('brand-filters');
    if(brandContainer) {
        brandContainer.innerHTML = marcas.map(m => `
            <div class="form-check mb-2">
                <input class="form-check-input filter-check" type="checkbox" value="${m}" id="brand-${m.replace(/\s+/g, '')}">
                <label class="form-check-label small text-muted fw-bold" for="brand-${m.replace(/\s+/g, '')}">${m}</label>
            </div>
        `).join('') || '<p class="small text-muted">Sem marcas</p>';
    }
}

document.addEventListener('DOMContentLoaded', inicializarBusca);