const SERVICE_PRICING_API_BASE_URL = window.API_BASE_URL || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://regia-tinas.onrender.com'
);

function normalizeServiceName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function parseServicePrice(value) {
    if (typeof value === 'number') return value;
    const raw = String(value ?? '').replace(/[^\d,.-]/g, '');
    if (!raw) return Number.NaN;

    const normalized = raw.includes(',')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw;
    return Number(normalized);
}

async function loadServicePrices() {
    const priceElements = document.querySelectorAll('[data-service-pricing]');
    if (!priceElements.length) return;

    try {
        const response = await fetch(`${SERVICE_PRICING_API_BASE_URL}/api/servicos`);
        if (!response.ok) throw new Error(`Falha ao consultar serviços: ${response.status}`);

        const payload = await response.json();
        const services = Array.isArray(payload) ? payload : payload.servicos;
        if (!Array.isArray(services)) throw new Error('Resposta inválida do catálogo de serviços.');

        priceElements.forEach((element) => {
            const matcher = normalizeServiceName(element.dataset.servicePricing);
            const service = services.find((item) =>
                normalizeServiceName(item.nome_servico).includes(matcher)
            );

            if (!service) {
                element.textContent = 'Não cadastrado no catálogo';
                return;
            }

            const price = parseServicePrice(service.preco_servico);
            element.textContent = Number.isFinite(price)
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
                : 'Preço não informado';
        });
    } catch (error) {
        console.error('Não foi possível carregar os preços do catálogo de serviços.', error);
        priceElements.forEach((element) => {
            element.textContent = 'Preço indisponível';
        });
    }
}

document.addEventListener('DOMContentLoaded', loadServicePrices);
