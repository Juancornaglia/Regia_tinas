/**
 * js/busca.js - Motor Unificado de Busca e Catálogo
 * Corrigido: Removidas duplicidades e variáveis redeclaradas.
 */

// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = []; // Cache global

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idProduto = urlParams.get('id');
    const termo = urlParams.get('q') || '';

    if (idProduto) {
        await carregarDetalhesProduto(idProduto);
    } else {
        alternarModoVisualizacao('busca');
        const termDisplay = document.getElementById('term-display');
        if (termDisplay) termDisplay.innerText = termo ? `"${termo}"` : "Todos os produtos";
        await inicializarCatalogoEBusca(termo);
    }
});

// 3. FAVORITAR (PÚBLICO)
window.favoritarProduto = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        alert("Ops! Para salvar seus favoritos, você precisa fazer login.");
        window.location.href = 'usuario/login.html';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/favoritos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId, id_produto: idProduto })
        });
        if (response.ok) alert("💖 Produto salvo nos favoritos!");
    } catch (error) {
        console.error("Erro ao favoritar:", error);
    }
};

// 4. UTILS
function formatPrice(price) {
    const valor = parseFloat(price);
    return isNaN(valor) ? 'Consulte' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 5. MOTOR DE FILTRAGEM
async function inicializarCatalogoEBusca(termoInicial) {
    const container = document.getElementById('search-results');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted small">Carregando...</p></div>';

    try {
        let url = `${API_BASE_URL}/api/busca?q=${encodeURIComponent(termoInicial)}`;
        const cat = Array.from(document.querySelectorAll('#category-filters input:checked')).map(i => i.value);
        if (cat.length > 0) url += `&categoria=${cat.join(',')}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        
        todosOsProdutos = await response.json();
        
        gerarFiltrosLaterais(todosOsProdutos);
        configurarOuvintesDeFiltros();
        executarFiltragem();
    } catch (e) {
        console.error("Erro na busca:", e);
        container.innerHTML = '<div class="col-12 text-center py-5 text-danger">Erro ao carregar catálogo.</div>';
    }
}

function configurarOuvintesDeFiltros() {
    const range = document.getElementById('price-range');
    const valueDisp = document.getElementById('price-value');
    
    if (range && valueDisp) {
        range.addEventListener('input', (e) => {
            valueDisp.innerText = `R$ ${e.target.value}`;
            executarFiltragem();
        });
    }
    document.getElementById('category-filters')?.addEventListener('change', executarFiltragem);
    document.getElementById('brand-filters')?.addEventListener('change', executarFiltragem);
}

function executarFiltragem() {
    const container = document.getElementById('search-results');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const termoLower = (urlParams.get('q') || '').toLowerCase();
    const categoriasSelecionadas = Array.from(document.querySelectorAll('#category-filters input:checked')).map(i => i.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('#brand-filters input:checked')).map(i => i.value);
    const precoMaximo = document.getElementById('price-range') ? parseFloat(document.getElementById('price-range').value) : Infinity;

    const filtrados = todosOsProdutos.filter(p => {
        const nome = (p.nome_produto || '').toLowerCase();
        const marca = (p.marca || '').toLowerCase();
        const tipo = (p.tipo_produto || '').toLowerCase();
        
        const matchTermo = !termoLower || nome.includes(termoLower) || marca.includes(termoLower) || tipo.includes(termoLower);
        const matchCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.tipo_produto);
        const matchMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);
        const preco = parseFloat(p.preco_promocional || p.preco) || 0;
        
        return matchTermo && matchCategoria && matchMarca && preco <= precoMaximo;
    });

    container.innerHTML = filtrados.length > 0 ? filtrados.map(createProductCard).join('') : '<p class="text-center w-100">Nenhum pet-produto encontrado.</p>';
}

function createProductCard(p) {
    const id = p.id_produto || p.id;
    const nome = p.nome_produto || 'Produto';
    const preco = parseFloat(p.preco_promocional || p.preco);
    let img = p.url_imagem;
    if (img && !img.startsWith('http') && !img.startsWith('img/')) img = 'img/' + img;
    
    return `
        <div class="col-md-4 col-sm-6 mb-4">
            <div class="product-card p-3" onclick="window.location.href='busca.html?id=${id}'">
                <img src="${img || 'img/logo_pequena4.png'}" class="img-fluid" style="height: 150px; object-fit: contain;" onerror="this.src='img/logo_pequena4.png'">
                <h6 class="fw-bold mt-2">${nome}</h6>
                <p class="text-brand fw-bold">${formatPrice(preco)}</p>
            </div>
        </div>
    `;
}

async function carregarDetalhesProduto(id) {
    alternarModoVisualizacao('detalhe');
    // (Mantenha aqui a sua lógica de detalhe que já estava funcionando)
}

function alternarModoVisualizacao(modo) {
    const b = document.getElementById('secao-busca-catalogo');
    const d = document.getElementById('product-detail-container');
    if (modo === 'detalhe') { if(b) b.style.display='none'; if(d) d.style.display='block'; }
    else { if(b) b.style.display='block'; if(d) d.style.display='none'; }
}

function gerarFiltrosLaterais(produtos) { /* (Mantenha a sua função aqui) */ }
window.adicionarModalAoCarrinho = () => alert("📍 Retirada disponível nas unidades!");