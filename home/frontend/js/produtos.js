// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; // <-- SEU LINK REAL AQUI

function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) { return 'Consulte o valor'; }
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 2. FUNÇÃO PRINCIPAL PARA CARREGAR PRODUTOS PÚBLICOS
async function loadPublicProducts() {
    const container = document.getElementById('product-list-container');
    const loading = document.getElementById('loading-products');
    const noProducts = document.getElementById('no-products');

    if (!container || !loading || !noProducts) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        // CORREÇÃO: Verificar se a resposta está OK ANTES de tentar ler o JSON!
        if (!response.ok) {
            throw new Error(`Erro na API: Status ${response.status}`);
        }

        const produtos = await response.json();
        loading.style.display = 'none';

        if (produtos && produtos.length > 0) {
            
            // 3. Cria um card para cada produto
            const cardsHtml = produtos.map(produto => {
                
                // Trata a imagem e protege contra falhas (evita o pisca-pisca)
                let imageUrl = produto.url_imagem;
                if (imageUrl && !imageUrl.startsWith('http')) { imageUrl = `img/${produto.url_imagem}`; }
                if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/logo_pequena4.png'; }
                
                // Limita a descrição
                const shortDescription = produto.descricao 
                    ? produto.descricao.substring(0, 70) + (produto.descricao.length > 70 ? '...' : '') 
                    : 'Clique para ver detalhes do produto.';

                // Lógica de Preço
                const originalPrice = parseFloat(produto.preco) || 0;
                const promoPrice = parseFloat(produto.preco_promocional);
                const isPromo = promoPrice && promoPrice < originalPrice;
                const displayPrice = isPromo ? promoPrice : originalPrice;

                // Link para a página de detalhes
                const detailUrl = `produto_detalhe.html?id=${produto.id_produto || produto.id}`;

                return `
                    <div class="col-sm-6 col-md-4 col-lg-3">
                        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden product-card-hover bg-white">
                            <a href="${detailUrl}" class="text-decoration-none text-dark d-flex flex-column h-100">
                                <div class="position-relative text-center pt-3">
                                    <img src="${imageUrl}" class="card-img-top" alt="${produto.nome_produto}" 
                                         style="height: 180px; object-fit: contain; padding: 10px;"
                                         onerror="this.onerror=null; this.src='img/logo_pequena4.png'">
                                    
                                    ${produto.quantidade_estoque < 3 && produto.quantidade_estoque > 0 ? '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Últimas unidades!</span>' : ''}
                                    ${produto.quantidade_estoque === 0 ? '<span class="badge bg-secondary position-absolute top-0 end-0 m-2">Esgotado</span>' : ''}
                                </div>
                                <div class="card-body d-flex flex-column text-center">
                                    <h6 class="card-title fw-bold mb-2">${produto.nome_produto}</h6>
                                    <p class="card-text text-muted small mb-3 flex-grow-1">${shortDescription}</p>
                                    
                                    <div class="mt-auto">
                                        ${isPromo ? `<small class="text-muted text-decoration-line-through">${formatPrice(originalPrice)}</small>` : '<small class="text-muted">&nbsp;</small>'}
                                        <h5 class="fw-bold mb-3" style="color: #FE8697;">${formatPrice(displayPrice)}</h5>
                                        <button class="btn btn-brand w-100 rounded-pill">
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = cardsHtml;

        } else {
            noProducts.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `<div class="col-12 text-center py-5"><h4 class="text-danger fw-bold">Não foi possível carregar o catálogo no momento.</h4><p>Tente atualizar a página.</p></div>`;
    }
}

// 4. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', loadPublicProducts);