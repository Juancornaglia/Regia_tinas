/**
 * js/loja.js - Localizador de Unidades (Versão Instantânea)
 */

const unidades = [
    {
        nome: "Mooca",
        endereco: "R. do Oratório, 426 - Mooca, São Paulo - SP",
        telefone: "(11) 99177-0311",
        mapa: "https://maps.google.com/maps?q=R.%20do%20Orat%C3%B3rio,%20426%20-%20Mooca,%20S%C3%A3o%20Paulo%20-%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
    },
    {
        nome: "Tatuapé",
        endereco: "R. Coelho Lisboa, 739 - Tatuapé, São Paulo - SP",
        telefone: "(11) 94527-7207",
        mapa: "https://maps.google.com/maps?q=R.%20Coelho%20Lisboa,%20739%20-%20Tatuap%C3%A9,%20S%C3%A3o%20Paulo%20-%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
    },
    {
        nome: "Ipiranga",
        endereco: "R. Srg. Mor João de Souza, 39 - Ipiranga, São Paulo - SP",
        telefone: "(11) 2925-3884",
        mapa: "https://maps.google.com/maps?q=R.%20Srg.%20Mor%20Jo%C3%A3o%20de%20Souza,%2039%20-%20Ipiranga,%20S%C3%A3o%20Paulo%20-%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
    },
    {
        nome: "Santos",
        endereco: "Av. Pres. Wilson, 180 - José Menino, Santos - SP",
        telefone: "(13) 97424-2956",
        mapa: "https://maps.google.com/maps?q=Av.%20Pres.%20Wilson,%20180%20-%20Jos%C3%A9%20Menino,%20Santos%20-%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
    },
    {
        nome: "Mega Pet Curitiba",
        endereco: "R. das Araucárias, 70 - Curitiba, PR",
        telefone: "(41) 9876-54321",
        mapa: "https://maps.google.com/maps?q=R.%20das%20Arauc%C3%A1rias,%2070%20-%20Curitiba,%20PR&t=&z=15&ie=UTF8&iwloc=&output=embed"
    }
];

function renderizarLojas() {
    const container = document.getElementById('lista-unidades');
    if (!container) return;

    container.innerHTML = unidades.map(loja => {
        // Link real para abrir o aplicativo do Google Maps ou Waze
        const linkDiretoMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loja.endereco)}`;

        return `
            <div class="col-lg-11 mb-4">
                <div class="store-card">
                    <div class="row g-0">
                        <div class="col-md-6 info-unidade d-flex flex-column justify-content-center">
                            <h2 class="fw-bold text-brand mb-3">Unidade ${loja.nome}</h2>
                            
                            <p class="fs-5 text-muted mb-4">
                                <i class="bi bi-geo-alt-fill me-2 text-brand"></i>${loja.endereco}
                            </p>
                            
                            <div class="mb-4">
                                <span class="small fw-bold text-secondary text-uppercase d-block mb-1">Fale Conosco:</span>
                                <span class="fs-4 fw-bold">${loja.telefone}</span>
                            </div>

                            <div class="d-flex flex-wrap gap-2">
                                <a href="${linkDiretoMaps}" target="_blank" class="btn-maps">
                                    <i class="bi bi-cursor-fill me-2"></i>COMO CHEGAR
                                </a>
                                <a href="https://wa.me/55${loja.telefone.replace(/\D/g, '')}" target="_blank" class="btn btn-outline-success rounded-pill px-4 fw-bold">
                                    <i class="bi bi-whatsapp me-2"></i>WHATSAPP
                                </a>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <iframe class="map-container" src="${loja.mapa}" allowfullscreen loading="lazy"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Dispara a renderização assim que o script carregar
renderizarLojas();