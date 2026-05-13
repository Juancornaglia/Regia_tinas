/**
 * js/busca.js - Lógica específica para a página de resultados
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const termo = urlParams.get('q') || '';
    document.getElementById('term-display').innerText = termo ? `"${termo}"` : "Todos os produtos";

    await carregarBusca(termo);
    configurarFiltroPreco();
});

async function carregarBusca(termo) {
    const container = document.getElementById('search-results');
    const termoLower = termo.toLowerCase();

    try {
        // Aproveitamos a lista que já existe ou buscamos do banco
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const produtos = await response.json();

        const filtrados = produtos.filter(p => 
            p.nome_produto.toLowerCase().includes(termoLower) || 
            p.marca.toLowerCase().includes(termoLower) ||
            p.tipo_produto.toLowerCase().includes(termoLower)
        );

        document.getElementById('results-count').innerText = `${filtrados.length} itens encontrados`;

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h5>Nenhum pet-produto encontrado. 🐾</h5></div>';
            return;
        }

        // Renderiza os cards (usando a mesma lógica do catalogo)
        container.innerHTML = filtrados.map(p => `
            <div class="col">
                <div class="product-card shadow-sm" onclick="abrirDetalhesProduto('${p.id_produto || p.id}')">
                    <div class="img-container">
                        <img src="${p.url_imagem}" class="product-img" onerror="this.src='../img/logo_pequena4.png'">
                    </div>
                    <div class="card-body">
                        <h6 class="fw-bold text-dark mb-1 text-truncate">${p.nome_produto}</h6>
                        <div class="price-tag">R$ ${p.preco}</div>
                    </div>
                </div>
            </div>
        `).join('');

        gerarFiltrosLaterais(produtos); // Gera filtros baseados em TODOS para o cara poder navegar

    } catch (e) {
        container.innerHTML = '<p class="text-danger">Erro ao carregar busca.</p>';
    }
}

function configurarFiltroPreco() {
    const range = document.getElementById('price-range');
    const valueDisp = document.getElementById('price-value');
    range.addEventListener('input', (e) => {
        valueDisp.innerText = `R$ ${e.target.value}`;
        // Aqui você pode disparar uma função de refiltro local
    });
}

function gerarFiltrosLaterais(produtos) {
    const categorias = [...new Set(produtos.map(p => p.tipo_produto))];
    const marcas = [...new Set(produtos.map(p => p.marca))];

    document.getElementById('category-filters').innerHTML = categorias.map(c => `
        <div class="form-check"><input class="form-check-input" type="checkbox" value="${c}"> <label class="form-check-label">${c}</label></div>
    `).join('');

    document.getElementById('brand-filters').innerHTML = marcas.map(m => `
        <div class="form-check"><input class="form-check-input" type="checkbox" value="${m}"> <label class="form-check-label">${m}</label></div>
    `).join('');
}