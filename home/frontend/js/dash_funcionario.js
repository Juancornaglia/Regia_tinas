/**
 * js/dash_funcionario.js - Cérebro do Painel Operacional
 * Gerencia KPIs, Fila de Hoje, Estoque e Segurança por CPF
 */

const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estados Globais
let acaoPendente = null; 
let modalAssinatura = null;
let agendaMesVisivel = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let agendaDataSelecionada = new Date();
let lembretesDoMes = [];
let agendamentosDaAgenda = [];

document.addEventListener('DOMContentLoaded', () => {
    // 0. Proteção de Rota (Apenas Funcionário ou Admin)
    const userRole = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();
    if (userRole !== 'funcionario' && userRole !== 'admin') {
        window.location.href = '../usuario/login.html';
        return;
    }

    console.log("Inicializando painel do funcionário.");
    
    // 1. Configurações Iniciais de Interface
    inicializarInterface();
    
    // 2. Carrega os Dados do Banco Neon
    if (document.getElementById('tabela-fila-trabalho')) {
        carregarResumoDoDia();
        window.setInterval(carregarResumoDoDia, 30000);
    } else if (document.getElementById('agenda-calendario')) {
        carregarResumoDoDia();
    }
    carregarListaEstoque();
    inicializarAgendaFuncionario();

    // 3. Configura o Logout
    const btnSair = document.getElementById('logout-button');
    if (btnSair && document.getElementById('tabela-fila-trabalho')) btnSair.onclick = encerrarTurno;
});

// ==========================================
// 1. INTERFACE E IDENTIDADE
// ==========================================

function inicializarInterface() {
    // Nome do Funcionário (Vem do Login)
    const nome = localStorage.getItem('usuario_nome') || "Equipe";
    const nomeDisplay = document.getElementById('nome-funcionario');
    if (nomeDisplay) nomeDisplay.innerText = nome.split(' ')[0];

    // Máscara de CPF no Modal de Segurança
    const inputCpf = document.getElementById('input-cpf-funcionario');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); 
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    // Listener do Botão de Confirmação do CPF
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    if (btnConfirmar) btnConfirmar.onclick = validarCpfESalvar;
}

// ==========================================
// 2. FILA E KPIs (BANCO NEON)
// ==========================================

async function carregarResumoDoDia() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");
        
        const agendamentos = await response.json();
        if (!Array.isArray(agendamentos)) return;
        agendamentosDaAgenda = agendamentos;
        window.renderizarNotificacoesAgendamento?.(agendamentos, 'employee-appointment-notifications');
        renderizarCalendarioAgenda();
        renderizarLembretesDoDia();

        // Filtra os status do dia
        const pendentes = agendamentos.filter(a => ['pendente', 'aguardando', 'confirmado'].includes(a.status));
        const emAndamento = agendamentos.filter(a => ['em_andamento', 'em_curso'].includes(a.status));
        const concluidos = agendamentos.filter(a => ['concluido', 'pronto'].includes(a.status));

        // Atualiza os números (KPIs)
        const kpiAguardando = document.getElementById('kpi-atendimentos');
        const kpiAndamento = document.getElementById('kpi-em-andamento');
        const kpiFinalizados = document.getElementById('kpi-concluidos');
        if (kpiAguardando) kpiAguardando.innerText = pendentes.length;
        if (kpiAndamento) kpiAndamento.innerText = emAndamento.length;
        if (kpiFinalizados) kpiFinalizados.innerText = concluidos.length;

        // Renderiza a Tabela de Próximos
        renderizarTabelaFila([...pendentes, ...emAndamento].slice(0, 5));

    } catch (error) {
        console.error("Erro ao carregar resumo:", error);
        const kpiAguardando = document.getElementById('kpi-atendimentos');
        const kpiAndamento = document.getElementById('kpi-em-andamento');
        const kpiFinalizados = document.getElementById('kpi-concluidos');
        if (kpiAguardando) kpiAguardando.innerText = '0';
        if (kpiAndamento) kpiAndamento.innerText = '0';
        if (kpiFinalizados) kpiFinalizados.innerText = '0';
        agendamentosDaAgenda = [];
        renderizarCalendarioAgenda();
        renderizarLembretesDoDia();
        renderizarTabelaFila([]);
    }
}

function renderizarTabelaFila(lista) {
    const tbody = document.getElementById('tabela-fila-trabalho');
    const mobileList = document.getElementById('mobile-fila-trabalho');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Nenhum atendimento pendente para agora.</td></tr>';
        if (mobileList) mobileList.innerHTML = '<p class="text-muted text-center py-3 mb-0">Nenhum atendimento pendente para agora.</p>';
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const isAndamento = ['em_andamento', 'em_curso'].includes(a.status);
        return `
        <tr>
            <td class="fw-bold text-secondary">${extrairHora(a.data_hora_inicio)}</td>
            <td>
                <div class="fw-bold text-dark">${a.nome_pet || 'Pet'}</div>
                <small class="text-muted">${a.cliente_nome || a.nome_cliente || 'Tutor'}</small>
            </td>
            <td>
                <span class="status-pill ${isAndamento ? 'bg-status-active' : 'bg-status-waiting'}">
                    ${isAndamento ? 'Em Curso' : 'Aguardando'}
                </span>
            </td>
        </tr>
    `}).join('');

    if (mobileList) {
        mobileList.innerHTML = lista.map((appointment) => {
            const pet = escapeHtml(appointment.nome_pet || 'Pet');
            const tutor = escapeHtml(appointment.cliente_nome || appointment.nome_cliente || 'Tutor');
            const hora = escapeHtml(extrairHora(appointment.data_hora_inicio));
            const andamento = ['em_andamento', 'em_curso'].includes(appointment.status);
            return `<details class="mobile-disclosure">
                <summary><span>${pet} · ${tutor}</span><i class="bi bi-chevron-down mobile-disclosure-chevron" aria-hidden="true"></i></summary>
                <div class="mobile-disclosure-body">
                    <dl class="row small mb-0">
                        <dt class="col-5 text-muted">Horário</dt><dd class="col-7">${hora}</dd>
                        <dt class="col-5 text-muted">Status</dt><dd class="col-7">${andamento ? 'Em Curso' : 'Aguardando'}</dd>
                    </dl>
                </div>
            </details>`;
        }).join('');
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

// ==========================================
// 3. ESTOQUE E CONSUMO
// ==========================================

async function carregarListaEstoque() {
    const select = document.getElementById('select-produto-estoque');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error("Falha ao buscar produtos.");
        
        const produtos = await response.json();
        if (!Array.isArray(produtos) || produtos.length === 0) {
            select.innerHTML = '<option value="">Nenhum produto cadastrado no estoque</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecione o material...</option>' + 
            produtos.map(p => `<option value="${p.id_produto || p.id}">${p.nome_produto} (${p.quantidade_estoque ?? 0} un)</option>`).join('');
    } catch (e) {
        console.error("Erro ao carregar estoque:", e);
        select.innerHTML = '<option value="">Erro ao carregar estoque</option>';
    }
}

// ==========================================
// 4. O ESCUDO DE CPF (SEGURANÇA)
// ==========================================

window.solicitarAssinatura = (callback) => {
    const selectProd = document.getElementById('select-produto-estoque');
    if (selectProd && document.getElementById('modalEstoque')?.classList.contains('show')) {
        if (!selectProd.value) {
            alert("Selecione um produto antes de avançar!");
            return;
        }
    }

    acaoPendente = callback;
    
    // Limpa o modal
    document.getElementById('input-cpf-funcionario').value = '';
    document.getElementById('erro-validacao').style.display = 'none';

    // Fecha modal de estoque se estiver aberto
    const mEstoqueEl = document.getElementById('modalEstoque');
    if (mEstoqueEl) {
        const mEstoque = bootstrap.Modal.getInstance(mEstoqueEl);
        if (mEstoque) mEstoque.hide();
    }

    modalAssinatura = new bootstrap.Modal(document.getElementById('modalAssinaturaFuncionario'));
    modalAssinatura.show();
};

async function validarCpfESalvar() {
    const cpf = document.getElementById('input-cpf-funcionario').value;
    const btn = document.getElementById('btn-confirmar-acao');
    const erro = document.getElementById('erro-validacao');

    if (cpf.length < 14) {
        erro.innerText = "Digite o CPF completo!";
        erro.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> VALIDANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/validar-cpf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
        });

        const data = await res.json();

        if (res.ok && data.autorizado) {
            modalAssinatura.hide();
            if (acaoPendente) acaoPendente(data.id_funcionario);
        } else {
            throw new Error("CPF não autorizado.");
        }

    } catch (e) {
        erro.style.display = 'block';
        erro.innerText = "Acesso Negado: CPF não reconhecido.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'CONFIRMAR AÇÃO';
    }
}

// ==========================================
// 5. PROCESSAMENTO DE BAIXA
// ==========================================

window.processarBaixaEstoque = async (idFuncionario) => {
    const prodId = document.getElementById('select-produto-estoque').value;
    const qtd = document.getElementById('qtd-consumo').value;

    const dados = {
        id_produto: prodId,
        quantidade: parseInt(qtd, 10) || 1,
        id_funcionario: idFuncionario
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/estoque/consumo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert("Baixa de estoque realizada e assinada digitalmente.");
            carregarResumoDoDia();
            carregarListaEstoque();
        } else {
            const err = await res.json();
            alert(err.error || "Não foi possível registrar a baixa.");
        }
    } catch (e) {
        alert("Erro ao salvar no Neon.");
    }
};

// ==========================================
// UTILITÁRIOS
// ==========================================

function extrairHora(dataISO) {
    if (!dataISO) return "--:--";
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function encerrarTurno() {
    if (confirm("Deseja realmente encerrar o turno e sair?")) {
        localStorage.clear();
        window.location.href = '../usuario/login.html';
    }
}

function inicializarAgendaFuncionario() {
    if (!document.getElementById('agenda-calendario')) return;

    document.getElementById('btn-novo-lembrete')?.addEventListener('click', () => abrirFormularioLembrete());
    document.getElementById('agenda-mes-anterior')?.addEventListener('click', () => navegarAgendaMes(-1));
    document.getElementById('agenda-proximo-mes')?.addEventListener('click', () => navegarAgendaMes(1));
    document.getElementById('agenda-dia-anterior')?.addEventListener('click', () => selecionarDiaAgenda(-1));
    document.getElementById('agenda-proximo-dia')?.addEventListener('click', () => selecionarDiaAgenda(1));
    document.getElementById('form-lembrete-funcionario')?.addEventListener('submit', salvarLembreteFuncionario);
    document.getElementById('agenda-calendario')?.addEventListener('click', event => {
        const botao = event.target.closest('[data-agenda-date]');
        if (botao) selecionarDataAgenda(botao.dataset.agendaDate);
    });
    document.getElementById('agenda-lembretes-dia')?.addEventListener('click', executarAcaoLembrete);

    carregarLembretesDoMes();
}

function dataAgendaChave(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function dataAgendaObjeto(chave) {
    const [ano, mes, dia] = chave.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
}

function intervaloAgendaMes(data) {
    const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
    const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
    return { inicio: dataAgendaChave(inicio), fim: dataAgendaChave(fim) };
}

async function requisitarJsonLembrete(url, opcoes) {
    let res;
    try {
        res = await fetch(url, opcoes);
    } catch {
        throw new Error('A API de lembretes está offline ou reiniciando. Verifique se o servidor está ativo na porta 5000.');
    }

    let dados;
    try {
        const text = await res.text();
        dados = JSON.parse(text);
    } catch {
        throw new Error('A API de lembretes retornou uma resposta inválida. Verifique se o servidor está online ou reiniciando.');
    }

    if (!res.ok) {
        throw new Error(dados.error || `Falha na API de lembretes (HTTP ${res.status}).`);
    }
    return dados;
}

async function carregarLembretesDoMes() {
    const lista = document.getElementById('agenda-lembretes-dia');
    const idFuncionario = localStorage.getItem('usuario_id');
    if (!idFuncionario) return;

    if (lista) lista.innerHTML = '<p class="text-muted small text-center py-3 mb-0">Carregando lembretes...</p>';
    const intervalo = intervaloAgendaMes(agendaMesVisivel);
    const parametros = new URLSearchParams({
        id_funcionario: idFuncionario,
        inicio: intervalo.inicio,
        fim: intervalo.fim
    });

    try {
        const dados = await requisitarJsonLembrete(`${API_BASE_URL}/api/funcionario/lembretes?${parametros}`);
        lembretesDoMes = Array.isArray(dados) ? dados : [];
        renderizarCalendarioAgenda();
        renderizarLembretesDoDia();
    } catch (error) {
        console.error('Erro ao carregar agenda do turno:', error);
        if (lista) lista.innerHTML = `<p class="text-danger small text-center py-3 mb-0">${escaparHTML(error.message)}</p>`;
    }
}

function renderizarCalendarioAgenda() {
    const titulo = document.getElementById('agenda-mes-titulo');
    const grade = document.getElementById('agenda-calendario');
    if (!titulo || !grade) return;

    titulo.textContent = agendaMesVisivel.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const primeiroDia = new Date(agendaMesVisivel.getFullYear(), agendaMesVisivel.getMonth(), 1);
    const deslocamento = (primeiroDia.getDay() + 6) % 7;
    const inicioGrade = new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), 1 - deslocamento);
    const hoje = dataAgendaChave(new Date());
    const agendamentosAtivos = agendamentosDaAgenda.filter(agendamento => String(agendamento.status || '').toLowerCase() !== 'cancelado');
    const datasComLembretes = new Set([
        ...lembretesDoMes.map(lembrete => lembrete.data_lembrete),
        ...agendamentosAtivos.map(agendamento => chaveDataAgendamento(agendamento.data_hora_inicio))
    ]);

    grade.innerHTML = Array.from({ length: 42 }, (_, indice) => {
        const data = new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + indice);
        const chave = dataAgendaChave(data);
        const classes = ['agenda-day'];
        if (data.getMonth() !== agendaMesVisivel.getMonth()) classes.push('is-outside');
        if (chave === dataAgendaChave(agendaDataSelecionada)) classes.push('is-selected');
        if (chave === hoje) classes.push('is-today');
        if (datasComLembretes.has(chave)) classes.push('has-items');
        return `<button type="button" class="${classes.join(' ')}" data-agenda-date="${chave}" aria-pressed="${chave === dataAgendaChave(agendaDataSelecionada)}">${data.getDate()}</button>`;
    }).join('');
}

function renderizarLembretesDoDia() {
    const lista = document.getElementById('agenda-lembretes-dia');
    const dataTitulo = document.getElementById('agenda-data-selecionada');
    if (!lista || !dataTitulo) return;

    const chave = dataAgendaChave(agendaDataSelecionada);
    dataTitulo.textContent = agendaDataSelecionada.toLocaleDateString('pt-BR', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
    const agendamentos = agendamentosDaAgenda.filter(agendamento =>
        String(agendamento.status || '').toLowerCase() !== 'cancelado'
        && chaveDataAgendamento(agendamento.data_hora_inicio) === chave
    );
    const lembretes = lembretesDoMes.filter(lembrete => lembrete.data_lembrete === chave);
    if (!lembretes.length && !agendamentos.length) {
        lista.innerHTML = '<p class="text-muted small text-center py-3 mb-0">Sem atendimentos ou lembretes para esta data.</p>';
        return;
    }

    const itensAgendamento = agendamentos.map(agendamento => {
        const servico = agendamento.nome_servico || 'Atendimento';
        const hotel = /hotel|hosped|estadia/i.test(servico);
        const hora = extrairHora(agendamento.data_hora_inicio);
        return `<article class="agenda-reminder p-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="min-w-0">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="badge ${hotel ? 'bg-info-subtle text-dark' : 'bg-light text-dark border'}">${hotel ? 'Hóspede do hotel' : 'Atendimento'}</span>
                        <small class="text-muted">${escaparHTML(hora)}</small>
                    </div>
                    <div class="fw-bold small mt-1 text-break">${escaparHTML(servico)} · ${escaparHTML(agendamento.nome_pet || 'Pet')}</div>
                    <div class="small text-muted text-break">${escaparHTML(agendamento.cliente_nome || 'Tutor')}${agendamento.nome_loja ? ` · ${escaparHTML(agendamento.nome_loja)}` : ''}</div>
                    <div class="small text-muted">Status: ${escaparHTML(agendamento.status || 'pendente')}</div>
                </div>
            </div>
        </article>`;
    });
    const rotulosTipo = {
        cliente_fixo: 'Cliente fixo',
        retorno: 'Retorno',
        tarefa_interna: 'Tarefa interna'
    };
    const itensLembrete = lembretes.map(lembrete => `
        <article class="agenda-reminder ${lembrete.concluido ? 'is-done' : ''} p-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="min-w-0">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="badge ${lembrete.concluido ? 'bg-success' : 'bg-light text-dark border'}">${rotulosTipo[lembrete.tipo] || 'Tarefa'}</span>
                        <small class="text-muted">${escaparHTML(lembrete.hora_lembrete || 'Sem horário')}</small>
                    </div>
                    <div class="fw-bold small mt-1 text-break ${lembrete.concluido ? 'text-decoration-line-through' : ''}">${escaparHTML(lembrete.titulo)}</div>
                    <div class="small text-muted text-break">${escaparHTML([lembrete.cliente_nome, lembrete.nome_pet].filter(Boolean).join(' · '))}</div>
                    ${lembrete.descricao ? `<div class="small text-muted mt-1">${escaparHTML(lembrete.descricao)}</div>` : ''}
                </div>
                ${document.getElementById('form-lembrete-funcionario') ? `<div class="d-flex gap-1 flex-shrink-0">
                    <button type="button" class="btn btn-sm btn-light" data-lembrete-acao="editar" data-lembrete-id="${lembrete.id_lembrete}" aria-label="Alterar lembrete" title="Alterar"><i class="bi bi-pencil"></i></button>
                    <button type="button" class="btn btn-sm btn-light" data-lembrete-acao="concluir" data-lembrete-id="${lembrete.id_lembrete}" aria-label="${lembrete.concluido ? 'Reabrir lembrete' : 'Concluir lembrete'}" title="${lembrete.concluido ? 'Reabrir' : 'Concluir'}"><i class="bi ${lembrete.concluido ? 'bi-arrow-counterclockwise' : 'bi-check2'}"></i></button>
                    <button type="button" class="btn btn-sm btn-light text-danger" data-lembrete-acao="apagar" data-lembrete-id="${lembrete.id_lembrete}" aria-label="Apagar lembrete" title="Apagar"><i class="bi bi-trash"></i></button>
                </div>` : ''}
            </div>
        </article>
    `).join('');
    lista.innerHTML = [...itensAgendamento, itensLembrete].join('');
}

function chaveDataAgendamento(valor) {
    const valorTexto = String(valor || '');
    const dataISO = valorTexto.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dataISO) return dataISO[1];
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '' : dataAgendaChave(data);
}

function navegarAgendaMes(delta) {
    const ano = agendaMesVisivel.getFullYear();
    const mes = agendaMesVisivel.getMonth() + delta;
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    agendaMesVisivel = new Date(ano, mes, 1);
    agendaDataSelecionada = new Date(ano, mes, Math.min(agendaDataSelecionada.getDate(), ultimoDia));
    carregarLembretesDoMes();
}

function selecionarDiaAgenda(delta) {
    const novaData = new Date(
        agendaDataSelecionada.getFullYear(),
        agendaDataSelecionada.getMonth(),
        agendaDataSelecionada.getDate() + delta
    );
    selecionarDataAgenda(dataAgendaChave(novaData));
}

function selecionarDataAgenda(chave) {
    agendaDataSelecionada = dataAgendaObjeto(chave);
    if (agendaDataSelecionada.getMonth() !== agendaMesVisivel.getMonth() || agendaDataSelecionada.getFullYear() !== agendaMesVisivel.getFullYear()) {
        agendaMesVisivel = new Date(agendaDataSelecionada.getFullYear(), agendaDataSelecionada.getMonth(), 1);
        carregarLembretesDoMes();
        return;
    }
    renderizarCalendarioAgenda();
    renderizarLembretesDoDia();
}

function abrirFormularioLembrete(lembrete = null) {
    const form = document.getElementById('form-lembrete-funcionario');
    const modalEl = document.getElementById('modalLembreteFuncionario');
    const erro = document.getElementById('lembrete-erro');
    form?.reset();
    if (erro) {
        erro.hidden = true;
        erro.textContent = '';
    }

    document.getElementById('modalLembreteTitulo').textContent = lembrete ? 'Alterar lembrete' : 'Novo lembrete';
    document.getElementById('lembrete-id').value = lembrete?.id_lembrete || '';
    document.getElementById('lembrete-tipo').value = lembrete?.tipo || 'cliente_fixo';
    document.getElementById('lembrete-titulo').value = lembrete?.titulo || '';
    document.getElementById('lembrete-data').value = lembrete?.data_lembrete || dataAgendaChave(agendaDataSelecionada);
    document.getElementById('lembrete-hora').value = lembrete?.hora_lembrete || '';
    document.getElementById('lembrete-cliente').value = lembrete?.cliente_nome || '';
    document.getElementById('lembrete-pet').value = lembrete?.nome_pet || '';
    document.getElementById('lembrete-descricao').value = lembrete?.descricao || '';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function salvarLembreteFuncionario(event) {
    event.preventDefault();
    const idFuncionario = localStorage.getItem('usuario_id');
    const id = document.getElementById('lembrete-id').value;
    const botao = document.getElementById('btn-salvar-lembrete');
    const erro = document.getElementById('lembrete-erro');
    const dados = {
        id_funcionario: idFuncionario,
        tipo: document.getElementById('lembrete-tipo').value,
        titulo: document.getElementById('lembrete-titulo').value.trim(),
        data_lembrete: document.getElementById('lembrete-data').value,
        hora_lembrete: document.getElementById('lembrete-hora').value || null,
        cliente_nome: document.getElementById('lembrete-cliente').value.trim(),
        nome_pet: document.getElementById('lembrete-pet').value.trim(),
        descricao: document.getElementById('lembrete-descricao').value.trim()
    };

    botao.disabled = true;
    try {
        await requisitarJsonLembrete(`${API_BASE_URL}/api/funcionario/lembretes${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        agendaDataSelecionada = dataAgendaObjeto(dados.data_lembrete);
        agendaMesVisivel = new Date(agendaDataSelecionada.getFullYear(), agendaDataSelecionada.getMonth(), 1);
        bootstrap.Modal.getInstance(document.getElementById('modalLembreteFuncionario'))?.hide();
        await carregarLembretesDoMes();
    } catch (error) {
        erro.textContent = error.message;
        erro.hidden = false;
    } finally {
        botao.disabled = false;
    }
}

async function executarAcaoLembrete(event) {
    const botao = event.target.closest('[data-lembrete-acao]');
    if (!botao) return;
    const id = botao.dataset.lembreteId;
    const lembrete = lembretesDoMes.find(item => String(item.id_lembrete) === id);
    if (!lembrete) return;

    if (botao.dataset.lembreteAcao === 'editar') {
        abrirFormularioLembrete(lembrete);
        return;
    }

    const idFuncionario = localStorage.getItem('usuario_id');
    if (botao.dataset.lembreteAcao === 'apagar') {
        if (!confirm(`Apagar o lembrete "${lembrete.titulo}"?`)) return;
        try {
            const parametros = new URLSearchParams({ id_funcionario: idFuncionario });
            await requisitarJsonLembrete(`${API_BASE_URL}/api/funcionario/lembretes/${id}?${parametros}`, { method: 'DELETE' });
            await carregarLembretesDoMes();
        } catch (error) {
            alert(error.message);
        }
        return;
    }

    try {
        await requisitarJsonLembrete(`${API_BASE_URL}/api/funcionario/lembretes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_funcionario: idFuncionario, concluido: !lembrete.concluido })
        });
        await carregarLembretesDoMes();
    } catch (error) {
        alert(error.message);
    }
}