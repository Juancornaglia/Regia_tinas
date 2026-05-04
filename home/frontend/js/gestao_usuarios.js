import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = "https://regia-tinas.onrender.com";
let listaOriginal = [];
let filtroCargo = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarUsuarios();

    // Busca ao digitar
    document.getElementById('input-busca-inteligente').addEventListener('input', (e) => {
        filtrarERenderizar(e.target.value);
    });

    // Filtro das abas
    document.querySelectorAll('#pills-tab button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('#pills-tab .active').classList.remove('active');
            e.target.classList.add('active');
            filtroCargo = e.target.getAttribute('data-role');
            filtrarERenderizar(document.getElementById('input-busca-inteligente').value);
        });
    });
});

async function carregarUsuarios() {
    const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
    listaOriginal = await res.json();
    filtrarERenderizar('');
}

function filtrarERenderizar(termo) {
    const container = document.getElementById('container-lista-usuarios');
    const t = termo.toLowerCase();

    const filtrados = listaOriginal.filter(u => {
        const matchesSearch = u.nome_completo.toLowerCase().includes(t) || u.email.toLowerCase().includes(t);
        const matchesRole = filtroCargo === 'todos' || u.role === filtroCargo;
        return matchesSearch && matchesRole;
    });

    container.innerHTML = filtrados.map(user => `
        <div class="col-md-6 col-lg-4">
            <div class="card user-card shadow-sm role-${user.role}">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="fw-bold mb-0">${user.nome_completo}</h6>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-pink')} small">
                            ${user.role.toUpperCase()}
                        </span>
                    </div>
                    <p class="small text-muted mb-3">${user.email}</p>
                    <div class="d-flex gap-2">
                        <select class="form-select form-select-sm" onchange="window.mudarCargo('${user.id}', this.value)">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

window.mudarCargo = async (id, role) => {
    if(!confirm("Mudar cargo?")) return;
    await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id_usuario: id, novo_role: role})
    });
    carregarUsuarios();
};