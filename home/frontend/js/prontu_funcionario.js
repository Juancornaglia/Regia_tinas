/**
 * js/prontu_funcionario.js - Cérebro do Prontuário Médico
 * Gerencia a busca de pets, exibição de histórico e novos registros
 */

const PRONTU_API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estados globais
let petSelecionado = null;
let historicoClinico = [];
let acaoRegistroAtual = 'adicionar';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema de Prontuário iniciado.");
    
    // 1. Configura a barra de busca
    const inputBusca = document.getElementById('input-busca-pet');
    const btnBusca = document.getElementById('btn-busca-pet');

    if (btnBusca && inputBusca) {
        btnBusca.addEventListener('click', () => buscarPet(inputBusca.value.trim()));
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarPet(inputBusca.value.trim());
            }
        });
    }

    // 2. Configura a lógica visual do formulário (Adicionar/Alterar/Excluir)
    configurarInterfaceModal();
    configurarExpansaoPerfilPet();
    document.addEventListener('click', event => {
        const botao = event.target.closest('[data-record-action]');
        if (!botao) return;
        const item = botao.closest('[data-record-id]');
        const idRegistro = item?.dataset.recordId || historicoClinico[0]?.id_prontuario;
        abrirEditorProntuario(botao.dataset.recordAction, idRegistro);
    });
});

// ==========================================
// 1. BUSCA DE PETS E PERFIL
// ==========================================

async function buscarPet(termo) {
    if (!termo) {
        alert("Digite o nome do pet ou CPF do tutor para buscar!");
        return;
    }

    try {
        const response = await fetch(`${PRONTU_API_URL}/api/perfis?busca=${encodeURIComponent(termo)}`);
        if (!response.ok) throw new Error("Erro ao consultar pacientes.");

        const perfis = await response.json();

        if (!Array.isArray(perfis) || perfis.length === 0) {
            alert("Nenhum pet encontrado com esses dados.");
            return;
        }

        petSelecionado = perfis[0];
        atualizarCardPerfil(petSelecionado);
        carregarHistoricoMedico(petSelecionado.id_pet || petSelecionado.id);

    } catch (error) {
        console.error("Erro ao buscar pet:", error);
        alert("Erro ao buscar dados do paciente no servidor.");
    }
}

function atualizarCardPerfil(p) {
    const card = document.getElementById('card-perfil-pet');
    if (!card) return;

    const idCurto = String(p.id_pet || p.id || '0000').slice(0, 8).toUpperCase();
    const badge = document.getElementById('pet-registro-badge');
    if (badge) badge.innerText = `REGISTRO #${idCurto}`;
    
    // Nome e Raça
    const titulo = document.getElementById('pet-nome-titulo');
    if (titulo) {
        titulo.innerHTML = `${escaparHTML(p.nome_pet || p.nome || 'Pet')} <small class="text-muted fs-6 fw-normal">· Raça: ${escaparHTML(p.raca || 'Não informada')}</small>`;
    }
    
    // Detalhes (Tutor, Idade, Peso)
    const detalhesContainer = document.getElementById('pet-detalhes-lista');
    if (detalhesContainer) {
        const detalhes = detalhesContainer.querySelectorAll('span');
        if (detalhes[0]) detalhes[0].innerHTML = `<i class="bi bi-person me-1 brand-pink"></i>Tutor: ${escaparHTML(p.nome_tutor || p.nome_cliente || 'Não informado')}`;
        if (detalhes[1]) detalhes[1].innerHTML = `<i class="bi bi-calendar-event me-1 brand-pink"></i>Idade: ${escaparHTML(p.idade ? `${p.idade} anos` : 'Não inf.')}`;
        if (detalhes[2]) detalhes[2].innerHTML = `<i class="bi bi-speedometer2 me-1 brand-pink"></i>Peso: ${escaparHTML(p.peso ? `${p.peso}kg` : 'Não inf.')}`;
    }

    // Imagem
    const avatar = card.querySelector('.pet-avatar');
    if (avatar && p.url_imagem) {
        avatar.src = p.url_imagem;
    }

    const btnPerfil = document.getElementById('btn-perfil-completo');
    if (btnPerfil) {
        btnPerfil.disabled = false;
        btnPerfil.innerText = "Abrir prontuário";
    }
    document.getElementById('pet-record-content')?.classList.add('d-none');
    const resumoPerfil = document.querySelector('#card-perfil-pet [data-pet-profile-summary]');
    resumoPerfil?.setAttribute('aria-expanded', 'false');
    document.getElementById('pet-record-chevron')?.classList.remove('is-expanded');
    if (btnPerfil) btnPerfil.textContent = 'Abrir prontuário';
    atualizarAcoesProntuario();
}

function configurarExpansaoPerfilPet() {
    const resumo = document.querySelector('#card-perfil-pet [data-pet-profile-summary]');
    const botao = document.getElementById('btn-perfil-completo');
    const cartao = document.getElementById('card-perfil-pet');
    const conteudo = document.getElementById('pet-record-content');
    if (!resumo || !cartao || !conteudo) return;

    resumo.setAttribute('role', 'button');
    resumo.setAttribute('tabindex', '0');
    resumo.setAttribute('aria-expanded', 'false');
    resumo.style.cursor = 'pointer';

    const alternar = () => {
        if (!petSelecionado) return;
        const aberto = conteudo.classList.toggle('d-none') === false;
        resumo.setAttribute('aria-expanded', String(aberto));
        if (botao) botao.textContent = aberto ? 'Fechar prontuário' : 'Abrir prontuário';
        document.getElementById('pet-record-chevron')?.classList.toggle('is-expanded', aberto);
    };

    resumo.addEventListener('click', alternar);
    resumo.addEventListener('keydown', event => {
        if (event.target.closest('button')) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            alternar();
        }
    });
}

// ==========================================
// 2. HISTÓRICO E LINHA DO TEMPO (TIMELINE)
// ==========================================

async function carregarHistoricoMedico(idPet) {
    const timeline = document.getElementById('timeline-prontuario');
    if (!timeline) return;

    timeline.innerHTML = '<div class="text-center p-4"><div class="spinner-border brand-pink"></div></div>';

    try {
        const response = await fetch(`${PRONTU_API_URL}/api/pet/historico/${idPet}`);
        if (!response.ok) throw new Error("Falha ao buscar histórico.");

        historicoClinico = await response.json();

        if (!Array.isArray(historicoClinico) || historicoClinico.length === 0) {
            timeline.innerHTML = '<p class="text-muted ps-2">Nenhum histórico médico registrado para este pet.</p>';
            historicoClinico = [];
            atualizarAcoesProntuario();
            return;
        }

        renderizarTimeline();

    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
        timeline.innerHTML = '<p class="text-danger ps-2">Erro ao carregar histórico médico.</p>';
    }
}

function renderizarTimeline() {
    const timeline = document.getElementById('timeline-prontuario');
    if (!timeline) return;
    
    timeline.innerHTML = historicoClinico.map(h => {
        const categoria = h.categoria || 'Consulta';
        const idRegistro = h.id_prontuario || h.id;
        const idSeguro = escaparHTML(idRegistro || '');
        return `
        <div class="timeline-item" data-record-id="${idSeguro}">
            <div class="timeline-marker"></div>
            <div class="history-card shadow-sm">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge ${getCategoriaStyle(categoria)} bg-opacity-10 border px-3 py-1 rounded-pill fw-bold small">${categoria.toUpperCase()}</span>
                    <small class="text-muted fw-bold"><i class="bi bi-calendar-check me-1"></i>${formatarData(h.data_registro)}</small>
                </div>
                <h6 class="fw-bold text-dark fs-5 mb-2">${h.titulo || h.servico || categoria}</h6>
                <p class="text-muted small mb-0">${h.descricao || h.observacoes || 'Sem observações detalhadas.'}</p>
                <div class="mt-3 text-end border-top pt-2">
                    <small class="fw-bold brand-pink"><i class="bi bi-person-badge me-1"></i>Registrado por: ${h.nome_funcionario || 'Equipe Técnica'}</small>
                </div>
                <div class="d-flex flex-wrap gap-2 mt-3">
                    <button type="button" class="btn btn-sm text-white rounded-pill" style="background:#FE8697" data-record-action="adicionar"><i class="bi bi-plus-lg me-1"></i>Adicionar Info</button>
                    <button type="button" class="btn btn-sm btn-outline-primary rounded-pill" data-record-action="alterar" ${idRegistro ? '' : 'disabled'}><i class="bi bi-pencil me-1"></i>Atualizar</button>
                    <button type="button" class="btn btn-sm btn-outline-danger rounded-pill" data-record-action="cancelar" ${idRegistro ? '' : 'disabled'}><i class="bi bi-x-lg me-1"></i>Cancelar</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function atualizarAcoesProntuario() {
    const temPet = Boolean(petSelecionado);
    const temRegistro = historicoClinico.length > 0 && Boolean(historicoClinico[0].id_prontuario || historicoClinico[0].id);
    document.querySelectorAll('#card-perfil-pet [data-record-action="adicionar"]').forEach(botao => { botao.disabled = !temPet; });
    document.querySelectorAll('#card-perfil-pet [data-record-action="alterar"], #card-perfil-pet [data-record-action="cancelar"]')
        .forEach(botao => { botao.disabled = !temPet || !temRegistro; });
}

function abrirEditorProntuario(acao, idRegistro) {
    if (!petSelecionado) {
        alert('Busque e selecione um pet antes de continuar.');
        return;
    }

    acaoRegistroAtual = acao;
    const registro = historicoClinico.find(item => String(item.id_prontuario || item.id) === String(idRegistro));
    if (acao !== 'adicionar' && !registro) {
        alert('Selecione um registro médico válido.');
        return;
    }
    if (acao === 'cancelar') {
        if (!confirm('Cancelar este registro médico?')) return;
        document.getElementById('reg-id-prontuario').value = registro.id_prontuario || registro.id;
        solicitarAssinatura(finalizarRegistroProntuario);
        return;
    }

    const form = document.getElementById('form-prontuario') || document.getElementById('formRegistroClinico');
    form?.reset();
    document.getElementById('reg-id-prontuario').value = acao === 'alterar' ? (registro.id_prontuario || registro.id) : '';
    document.getElementById('reg-categoria').value = registro?.categoria || 'Consulta';
    document.getElementById('reg-titulo').value = registro?.titulo || '';
    document.getElementById('reg-descricao').value = registro?.descricao || '';
    const radio = document.querySelector(`input[name="tipo_prontu"][value="${acao}"]`);
    if (radio) radio.checked = true;
    const modalEl = document.getElementById('modalGerenciarProntuario') || document.getElementById('modalNovoRegistro');
    const titulo = modalEl?.querySelector('.modal-header h5');
    if (titulo) titulo.textContent = acao === 'alterar' ? 'Atualizar registro clínico' : 'Adicionar informação clínica';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function getCategoriaStyle(cat) {
    const estilos = {
        'Vacina': 'bg-success text-success border-success',
        'Consulta': 'bg-info text-info border-info',
        'Cirurgia': 'bg-danger text-danger border-danger',
        'Exame': 'bg-warning text-warning border-warning'
    };
    return estilos[cat] || 'bg-secondary text-secondary border-secondary';
}

// ==========================================
// 3. PROCESSAR NOVO REGISTRO (INTEGRAÇÃO CPF)
// ==========================================

function configurarInterfaceModal() {
    const radios = document.querySelectorAll('input[name="tipo_prontu"]');
    const btnAvancar = document.getElementById('btn-avancar-prontuario');

    if (!btnAvancar) return;

    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'cancelar') {
                btnAvancar.className = "btn btn-danger rounded-pill px-4 fw-bold shadow";
                btnAvancar.innerText = "CONFIRMAR EXCLUSÃO E ASSINAR";
            } else if (e.target.value === 'alterar') {
                btnAvancar.className = "btn btn-warning text-dark rounded-pill px-4 fw-bold shadow";
                btnAvancar.innerText = "SALVAR ALTERAÇÃO E ASSINAR";
            } else {
                btnAvancar.className = "btn bg-brand-pink text-white rounded-pill px-4 fw-bold shadow";
                btnAvancar.innerText = "AVANÇAR PARA ASSINATURA";
            }
        });
    });
}

window.prepararAssinaturaProntuario = function() {
    if (!petSelecionado) {
        alert("Busque e selecione um pet antes de adicionar um registro ao prontuário!");
        return;
    }

    const acao = document.querySelector('input[name="tipo_prontu"]:checked')?.value || acaoRegistroAtual;
    const descricao = document.getElementById('reg-descricao')?.value.trim();
    if (acao !== 'cancelar' && !descricao) {
        alert("Preencha as observações clínicas antes de prosseguir!");
        return;
    }

    const modalEl = document.getElementById('modalGerenciarProntuario') || document.getElementById('modalNovoRegistro');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();

    acaoRegistroAtual = acao;
    solicitarAssinatura(finalizarRegistroProntuario);
};

async function finalizarRegistroProntuario(idFuncionario) {
    if (!petSelecionado) return;

    const acao = acaoRegistroAtual || document.querySelector('input[name="tipo_prontu"]:checked')?.value || 'adicionar';
    const categoria = document.getElementById('reg-categoria')?.value || 'Consulta';
    const titulo = document.getElementById('reg-titulo')?.value.trim() || categoria;
    const descricao = document.getElementById('reg-descricao')?.value.trim() || '';
    
    const dados = {
        id_pet: petSelecionado.id_pet || petSelecionado.id,
        id_funcionario: idFuncionario,
        categoria: categoria,
        titulo: titulo,
        descricao: descricao,
        tipo_acao: acao,
        id_registro: document.getElementById('reg-id-prontuario')?.value || null
    };

    try {
        const res = await fetch(`${PRONTU_API_URL}/api/pet/historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert(`Registro de ${acao} salvo e assinado no prontuário!`);
            (document.getElementById('form-prontuario') || document.getElementById('formRegistroClinico'))?.reset();
            await carregarHistoricoMedico(dados.id_pet);
            atualizarAcoesProntuario();
        } else {
            const err = await res.json();
            alert(err.error || "Não foi possível salvar o registro no prontuário.");
        }
    } catch (e) {
        console.error("Erro ao salvar prontuário:", e);
        alert("Erro ao conectar com o banco Neon.");
    }
}

// Auxiliares
function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
}

function formatarData(dataISO) {
    if (!dataISO) return "--/--/----";
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR') + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}