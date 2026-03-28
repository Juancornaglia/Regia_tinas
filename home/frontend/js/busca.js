// Configuração da URL do seu servidor Flask
// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

/**
 * Função principal que inicia ao carregar a página
 */
async function inicializarBusca() {
    const urlParams = new URLSearchParams(window.location.search);
    const termoBusca = urlParams.get('q') || '';
    
    // Atualiza o texto na tela
    const displayTermo = document.getElementById('search-term-display');
    if (displayTermo) displayTermo.textContent = termoBusca;

    try {
        // 1. Busca todos os produtos do Neon via API Python
        // Usamos a rota de produtos que você já tem no admin ou ecommerce
        const response = await fetch(`${API_URL}/produtos`); 
        const produtos = await response.json();

        if (!response.ok) throw new Error('Falha ao buscar produtos');

        // 2. Filtra os produtos com base no termo digitado
        const resultadosFiltrados = produtos.filter(p => 
            p.nome_produto.toLowerCase().includes(termoBusca.toLowerCase()) ||
            (p.descricao && p.descricao.toLowerCase().includes(termoBusca.toLowerCase())) ||
            (p.marca && p.marca.toLowerCase().includes(termoBusca.toLowerCase()))
        );

        // 3. Renderiza os cards na tela
        renderizarProdutos(resultadosFiltrados);

        // 4. Gera os filtros laterais dinamicamente
        gerarFiltrosLaterais(resultadosFiltrados);

        // 5. Atualiza o contador
        document.getElementById('results-count').textContent = 
            `${resultadosFiltrados.length} ${resultadosFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;

    } catch (error) {
        console.error('Erro na busca:', error);
        document.getElementById('search-results-container').innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
                <p class="mt-3">Não conseguimos carregar os produtos. Verifique se o servidor está rodando.</p>
            </div>
        `;
    }
}

/**
 * Cria o HTML dos cards de produto
 */
function renderizarProdutos(lista) {
    const container = document.getElementById('search-results-container');
    
    if (lista.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><h3>Nenhum resultado para sua pesquisa.</h3></div>`;
        return;
    }

    container.innerHTML = lista.map(p => {
        // Formatação de preço
        const precoOriginal = Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        return `
        <div class="col">
            <div class="card h-100 product-card border-0 shadow-sm">
                <div class="card-img-container">
                    <img src="${p.url_imagem || 'img/placeholder.png'}" 
                         class="card-img-top" 
                         alt="${p.nome_produto}"
                         onerror="this.src='img/placeholder.png'">
                </div>
                <div class="card-body d-flex flex-direction-column">
                    <h5 class="card-title text-dark">${p.nome_produto}</h5>
                    <div class="mt-auto">
                        <p class="card-text fs-5 fw-bold text-pink" style="color: #FE8697">${precoOriginal}</p>
                        <a href="produto_detalhe.html?id=${p.id_produto}" class="btn btn-custom w-100">
                            Ver Detalhes
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

/**
 * Extrai categorias e marcas dos produtos para criar os checkboxes de filtro
 */
function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.tipo_produto))].filter(Boolean);
    const marcas = [...new Set(produtos.map(p => p.marca))].filter(Boolean);

    // Preenche Categorias
    const catContainer = document.getElementById('category-filters');
    catContainer.innerHTML = categorias.map(c => `
        <div class="form-check">
            <input class="form-check-input filter-check" type="checkbox" value="${c}" id="cat-${c}">
            <label class="form-check-label small" for="cat-${c}">${c}</label>
        </div>
    `).join('') || '<p class="small text-muted">Sem categorias</p>';

    // Preenche Marcas
    const brandContainer = document.getElementById('brand-filters');
    brandContainer.innerHTML = marcas.map(m => `
        <div class="form-check">
            <input class="form-check-input filter-check" type="checkbox" value="${m}" id="brand-${m}">
            <label class="form-check-label small" for="brand-${m}">${m}</label>
        </div>
    `).join('') || '<p class="small text-muted">Sem marcas</p>';
    
    // Limpa o spinner do Tamanho
    document.getElementById('tamanho-filters').innerHTML = '<p class="small text-muted">Filtros automáticos ativados.</p>';
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', inicializarBusca);