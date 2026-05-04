import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaOriginal = [];

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarUsuarios();

    const input = document.getElementById('input-busca-inteligente');
    const btn = document.getElementById('btn-buscar-manual');

    // Busca inteligente ao digitar
    input.addEventListener('input', () => filtrarERenderizar(input.value));
    // Busca ao clicar no botão
    btn.addEventListener('click', () => filtrarERenderizar(input.value));
});

async function carregarUsuarios() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        if (res.status === 404) throw new Error("Rota não encontrada no servidor.");
        listaOriginal = await res.json();
        filtrarERenderizar('');
    } catch (error) {
        console.error("Erro:", error);
    }
}

function filtrarERenderizar(termo) {
    const t = termo.toLowerCase().trim();
    const equipeContainer = document.getElementById('lista-equipe');
    const clientesContainer = document.getElementById('lista-clientes');

    const filtrados = listaOriginal.filter(u => 
        (u.nome_completo || "").toLowerCase().includes(t) || 
        (u.email || "").toLowerCase().includes(t) || 
        (u.cpf || "").includes(t)
    );

    const equipeHtml = filtrados.filter(u => u.role === 'admin' || u.role === 'funcionario').map(user => cardUsuario(user)).join('');
    const clientesHtml = filtrados.filter(u => u.role === 'cliente').map(user => cardUsuario(user)).join('');

    equipeContainer.innerHTML = equipeHtml || '<p class="text-muted ps-3">Nenhum membro da equipe encontrado.</p>';
    clientesContainer.innerHTML = clientesHtml || '<p class="text-muted ps-3">Nenhum cliente encontrado.</p>';
}

function cardUsuario(user) {
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card user-card shadow-sm role-${user.role}">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="fw-bold mb-0">${user.nome_completo || 'Sem Nome'}</h6>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-pink')} small">
                            ${user.role.toUpperCase()}
                        </span>
                    </div>
                    <p class="small text-muted mb-3">${user.email}</p>
                    <select class="form-select form-select-sm" onchange="window.mudarCargo('${user.id}', this.value)">
                        <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                        <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </div>
        </div>`;
}

window.mudarCargo = async (id, novoRole) => {
    if(!confirm("Mudar permissões?")) return;
    await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id_usuario: id, novo_role: novoRole})
    });
    carregarUsuarios();
};