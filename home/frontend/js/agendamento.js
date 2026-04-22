// 1. CONFIGURAÇÃO DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

let currentStep = 1;
const appointmentData = {
    loja_id: null, loja_nome: null,
    servico_id: null, servico_nome: null,
    data: null, horario: null,
    cliente_id: localStorage.getItem('usuario_id')
};

// --- CARREGAR SERVIÇOS ---
async function loadServices() {
    const serviceSelect = document.getElementById('service-select');
    if (!serviceSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/servicos_lista`);
        if (!response.ok) throw new Error("Erro ao buscar serviços");
        
        const data = await response.json();
        serviceSelect.innerHTML = '<option value="" disabled selected>Selecione o serviço...</option>';
        data.forEach(s => {
            serviceSelect.innerHTML += `<option value="${s.id_servico}">${s.nome_servico}</option>`;
        });
    } catch (e) { 
        console.error(e);
        serviceSelect.innerHTML = '<option value="">Erro ao carregar serviços</option>';
    }
}

// --- CARREGAR LOJAS ---
async function loadStores() {
    const storeSelect = document.getElementById('store-select');
    if (!storeSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        if (!response.ok) throw new Error("Erro ao buscar lojas");

        const data = await response.json();
        storeSelect.innerHTML = '<option value="" disabled selected>Selecione a unidade...</option>';
        data.forEach(l => {
            storeSelect.innerHTML += `<option value="${l.id_loja}">${l.nome_loja}</option>`;
        });
    } catch (e) { 
        console.error(e);
        storeSelect.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    }
}

// --- BUSCAR HORÁRIOS ---
async function fetchAvailableSlots(lojaId, servicoId, dateStr) {
    const container = document.getElementById('time-slots-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-brand"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/horarios-disponiveis?loja_id=${lojaId}&servico_id=${servicoId}&data=${dateStr}`);
        
        if (!response.ok) throw new Error("Erro ao buscar horários");
        
        const slots = await response.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 text-secondary">Horários livres:</h6>';
        if (!slots || slots.length === 0) {
            container.innerHTML = '<p class="text-muted text-center mt-5">Lotado! Tente outro dia.</p>';
            return;
        }

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary m-1 time-slot-btn';
            btn.textContent = time;
            btn.onclick = () => {
                appointmentData.horario = time;
                document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.replace('btn-primary', 'btn-outline-secondary'));
                btn.classList.replace('btn-outline-secondary', 'btn-primary');
                document.getElementById('nextButtonStep3').disabled = false;
            };
            container.appendChild(btn);
        });
    } catch (e) { 
        container.innerHTML = '<p class="text-danger">Erro ao carregar horários.</p>'; 
    }
}

// --- GESTÃO DO CALENDÁRIO ---
let calendarDate = new Date();
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    if (!grid || !monthYear) return;

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    
    monthYear.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    grid.innerHTML = ['D','S','T','Q','Q','S','S'].map(d => `<div class="calendar-day-name">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';

    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isPast = new Date(dateStr + "T23:59:59") < new Date();
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isPast ? 'disabled' : ''}`;
        dayEl.textContent = d;
        if (!isPast) {
            dayEl.onclick = () => {
                appointmentData.data = dateStr;
                document.querySelectorAll('.calendar-day.selected').forEach(x => x.classList.remove('selected'));
                dayEl.classList.add('selected');
                fetchAvailableSlots(appointmentData.loja_id, appointmentData.servico_id, dateStr);
            };
        }
        grid.appendChild(dayEl);
    }
}

// --- FINALIZAR AGENDAMENTO ---
async function confirmAppointment() {
    const btn = document.getElementById('confirmButton');
    btn.disabled = true; btn.innerText = "Agendando...";

    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        nome_pet: document.getElementById('nome_pet').value,
        raca_pet: document.getElementById('especie_raca').value,
        porte_pet: document.getElementById('porte').value,
        observacoes: document.getElementById('observacoes').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Sucesso! Agendamento realizado.");
            window.location.href = '../index.html';
        } else { 
            const err = await response.json();
            alert("Erro ao agendar: " + (err.error || "Tente novamente.")); 
            btn.disabled = false; 
            btn.innerText = "Confirmar Agendamento";
        }
    } catch (e) { 
        alert("Erro de conexão."); 
        btn.disabled = false; 
        btn.innerText = "Confirmar Agendamento";
    }
}

// --- NAVEGAÇÃO ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i+1 === n));
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n/5)*100}%`;
    currentStep = n;
    
    if (n === 5) {
        document.getElementById('confirmation-summary').innerHTML = `
            <p><strong>Serviço:</strong> ${appointmentData.servico_nome}</p>
            <p><strong>Unidade:</strong> ${appointmentData.loja_nome}</p>
            <p><strong>Data:</strong> ${new Date(appointmentData.data).toLocaleDateString('pt-BR')} às ${appointmentData.horario}</p>
            <p><strong>Pet:</strong> ${document.getElementById('nome_pet').value}</p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadStores();

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

    document.getElementById('nextButtonStep1').onclick = () => showStep(2);
    document.getElementById('nextButtonStep2').onclick = () => { renderCalendar(); showStep(3); };
    document.getElementById('nextButtonStep3').onclick = () => showStep(4);
    
    document.getElementById('pet-info-form').onsubmit = (e) => {
        e.preventDefault();
        showStep(5);
    };

    document.getElementById('confirmButton').onclick = confirmAppointment;

    document.querySelectorAll('.btn-back').forEach(b => b.onclick = () => showStep(currentStep - 1));

    document.getElementById('prevMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth()-1); renderCalendar(); };
    document.getElementById('nextMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth()+1); renderCalendar(); };
});