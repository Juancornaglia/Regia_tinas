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

// Função para formatar o preço (Mantida original)
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) { return 'R$ 0,00'; }
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função principal para carregar os produtos do Neon via Python
async function loadPublicProducts() {
    const container = document.getElementById('product-list-container');
    const loading = document.getElementById('loading-products');
    const noProducts = document.getElementById('no-products');

    if (!container || !loading || !noProducts) {
        console.error("Elementos da página não encontrados no HTML.");
        return;
    }

    try {
        // 1. Busca os produtos no seu servidor Python
        const response = await fetch(`${API_URL}/admin/produtos`);
        const produtos = await response.json();

        // Esconde o "Carregando"
        loading.style.display = 'none';

        // 2. Verifica se encontrou produtos no banco Neon
        if (produtos && produtos.length > 0) {
            
            container.innerHTML = ''; // Limpa o container

            // 3. Cria um card para cada produto
            produtos.forEach(produto => {
                const imageUrl = produto.url_imagem || 'img/produto_sem_imagem.png'; 
                
                // Limita a descrição para o card não ficar gigante
                const shortDescription = produto.descricao 
                    ? produto.descricao.substring(0, 80) + (produto.descricao.length > 80 ? '...' : '') 
                    : 'Clique para ver mais detalhes deste produto.';

                // Link para a página de detalhes com o ID na URL
                const detailUrl = `produto_detalhe.html?id=${produto.id_produto}`;

                const cardHtml = `
                    <div class="col-md-4 col-lg-3 mb-4">
                        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden product-card-hover">
                            <a href="${detailUrl}" class="text-decoration-none text-dark">
                                <div class="position-relative">
                                    <img src="${imageUrl}" class="card-img-top" alt="${produto.nome_produto}" 
                                         style="height: 200px; object-fit: contain; padding: 15px;"
                                         onerror="this.src='img/produto_sem_imagem.png'">
                                    ${produto.quantidade_estoque < 3 ? '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Últimas unidades!</span>' : ''}
                                </div>
                                <div class="card-body">
                                    <h6 class="card-title fw-bold mb-1">${produto.nome_produto}</h6>
                                    <p class="card-text text-muted small mb-2">${shortDescription}</p>
                                    <h5 class="text-primary fw-bold">${formatPrice(produto.preco)}</h5>
                                </div>
                            </a>
                            <div class="card-footer bg-white border-0 pb-3">
                                <button class="btn btn-outline-primary w-100 rounded-pill" onclick="location.href='${detailUrl}'">
                                    Ver detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHtml);
            });

        } else {
            noProducts.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-danger">Não foi possível carregar o catálogo no momento.</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadPublicProducts);