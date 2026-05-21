async function renderFavoritesPage() {
    const userId = localStorage.getItem('usuario_id');
    
    if (!userId) {
        // Se não logou, manda pro login
        window.location.href = '../usuario/login.html';
        return;
    }

    try {
        // Busca do BANCO e não do LocalStorage
        const response = await fetch(`${API_BASE_URL}/api/favoritos/${userId}`);
        const favoriteProducts = await response.json();

        if (favoriteProducts.length === 0) {
            favoritesListContainer.style.display = 'none';
            noFavoritesMessage.style.display = 'block';
            return;
        }

        favoritesListContainer.innerHTML = favoriteProducts.map(createFavoriteCard).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

// Função para remover do BANCO (usada no botão)
async function removerFavorito(idProduto) {
    const userId = localStorage.getItem('usuario_id');
    await fetch(`${API_BASE_URL}/api/favoritos/remover`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: userId, id_produto: idProduto })
    });
    renderFavoritesPage(); // Recarrega a lista
}