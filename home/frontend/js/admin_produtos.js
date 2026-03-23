const API_URL = 'http://localhost:5000/api/admin/produtos';
let productModal;

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    loadProducts();

    // Listener para o formulário (Criar/Editar)
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Listener para busca em tempo real
    document.getElementById('input-busca').addEventListener('input', handleSearch);
});

async function loadProducts() {
    const tableBody = document.getElementById('product-table-body');
    const loadingRow = document.getElementById('loading-row');
    
    try {
        const response = await fetch(API_URL);
        const produtos = await response.json();

        loadingRow.style.display = 'none';
        // Limpa linhas antigas
        const oldRows = tableBody.querySelectorAll('tr:not(#loading-row):not(#no-products-row)');
        oldRows.forEach(row => row.remove());

        if (produtos.length === 0) {
            document.getElementById('no-products-row').style.display = 'table-row';
            return;
        }

        produtos.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id_produto}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${p.url_imagem || '../img/placeholder.png'}" class="rounded me-2" style="width:40px;height:40px;object-fit:cover">
                        <div><strong>${p.nome_produto}</strong><br><small class="text-muted">${p.marca || ''}</small></div>
                    </div>
                </td>
                <td>R$ ${Number(p.preco).toFixed(2)}</td>
                <td>
                    ${p.quantidade_estoque} un 
                    <span class="badge ${p.quantidade_estoque < 5 ? 'bg-danger' : 'bg-success'}">
                        ${p.quantidade_estoque < 5 ? 'Baixo' : 'Ok'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="openEditModal(${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id_produto})"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    const data = {
        nome_produto: document.getElementById('nome_produto').value,
        preco: document.getElementById('preco').value,
        quantidade_estoque: document.getElementById('quantidade_estoque').value,
        url_imagem: document.getElementById('url_imagem').value,
        marca: document.getElementById('marca').value,
        tipo_produto: document.getElementById('tipo_produto').value,
        descricao: document.getElementById('descricao').value
    };

    const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        productModal.hide();
        loadProducts();
        document.getElementById('productForm').reset();
    }
}

window.openEditModal = (p) => {
    document.getElementById('editProductId').value = p.id_produto;
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

window.deleteProduct = async (id) => {
    if (confirm("Deseja excluir este produto?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadProducts();
    }
};

function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#product-table-body tr:not(#loading-row):not(#no-products-row)');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}