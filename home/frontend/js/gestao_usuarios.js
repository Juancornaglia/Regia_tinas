import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaMestra = []; // Guarda todos os usuários do banco
let filtroAtual = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarBaseUsuarios();

    // Evento de Busca Inteligente
    document.getElementById('input-busca-inteligente').addEventListener('input', (e) => {
        filtrarERenderizar(e.target.value);
    });

    // Eventos dos Botões de Filtro
    document.querySelectorAll('#pills-tab .nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('#pills-tab .active').classList.remove('active');
            e.target.classList.add('active');
            filtroAtual = e.target.getAttribute('data-role');
            filtrarERenderizar(document.getElementById('input-busca-inteligente').value);
        });
    });
});

async function carregarBaseUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-completo`);
        listaMestra = await response.json();
        filtrarERenderizar('');
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
    }
}

function filtrarERenderizar(termo) {
    const container = document.getElementById('lista-usuarios');
    const t = termo.toLowerCase();

    const filtrados = listaMestra.filter(u => {
        // Busca Inteligente: Nome, Email ou CPF
        const matchesSearch = 
            (u.nome_completo && u.nome_completo.toLowerCase().includes(t)) ||
            (u.email && u.email.toLowerCase().includes(t)) ||
            (u.cpf && u.cpf.includes(t));

        // Filtro de Categoria (Aba)
        const matchesRole = filtroAtual === 'todos' || u.role === filtroAtual;

        return matchesSearch && matchesRole;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nenhum usuário encontrado com esses critérios.</div>';
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
                    
                    <div class="small text-muted mb-3">
                        <div><i class="bi bi-phone me-2"></i>${user.telefone || 'N/A'}</div>
                        <div><i class="bi bi-card-text me-2"></i>CPF: ${user.cpf || 'N/A'}</div>
                    </div>

                    <div class="d-flex gap-2">
                        <select class="form-select form-select-sm" onchange="window.mudarCargo('${user.id}', this.value)">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.desativarUsuario('${user.id}')" title="Desativar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Funções Globais expostas ao Window
window.mudarCargo = async (id, novoRole) => {
    if(!confirm(`Mudar acesso para ${novoRole.toUpperCase()}?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_usuario: id, novo_role: novoRole})
        });
        if(response.ok) await carregarBaseUsuarios();
    } catch (e) { alert("Erro ao atualizar."); }
};