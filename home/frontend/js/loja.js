/**
 * js/loja.js - Lista de Unidades Instantânea (Sem GPS)
 */

const unidades = [
    {
        nome: "Unidade Mooca",
        endereco: "R. do Oratório, 426 - Mooca, São Paulo - SP",
        telefone: "(11) 99177-0311",
        imagem: "img/loja7.png"
    },
    {
        nome: "Unidade Tatuapé",
        endereco: "R. Coelho Lisboa, 739 - Tatuapé, São Paulo - SP",
        telefone: "(11) 94527-7207",
        imagem: "img/loja7.png"
    },
    {
        nome: "Unidade Ipiranga",
        endereco: "R. Srg. Mor João de Souza, 39 - Ipiranga, São Paulo - SP",
        telefone: "(11) 2925-3884",
        imagem: "img/loja7.png"
    },
    {
        nome: "Unidade Santos",
        endereco: "Av. Pres. Wilson, 180 - José Menino, Santos - SP",
        telefone: "(13) 97424-2956",
        imagem: "img/loja7.png"
    },
    {
        nome: "Unidade Curitiba",
        endereco: "R. das Araucárias, 70 - Curitiba, PR",
        telefone: "(41) 9876-54321",
        imagem: "img/loja7.png"
    }
];

function renderizarLojas() {
    const container = document.getElementById('lista-unidades');
    if (!container) return;

    container.innerHTML = unidades.map(loja => {
        // Gera o link de busca do Google Maps
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loja.endereco)}`;

        return `
            <div class="col-lg-10 mb-4">
                <div class="store-card">
                    <div class="row g-0">
                        <div class="col-md-5">
                            <img src="${loja.imagem}" class="store-img" alt="${loja.nome}" onerror="this.src='img/logo_pequena4.png'">
                        </div>
                        
                        <div class="col-md-7 info-unidade d-flex flex-column justify-content-center">
                            <h3 class="fw-bold text-brand mb-3">${loja.nome}</h3>
                            
                            <a href="${mapsUrl}" target="_blank" class="address-box mb-4">
                                <div class="small fw-bold text-brand text-uppercase mb-1">Endereço (Toque para abrir o GPS):</div>
                                <div class="text-dark"><i class="bi bi-geo-alt-fill me-2 text-brand"></i>${loja.endereco}</div>
                            </a>
                            
                            <div class="mb-4">
                                <span class="small fw-bold text-secondary d-block">Telefone:</span>
                                <span class="fs-4 fw-bold text-dark">${loja.telefone}</span>
                            </div>

                            <div>
                                <a href="https://wa.me/55${loja.telefone.replace(/\D/g, '')}" target="_blank" class="btn-whatsapp">
                                    <i class="bi bi-whatsapp me-2"></i>CHAMAR NO WHATSAPP
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Executa na hora!
document.addEventListener('DOMContentLoaded', renderizarLojas);