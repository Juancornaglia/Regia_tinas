const API_URL = 'http://localhost:5000/api';

// Função para formatar o preço (Mantida original)
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) { return 'R$ 0,00'; }
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função principal para carregar os detalhes
async function loadProductDetails() {
    
    // --- 1. Pegar o ID da URL (?id=123) ---
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    const loading = document.getElementById('loading-product');
    const notFound = document.getElementById('product-not-found');
    const productDataEl = document.getElementById('product-data');

    if (!productId) {
        if (loading) loading.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
        return;
    }

    try {
        // --- 2. Buscar no Python/Neon ---
        // Reutilizamos a rota de listagem e filtramos o ID (ou criamos uma específica no app.py)
        const response = await fetch(`${API_URL}/admin/produtos`);
        const produtos = await response.json();
        
        // Procura o produto específico pelo ID da URL
        const produto = produtos.find(p => p.id_produto == productId);

        if (!produto) {
            throw new Error('Produto não encontrado no banco Neon.');
        }

        // --- 3. Preencher a página com os dados ---
        if (loading) loading.style.display = 'none';

        // Imagem
        const imgElement = document.getElementById('product-image');
        if (imgElement) {
            imgElement.src = produto.url_imagem || 'img/produto_sem_imagem.png';
            imgElement.alt = produto.nome_produto;
        }
        
        // Nome, Preço e Marca
        document.getElementById('product-name').textContent = produto.nome_produto;
        document.getElementById('product-price').textContent = formatPrice(produto.preco);
        document.getElementById('product-brand').textContent = produto.marca || 'Regia & Tinas Care';
        
        // Descrição
        const descElement = document.getElementById('product-description');
        if (descElement) {
            descElement.textContent = produto.descricao || 'Este produto não possui descrição detalhada.';
        }
        
        // Título da Aba
        document.title = `${produto.nome_produto} - Chateau du Pet`;

        // Botão de Adicionar (Dinâmico)
        const btnContainer = document.getElementById('btn-container-detalhe');
        if (btnContainer) {
            btnContainer.innerHTML = `
                <button class="btn btn-rosa btn-lg w-100 rounded-pill fw-bold" onclick="adicionarAoCarrinho(${produto.id_produto})">
                    <i class="bi bi-cart-plus me-2"></i> Adicionar ao Carrinho
                </button>
            `;
        }

        // Mostra o conteúdo
        if (productDataEl) productDataEl.style.display = 'flex';

    } catch (error) {
        console.error('Erro:', error.message);
        if (loading) loading.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', loadProductDetails);