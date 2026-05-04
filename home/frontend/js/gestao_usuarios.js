import { checkAdminAuth } from './admin_auth.js';

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaOriginal = []; // Cache dos usuários
let filtroCargo = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    // Carrega os dados do Neon
    await carregarUsuarios();

    // 🔍 BUSCA EM TEMPO REAL
    const inputBusca = document.getElementById('input-busca-inteligente');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            filtrarERenderizar(e.target.value);
        });
    }

    // 📂 FILTRO POR ABAS (Equipe / Clientes)
    document.querySelectorAll('#pills-tab button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Estética das abas
            document.querySelector('#pills-tab .active').classList.remove('active');
            e.target.classList.add('active');
            
            // Lógica do filtro
            filtroCargo = e.target.getAttribute('data-role');
            filtrarERenderizar(document.getElementById('input-busca-inteligente').value);
        });
    });
});

async function carregarUsuarios() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        if (!res.ok) throw new Error("Erro ao buscar dados");
        
        listaOriginal = await res.json();
        console.log("Usuários carregados:", listaOriginal.length);
        filtrarERenderizar(''); // Primeira renderização
    } catch (error) {
        console.error("Erro na carga inicial:", error);
        document.getElementById('container-lista-usuarios').innerHTML = 
            '<div class="alert alert-danger text-center">Erro ao conectar com o banco de dados.</div>';
    }
}

function filtrarERenderizar(termo) {
    const container = document.getElementById('container-lista-usuarios');
    if (!container) return;

    const t = termo.toLowerCase().trim();

    const filtrados = listaOriginal.filter(u => {
        // Blindagem contra campos nulos no banco (evita o erro do .toLowerCase)
        const nome = (u.nome_completo || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const cpf = (u.cpf || "");

        const matchesSearch = nome.includes(t) || email.includes(t) || cpf.includes(t);
        const matchesRole = filtroCargo === 'todos' || u.role === filtroCargo;

        return matchesSearch && matchesRole;
    });

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-person-x fs-1 text-muted"></i>
                <p class="text-muted mt-2">Nenhum usuário encontrado para "${termo}"</p>
            </div>`;
        return;
    }

    container.innerHTML = filtrados.map(user => `
        <div class="col-md-6 col-lg-4">
            <div class="card user-card shadow-sm role-${user.role}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">${user.nome_completo || 'Sem Nome'}</h6>
                            <small class="text-muted d-block">${user.email || 'Sem e-mail'}</small>
                        </div>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : (user.role === 'funcionario' ? 'bg-info text-dark' : 'bg-pink')} small">
                            ${user.role ? user.role.toUpperCase() : 'CLIENTE'}
                        </span>
                    </div>
                    
                    <div class="mb-3 small">
                        <div class="text-muted"><i class="bi bi-phone me-2"></i>${user.telefone || 'Não cadastrado'}</div>
                        <div class="text-muted"><i class="bi bi-card-text me-2"></i>CPF: ${user.cpf || 'Não cadastrado'}</div>
                    </div>

                    <div class="d-flex gap-2 border-top pt-3">
                        <select class="form-select form-select-sm shadow-none" onchange="window.mudarCargo('${user.id}', this.value)">
                            <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Tornar Cliente</option>
                            <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Tornar Funcionário</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Tornar Admin</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// FUNÇÕES GLOBAIS
window.mudarCargo = async (id, novoRole) => {
    if(!confirm(`Deseja alterar as permissões para ${novoRole.toUpperCase()}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_usuario: id, novo_role: novoRole})
        });
        
        if(response.ok) {
            console.log("Cargo alterado!");
            await carregarUsuarios(); // Recarrega a lista do banco
        } else {
            alert("Erro ao salvar no banco.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    }
};