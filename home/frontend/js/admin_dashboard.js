document.addEventListener('DOMContentLoaded', async () => {
    const tabelaAdmin = document.getElementById('tabela-agendamentos-admin');
    const totalHoje = document.getElementById('total-hoje');

    try {
        const response = await fetch('http://localhost:5000/api/admin/agendamentos');
        const agendamentos = await response.json();

        if (tabelaAdmin) {
            tabelaAdmin.innerHTML = '';
            
            // Contador de hoje (simples)
            const hoje = new Date().toLocaleDateString('pt-BR');
            let contador = 0;

            agendamentos.forEach(ag => {
                const dataAg = new Date(ag.data_hora_inicio);
                if (dataAg.toLocaleDateString('pt-BR') === hoje) contador++;

                tabelaAdmin.innerHTML += `
                    <tr>
                        <td>${dataAg.toLocaleString('pt-BR')}</td>
                        <td>${ag.dono_nome}</td>
                        <td>${ag.nome_pet}</td>
                        <td>${ag.nome_servico}</td>
                        <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="avisarWhatsapp('${ag.dono_tel}', '${ag.dono_nome}', '${ag.nome_pet}', '${ag.nome_servico}', '${ag.data_hora_inicio}')">
                                <i class="bi bi-whatsapp"></i> Avisar
                            </button>
                        </td>
                    </tr>
                `;
            });
            if (totalHoje) totalHoje.innerText = contador;
        }
    } catch (error) {
        console.error("Erro ao carregar painel admin:", error);
    }
});

// Função global para o botão de WhatsApp
window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    const data = new Date(dataHora).toLocaleDateString('pt-BR');
    const hora = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const msg = `Olá ${dono}! 🐾 Passando para confirmar o horário do(a) ${pet} para ${servico} no dia ${data} às ${hora}. Podemos confirmar?`;
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
};

// --- 2. CARREGAR KPIs (Vendas, Agendamentos, Pets, Clientes) ---
async function carregarKPIs() {
    try {
        // Faturamento Total (Pedidos)
        const { data: vendas } = await supabase.from('pedidos').select('total_pedido');
        const totalFaturado = vendas?.reduce((acc, v) => acc + Number(v.total_pedido), 0) || 0;
        document.getElementById('kpi-vendas').innerText = totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Contadores rápidos usando exact count
        const countTable = async (table) => {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            return count || 0;
        };

        document.getElementById('kpi-agendamentos').innerText = await countTable('agendamentos');
        document.getElementById('kpi-pets').innerText = await countTable('pets');
        
        const { count: cliCount } = await supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('role', 'cliente');
        document.getElementById('kpi-clientes').innerText = cliCount || 0;

    } catch (err) {
        console.error("Erro nos KPIs:", err.message);
    }
}

// --- 3. CARREGAR TABELA DE AGENDAMENTOS (Relacional) ---
async function carregarTabelaAgendamentos() {
    const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
            id_agendamento,
            data_hora_inicio,
            status,
            perfis ( nome_completo, telefone ),
            pets ( nome_pet, raca, porte ),
            servicos ( nome_servico )
        `)
        .order('data_hora_inicio', { ascending: true })
        .limit(10); // Mostra os 10 mais próximos

    const tabela = document.getElementById('tabela-agendamentos-admin');
    if (!tabela) return;

    if (error) {
        tabela.innerHTML = `<tr><td colspan="6" class="text-danger">Erro: ${error.message}</td></tr>`;
        return;
    }

    tabela.innerHTML = agendamentos.map(ag => `
        <tr>
            <td>${new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</td>
            <td>
                <strong>${ag.perfis?.nome_completo || 'N/A'}</strong><br>
                <small class="text-muted">${ag.perfis?.telefone || ''}</small>
            </td>
            <td>
                <strong>${ag.pets?.nome_pet || 'N/A'}</strong><br>
                <small class="text-muted">${ag.pets?.raca || ''}</small>
            </td>
            <td>${ag.servicos?.nome_servico || 'N/A'}</td>
            <td><span class="badge ${ag.status === 'confirmado' ? 'bg-success' : 'bg-warning'}">${ag.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-success" onclick="confirmarAgendamento(${ag.id_agendamento})">✅</button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelarAgendamento(${ag.id_agendamento})">❌</button>
            </td>
        </tr>
    `).join('');
}

// --- 4. ESTOQUE CRÍTICO ---
async function carregarEstoqueCritico() {
    const { data: criticos } = await supabase
        .from('produtos')
        .select('nome_produto, quantidade_estoque')
        .lt('quantidade_estoque', 5);

    const container = document.getElementById('lista-estoque-critico');
    if (!container) return;

    if (criticos && criticos.length > 0) {
        container.innerHTML = criticos.map(p => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded border-start border-danger border-4">
                <span class="small fw-bold">${p.nome_produto}</span>
                <span class="badge bg-danger">${p.quantidade_estoque} un</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-success small mt-2">✅ Estoque em dia!</p>';
    }
}

// --- 5. GRÁFICOS (Integração Python API) ---
async function carregarGraficos() {
    try {
        const response = await fetch('http://localhost:5000/api/admin/relatorio-geral');
        if (!response.ok) throw new Error("API Offline");
        const dados = await response.json();

        const ticketMedioEl = document.getElementById('ticket-medio-valor');
        if (ticketMedioEl) {
            ticketMedioEl.innerText = dados.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const ctx = document.getElementById('graficoFaturamento');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Banho', 'Tosa', 'Hotel', 'Veterinário'],
                datasets: [{
                    label: 'Receita (R$)',
                    data: dados.faturamento_por_servico || [1200, 1900, 3000, 1500],
                    backgroundColor: '#FE8697',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    } catch (error) {
        console.warn("Gráficos: Usando dados locais (Backend Python não detectado)");
        // Lógica de fallback para gráfico se a API estiver fora
    }
}

// --- 6. AÇÕES GLOBAIS (Confirmar/Cancelar) ---
window.confirmarAgendamento = async (id) => {
    const { error } = await supabase.from('agendamentos').update({ status: 'confirmado' }).eq('id_agendamento', id);
    if (error) alert("Erro: " + error.message);
    else location.reload();
};

window.cancelarAgendamento = async (id) => {
    if (confirm("Deseja realmente cancelar?")) {
        const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id_agendamento', id);
        if (error) alert("Erro: " + error.message);
        else location.reload();
    }
};