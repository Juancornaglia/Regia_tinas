// 1. CONFIGURAÇÃO AMBIENTE
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. ESTADO GLOBAL DO AGENDAMENTO
let currentStep = 1;
let calendarDate = new Date(); // Data base para navegação do calendário

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

// SEGURANÇA: REDIRECIONA SE NÃO TIVER LOGADO
if (!appointmentData.cliente_id) {
    alert("Por favor, faça login para agendar.");
    window.location.href = '../usuario/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

// --- INICIALIZAÇÃO ---
function init() {
    loadServices();
    loadStores();
    setupEventListeners();
}

// --- PASSO 1: CARREGAR SERVIÇOS ---
async function loadServices() {
    const select = document.getElementById('service-select');
    try {
        const res = await fetch(`${API_BASE_URL}/api/servicos_lista`);
        const data = await res.json();
        
        select.innerHTML = '<option value="" disabled selected>O que vamos fazer hoje?</option>';
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_servico;
            // Guardamos o preço no atributo data para facilitar a recuperação depois
            opt.dataset.preco = s.preco_servico;
            opt.textContent = `${s.nome_servico} - R$ ${s.preco_servico}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao carregar serviços:", e);
        select.innerHTML = '<option value="">Erro ao carregar serviços</option>';
    }
}

// --- PASSO 2: CARREGAR LOJAS ---
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
        console.error("Erro ao carregar lojas:", e);
    }
}

// --- PASSO 3: CALENDÁRIO E HORÁRIOS ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = '';
    const daysHeader = ['D','S','T','Q','Q','S','S'];
    daysHeader.forEach(d => grid.innerHTML += `<div class="calendar-day-name">${d}</div>`);

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    
    // Nome do mês em português
    const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(calendarDate);
    monthYearLabel.textContent = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    // Espaços vazios do início do mês
    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';

    // Dias do mês
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
    container.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-brand spinner-border-sm"></div></div>';

    try {
        const url = `${API_BASE_URL}/api/horarios-disponiveis?loja_id=${appointmentData.loja_id}&servico_id=${appointmentData.servico_id}&data=${dateStr}`;
        const res = await fetch(url);
        const slots = await res.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 small text-uppercase">Horários Livres:</h6>';
        
        if (!slots || slots.length === 0) {
            container.innerHTML = '<div class="text-center py-4"><i class="bi bi-calendar-x text-muted"></i><p class="small text-muted">Lotado ou Fechado</p></div>';
            return;
        }

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn';
            btn.textContent = time;
            if (appointmentData.horario === time) btn.classList.replace('btn-outline-secondary', 'btn-brand');
            
            btn.onclick = () => {
                appointmentData.horario = time;
                document.querySelectorAll('.time-slot-btn').forEach(b => b.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn');
                btn.className = 'btn btn-brand btn-sm m-1 time-slot-btn text-white';
                document.getElementById('nextButtonStep3').disabled = false;
            };
            container.appendChild(btn);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger small">Erro ao carregar horários.</p>';
    }
}

// --- PASSO 4: CARREGAR PETS ---
async function loadUserPets() {
    const select = document.getElementById('select-pet');
    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/usuario/${appointmentData.cliente_id}`);
        const data = await res.json();
        
        select.innerHTML = '<option value="NEW">-- Cadastrar Novo Pet --</option>';
        if (Array.isArray(data)) {
            data.forEach(p => {
                const opt = new Option(p.nome_pet, p.id_pet);
                select.add(opt);
            });
        }
    } catch (e) { console.error("Erro pets"); }
}

// --- NAVEGAÇÃO E WIZARD ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n / 5) * 100}%`;
    currentStep = n;

    if (n === 4) loadUserPets();
    if (n === 5) gerarResumo();
}

function gerarResumo() {
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

// --- EVENTOS E CLIQUES ---
function setupEventListeners() {
    // Passo 1 -> Passo 2
    document.getElementById('service-select').onchange = (e) => {
        appointmentData.servico_id = e.target.value;
        appointmentData.servico_nome = e.target.options[e.target.selectedIndex].text.split(' - ')[0];
        appointmentData.servico_preco = e.target.options[e.target.selectedIndex].dataset.preco;
        document.getElementById('nextButtonStep1').disabled = false;
    };

    // Passo 2 -> Passo 3
    document.getElementById('store-select').onchange = (e) => {
        appointmentData.loja_id = e.target.value;
        appointmentData.loja_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep2').disabled = false;
    };

    // Pet NEW/EXISTING
    document.getElementById('select-pet').onchange = (e) => {
        document.getElementById('new-pet-fields').style.display = (e.target.value === 'NEW') ? 'block' : 'none';
        appointmentData.id_pet = (e.target.value === 'NEW') ? null : e.target.value;
    };

    // Navegação botões
    document.getElementById('nextButtonStep1').onclick = () => showStep(2);
    document.getElementById('nextButtonStep2').onclick = () => { renderCalendar(); showStep(3); };
    document.getElementById('nextButtonStep3').onclick = () => showStep(4);
    
    document.getElementById('pet-info-form').onsubmit = (e) => {
        e.preventDefault();
        showStep(5);
    };

    document.querySelectorAll('.btn-back').forEach(b => {
        b.onclick = () => showStep(currentStep - 1);
    });

    // Meses Calendário
    document.getElementById('prevMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); };

    // Confirmar Final
    document.getElementById('confirmButton').onclick = confirmAppointment;
}

// --- ENVIO PARA O BACKEND ---
async function confirmAppointment() {
    const btn = document.getElementById('confirmButton');
    const isNewPet = document.getElementById('select-pet').value === 'NEW';
    
    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        id_pet: isNewPet ? null : appointmentData.id_pet,
        novo_pet: isNewPet ? {
            nome: document.getElementById('nome_pet').value,
            raca: document.getElementById('especie_raca').value,
            porte: document.getElementById('porte').value
        } : null,
        observacoes: document.getElementById('observacoes').value
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Gravando...';
        
        const res = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✨ Tudo pronto! Seu agendamento foi confirmado.");
            window.location.href = 'meus_agendamentos.html';
        } else {
            const err = await res.json();
            alert("Ops: " + err.error);
            btn.disabled = false;
            btn.innerText = "Confirmar Agora!";
        }
    } catch (e) {
        alert("Erro de conexão.");
        btn.disabled = false;
    }
}