// Importa o validador central de segurança
import { checkAdminAuth } from './admin_auth.js';

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. A BARREIRA DE SEGURANÇA
    const usuarioLogado = await checkAdminAuth();
    if (!usuarioLogado) return;
    
    // Bloqueia clientes
    if (usuarioLogado.role !== 'funcionario' && usuarioLogado.role !== 'admin') {
        alert("Acesso restrito à equipe operacional.");
        window.location.href = '../usuario/login.html';
        return;
    }

    // 2. NOME NA TELA
    document.getElementById('nome-funcionario').textContent = usuarioLogado.nome || "Equipe";
    if(usuarioLogado.role === 'admin') {
        document.getElementById('cargo-display').textContent = "Visualização de Equipe (Admin)";
    }

    // 3. CARREGA OS DADOS
    carregarKpisOperacionais(usuarioLogado.id);
    carregarFilaDeTrabalho(usuarioLogado.id);
    carregarAlertasDeVacina();
    
    // Sair do sistema
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token_acesso_regia_tinas');
        localStorage.removeItem('usuario_nome');
        localStorage.removeItem('usuario_id');
        window.location.href = '../usuario/login.html';
    });
});

async function carregarKpisOperacionais(funcionarioId) {
    setTimeout(() => {
        document.getElementById('kpi-atendimentos').textContent = "8";
        document.getElementById('kpi-daycare').textContent = "12";
        document.getElementById('kpi-avisos').textContent = "3";
    }, 800);
}

async function carregarFilaDeTrabalho(funcionarioId) {
    const tbody = document.getElementById('tabela-fila-trabalho');
    setTimeout(() => {
        tbody.innerHTML = `
            <tr>
                <td class="fw-bold text-dark">09:00</td>
                <td><div class="fw-bold">Rex (Golden)</div><small class="text-muted">Tutor: Maria Silva</small></td>
                <td>Banho e Tosa Completa</td>
                <td><span class="badge bg-warning text-dark badge-status">Aguardando Pet</span></td>
                <td class="text-end"><button class="btn btn-sm btn-success fw-bold"><i class="bi bi-check2-square me-1"></i>Iniciar</button></td>
            </tr>
            <tr>
                <td class="fw-bold text-dark">10:30</td>
                <td><div class="fw-bold">Luna (Siamês)</div><small class="text-muted">Tutor: João Pedro</small></td>
                <td>Consulta Rotina</td>
                <td><span class="badge bg-primary badge-status">Em Andamento</span></td>
                <td class="text-end"><button class="btn btn-sm btn-outline-dark fw-bold"><i class="bi bi-journal-text me-1"></i>Prontuário</button></td>
            </tr>
        `;
    }, 1200);
}

async function carregarAlertasDeVacina() {
    const listaAlertas = document.getElementById('lista-alertas-vacinas');
    setTimeout(() => {
        listaAlertas.innerHTML = `
            <li class="list-group-item px-0">
                <div class="d-flex w-100 justify-content-between"><h6 class="mb-1 fw-bold text-dark">Bolinha</h6><small class="text-danger fw-bold">Amanhã</small></div>
                <p class="mb-1 small text-muted">Vacina V10 • Tutor: Carlos</p>
            </li>
        `;
    }, 1500);
}