// --- ESTADO DO AGENDAMENTO (Mantido original) ---
let currentStep = 1;
const appointmentData = {
    loja_id: null, loja_nome: null,
    servico_id: null, servico_nome: null,
    data: null, horario: null,
    pet_info: {},
    selected_pet_id: null,
    selected_pet_name: null,
    cliente_id: localStorage.getItem('usuario_id'), // Pega do localStorage do Neon
    cliente_email: localStorage.getItem('usuario_email')
};

// --- CONFIGURAÇÃO DO BACKEND ---
// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

// --- FUNÇÃO PARA CARREGAR SERVIÇOS (Substitui Supabase) ---
async function loadServices() {
    const serviceSelect = document.getElementById('service-select');
    if (!serviceSelect) return;

    try {
        const response = await fetch(`${API_URL}/servicos_lista`); // Criar essa rota no Python
        const data = await response.json();
        
        serviceSelect.innerHTML = '<option value="" disabled selected>Selecione o serviço...</option>';
        data.forEach(service => {
            serviceSelect.innerHTML += `<option value="${service.id_servico}" data-nome="${service.nome_servico}">${service.nome_servico}</option>`;
        });
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
    }
}

// --- FUNÇÃO PARA BUSCAR HORÁRIOS DISPONÍVEIS (Pelo Python) ---
async function fetchAvailableSlots(lojaId, servicoId, dateStr) {
    const timeSlotsContainer = document.getElementById('time-slots-container');
    timeSlotsContainer.innerHTML = 'Buscando horários...';

    try {
        const response = await fetch(`${API_URL}/horarios-disponiveis?loja_id=${lojaId}&servico_id=${servicoId}&data=${dateStr}`);
        const slots = await response.json();
        
        displayAvailableSlots(slots);
    } catch (error) {
        timeSlotsContainer.innerHTML = '<p class="text-danger">Erro ao conectar com o servidor.</p>';
    }
}

// --- FUNÇÃO PARA CONFIRMAR AGENDAMENTO (POST para o Python) ---
async function confirmAppointment() {
    const confirmButton = document.getElementById('confirmButton');
    confirmButton.disabled = true;

    try {
        const payload = {
            id_cliente: appointmentData.cliente_id,
            id_pet: appointmentData.selected_pet_id,
            id_loja: appointmentData.loja_id,
            id_servico: appointmentData.servico_id,
            data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
            observacoes_cliente: appointmentData.pet_info.observacoes || "Via Web"
        };

        const response = await fetch(`${API_URL}/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Agendamento realizado com sucesso!");
            window.location.href = '../usuario/meus_agendamentos.html';
        } else {
            const err = await response.json();
            throw new Error(err.error);
        }
    } catch (error) {
        alert("Erro: " + error.message);
        confirmButton.disabled = false;
    }
}

// --- LÓGICA DE WHATSAPP (Mantida original - Muito boa para o TCC!) ---
window.enviarNotificacaoWhatsApp = (telefone, nomeCliente, nomePet, servico, dataHora) => {
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const mensagem = `Olá ${nomeCliente}! 🐾%0A%0AConfirmamos o agendamento do(a) *${nomePet}* para o serviço de *${servico}*.%0A📅 *Data:* ${data}%0A⏰ *Horário:* ${hora}`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${mensagem}`, '_blank');
};

// --- 4. LÓGICA DO CALENDÁRIO (Renderização e Navegação) ---
let currentCalendarDate = new Date();

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    if (!calendarGrid) return;

    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    
    // Nome do mês no topo
    calendarMonthYear.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    calendarGrid.innerHTML = ''; 
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekDays.forEach(day => { calendarGrid.innerHTML += `<div class="calendar-day-name">${day}</div>`; });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Espaços vazios antes do dia 1
    for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.innerHTML += '<div></div>'; }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date();
        today.setHours(0,0,0,0);
        const dateObj = new Date(dateStr + "T00:00:00");

        let classes = "calendar-day";
        if (dateObj < today) {
            classes += " disabled";
        } else {
            classes += " available";
        }

        const dayEl = document.createElement('div');
        dayEl.className = classes;
        dayEl.textContent = day;
        if (!classes.includes('disabled')) {
            dayEl.onclick = () => selectDate(dateStr, dayEl);
        }
        calendarGrid.appendChild(dayEl);
    }
}

function selectDate(dateStr, element) {
    appointmentData.data = dateStr;
    appointmentData.horario = null; // Reseta horário ao mudar data
    
    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
    element.classList.add('selected');

    // Busca horários disponíveis no Python
    fetchAvailableSlots(appointmentData.loja_id, appointmentData.servico_id, dateStr);
}

function displayAvailableSlots(slots) {
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const nextButtonStep3 = document.getElementById('nextButtonStep3');
    timeSlotsContainer.innerHTML = '';

    if (!slots || slots.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted text-center">Nenhum horário disponível para este dia ou unidade.</p>';
        return;
    }

    slots.forEach(timeStr => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-secondary m-1 time-slot-btn';
        button.textContent = timeStr;
        button.onclick = () => {
            appointmentData.horario = timeStr;
            document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.replace('btn-primary', 'btn-outline-secondary'));
            button.classList.replace('btn-outline-secondary', 'btn-primary');
            nextButtonStep3.disabled = false;
        };
        timeSlotsContainer.appendChild(button);
    });
}

// --- 5. GESTÃO DOS PASSOS (Wizard) ---
function showStep(stepNumber) {
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('step-progressbar');
    
    currentStep = stepNumber;
    steps.forEach((step, index) => {
        step.classList.toggle('active', (index + 1) === stepNumber);
    });

    if (progressBar) {
        const progress = ((stepNumber - 1) / 4) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Lógica específica ao entrar em certos passos
    if (stepNumber === 4) carregarPetsNoSelect();
    if (stepNumber === 5) montarResumoFinal();
}

async function carregarPetsNoSelect() {
    const selectPet = document.getElementById('select-pet');
    if (!selectPet) return;

    const response = await fetch(`${API_URL}/meus-pets/${appointmentData.cliente_id}`);
    const pets = await response.json();

    selectPet.innerHTML = '<option value="" disabled selected>Escolha o pet...</option>';
    pets.forEach(pet => {
        selectPet.innerHTML += `<option value="${pet.id_pet}">${pet.nome_pet}</option>`;
    });
}

function montarResumoFinal() {
    const summary = document.getElementById('confirmation-summary');
    if (!summary) return;

    summary.innerHTML = `
        <div class="alert alert-light border">
            <p><strong>Loja:</strong> ${appointmentData.loja_nome}</p>
            <p><strong>Serviço:</strong> ${appointmentData.servico_nome}</p>
            <p><strong>Data:</strong> ${new Date(appointmentData.data).toLocaleDateString('pt-BR')} às ${appointmentData.horario}</p>
            <p><strong>Pet:</strong> ${document.getElementById('select-pet').options[document.getElementById('select-pet').selectedIndex].text}</p>
        </div>
    `;
}

// --- 6. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Carrega serviços e lojas ao abrir a página
    loadServices();
    
    // Eventos de Navegação
    document.getElementById('nextButtonStep1')?.addEventListener('click', () => {
        const sel = document.getElementById('service-select');
        appointmentData.servico_id = sel.value;
        appointmentData.servico_nome = sel.options[sel.selectedIndex].text;
        showStep(2);
    });

    document.getElementById('store-select')?.addEventListener('change', (e) => {
        appointmentData.loja_id = e.target.value;
        appointmentData.loja_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep2').disabled = false;
    });

    document.getElementById('nextButtonStep2')?.addEventListener('click', () => {
        renderCalendar();
        showStep(3);
    });

    document.getElementById('nextButtonStep3')?.addEventListener('click', () => showStep(4));
    
    document.getElementById('pet-info-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        appointmentData.selected_pet_id = document.getElementById('select-pet').value;
        appointmentData.pet_info.observacoes = document.getElementById('observacoes')?.value;
        showStep(5);
    });

    document.getElementById('confirmButton')?.addEventListener('click', confirmAppointment);

    // Botões de Voltar
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => showStep(currentStep - 1));
    });

    // Navegação do Mês
    document.getElementById('prevMonthButton')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonthButton')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
});