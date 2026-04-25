// js/admin_horarios.js - CONECTADO À API REAL

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    carregarProfissionais();

    // Quando escolhe um funcionário, carrega a agenda dele
    document.getElementById('profissional-select').addEventListener('change', (e) => {
        const idProfissional = e.target.value;
        if(idProfissional) {
            document.getElementById('area-agenda').style.display = 'block';
            carregarHorarioPadrao(idProfissional);
            carregarFolgas(idProfissional);
            // renderizarCalendarioMock(); // Opcional: Manter o mini-calendário visual
        }
    });

    // Salvar nova folga/bloqueio
    document.getElementById('blockDayForm').addEventListener('submit', salvarFolga);
    
    // Salvar grade de horários da semana
    document.getElementById('horariosForm').addEventListener('submit', salvarGradeHorarios);
});

// --- 1. BUSCAR FUNCIONÁRIOS DO BANCO ---
async function carregarProfissionais() {
    const select = document.getElementById('profissional-select');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/funcionarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const profissionais = await response.json();
            profissionais.forEach(p => {
                select.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.nome_completo}</option>`);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar profissionais", error);
    }
}

// --- 2. CARREGAR GRADE DE HORÁRIOS ---
async function carregarHorarioPadrao(idProfissional) {
    const tbody = document.getElementById('tabela-horarios-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-danger"></div></td></tr>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/horarios-profissional/${idProfissional}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const horarios = response.ok ? await response.json() : [];
        const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

        tbody.innerHTML = diasSemana.map(dia => {
            // Procura se já tem salvo no banco, senão traz vazio
            const h = horarios.find(x => x.dia_semana === dia) || { is_folga: false, hora_inicio: '09:00', hora_fim: '18:00' };
            const checkFolga = h.is_folga ? '' : 'checked';
            const disabled = h.is_folga ? 'disabled' : '';

            return `
            <tr data-dia="${dia}">
                <td class="fw-bold text-secondary">${dia}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input switch-folga" type="checkbox" role="switch" ${checkFolga}>
                        <label class="form-check-label small">${h.is_folga ? 'Folga' : 'Trabalha'}</label>
                    </div>
                </td>
                <td><input type="time" class="form-control form-control-sm shadow-sm input-inicio" value="${h.hora_inicio || ''}" ${disabled}></td>
                <td><input type="time" class="form-control form-control-sm shadow-sm input-fim" value="${h.hora_fim || ''}" ${disabled}></td>
            </tr>
            `;
        }).join('');

        // Adiciona evento para desabilitar/habilitar horários ao clicar na chave de Folga
        document.querySelectorAll('.switch-folga').forEach(switchEl => {
            switchEl.addEventListener('change', (e) => {
                const tr = e.target.closest('tr');
                const isFolga = !e.target.checked;
                tr.querySelector('label').innerText = isFolga ? 'Folga' : 'Trabalha';
                tr.querySelector('.input-inicio').disabled = isFolga;
                tr.querySelector('.input-fim').disabled = isFolga;
            });
        });

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Ligue o servidor Python.</td></tr>';
    }
}

// --- 3. SALVAR GRADE DE HORÁRIOS ---
async function salvarGradeHorarios(e) {
    e.preventDefault();
    const idProfissional = document.getElementById('profissional-select').value;
    const linhas = document.querySelectorAll('#tabela-horarios-body tr');
    
    const grade = Array.from(linhas).map(tr => ({
        dia_semana: tr.dataset.dia,
        is_folga: !tr.querySelector('.switch-folga').checked,
        hora_inicio: tr.querySelector('.input-inicio').value || null,
        hora_fim: tr.querySelector('.input-fim').value || null
    }));

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/horarios-profissional/${idProfissional}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ grade })
        });

        if (response.ok) alert("Horários semanais salvos com sucesso!");
        else alert("Erro ao salvar horários.");
    } catch (error) {
        alert("Erro de conexão.");
    }
}

// --- 4. CARREGAR FOLGAS/BLOQUEIOS ESPECÍFICOS ---
async function carregarFolgas(idProfissional) {
    const list = document.getElementById('blockedDaysList');
    list.innerHTML = '<div class="text-center p-3"><span class="spinner-border text-danger"></span></div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/ausencias-profissional/${idProfissional}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const folgas = await response.json();
            if(folgas.length === 0) {
                list.innerHTML = '<li class="list-group-item text-muted">Nenhuma ausência registrada.</li>';
                return;
            }

            list.innerHTML = folgas.map(f => `
                <li class="list-group-item d-flex justify-content-between align-items-center border-start border-4 border-danger mb-2 shadow-sm rounded bg-white">
                    <div>
                        <strong class="text-dark"><i class="bi bi-calendar-event me-2"></i>${new Date(f.data_bloqueada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong><br>
                        <small class="text-muted">${f.motivo || 'Folga'}</small>
                    </div>
                    <button class="btn btn-sm btn-light text-danger" title="Cancelar Folga" onclick="window.removerFolga(${f.id_bloqueio}, '${idProfissional}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `).join('');
        }
    } catch (error) {
        list.innerHTML = '<li class="list-group-item text-danger">Erro de conexão.</li>';
    }
}

// --- 5. SALVAR NOVA FOLGA ---
async function salvarFolga(e) {
    e.preventDefault();
    const idProfissional = document.getElementById('profissional-select').value;
    const dataAusencia = document.getElementById('blockDayForm').querySelector('input[type="date"]').value;
    const motivo = document.getElementById('blockDayForm').querySelector('select').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/bloquear-dia`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ id_funcionario: idProfissional, data: dataAusencia, motivo })
        });

        if (response.ok) {
            alert("Ausência registrada!");
            document.getElementById('blockDayForm').reset();
            carregarFolgas(idProfissional);
        } else {
            alert("Erro ao salvar folga.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
}

// --- 6. REMOVER FOLGA ---
window.removerFolga = async (idBloqueio, idProfissional) => {
    if(!confirm("Deseja cancelar esta folga/ausência?")) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/remover-bloqueio/${idBloqueio}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) carregarFolgas(idProfissional);
        else alert("Erro ao cancelar folga.");
    } catch (error) {
        alert("Erro de conexão.");
    }
};