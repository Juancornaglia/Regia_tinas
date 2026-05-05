import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaOriginal = [];
let usuarioPromocao = null; // Guarda os dados temporariamente

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarUsuarios();

    const input = document.getElementById('input-busca-inteligente');
    const btn = document.getElementById('btn-buscar-manual');

    input.addEventListener('input', () => filtrarERenderizar(input.value));
    btn.addEventListener('click', () => filtrarERenderizar(input.value));

    // Evento de disparo do Modal de Promoção
    document.getElementById('formPromover').addEventListener('submit', async (e) => {
        e.preventDefault();
        const especialidade = document.getElementById('promover_especialidade').value;
        const salario = document.getElementById('promover_salario').value;

        await executarMudancaCargo(usuarioPromocao.id, usuarioPromocao.novoRole, especialidade, salario);
        
        // Fecha o modal e limpa tudo
        bootstrap.Modal.getInstance(document.getElementById('modalPromover')).hide();
        e.target.reset();
    });
});

window.carregarUsuarios = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        if (res.status === 404) throw new Error("Rota não encontrada no servidor.");
        listaOriginal = await res.json();
        
        const input = document.getElementById('input-busca-inteligente');
        filtrarERenderizar(input ? input.value : '');
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
                    <div class="d-flex justify-content-between mb-2">
                        <h6 class="fw-bold mb-0">${user.nome_completo || 'Sem Nome'}</h6>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-pink')} small">
                            ${user.role.toUpperCase()}
                        </span>
                    </div>
                    <p class="small text-muted mb-3"><i class="bi bi-envelope me-1"></i>${user.email}</p>
                    
                    <select class="form-select form-select-sm bg-light border-0" onchange="window.verificarMudancaCargo('${user.id}', '${user.role}', this.value)">
                        <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Acesso: Cliente</option>
                        <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Acesso: Funcionário</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Acesso: Admin</option>
                    </select>
                </div>
            </div>
        </div>`;
}

// ----------------------------------------------------
// LÓGICA INTELIGENTE DE TROCA DE CARGOS
// ----------------------------------------------------
window.verificarMudancaCargo = (id, roleAntiga, novoRole) => {
    // Se está promovendo um cliente para equipe, abre o Modal de RH
    if (roleAntiga === 'cliente' && (novoRole === 'funcionario' || novoRole === 'admin')) {
        usuarioPromocao = { id, novoRole };
        const modal = new bootstrap.Modal(document.getElementById('modalPromover'));
        modal.show();
        return; // Pausa aqui até o Modal ser preenchido
    }

    // Se for rebaixamento (Admin -> Cliente) ou só troca de Admin/Func, vai direto
    if (confirm(`Atenção: Tem certeza que deseja alterar as permissões para ${novoRole.toUpperCase()}?`)) {
        executarMudancaCargo(id, novoRole, null, null);
    } else {
        carregarUsuarios(); // Reseta o select caso ele cancele
    }
};

async function executarMudancaCargo(id, novoRole, especialidade, salario) {
    try {
        const payload = { 
            id_usuario: id, 
            novo_role: novoRole 
        };
        
        // Se vieram dados do Modal, envia junto
        if (especialidade) payload.especialidade = especialidade;
        if (salario) payload.salario = salario;

        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Permissões e dados de equipe atualizados com sucesso!");
        } else {
            const data = await res.json().catch(()=>null);
            alert((data && data.error) ? data.error : "Erro ao atualizar cargo.");
        }
    } catch (e) {
        alert("Erro de conexão com o servidor.");
    } finally {
        carregarUsuarios(); // Atualiza a tela independente do resultado
    }
}