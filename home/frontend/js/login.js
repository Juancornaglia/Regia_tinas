/**
 * js/loja.js - Gestão Unificada das Unidades Físicas (Regia & Tinas Care)
 * Ajustado para ler direto da pasta raiz do projeto.
 */

document.addEventListener('DOMContentLoaded', () => {
    carregarLojas();
});

async function carregarLojas() {
    const container = document.getElementById('lista-unidades');
    if (!container) return;

    try {
        // CORREÇÃO MÁXIMA: Buscando o JSON diretamente na raiz da pasta js/
        const response = await fetch('js/lojas.json');
        
        if (!response.ok) throw new Error("Falha ao ler o arquivo JSON das lojas");
        
        const lojas = await response.json();
        const listaLojas = Array.isArray(lojas) ? lojas : [];

        if (listaLojas.length === 0) {
            container.innerHTML = '<div class="col-12 text-center p-3 text-muted small">Nenhuma unidade cadastrada no momento.</div>';
            return;
        }

        // Monta a grade visual premium idêntica à vibe solicitada
        container.innerHTML = listaLojas.map(l => {
            const nomeLoja = l.nome_loja || 'Unidade Care';
            const endereco = l.endereco || 'Endereço Indisponível';
            const telefone = l.telefone || '(11) 0000-0000';
            
            // Tratamento dinâmico de fotos (aponta para img/ na raiz)
            const imgUrl = l.nome_loja.toLowerCase() === 'mooca' ? 'img/unidade_mooca.jpg' : 
                           l.nome_loja.toLowerCase() === 'tatuapé' ? 'img/unidade_tatuape.jpg' : 
                           l.nome_loja.toLowerCase() === 'ipiranga' ? 'img/unidade_ipiranga.jpg' : 'img/unidade_placeholder.jpg';

            const mapsUrl = l.link_google_maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="store-card shadow-sm p-0">
                        <div class="store-img-container border-bottom">
                            <span class="store-badge border">Unidade Física</span>
                            <img src="${imgUrl}" class="store-img" alt="Unidade ${nomeLoja}" onerror="this.src='img/logo_pequena4.png'; this.style.padding='40px';">
                        </div>
                        <div class="info-unidade p-4">
                            <h4 class="fw-bold text-dark mb-1">Unidade ${nomeLoja}</h4>
                            <p class="text-muted small mb-3"><i class="bi bi-telephone-fill me-2 text-brand"></i>${telefone}</p>
                            
                            <a href="${mapsUrl}" target="_blank" class="address-box mb-3 shadow-sm">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-geo-alt-fill text-danger fs-5 me-3 mt-1"></i>
                                    <div>
                                        <strong class="text-dark d-block small mb-1 text-uppercase">Endereço de Retirada:</strong>
                                        <span class="small text-secondary" style="line-height: 1.4;">${endereco}</span>
                                    </div>
                                </div>
                            </a>
                            
                            <div class="mt-3">
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
        console.error("Erro crítico ao carregar unidades:", error);
        container.innerHTML = '<p class="text-danger small p-3 text-center">Falha ao processar a lista de unidades físicas.</p>';
    }
}