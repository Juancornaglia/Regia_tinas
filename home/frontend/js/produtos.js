/**
 * js/produtos.js - Motor do Catálogo de Produtos
 * Conectado ao banco Neon + Render
 */

// 1. CONFIGURAÇÕES DE ENDEREÇO DA API
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// Função para formatar dinheiro (R$)
function formatPrice(price) {
    const valor = parseFloat(price);
    if (isNaN(valor)) return 'Consulte';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 2. FUNÇÃO PRINCIPAL: CARREGAR VITRINE
async function loadPublicProducts() {
    const container = document.getElementById('product-list-container');
    const loading = document.getElementById('loading-products');
    const noProducts = document.getElementById('no-products');

    if (!container) return;

    try {
        console.log("📡 Acessando estoque na nuvem...");
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        if (!response.ok) throw new Error(`Erro API: ${response.status}`);

        const data = await response.json();
        
        // Garante que temos uma lista de produtos, mesmo que o backend mude o formato
        const produtos = Array.isArray(data) ? data : (data.produtos || []);

        // Esconde o carregando
        if (loading) loading.style.display = 'none';

        if (produtos.length > 0) {
            // 3. GERAÇÃO DOS CARDS
            container.innerHTML = produtos.map(p => {
                // IDs podem vir como id ou id_produto
                const id = p.id_produto || p.id;
                const nome = p.nome_produto || 'Produto sem nome';
                const img = p.url_imagem || 'img/logo_pequena4.png';
                const marca = p.marca || 'Regia & Tinas';
                
                // Preços
                const precoBase = parseFloat(p.preco) || 0;
                const precoPromo = parseFloat(p.preco_promocional);
                const temPromo = precoPromo && precoPromo < precoBase;
                const precoFinal = temPromo ? precoPromo : precoBase;

                // Status de Estoque
                let badgeEstoque = '';
                if (p.quantidade_estoque <= 0) {
                    badgeEstoque = '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Esgotado</span>';
                } else if (p.quantidade_estoque < 5) {
                    badgeEstoque = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Últimas unidades!</span>';
                }

                return `
                    <div class="col-6 col-md-4 col-lg-3">
                        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden product-card-hover bg-white">
                            <a href="produto_detalhe.html?id=${id}" class="text-decoration-none text-dark d-flex flex-column h-100">
                                <div class="position-relative text-center bg-white pt-3" style="height: 180px;">
                                    <img src="${img.startsWith('http') ? img : 'img/'+img}" 
                                         class="card-img-top" 
                                         alt="${nome}"
                                         style="height: 100%; object-fit: contain; padding: 10px;"
                                         onerror="this.src='img/logo_pequena4.png'">
                                    ${badgeEstoque}
                                </div>
                                
                                <div class="card-body d-flex flex-column p-3">
                                    <small class="text-muted text-uppercase fw-bold" style="font-size: 0.6rem;">${marca}</small>
                                    <h6 class="card-title fw-bold mb-2 text-truncate" title="${nome}">${nome}</h6>
                                    
                                    <div class="mt-auto">
                                        <div class="mb-2">
                                            ${temPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(precoBase)}</small>` : '<small class="text-white">&nbsp;</small>'}
                                            <div class="fs-5 fw-bold" style="color: #FE8697;">${formatPrice(precoFinal)}</div>
                                        </div>
                                        <button class="btn btn-brand w-100 rounded-pill btn-sm fw-bold py-2">
                                            VER DETALHES
                                        </button>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            if (noProducts) noProducts.style.display = 'block';
        }

    } catch (error) {
        console.error('❌ Erro no Catálogo:', error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-wifi-off fs-1 text-muted"></i>
                <h5 class="mt-3 fw-bold">Não foi possível carregar os produtos.</h5>
                <p class="text-muted small">Verifique sua conexão ou se o servidor Python está ligado.</p>
                <button class="btn btn-outline-brand btn-sm mt-2 rounded-pill" onclick="location.reload()">Tentar Novamente</button>
            </div>`;
    }
}

// 4. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', loadPublicProducts);