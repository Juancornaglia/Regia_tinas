/**
 * js/favoritos.js - Motor de Favoritos Conectado ao Banco (Regia & Tinas Care)
 */

// 1. CONFIGURAÇÕES GERAIS
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

const favoritesListContainer = document.getElementById('favorites-list');
const noFavoritesMessage = document.getElementById('no-favorites-message');

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    renderFavoritesPage();
});

// 3. FUNÇÃO PRINCIPAL (BUSCA E RENDERIZA DO BANCO)
async function renderFavoritesPage() {
    const userId = localStorage.getItem('usuario_id');
    console.log("ID do Usuário no LocalStorage:", userId); // Olhe o console!
    
    if (!userId || userId === "null" || userId === "undefined") {
        console.error("ID de usuário inválido!");
        return;
    }

    try {
        console.log("Buscando favoritos para o usuário:", userId);
        const response = await fetch(`${API_BASE_URL}/api/favoritos/${userId}`);
        
        // Se o servidor responder erro, trata no catch
        if (!response.ok) throw new Error(`Erro ${response.status}: ${await response.text()}`);
        
        const favoriteProducts = await response.json();

        // Lógica de lista vazia
        if (!favoriteProducts || favoriteProducts.length === 0) {
            favoritesListContainer.style.display = 'none';
            if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
            return;
        }

        // Renderização
        favoritesListContainer.style.display = 'grid'; 
        if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';
        favoritesListContainer.innerHTML = favoriteProducts.map(createFavoriteCard).join('');
        
    } catch (error) {
        console.error("❌ ERRO NO FAVORITOS:", error);
        favoritesListContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <h5 class="text-danger">Erro ao carregar favoritos: ${error.message}</h5>
            </div>`;
    }
}

// 4. MONTA O HTML DE CADA CARD
// Dentro da sua função createFavoriteCard(produto)
function createFavoriteCard(produto) {
    // Certifique-se de que o campo bate com o que o Python retorna (p.preco_venda)
    // Se no Python estiver preco_venda, aqui deve ser produto.preco_venda ou produto.preco
    const preco = produto.preco || produto.preco_venda || 0; 
    const precoFormatado = parseFloat(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    return `
        <div class="card-favorite">
            <a href="detalhes.html?id=${produto.id_produto}" class="card-img-container">
                <img src="${produto.url_imagem}" alt="${produto.nome_produto}" onerror="this.src='../img/logo_pequena4.png'">
            </a>
            <div class="card-favorite-body">
                <a href="detalhes.html?id=${produto.id_produto}" class="card-title">${produto.nome_produto}</a>
                <p class="text-brand fw-bold fs-5 mt-2 mb-3">${precoFormatado}</p>
                
                <div class="mt-auto d-flex flex-column gap-2">
                    <button class="remove-btn py-1" onclick="removerFavorito(${produto.id_produto})">
                        <i class="bi bi-trash3 me-1"></i>Remover
                    </button>
                </div>
            </div>
        </div>
    `;
}
