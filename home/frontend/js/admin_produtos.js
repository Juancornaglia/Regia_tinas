// 1. DEFINIÇÃO DA URL DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. SEGURANÇA: VERIFICAR ADMIN
async function verificarAdmin(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${token}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        return false;
    }
}

let productModal;

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token'); 
    
    // Verificação de segurança obrigatória
    if (!token) {
        window.location.href = '../usuario/login.html';
        return;
    }

    const isAdmin = await verificarAdmin(token);
    if (!isAdmin) {
        alert("Acesso restrito!");
        window.location.href = '../usuario/login.html';
        return; 
    }

    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    
    loadProducts();

    // Listeners
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('input-busca').addEventListener('input', handleSearch);
    
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm('Deseja sair?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });

    // Limpar form ao abrir modal para "Novo Produto"
    document.getElementById('add-product-button')?.addEventListener('click', () => {
        document.getElementById('productForm').reset();
        document.getElementById('editProductId').value = '';
        document.getElementById('productModalLabel').innerText = "Novo Produto";
    });
});

// 4. CARREGAR PRODUTOS DO BANCO
async function loadProducts() {
    const tableBody = document.getElementById('product-table-body');
    const loadingRow = document.getElementById('loading-row');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/produtos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const produtos = await response.json();

        loadingRow.style.display = 'none';
        
        // Limpa linhas antigas
        const oldRows = tableBody.querySelectorAll('tr:not(#loading-row):not(#no-products-row)');
        oldRows.forEach(row => row.remove());

        if (!response.ok) throw new Error(produtos.mensagem || "Erro na API");

        if (!Array.isArray(produtos) || produtos.length === 0) {
            document.getElementById('no-products-row').style.display = 'table-row';
            return;
        }

        document.getElementById('no-products-row').style.display = 'none';

        produtos.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 fw-bold text-secondary">#${p.id_produto || p.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${p.url_imagem || '../img/placeholder.png'}" class="rounded me-3 shadow-sm" style="width:45px;height:45px;object-fit:cover">
                        <div><strong class="text-dark">${p.nome_produto}</strong><br><small class="text-muted">${p.marca || 'Sem marca'}</small></div>
                    </div>
                </td>
                <td class="fw-bold">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</td>
                <td>
                    <span class="fw-bold">${p.quantidade_estoque} un</span> 
                    <span class="badge ms-2 ${p.quantidade_estoque < 5 ? 'bg-danger' : 'bg-success'}">
                        ${p.quantidade_estoque < 5 ? 'Baixo' : 'Ok'}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-brand me-1" onclick='window.openEditModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteProduct(${p.id_produto || p.id})"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        loadingRow.style.display = 'none';
        tableBody.insertAdjacentHTML('beforeend', `<tr><td colspan="5" class="text-center text-danger p-4">Erro ao conectar com o banco de dados.</td></tr>`);
    }
}

// 5. SALVAR PRODUTO (NOVO OU EDITADO)
async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProductButton');
    btn.disabled = true;
    btn.innerText = "Salvando...";

    const id = document.getElementById('editProductId').value;
    const method = id ? 'PUT' : 'POST';
    
    // Assumindo que a sua rota de administração de produtos é /api/admin/produtos
    const url = id ? `${API_BASE_URL}/api/admin/produtos/${id}` : `${API_BASE_URL}/api/admin/produtos`;

    const data = {
        nome_produto: document.getElementById('nome_produto').value,
        preco: parseFloat(document.getElementById('preco').value),
        quantidade_estoque: parseInt(document.getElementById('quantidade_estoque').value),
        url_imagem: document.getElementById('url_imagem').value,
        marca: document.getElementById('marca').value,
        tipo_produto: document.getElementById('tipo_produto').value,
        descricao: document.getElementById('descricao').value
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert(id ? "Produto atualizado!" : "Produto criado com sucesso!");
            productModal.hide();
            loadProducts();
            document.getElementById('productForm').reset();
        } else {
            const result = await response.json();
            alert("Erro: " + (result.mensagem || "Falha ao salvar produto."));
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Salvar Produto";
    }
}

// 6. ABRIR MODAL PARA EDIÇÃO
window.openEditModal = (p) => {
    document.getElementById('editProductId').value = p.id_produto || p.id;
    document.getElementById('nome_produto').value = p.nome_produto;
    document.getElementById('preco').value = p.preco;
    document.getElementById('quantidade_estoque').value = p.quantidade_estoque;
    document.getElementById('url_imagem').value = p.url_imagem;
    document.getElementById('marca').value = p.marca;
    document.getElementById('tipo_produto').value = p.tipo_produto;
    document.getElementById('descricao').value = p.descricao;
    document.getElementById('productModalLabel').innerText = "Editar Produto";
    productModal.show();
};

// 7. EXCLUIR PRODUTO
window.deleteProduct = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
        try {
            const token = localStorage.getItem('token');
            // Assumindo rota de admin para deletar
            const response = await fetch(`${API_BASE_URL}/api/admin/produtos/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                loadProducts();
            } else {
                alert("Erro ao excluir produto no servidor.");
            }
        } catch(error) {
            alert("Erro de conexão.");
        }
    }
};

// 8. BUSCA LOCAL
function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#product-table-body tr:not(#loading-row):not(#no-products-row)');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}