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
    if (!favoritesListContainer) return;

    const userId = localStorage.getItem('usuario_id');
    
    // Trava de Segurança: Se não tem ID, manda pro Login
    if (!userId) {
        alert("Para ver seus favoritos, você precisa fazer login primeiro!");
        window.location.href = '../usuario/login.html';
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
function createFavoriteCard(produto) {
    const precoFormatado = parseFloat(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    return `
        <div class="card-favorite">
            <a href="../ecommerce/detalhes.html?id=${produto.id_produto}" class="card-img-container">
                <img src="${produto.url_imagem}" alt="${produto.nome_produto}" onerror="this.src='../img/logo_pequena4.png'">
            </a>
            <div class="card-favorite-body">
                <a href="../ecommerce/detalhes.html?id=${produto.id_produto}" class="card-title">${produto.nome_produto}</a>
                <p class="text-brand fw-bold fs-5 mt-2 mb-3">${precoFormatado}</p>
                
                <div class="mt-auto d-flex flex-column gap-2">
                    <button class="btn btn-brand" onclick="alert('Adicionar ao carrinho em breve!')">
                        <i class="bi bi-cart-plus me-2"></i>Comprar
                    </button>
                    <button class="remove-btn py-1" onclick="removerFavorito(${produto.id_produto})">
                        <i class="bi bi-trash3 me-1"></i>Remover
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 5. FUNÇÃO PARA REMOVER DO BANCO
window.removerFavorito = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/favoritos/remover`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId, id_produto: idProduto })
        });
        
        if (response.ok) {
            renderFavoritesPage(); // Recarrega a lista após remover
        } else {
            alert("Erro ao remover favorito.");
        }
    } catch(error) {
        console.error("Erro ao remover:", error);
    }
};