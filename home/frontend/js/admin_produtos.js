// js/admin_produtos.js - COM LÓGICA REAL DE API (CRUD COMPLETO)

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

let productModal;

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    
    // Chama a função para buscar os dados reais do banco
    loadProducts();

    // Eventos
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Limpar form ao abrir modal para "Novo Produto"
    document.getElementById('add-product-button')?.addEventListener('click', () => {
        document.getElementById('productForm').reset();
        document.getElementById('editProductId').value = '';
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-box-seam me-2"></i>Novo Produto';
    });
});

// --- 1. BUSCAR PRODUTOS DO BANCO (GET) ---
async function loadProducts() {
    const tableBody = document.getElementById('product-table-body');
    if (!tableBody) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/produtos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Erro ao buscar do servidor.");

        const produtos = await response.json();
        tableBody.innerHTML = ''; 

        if (produtos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum produto cadastrado no banco.</td></tr>';
            return;
        }

        produtos.forEach(p => {
            // Lógica de preço promocional
            let htmlPreco = `<strong>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</strong>`;
            if (p.preco_promocional && p.preco_promocional < p.preco) {
                htmlPreco = `
                    <span class="text-muted text-decoration-line-through small">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</span><br>
                    <strong class="text-success">R$ ${Number(p.preco_promocional).toFixed(2).replace('.', ',')}</strong>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-secondary">#${p.id_produto || p.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${p.url_imagem || '../img/logo_pequena4.png'}" 
                             class="rounded me-3 shadow-sm border" 
                             style="width:50px; height:50px; object-fit:cover"
                             onerror="this.onerror=null; this.src='../img/logo_pequena4.png'">
                        <div>
                            <strong class="text-dark">${p.nome_produto}</strong><br>
                            <span class="badge ${p.status_produto === 'Ativo' ? 'bg-light text-success border' : 'bg-light text-danger border'}">${p.status_produto || 'Ativo'}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="d-block">${p.tipo_produto} ${p.subcategoria ? '> ' + p.subcategoria : ''}</span>
                    <small class="text-muted"><i class="bi bi-tag-fill me-1"></i>${p.marca || 'S/ Marca'}</small>
                </td>
                <td>${htmlPreco}</td>
                <td>
                    <strong class="fs-6">${p.quantidade_estoque} un</strong> 
                    ${p.quantidade_estoque < 5 ? '<span class="badge bg-danger ms-1">Baixo</span>' : ''}
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary rounded-circle shadow-sm" title="Editar" onclick='window.openEditModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm ms-1" title="Excluir" onclick="window.deleteProduct(${p.id_produto || p.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Erro ao conectar com o servidor. Ligue a API Python.</td></tr>`;
    }
}

// --- 2. SALVAR E ALTERAR (POST e PUT) ---
async function handleProductSubmit(e) {
    e.preventDefault(); // Impede a página de recarregar
    
    const btn = document.getElementById('saveProductButton');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const id = document.getElementById('editProductId').value;
    
    // Se tem ID, é Alterar (PUT). Se não tem, é Inserir (POST)
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE_URL}/api/admin/produtos/${id}` : `${API_BASE_URL}/api/admin/produtos`;

    // Mapeando todos os campos do seu banco Neon
    const data = {
        nome_produto: document.getElementById('nome_produto').value,
        url_imagem: document.getElementById('url_imagem').value || null,
        tipo_produto: document.getElementById('tipo_produto').value,
        subcategoria: document.getElementById('subcategoria').value || null,
        marca: document.getElementById('marca').value || null,
        fabricante: document.getElementById('fabricante').value || null,
        preco: parseFloat(document.getElementById('preco').value),
        preco_promocional: document.getElementById('preco_promocional').value ? parseFloat(document.getElementById('preco_promocional').value) : null,
        quantidade_estoque: parseInt(document.getElementById('quantidade_estoque').value),
        cor: document.getElementById('cor').value || null,
        tamanho_medida: document.getElementById('tamanho_medida').value || null,
        data_fabricacao: document.getElementById('data_fabricacao').value || null,
        data_validade: document.getElementById('data_validade').value || null,
        status_produto: document.getElementById('status_produto').value,
        descricao: document.getElementById('descricao').value || null,
        observacoes: document.getElementById('observacoes').value || null
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

        if (!response.ok) throw new Error("Erro ao salvar produto no banco.");

        alert(id ? "Produto alterado com sucesso!" : "Produto cadastrado com sucesso!");
        productModal.hide(); // Fecha a janela
        loadProducts(); // Recarrega a tabela com os dados novos
        
    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-floppy me-2"></i>Salvar Produto';
    }
}

// --- 3. EXCLUIR PRODUTO (DELETE) ---
window.deleteProduct = async (id) => {
    if (confirm(`Deseja realmente excluir o produto #${id} permanentemente?`)) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/produtos/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert("Produto excluído com sucesso!");
                loadProducts(); // Recarrega a tabela
            } else {
                alert("Erro ao excluir. O produto pode estar atrelado a algum pedido.");
            }
        } catch(error) {
            alert("Erro de conexão ao excluir.");
        }
    }
};

// --- PREENCHER MODAL AO CLICAR EM ALTERAR ---
window.openEditModal = (p) => {
    document.getElementById('editProductId').value = p.id_produto || p.id;
    document.getElementById('nome_produto').value = p.nome_produto || '';
    document.getElementById('url_imagem').value = p.url_imagem || '';
    document.getElementById('tipo_produto').value = p.tipo_produto || 'Acessório';
    document.getElementById('subcategoria').value = p.subcategoria || '';
    document.getElementById('marca').value = p.marca || '';
    document.getElementById('fabricante').value = p.fabricante || '';
    document.getElementById('cor').value = p.cor || '';
    document.getElementById('tamanho_medida').value = p.tamanho_medida || '';
    document.getElementById('preco').value = p.preco || '';
    document.getElementById('preco_promocional').value = p.preco_promocional || '';
    document.getElementById('data_fabricacao').value = p.data_fabricacao ? p.data_fabricacao.split('T')[0] : '';
    document.getElementById('data_validade').value = p.data_validade ? p.data_validade.split('T')[0] : '';
    document.getElementById('quantidade_estoque').value = p.quantidade_estoque || 0;
    document.getElementById('status_produto').value = p.status_produto || 'Ativo';
    document.getElementById('descricao').value = p.descricao || '';
    document.getElementById('observacoes').value = p.observacoes || '';
    
    document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar Produto';
    productModal.show();
};