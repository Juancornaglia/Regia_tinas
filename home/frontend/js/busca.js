/**
 * js/busca.js - Lógica de Pesquisa e Filtros da Loja
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosProdutos = [];

document.addEventListener('DOMContentLoaded', async () => {
    atualizarBadgeCarrinho();

    // 1. Pega o termo de busca da URL
    const urlParams = new URLSearchParams(window.location.search);
    const termoBusca = urlParams.get('q') || '';
    
    document.getElementById('search-term-display').innerText = termoBusca ? `"${termoBusca}"` : 'Todos os Produtos';
    if (termoBusca) {
        document.getElementById('search-input-bar').value = termoBusca;
    }

    // 2. Busca os produtos no backend
    await buscarProdutos(termoBusca);
});

async function buscarProdutos(termo) {
    const container = document.getElementById('search-results-container');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const produtos = await response.json();
        
        // Filtra os produtos baseados no termo de busca (Nome, Marca ou Categoria)
        const termoLower = termo.toLowerCase().trim();
        todosProdutos = produtos.filter(p => 
            (p.nome_produto || "").toLowerCase().includes(termoLower) ||
            (p.marca || "").toLowerCase().includes(termoLower) ||
            (p.tipo_produto || "").toLowerCase().includes(termoLower)
        );

        gerarFiltrosLaterais(todosProdutos);
        aplicarFiltros(); // Renderiza os produtos na tela
        
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        container.innerHTML = '<div class="col-12 text-center text-danger py-5"><h5>Erro ao carregar os produtos. Tente novamente.</h5></div>';
    }
}

// --- RENDERIZAÇÃO E FILTROS ---

function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.tipo_produto).filter(Boolean))];
    const marcas = [...new Set(produtos.map(p => p.marca).filter(Boolean))];

    const catContainer = document.getElementById('category-filters');
    const marcaContainer = document.getElementById('brand-filters');

    catContainer.innerHTML = categorias.map(c => `
        <div class="form-check mb-2">
            <input class="form-check-input filter-checkbox" type="checkbox" value="${c}" data-filter-type="categoria" id="cat-${c}">
            <label class="form-check-label text-muted small" for="cat-${c}">${c}</label>
        </div>
    `).join('') || '<p class="small text-muted">Sem categorias</p>';

    marcaContainer.innerHTML = marcas.map(m => `
        <div class="form-check mb-2">
            <input class="form-check-input filter-checkbox" type="checkbox" value="${m}" data-filter-type="marca" id="mar-${m}">
            <label class="form-check-label text-muted small" for="mar-${m}">${m}</label>
        </div>
    `).join('') || '<p class="small text-muted">Sem marcas</p>';

    // Adiciona os eventos de clique para refiltrar automaticamente
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.addEventListener('change', aplicarFiltros);
    });

    document.getElementById('apply-price-filter').addEventListener('click', aplicarFiltros);
}

function aplicarFiltros() {
    const catSelecionadas = Array.from(document.querySelectorAll('input[data-filter-type="categoria"]:checked')).map(cb => cb.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('input[data-filter-type="marca"]:checked')).map(cb => cb.value);
    const precoMin = parseFloat(document.getElementById('price-min').value) || 0;
    const precoMax = parseFloat(document.getElementById('price-max').value) || Infinity;

    const filtrados = todosProdutos.filter(p => {
        const precoAtual = parseFloat(p.preco_promocional || p.preco);
        const passaCategoria = catSelecionadas.length === 0 || catSelecionadas.includes(p.tipo_produto);
        const passaMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);
        const passaPreco = precoAtual >= precoMin && precoAtual <= precoMax;

        return passaCategoria && passaMarca && passaPreco;
    });

    renderizarProdutos(filtrados);
}

function renderizarProdutos(produtos) {
    const container = document.getElementById('search-results-container');
    document.getElementById('results-count').innerText = `${produtos.length} produto(s) encontrado(s)`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-emoji-frown display-1 text-muted opacity-50"></i>
                <h4 class="mt-3 text-muted">Poxa, não encontramos nada com esses filtros.</h4>
                <button class="btn btn-outline-secondary mt-3 rounded-pill" onclick="window.location.href='busca.html'">Limpar Filtros</button>
            </div>`;
        return;
    }

    container.innerHTML = produtos.map(p => {
        const precoReal = parseFloat(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const temPromo = p.preco_promocional && parseFloat(p.preco_promocional) < parseFloat(p.preco);
        const precoPromo = temPromo ? parseFloat(p.preco_promocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

        return `
        <div class="col">
            <div class="card product-card h-100">
                <div class="card-img-container position-relative">
                    ${temPromo ? '<span class="badge bg-danger position-absolute top-0 start-0 m-3 shadow-sm">OFERTA</span>' : ''}
                    <img src="${p.url_imagem || 'img/produto_placeholder.png'}" class="card-img-top" alt="${p.nome_produto}" onerror="this.src='https://via.placeholder.com/300x300?text=Sem+Foto'">
                </div>
                <div class="card-body d-flex flex-column">
                    <small class="text-muted text-uppercase mb-1" style="font-size: 0.75rem;">${p.marca || 'Regia & Tinas'}</small>
                    <h5 class="card-title text-dark">${p.nome_produto}</h5>
                    
                    <div class="mt-auto pt-3 border-top">
                        ${temPromo 
                            ? `<small class="text-decoration-line-through text-muted d-block">${precoReal}</small>
                               <span class="fs-5 fw-bold" style="color: var(--chateau-pink);">${precoPromo}</span>` 
                            : `<span class="fs-5 fw-bold text-dark">${precoReal}</span>`
                        }
                    </div>
                    <button class="btn btn-custom w-100 mt-3" onclick="adicionarAoCarrinho('${p.id_produto}', '${p.nome_produto}', ${p.preco_promocional || p.preco})">
                        <i class="bi bi-cart-plus me-2"></i>Comprar
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// --- CARRINHO BÁSICO ---

window.adicionarAoCarrinho = (id, nome, preco) => {
    let carrinho = JSON.parse(localStorage.getItem('carrinho_regia')) || [];
    
    // Verifica se já tem no carrinho para somar a quantidade
    const index = carrinho.findIndex(item => item.id === id);
    if (index > -1) {
        carrinho[index].quantidade += 1;
    } else {
        carrinho.push({ id, nome, preco, quantidade: 1 });
    }
    
    localStorage.setItem('carrinho_regia', JSON.stringify(carrinho));
    atualizarBadgeCarrinho();
    
    // Feedback visual rápido
    alert(`🐾 "${nome}" foi adicionado ao seu carrinho!`);
};

function atualizarBadgeCarrinho() {
    let carrinho = JSON.parse(localStorage.getItem('carrinho_regia')) || [];
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    
    // Cria ou atualiza a bolinha vermelha no ícone do carrinho
    const cartIcon = document.querySelector('.bi-cart3').parentElement;
    let badge = cartIcon.querySelector('.badge');
    
    if (!badge && totalItens > 0) {
        badge = document.createElement('span');
        badge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light';
        cartIcon.appendChild(badge);
    }
    
    if (badge) {
        badge.innerText = totalItens;
        badge.style.display = totalItens > 0 ? 'block' : 'none';
    }
}