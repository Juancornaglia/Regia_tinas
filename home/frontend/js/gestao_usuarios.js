// js/gestao_usuarios.js

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaOriginal = [];
let usuarioPromocao = null;

// --- FUNÇÃO DE SEGURANÇA ---
async function checkAdminAuth() {
    const userId = localStorage.getItem('usuario_id');
    const userRole = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();

    if (!userId || userRole !== 'admin') {
        console.warn("Acesso negado: Usuário não é administrador.");
        window.location.href = (userRole === 'funcionario') ? '../admin/funcionario.html' : '../usuario/login.html';
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        if (!response.ok) throw new Error("Servidor negou acesso.");
        const data = await response.json();
        return (data.isAdmin === true || data.isAdmin === "true") ? { id: userId, role: 'admin' } : null;
    } catch (error) {
        console.error("Erro de conexão:", error);
        return null;
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarUsuarios();

    const input = document.getElementById('input-busca-inteligente');
    const btn = document.getElementById('btn-buscar-manual');

    if (input) input.addEventListener('input', () => filtrarERenderizar(input.value));
    if (btn) btn.addEventListener('click', () => filtrarERenderizar(input.value));

    const formPromover = document.getElementById('formPromover');
    if (formPromover) {
        formPromover.addEventListener('submit', async (e) => {
            e.preventDefault();
            const especialidade = document.getElementById('promover_especialidade').value;
            const salario = document.getElementById('promover_salario').value;
            await executarMudancaCargo(usuarioPromocao.id, usuarioPromocao.novoRole, especialidade, salario);
            bootstrap.Modal.getInstance(document.getElementById('modalPromover')).hide();
            e.target.reset();
        });
    }
});

// --- FUNÇÕES DE CARREGAMENTO E RENDER ---
window.carregarUsuarios = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        listaOriginal = await res.json();
        
        // LOG IMPORTANTE: Veja o que chega do banco no seu F12 -> Console
        console.log("Usuários recebidos do servidor:", listaOriginal);
        
        const contador = document.getElementById('contador-total');
        if (contador) contador.textContent = listaOriginal.length;
        
        filtrarERenderizar('');
    } catch (error) {
        console.error("Erro ao carregar lista de usuários:", error);
    }
}

function filtrarERenderizar(termo) {
    const t = termo.toLowerCase().trim();
    const equipeContainer = document.getElementById('lista-equipe');
    const clientesContainer = document.getElementById('lista-clientes');
    const equipeMobile = document.getElementById('mobile-lista-equipe');
    const clientesMobile = document.getElementById('mobile-lista-clientes');

    const filtrados = listaOriginal.filter(u => 
        (u.nome_completo || "").toLowerCase().includes(t) || 
        (u.email || "").toLowerCase().includes(t) || 
        (u.cpf || "").includes(t)
    );

    const equipe = filtrados.filter(u => u.role === 'admin' || u.role === 'funcionario');
    const clientes = filtrados.filter(u => u.role === 'cliente');
    if (equipeContainer) equipeContainer.innerHTML = equipe.map(cardUsuario).join('') || '<tr><td colspan="3" class="text-muted text-center py-4">Nenhum membro da equipe encontrado.</td></tr>';
    if (clientesContainer) clientesContainer.innerHTML = clientes.map(cardUsuario).join('') || '<tr><td colspan="3" class="text-muted text-center py-4">Nenhum cliente encontrado.</td></tr>';
    if (equipeMobile) equipeMobile.innerHTML = equipe.map(cardUsuarioMobile).join('') || '<p class="text-muted text-center py-3 mb-0">Nenhum membro da equipe encontrado.</p>';
    if (clientesMobile) clientesMobile.innerHTML = clientes.map(cardUsuarioMobile).join('') || '<p class="text-muted text-center py-3 mb-0">Nenhum cliente encontrado.</p>';
}

function cardUsuario(user) {
    // Garantimos que pegamos o ID independente do nome da coluna (id ou id_usuario)
    const userId = user.id || user.id_usuario;
    const escapar = escaparHtml;
    return `<tr>
        <td class="fw-semibold">${escapar(user.nome_completo || 'Sem Nome')}</td>
        <td>${escapar(user.email || 'Sem E-mail')}</td>
        <td><select class="form-select form-select-sm" onchange="window.verificarMudancaCargo('${escapar(userId)}', '${escapar(user.role)}', this.value)" aria-label="Permissão de ${escapar(user.nome_completo || 'usuário')}">
            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select></td>
    </tr>`;
}

function cardUsuarioMobile(user) {
    const userId = escaparHtml(user.id || user.id_usuario || '');
    const role = escaparHtml(user.role || 'cliente');
    const nome = escaparHtml(user.nome_completo || 'Sem Nome');
    const roleLabel = user.role === 'admin' ? 'Administrador' : user.role === 'funcionario' ? 'Funcionário' : 'Cliente';
    const email = escaparHtml(user.email || 'Não informado');
    const cpf = escaparHtml(user.cpf || 'Não informado');
    const telefone = escaparHtml(user.telefone || 'Não informado');

    return `<details class="mobile-disclosure">
        <summary><span>${nome}</span><i class="bi bi-chevron-down mobile-disclosure-chevron" aria-hidden="true"></i></summary>
        <div class="mobile-disclosure-body">
            <dl class="row small mb-3">
                <dt class="col-5 text-muted">E-mail</dt><dd class="col-7 text-break">${email}</dd>
                <dt class="col-5 text-muted">Cargo / Acesso</dt><dd class="col-7">${roleLabel}</dd>
                <dt class="col-5 text-muted">CPF</dt><dd class="col-7">${cpf}</dd>
                <dt class="col-5 text-muted">Telefone</dt><dd class="col-7">${telefone}</dd>
            </dl>
            <label class="form-label small fw-bold" for="mobile-role-${userId}">Alterar cargo / acesso</label>
            <select id="mobile-role-${userId}" class="form-select form-select-sm mobile-role-select mb-2" data-current-role="${role}" aria-label="Permissão de ${nome}">
                <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button type="button" class="btn btn-outline-dark btn-sm rounded-pill w-100" data-mobile-role-id="${userId}">Atualizar acesso</button>
        </div>
    </details>`;
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
}

// --- LÓGICA DE CARGOS ---
window.verificarMudancaCargo = (id, roleAntiga, novoRole) => {
    if (roleAntiga === 'cliente' && (novoRole === 'funcionario' || novoRole === 'admin')) {
        usuarioPromocao = { id, novoRole };
        new bootstrap.Modal(document.getElementById('modalPromover')).show();
        return;
    }
    if (confirm("Confirmar alteração de cargo?")) executarMudancaCargo(id, novoRole);
    else window.carregarUsuarios();
};

async function executarMudancaCargo(id, novoRole, esp = null, sal = null) {
    const payload = { id_usuario: id, novo_role: novoRole, especialidade: esp, salario: sal };
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) alert("Alteração realizada!");
    } catch (e) { alert("Erro de conexão"); }
    window.carregarUsuarios();
}

document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mobile-role-id]');
    if (!button) return;
    const select = button.parentElement.querySelector('.mobile-role-select');
    if (!select || select.value === select.dataset.currentRole) return;
    window.verificarMudancaCargo(button.dataset.mobileRoleId, select.dataset.currentRole, select.value);
});