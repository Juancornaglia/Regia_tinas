const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    renderFavoritesPage();
});

const favoritesListContainer = document.getElementById('favorites-list');
const noFavoritesMessage = document.getElementById('no-favorites-message');

async function renderFavoritesPage() {
    const userId = localStorage.getItem('usuario_id');
    
    // Trava de Segurança: Se não tem ID, manda pro Login
    if (!userId) {
        alert("Para ver seus favoritos, você precisa fazer login primeiro!");
        window.location.href = '../usuario/login.html'; // Ajuste o caminho se necessário
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/favoritos/${userId}`);
        const favoriteProducts = await response.json();

        // Se a lista vier vazia ou der erro
        if (!favoriteProducts || favoriteProducts.length === 0 || favoriteProducts.error) {
            favoritesListContainer.style.display = 'none';
            noFavoritesMessage.style.display = 'block';
            return;
        }

        // Se tiver produtos, monta os cards na tela
        favoritesListContainer.style.display = 'grid'; 
        noFavoritesMessage.style.display = 'none';
        favoritesListContainer.innerHTML = favoriteProducts.map(createFavoriteCard).join('');
        
    } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        favoritesListContainer.innerHTML = `<h5 class="text-danger text-center w-100">Erro ao buscar favoritos. Tente novamente mais tarde.</h5>`;
    }
}

// Monta o HTML de cada card do produto favorito
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

// Função para remover produto (Ativada pelo botão Remover)
window.removerFavorito = async function(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/favoritos/remover`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId, id_produto: idProduto })
        });
        
        if (response.ok) {
            renderFavoritesPage(); // Recarrega a tela na mesma hora
        }
    } catch(error) {
        console.error("Erro ao remover:", error);
    }
}