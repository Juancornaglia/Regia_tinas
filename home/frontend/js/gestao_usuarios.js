import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosUsuarios = []; // Cache local para busca instantânea
let filtroCargo = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Catraca de Segurança
    const auth = await checkAdminAuth();
    if (!auth) return;

    // 2. Carregar dados iniciais
    await carregarBaseUsuarios();

    // 3. Listener da Busca Inteligente
    document.getElementById('input-busca-inteligente').addEventListener('input', (e) => {
        renderizarCards(e.target.value);
    });

    // 4. Listener das Abas (Filtros de Categoria)
    document.querySelectorAll('#pills-tab button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            filtroCargo = e.target.getAttribute('data-role');
            renderizarCards(document.getElementById('input-busca-inteligente').value);
        });
    });
});

async function carregarBaseUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        todosUsuarios = await response.json();
        renderizarCards('');
    } catch (error) {
        console.error("Erro ao carregar banco:", error);
    }
}

function renderizarCards(termoBusca) {
    const container = document.getElementById('lista-usuarios-cards');
    const termo = termoBusca.toLowerCase();

    // LÓGICA DA BUSCA INTELIGENTE
    const filtrados = todosUsuarios.filter(u => {
        const matchesSearch = 
            u.nome_completo.toLowerCase().includes(termo) || 
            u.email.toLowerCase().includes(termo) || 
            (u.cpf && u.cpf.includes(termo)) ||
            u.id.includes(termo);
        
        const matchesRole = filtroCargo === 'todos' || u.role === filtroCargo;
        
        return matchesSearch && matchesRole;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nenhum usuário encontrado.</div>';
        return;
    }

    container.innerHTML = filtrados.map(user => `
        <div class="col-md-6 col-lg-4">
            <div class="card user-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">${user.nome_completo}</h6>
                            <small class="text-muted">${user.email}</small>
                        </div>
                        <span class="badge role-badge-${user.role} small">
                            ${user.role.toUpperCase()}
                        </span>
                    </div>
                    
                    <div class="mb-3 small">
                        <div class="text-muted"><i class="bi bi-phone me-2"></i>${user.telefone || 'Não informado'}</div>
                        <div class="text-muted"><i class="bi bi-card-text me-2"></i>CPF: ${user.cpf || 'Não informado'}</div>
                    </div>

                    <div class="d-flex gap-2 border-top pt-3">
                        <select class="form-select form-select-sm" onchange="window.mudarCargo('${user.id}', this.value)">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.excluirUsuario('${user.id}')" title="Inativar">
                            <i class="bi bi-person-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Funções expostas ao window para os botões do HTML funcionarem
window.mudarCargo = async (id, novoRole) => {
    if(!confirm("Deseja alterar as permissões deste usuário?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_usuario: id, novo_role: novoRole})
        });
        if(response.ok) await carregarBaseUsuarios();
    } catch (e) { alert("Erro ao atualizar."); }
};