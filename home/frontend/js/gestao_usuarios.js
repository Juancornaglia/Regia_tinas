const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosUsuarios = [];
let filtroCargo = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    await carregarTodosUsuarios();
    
    // Busca Inteligente (Debounce para não pesar o banco)
    document.getElementById('busca-inteligente').addEventListener('input', (e) => {
        filtrarERenderizar(e.target.value);
    });

    // Filtro por Abas
    document.querySelectorAll('#pills-tab button').forEach(btn => {
        btn.addEventListener('click', () => {
            filtroCargo = btn.getAttribute('data-role');
            filtrarERenderizar(document.getElementById('busca-inteligente').value);
        });
    });
});

async function carregarTodosUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-completo`);
        todosUsuarios = await response.json();
        filtrarERenderizar('');
    } catch (error) {
        console.error("Erro ao carregar banco:", error);
    }
}

function filtrarERenderizar(termo) {
    const container = document.getElementById('lista-usuarios-container');
    const t = termo.toLowerCase();

    const filtrados = todosUsuarios.filter(u => {
        const matchesSearch = u.nome_completo?.toLowerCase().includes(t) || 
                              u.email?.toLowerCase().includes(t) || 
                              u.cpf?.includes(t);
        
        const matchesRole = filtroCargo === 'todos' || u.role === filtroCargo;
        
        return matchesSearch && matchesRole;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nenhum resultado encontrado.</div>';
        return;
    }

    container.innerHTML = filtrados.map(u => `
        <div class="col-md-6 col-xl-4">
            <div class="card user-card shadow-sm role-${u.role}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">${u.nome_completo}</h6>
                        <span class="badge ${u.role === 'admin' ? 'bg-danger' : (u.role === 'funcionario' ? 'bg-info text-dark' : 'bg-pink')} small">
                            ${u.role.toUpperCase()}
                        </span>
                    </div>
                    <p class="small text-muted mb-1"><i class="bi bi-envelope me-2"></i>${u.email}</p>
                    <p class="small text-muted mb-3"><i class="bi bi-telephone me-2"></i>${u.telefone || 'Não informado'}</p>
                    
                    <div class="d-flex gap-2">
                        <select class="form-select form-select-sm" onchange="alterarCargo('${u.id}', this.value)">
                            <option value="cliente" ${u.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${u.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleAtivo('${u.id}', ${u.ativo})">
                            ${u.ativo ? '<i class="bi bi-person-x"></i>' : '<i class="bi bi-person-check"></i>'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Expõe funções para o HTML
window.alterarCargo = async (id, novoRole) => {
    if(!confirm("Deseja alterar o cargo deste usuário?")) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id_usuario: id, novo_role: novoRole})
    });
    if(res.ok) carregarTodosUsuarios();
};