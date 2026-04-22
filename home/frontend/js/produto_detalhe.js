// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; // <-- SEU LINK REAL AQUI

document.addEventListener('DOMContentLoaded', () => {
    carregarDetalhesProduto();
});

async function carregarDetalhesProduto() {
    // 2. Pega o ID do produto que está na URL (ex: produto_detalhe.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const loadingSection = document.getElementById('loading-product');
    const notFoundSection = document.getElementById('product-not-found');
    const dataSection = document.getElementById('product-data');

    // Se não tiver ID na URL, mostra erro
    if (!productId) {
        loadingSection.style.display = 'none';
        notFoundSection.style.display = 'block';
        return;
    }

    try {
        // 3. Busca a lista de produtos na sua rota pública do Python
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        // CORREÇÃO: Verifica se a resposta foi um sucesso ANTES de transformar em JSON
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const produtos = await response.json();

        // 4. Procura o produto específico dentro da lista
        const produto = produtos.find(p => (p.id_produto || p.id) == productId);

        loadingSection.style.display = 'none';

        if (produto) {
            // Se achou, preenche os dados na tela
            document.getElementById('product-id-badge').textContent = produto.id_produto || produto.id;
            document.getElementById('product-name').textContent = produto.nome_produto || 'Produto sem nome';
            document.getElementById('product-brand').textContent = produto.marca || 'Sem marca';
            
            // Tratamento do preço
            const preco = parseFloat(produto.preco_promocional || produto.preco || 0);
            document.getElementById('product-price').textContent = preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            document.getElementById('product-description').textContent = produto.descricao || 'Nenhuma descrição disponível para este produto.';

            // Tratamento da imagem
            const imageEl = document.getElementById('product-image');
            let imageUrl = produto.url_imagem;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `img/${produto.url_imagem}`; 
            }
            if (!imageUrl || imageUrl.trim() === "") { imageUrl = 'img/logo_pequena4.png'; }
            imageEl.src = imageUrl;

            // Mostra a seção de dados
            dataSection.style.display = 'flex';
        } else {
            // Se o ID não existir no banco
            notFoundSection.style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao carregar o produto:", error);
        loadingSection.style.display = 'none';
        notFoundSection.style.display = 'block';
        notFoundSection.querySelector('p').textContent = "Ocorreu um erro ao conectar com o banco de dados. Tente novamente mais tarde.";
    }
}