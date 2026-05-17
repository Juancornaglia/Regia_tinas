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

// SEGURANÇA: Garante login prévio
if (!appointmentData.cliente_id) {
    sessionStorage.setItem('url_retorno_agendamento', window.location.href);
    alert("Por favor, faça login na sua conta para agendar o serviço.");
    window.location.href = '../usuario/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadServices();
    loadStores();
    setupEventListeners();
}

// --- PASSO 1: CARREGAR SERVIÇOS ---
async function loadServices() {
    const select = document.getElementById('service-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/servicos`);
        if (!res.ok) throw new Error("Falha ao buscar serviços");
        const data = await res.json();
        
        const listaServicos = Array.isArray(data) ? data : (data.servicos || data.data || []);
        
        select.innerHTML = '<option value="" disabled selected>O que vamos fazer hoje?</option>';
        if (listaServicos.length === 0) return select.innerHTML = '<option value="">Nenhum serviço disponível</option>';

        listaServicos.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_servico;
            opt.dataset.preco = s.preco_servico;
            opt.textContent = `${s.nome_servico} - R$ ${s.preco_servico}`;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar os serviços.</option>';
    }
}

// --- PASSO 2: CARREGAR LOJAS ---
async function loadStores() {
    const select = document.getElementById('store-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/lojas`);
        if (!res.ok) throw new Error("Falha ao buscar lojas");
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
        select.innerHTML = '<option value="">Erro ao carregar as unidades.</option>';
    }
}

// --- PASSO 3: CALENDÁRIO ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = '';
    const daysHeader = ['D','S','T','Q','Q','S','S'];
    daysHeader.forEach(d => grid.innerHTML += `<div class="calendar-day-name fw-bold text-muted small">${d}</div>`);

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
        dayEl.className = `calendar-day ${isPast ? 'disabled opacity-25' : ''}`;
        if (appointmentData.data === dateStr) dayEl.classList.add('selected', 'bg-brand', 'text-white', 'rounded-circle');
        dayEl.textContent = d;

        if (!isPast) {
            dayEl.onclick = () => {
                appointmentData.data = dateStr;
                renderCalendar(); // Re-renderiza para aplicar o estilo visual do dia
                fetchAvailableSlots(dateStr);
            };
        }
        grid.appendChild(dayEl);
    }
}

// --- BUSCA OS HORÁRIOS LIVRES NO PYTHON ---
async function fetchAvailableSlots(dateStr) {
    const container = document.getElementById('time-slots-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-danger spinner-border-sm"></div><p class="small text-muted mt-2">Buscando horários...</p></div>';

    try {
        const url = `${API_BASE_URL}/api/horarios-disponiveis?loja_id=${appointmentData.loja_id}&servico_id=${appointmentData.servico_id}&data=${dateStr}`;
        const res = await fetch(url);
        
        // TRATAMENTO INTELIGENTE DO ERRO 404 (Avisa se o Python não tiver a rota)
        if (res.status === 404) {
            container.innerHTML = '<p class="text-danger small mt-3 fw-bold"><i class="bi bi-exclamation-triangle"></i> Erro 404: Rota de horários ausente no Backend.</p>';
            return;
        }

        const slots = await res.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 small text-uppercase text-secondary mt-3">Horários Livres:</h6>';
        
        if (!slots || slots.length === 0) {
            container.innerHTML += '<div class="text-center py-3 bg-light rounded-3"><i class="bi bi-calendar-x text-muted fs-4"></i><p class="small text-muted mb-0">Agenda lotada para este dia.</p></div>';
            return;
        }

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'd-flex flex-wrap gap-2 justify-content-center';
        
        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = `btn btn-sm rounded-pill px-3 py-2 fw-medium ${appointmentData.horario === time ? 'btn-danger text-white shadow-sm' : 'btn-outline-secondary'}`;
            btn.textContent = time;
            
            btn.onclick = () => {
                appointmentData.horario = time;
                fetchAvailableSlots(dateStr); // Re-renderiza para destacar o botão clicado
                
                const nextBtn = document.getElementById('nextButtonStep3');
                if (nextBtn) nextBtn.disabled = false;
            };
            slotsGrid.appendChild(btn);
        });
        container.appendChild(slotsGrid);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger small mt-3">Falha ao conectar com o servidor Neon.</p>';
    }
}

// --- PASSO 4: CARREGAR PETS ---
async function loadUserPets() {
    const select = document.getElementById('select-pet');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/usuario/${appointmentData.cliente_id}`);
        const data = await res.json();
        const listaPets = Array.isArray(data) ? data : [];
        
        select.innerHTML = '<option value="NEW">-- Adicionar um Novo Pet --</option>';
        listaPets.forEach(p => select.add(new Option(p.nome_pet, p.id_pet)));
    } catch (e) { 
        console.error("Erro pets:", e); 
    }
}

// --- NAVEGAÇÃO WIZARD ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.style.display = (i + 1 === n) ? 'block' : 'none');
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n / 5) * 100}%`;
    currentStep = n;

    if (n === 4) loadUserPets();
    if (n === 5) gerarResSummary();
}

function gerarResSummary() {
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    const nomePet = isNewPet ? (document.getElementById('nome_pet')?.value || 'Novo Pet') : selectPet.options[selectPet.selectedIndex].text;

    document.getElementById('confirmation-summary').innerHTML = `
        <div class="row g-3 bg-light p-3 rounded-4 border">
            <div class="col-6"><small class="text-muted d-block" style="font-size:0.7rem;">SERVIÇO</small> <strong class="text-dark">${appointmentData.servico_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block" style="font-size:0.7rem;">UNIDADE</small> <strong class="text-dark">${appointmentData.loja_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block" style="font-size:0.7rem;">DATA</small> <strong class="text-dark">${appointmentData.data.split('-').reverse().join('/')}</strong></div>
            <div class="col-6"><small class="text-muted d-block" style="font-size:0.7rem;">HORÁRIO</small> <strong class="text-dark">${appointmentData.horario}</strong></div>
            <div class="col-12 border-top pt-2"><small class="text-muted d-block" style="font-size:0.7rem;">PET SELECIONADO</small> <strong class="text-dark"><i class="bi bi-paw-fill text-danger me-1"></i>${nomePet}</strong></div>
        </div>
    `;
}

// --- LISTENERS ---
function setupEventListeners() {
    document.getElementById('service-select').onchange = (e) => {
        appointmentData.servico_id = e.target.value;
        appointmentData.servico_nome = e.target.options[e.target.selectedIndex].text.split(' - ')[0];
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

    document.getElementById('nextButtonStep1')?.addEventListener('click', () => showStep(2));
    document.getElementById('nextButtonStep2')?.addEventListener('click', () => { renderCalendar(); showStep(3); });
    document.getElementById('nextButtonStep3')?.addEventListener('click', () => showStep(4));
    
    document.getElementById('pet-info-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showStep(5);
    });

    document.querySelectorAll('.btn-back').forEach(b => b.onclick = () => showStep(currentStep - 1));

    document.getElementById('prevMonthButton')?.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('nextMonthButton')?.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

    document.getElementById('confirmButton')?.addEventListener('click', confirmAppointment);
}

// --- ENVIO FINAL PARA O BACKEND ---
async function confirmAppointment() {
    const btn = document.getElementById('confirmButton');
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    
    const inputObs = document.getElementById('observacoes') || document.getElementById('observacoes_cliente');
    const inputNomePet = document.getElementById('nome_pet');
    const inputRaca = document.getElementById('especie_raca') || document.getElementById('raca');
    const inputPorte = document.getElementById('porte');
    
    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        id_pet: isNewPet ? null : appointmentData.id_pet,
        novo_pet: isNewPet ? {
            nome: inputNomePet ? inputNomePet.value.trim() : 'Pet Sem Nome',
            raca: inputRaca ? inputRaca.value.trim() : 'SRD',
            porte: inputPorte ? inputPorte.value : 'Médio'
        } : null,
        observacoes: inputObs ? inputObs.value.trim() : ''
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Finalizando...';
        
        const res = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✨ Tudo pronto! O seu agendamento foi confirmado no Neon.");
            window.location.href = '../usuario/perfil.html';
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Ops: " + (err.error || "Falha ao registrar horário no banco."));
            btn.disabled = false;
            btn.innerText = "Confirmar Agora!";
        }
    } catch (e) {
        console.error(e);
        alert("Erro de comunicação com o servidor.");
        btn.disabled = false;
        btn.innerText = "Confirmar Agora!";
    }
}