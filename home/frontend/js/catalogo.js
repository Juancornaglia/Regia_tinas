/**
 * js/catalogo.js - Vitrine Digital Refinada
 * Versão otimizada para carregar produtos do banco Neon
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let produtosNoEstoque = [];
let produtoAbertoAtualmente = null;

// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema Regia & Tinas iniciado. Carregando vitrine...");
    carregarVitrine();
});

// ==========================================
// 2. LÓGICA DA VITRINE
// ==========================================
async function carregarVitrine() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) {
        console.error("ERRO: Elemento 'vitrine-produtos' não encontrado no HTML!");
        return;
    }
    
    container.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner-border text-primary"></div><p>Buscando produtos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Erro de conexão");
        
        const data = await response.json();
        produtosNoEstoque = Array.isArray(data) ? data : (data.produtos || []);

        if (produtosNoEstoque.length === 0) {
            container.innerHTML = '<div class="col-12 text-center p-5"><h4>Nenhum produto em exposição.</h4></div>';
            return;
        }

        container.innerHTML = produtosNoEstoque.map(p => {
            const id = p.id_produto || p.id;
            const nome = p.nome_produto || 'Produto';
            const img = p.url_imagem ? (p.url_imagem.startsWith('http') ? p.url_imagem : `img/${p.url_imagem}`) : 'img/logo_pequena4.png';
            const preco = parseFloat(p.preco) || 0;
            
            return `
                <div class="col-6 col-md-4 col-lg-3 mb-4">
                    <div class="product-card h-100 shadow-sm p-2" onclick="abrirDetalhesProduto('${id}')" style="cursor: pointer;">
                        <div class="img-container"><img src="${img}" class="product-img" onerror="this.src='img/logo_pequena4.png'"></div>
                        <div class="card-body text-center">
                            <h6 class="fw-bold">${nome}</h6>
                            <p class="text-brand fw-bold">R$ ${preco.toFixed(2)}</p>
                            <button class="btn btn-sm btn-brand w-100 rounded-pill">VER DETALHES</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro na vitrine:", error);
        container.innerHTML = '<div class="col-12 text-center py-5 text-danger">Erro ao conectar com o catálogo.</div>';
    }
}

// ==========================================
// 3. MODAL E FAVORITOS
// ==========================================
window.abrirDetalhesProduto = (id) => {
    const produto = produtosNoEstoque.find(p => String(p.id_produto || p.id) === String(id));
    if (!produto) return;

    produtoAbertoAtualmente = produto;
    document.getElementById('modal-nome').innerText = produto.nome_produto;
    document.getElementById('modal-img').src = produto.url_imagem || 'img/logo_pequena4.png';
    // ... preencha o restante conforme seu HTML
    new bootstrap.Modal(document.getElementById('modalProduto')).show();
};

window.toggleFavorito = () => alert("💖 Produto favoritado!");
window.adicionarModalAoCarrinho = () => alert("📍 Disponível para retirada!");