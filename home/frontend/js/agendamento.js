// 1. CONFIGURAÇÃO AMBIENTE
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. ESTADO GLOBAL DO AGENDAMENTO
let currentStep = 1;
let calendarDate = new Date(); 

const appointmentData = {
    cliente_id: localStorage.getItem('usuario_id'),
    loja_id: null,
    loja_nome: null,
    servico_id: null,
    servico_nome: null,
    servico_preco: 0,
    data: null, // YYYY-MM-DD
    horario: null, // HH:MM
    id_pet: null
};

// TRAVA DE SEGURANÇA: Obriga o cliente a ter cadastro/login antes de ver os horários
if (!appointmentData.cliente_id) {
    sessionStorage.setItem('url_retorno_agendamento', window.location.href);
    alert("Para realizar um agendamento, é necessário estar logado. Vamos te redirecionar!");
    window.location.href = 'login.html'; // CORREÇÃO: Aponta direto para a raiz
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadServices();
    loadStores();
    setupEventListeners();
}

// --- PASSO 1: CARREGAR SERVIÇOS (PREÇOS OCULTADOS DA INTERFACE) ---
async function loadServices() {
    const select = document.getElementById('service-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/servicos`);
        if (!res.ok) throw new Error(`Erro: ${res.status}`);
        
        const data = await res.json();
        const listaServicos = Array.isArray(data) ? data : (data.servicos || data.data || []);
        
        select.innerHTML = '<option value="" disabled selected>O que vamos fazer hoje?</option>';

        listaServicos.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_servico;
            opt.dataset.preco = s.preco_servico; // Mantido em background de forma invisível
            opt.textContent = s.nome_servico;   // CORREÇÃO: Exibe apenas o nome, sem preço!
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro serviços:", e);
        select.innerHTML = '<option value="">Erro ao carregar serviços.</option>';
    }
}

// --- PASSO 2: CARREGAR LOJAS ---
async function loadStores() {
    const select = document.getElementById('store-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/lojas`);
        const data = await res.json();
        const listaLojas = Array.isArray(data) ? data : (data.lojas || data.data || []);
        
        select.innerHTML = '<option value="" disabled selected>Selecione a unidade...</option>';
        listaLojas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id_loja;
            opt.textContent = l.nome_loja;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar lojas</option>';
    }
}

// --- PASSO 3: CALENDÁRIO COM HORÁRIOS FILTRADOS ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = '';
    const daysHeader = ['D','S','T','Q','Q','S','S'];
    daysHeader.forEach(d => grid.innerHTML += `<div class="calendar-day-name">${d}</div>`);

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(calendarDate);
    monthYearLabel.textContent = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${year}`;

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
        if (appointmentData.data === dateStr) dayEl.classList.add('selected');
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

async function fetchAvailableSlots(dateStr) {
    const container = document.getElementById('time-slots-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-danger spinner-border-sm"></div></div>';

    try {
        const url = `${API_BASE_URL}/api/horarios-disponiveis?loja_id=${appointmentData.loja_id}&servico_id=${appointmentData.servico_id}&data=${dateStr}`;
        const res = await fetch(url);
        const slots = await res.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 small text-uppercase text-secondary">Horários Disponíveis:</h6>';
        
        if (!slots || slots.length === 0) {
            container.innerHTML = '<p class="small text-muted text-center py-4">Agenda cheia para este dia.</p>';
            return;
        }

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn rounded-pill';
            btn.textContent = time;
            if (appointmentData.horario === time) btn.classList.replace('btn-outline-secondary', 'btn-danger');
            
            btn.onclick = () => {
                appointmentData.horario = time;
                document.querySelectorAll('.time-slot-btn').forEach(b => b.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn rounded-pill');
                btn.className = 'btn bg-brand-pink text-white btn-sm m-1 time-slot-btn rounded-pill';
                document.getElementById('nextButtonStep3').disabled = false;
            };
            container.appendChild(btn);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger small">Erro ao carregar horários.</p>';
    }
}

// --- PASSO 4: CARREGAR PETS AUTOMÁTICOS DO LOGADO ---
async function loadUserPets() {
    const select = document.getElementById('select-pet');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/usuario/${appointmentData.cliente_id}`);
        const data = await res.json();
        const listaPets = Array.isArray(data) ? data : [];
        
        select.innerHTML = '<option value="" disabled selected>Para qual pet será o atendimento?</option>';
        listaPets.forEach(p => {
            select.add(new Option(p.nome_pet, p.id_pet));
        });
        select.add(new Option("➕ Cadastrar Outro / Novo Pet", "NEW"));
    } catch (e) { 
        console.error("Erro ao puxar pets:", e); 
    }
}

// --- CONTROLE DE FLUXO ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n / 5) * 100}%`;
    currentStep = n;

    if (n === 4) loadUserPets();
    if (n === 5) gerarResSummary();
}

function gerarResSummary() {
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    const nomePet = isNewPet ? document.getElementById('nome_pet').value : selectPet.options[selectPet.selectedIndex].text;

    // Resumo final limpo sem nenhuma menção a preços ou valores financeiros
    document.getElementById('confirmation-summary').innerHTML = `
        <div class="row g-3">
            <div class="col-6"><small class="text-muted d-block">SERVIÇO ESCOLHIDO</small> <strong class="text-dark">${appointmentData.servico_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block">UNIDADE FÍSICA</small> <strong class="text-dark">${appointmentData.loja_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block">DATA SELECIONADA</small> <strong class="text-dark">${appointmentData.data.split('-').reverse().join('/')}</strong></div>
            <div class="col-6"><small class="text-muted d-block">HORÁRIO DA TOSA</small> <strong class="text-dark">${appointmentData.horario}</strong></div>
            <div class="col-12 border-top pt-2"><small class="text-muted d-block">ANIMAL VINCULADO</small> <strong class="text-dark"><i class="bi bi-paw-fill text-danger me-1"></i>${nomePet}</strong></div>
        </div>
    `;
}

function setupEventListeners() {
    document.getElementById('service-select').onchange = (e) => {
        appointmentData.servico_id = e.target.value;
        appointmentData.servico_nome = e.target.options[e.target.selectedIndex].text;
        appointmentData.servico_preco = e.target.options[e.target.selectedIndex].dataset.preco;
        document.getElementById('nextButtonStep1').disabled = false;
    };

    document.getElementById('store-select').onchange = (e) => {
        appointmentData.loja_id = e.target.value;
        appointmentData.loja_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep2').disabled = false;
    };

    document.getElementById('select-pet').onchange = (e) => {
        const fields = document.getElementById('new-pet-fields');
        if (fields) fields.style.display = (e.target.value === 'NEW') ? 'block' : 'none';
        appointmentData.id_pet = (e.target.value === 'NEW') ? null : e.target.value;
    };

    document.getElementById('nextButtonStep1').onclick = () => showStep(2);
    document.getElementById('nextButtonStep2').onclick = () => { renderCalendar(); showStep(3); };
    document.getElementById('nextButtonStep3').onclick = () => showStep(4);
    
    document.getElementById('pet-info-form').onsubmit = (e) => {
        e.preventDefault();
        showStep(5);
    };

    document.querySelectorAll('.btn-prev').forEach(b => {
        b.onclick = () => showStep(currentStep - 1);
    });

    document.getElementById('prevMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); };

    document.getElementById('confirmButton').onclick = confirmAppointment;
}

async function confirmAppointment() {
    const btn = document.getElementById('confirmButton');
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    
    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        id_pet: isNewPet ? null : appointmentData.id_pet,
        novo_pet: isNewPet ? {
            nome: document.getElementById('nome_pet').value.trim(),
            raca: document.getElementById('raca').value.trim() || 'SRD',
            porte: document.getElementById('porte').value
        } : null,
        observacoes: document.getElementById('observacoes').value.trim()
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Gravando Reserva...';
        
        const res = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✨ Tudo pronto! O seu agendamento foi confirmado.");
            window.location.href = 'meus_agendamentos.html'; // CORREÇÃO: Redireciona na raiz
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Ops: " + (err.error || "Falha ao registrar horário."));
            btn.disabled = false;
            btn.innerHTML = 'CONFIRMAR AGENDAMENTO <i class="bi bi-send-fill ms-2"></i>';
        }
    } catch (e) {
        alert("Erro de comunicação com o servidor.");
        btn.disabled = false;
        btn.innerHTML = 'CONFIRMAR AGENDAMENTO <i class="bi bi-send-fill ms-2"></i>';
    }
}