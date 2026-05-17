/**
 * js/loja.js - Gestão Unificada das Unidades Físicas (Regia & Tinas Care)
 * Sincronizado com os dados reais do Neon via arquivo JSON local
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    carregarLojas();
});

async function carregarLojas() {
    const container = document.getElementById('lista-unidades');
    if (!container) return;

    try {
        // Carrega o arquivo JSON local com os dados reais que você forneceu
        // CORREÇÃO: Usando fetch local para o JSON fornecido pelo usuário
        const response = await fetch('../js/lojas.json');
        
        if (!response.ok) throw new Error("Falha ao ler o arquivo JSON das lojas");
        
        const lojas = await response.json();
        const listaLojas = Array.isArray(lojas) ? lojas : [];

        if (listaLojas.length === 0) {
            container.innerHTML = '<div class="col-12 text-center p-3 text-muted small"><i class="bi bi-info-circle me-1"></i> Nenhuma unidade física cadastrada no momento.</div>';
            return;
        }

        // CORREÇÃO MÁXIMA: Geração da estrutura de GRADE PREMIUM alinhada com o HTML unificado
        container.innerHTML = listaLojas.map(l => {
            // Sincroniza os nomes de colunas do JSON real fornecido pelo usuário
            const nomeLoja = l.nome_loja || 'Unidade Care';
            const endereco = l.endereco || 'Endereço Indisponível';
            const telefone = l.telefone || '(11) 0000-0000';
            const referencia = l.referencia ? ` <span class="text-secondary opacity-75">(${l.referencia})</span>` : '';
            // Substitua 'unidade_placeholder.jpg' pelos nomes reais das suas imagens na pasta img
            const imgUrl = l.img_loja ? `../img/${l.img_loja}` : '../img/unidade_placeholder.jpg';
            const mapsUrl = l.link_google_maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

            return `
                <div class="col-md-6 col-lg-5 col-xl-4">
                    <div class="store-card shadow-sm p-0">
                        <div class="store-img-container shadow-sm border-bottom border-light">
                            <span class="store-badge border">Unidade Física</span>
                            <img src="${imgUrl}" class="store-img" alt="Unidade ${nomeLoja}" loading="lazy">
                        </div>
                        <div class="info-unidade h-100 d-flex flex-column justify-content-start p-4 p-lg-5">
                            <h3 class="fw-bold text-dark mb-1">Unidade ${nomeLoja}</h3>
                            <p class="text-muted small mb-4 fw-medium"><i class="bi bi-headset me-2 text-danger opacity-50"></i>Central: ${telefone}</p>
                            
                            <a href="${mapsUrl}" target="_blank" class="address-box mb-4 shadow-sm" title="Abrir rota no mapa">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-geo-alt-fill text-danger fs-5 me-3 mt-1"></i>
                                    <div>
                                        <strong class="text-dark d-block small mb-1 fw-semibold text-uppercase" style="letter-spacing: 0.5px;">Endereço de Retirada:</strong>
                                        <span class="small text-secondary" style="line-height: 1.4;">${endereco}${referencia}</span>
                                    </div>
                                </div>
                            </a>
                            
                            <div class="mt-auto text-end text-md-start">
                                <a href="https://wa.me/55${telefone.replace(/\D/g,'')}" target="_blank" class="btn-whatsapp rounded-pill shadow-sm small fw-semibold">
                                    <i class="bi bi-whatsapp"></i> Falar no Balcão
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro crítico ao carregar unidades físicas do Neon:", error);
        container.innerHTML = '<p class="text-danger small p-3 text-center">Falha operacional ao processar a lista de unidades físicas.</p>';
    }
}