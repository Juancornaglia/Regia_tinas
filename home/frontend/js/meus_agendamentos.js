document.addEventListener('DOMContentLoaded', async () => {
    const idUsuario = localStorage.getItem('usuario_id');
    const lista = document.getElementById('lista-agendamentos-cliente');

    const response = await fetch(`http://localhost:5000/api/usuario/agendamentos/${idUsuario}`);
    const agendamentos = await response.json();

    if (agendamentos.length === 0) {
        lista.innerHTML = '<p>Você não tem agendamentos marcados.</p>';
        return;
    }

    lista.innerHTML = agendamentos.map(ag => `
        <div class="list-group-item mb-3 shadow-sm">
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${ag.nome_servico} para ${ag.nome_pet}</h5>
                <span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span>
            </div>
            <p class="mb-1">📅 ${new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</p>
            <small>📍 Unidade: ${ag.nome_loja}</small>
        </div>
    `).join('');
});