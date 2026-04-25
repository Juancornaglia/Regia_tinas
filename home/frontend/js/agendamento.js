// js/agendamento.js

// 1. CONFIGURAÇÃO AMBIENTE
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. ESTADO DO AGENDAMENTO
let currentStep = 1;
const appointmentData = {
    cliente_id: localStorage.getItem('usuario_id'),
    loja_id: null,
    loja_nome: null,
    servico_id: null,
    servico_nome: null,
    data: null, // Formato YYYY-MM-DD
    horario: null, // Formato HH:MM
    id_pet: null // Null se for novo pet
};

// --- SEGURANÇA: REDIRECIONA SE NÃO TIVER LOGADO ---
if (!appointmentData.cliente_id) {
    alert("Por favor, faça login para agendar.");
    window.location.href = '../usuario/login.html';
}

// --- CARREGAR SERVIÇOS ---
async function loadServices() {
    const select = document.getElementById('service-select');
    try {
        const res = await fetch(`${API_BASE_URL}/api/servicos_lista`);
        const data = await res.json();
        
        select.innerHTML = '<option value="" disabled selected>O que vamos fazer hoje?</option>';
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_servico;
            opt.textContent = `${s.nome_servico} - R$ ${s.preco_servico}`;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar serviços</option>';
    }
}

// --- CARREGAR LOJAS ---
async function loadStores() {
    const select = document.getElementById('store-select');
    try {
        const res = await fetch(`${API_BASE_URL}/api/lojas`);
        const data = await res.json();
        
        select.innerHTML = '<option value="" disabled selected>Selecione a unidade...</option>';
        data.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id_loja;
            opt.textContent = l.nome_loja;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    }
}

// --- CARREGAR PETS DO USUÁRIO ---
async function loadUserPets() {
    const select = document.getElementById('select-pet');
    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/usuario/${appointmentData.cliente_id}`);
        const data = await res.json();
        
        // Mantém a opção de "Novo Pet" e limpa o resto
        select.innerHTML = '<option value="NEW">-- Cadastrar Novo Pet --</option>';
        
        if (Array.isArray(data)) {
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_pet;
                opt.textContent = p.nome_pet;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar pets do usuário");
    }
}

// --- BUSCAR HORÁRIOS DISPONÍVEIS ---
async function fetchAvailableSlots(dateStr) {
    const container = document.getElementById('time-slots-container');
    container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-brand"></div><p class="small text-muted">Buscando horários...</p></div>';

    try {
        const url = `${API_BASE_URL}/api/horarios-disponiveis?loja_id=${appointmentData.loja_id}&servico_id=${appointmentData.servico_id}&data=${dateStr}`;
        const res = await fetch(url);
        const slots = await res.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 small text-uppercase">Horários para este dia:</h6>';
        
        if (!slots || slots.length === 0) {
            container.innerHTML = '<div class="text-center mt-5"><i class="bi bi-calendar-x fs-1 text-muted"></i><p class="text-muted mt-2">Sem horários livres ou dia bloqueado.</p></div>';
            return;
        }

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn';
            btn.textContent = time;
            btn.onclick = () => {
                appointmentData.horario = time;
                // Estilização visual da seleção
                document.querySelectorAll('.time-slot-btn').forEach(b => {
                    b.classList.remove('bg-brand', 'text-white', 'border-brand');
                    b.classList.add('btn-outline-secondary');
                });
                btn.classList.remove('btn-outline-secondary');
                btn.classList.add('bg-brand', 'text-white', 'border-brand');
                document.getElementById('nextButtonStep3').disabled = false;
            };
            container.appendChild(btn);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger text-center">Erro ao carregar horários.</p>';
    }
}

// --- GESTÃO DO CALENDÁRIO ---
let calendarDate = new Date();
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = ''; // Limpa tudo
    const daysHeader = ['D','S','T','Q','Q','S','S'];
    daysHeader.forEach(d => grid.innerHTML += `<div class="calendar-day-name">${d}</div>`);

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    monthYear.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';

    for (let d = 1; d <= totalDays; d++) {
        const loopDate = new Date(year, month, d);
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isPast = loopDate < today;

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isPast ? 'disabled' : ''}`;
        dayEl.textContent = d;

        if (!isPast) {
            dayEl.onclick = () => {
                appointmentData.data = dateStr;
                document.querySelectorAll('.calendar-day.selected').forEach(x => x.classList.remove('selected'));
                dayEl.classList.add('selected');
                fetchAvailableSlots(dateStr);
            };
        }
        grid.appendChild(dayEl);
    }
}

// --- NAVEGAÇÃO DOS PASSOS ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n / 5) * 100}%`;
    currentStep = n;

    if (n === 4) loadUserPets(); // Carrega pets quando chegar no passo 4

    if (n === 5) {
        // Gera o resumo final
        const isNewPet = document.getElementById('select-pet').value === 'NEW';
        const nomePet = isNewPet ? document.getElementById('nome_pet').value : document.getElementById('select-pet').options[document.getElementById('select-pet').selectedIndex].text;

        document.getElementById('confirmation-summary').innerHTML = `
            <div class="row g-3">
                <div class="col-6"><small class="text-muted d-block">SERVIÇO</small> <strong>${appointmentData.servico_nome}</strong></div>
                <div class="col-6"><small class="text-muted d-block">UNIDADE</small> <strong>${appointmentData.loja_nome}</strong></div>
                <div class="col-6"><small class="text-muted d-block">DATA</small> <strong>${new Date(appointmentData.data + "T12:00:00").toLocaleDateString('pt-BR')}</strong></div>
                <div class="col-6"><small class="text-muted d-block">HORÁRIO</small> <strong>${appointmentData.horario}</strong></div>
                <div class="col-12"><small class="text-muted d-block">PET</small> <strong>${nomePet}</strong></div>
            </div>
        `;
    }
}

// --- CONFIRMAÇÃO FINAL ---
async function confirmAppointment() {
    const btn = document.getElementById('confirmButton');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Agendando...';

    const isNewPet = document.getElementById('select-pet').value === 'NEW';
    
    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        id_pet: isNewPet ? null : appointmentData.id_pet,
        // Se for novo pet, manda os dados extras
        novo_pet: isNewPet ? {
            nome: document.getElementById('nome_pet').value,
            raca: document.getElementById('especie_raca').value,
            porte: document.getElementById('porte').value
        } : null,
        observacoes: document.getElementById('observacoes').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✨ Agendamento realizado com sucesso! Esperamos por você.");
            window.location.href = 'meus_agendamentos.html';
        } else {
            const err = await res.json();
            alert("Erro: " + err.error);
            btn.disabled = false;
            btn.innerText = "Confirmar Agora!";
        }
    } catch (e) {
        alert("Erro de conexão com o servidor.");
        btn.disabled = false;
    }
}

// --- EVENTOS INICIAIS ---
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadStores();

    // Eventos de Seleção
    document.getElementById('service-select').onchange = (e) => {
        appointmentData.servico_id = e.target.value;
        appointmentData.servico_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep1').disabled = false;
    };

    document.getElementById('store-select').onchange = (e) => {
        appointmentData.loja_id = e.target.value;
        appointmentData.loja_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep2').disabled = false;
    };

    document.getElementById('select-pet').onchange = (e) => {
        const fields = document.getElementById('new-pet-fields');
        if (e.target.value === 'NEW') {
            fields.style.display = 'block';
            appointmentData.id_pet = null;
        } else {
            fields.style.display = 'none';
            appointmentData.id_pet = e.target.value;
        }
    };

    // Botões Próximo/Voltar
    document.getElementById('nextButtonStep1').onclick = () => showStep(2);
    document.getElementById('nextButtonStep2').onclick = () => { renderCalendar(); showStep(3); };
    document.getElementById('nextButtonStep3').onclick = () => showStep(4);
    
    document.getElementById('pet-info-form').onsubmit = (e) => {
        e.preventDefault();
        showStep(5);
    };

    document.getElementById('confirmButton').onclick = confirmAppointment;
    document.querySelectorAll('.btn-back').forEach(b => b.onclick = () => showStep(currentStep - 1));

    // Navegação Calendário
    document.getElementById('prevMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); };
});