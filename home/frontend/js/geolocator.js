// --- CONFIGURAÇÃO ---
const API_URL = 'http://localhost:5000/api';
export const CHATEAU_SELECTED_STORE_KEY = 'chateau_selected_store';

// Função Haversine (Cálculo matemático de distância entre dois pontos no globo)

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 1. BUSCAR LOJAS REAIS DO NEON (Via Python)
async function getUnidadesDoBanco() {
    try {
        const response = await fetch(`${API_URL}/admin/lojas`);
        const lojas = await response.json();
        // Nota: Garanta que sua tabela 'lojas' no Neon tenha as colunas 'latitude' e 'longitude'
        return lojas;
    } catch (error) {
        console.error("Erro ao carregar unidades:", error);
        return [];
    }
}

// 2. DEFINIR LOJA SELECIONADA
function setSelectedStore(storeId, storeName, distance = null) {
    const locationSpan = document.getElementById('unidade-proxima');
    
    localStorage.setItem(CHATEAU_SELECTED_STORE_KEY, JSON.stringify({ id: storeId, name: storeName }));
    
    let display = `📍 Unidade: ${storeName}`;
    if (distance !== null) {
        display += ` (a ${distance.toFixed(1)} km de você)`;
    }

    if (locationSpan) locationSpan.textContent = display;
    
    // Dispara evento para outros scripts (como o de produtos) filtrarem pela loja
    window.dispatchEvent(new Event('chateauStoreChanged'));
}

// 3. ENCONTRAR A MAIS PRÓXIMA
async function findNearestStore(userLat, userLon) {
    const unidades = await getUnidadesDoBanco();
    let nearestStore = null;
    let minDistance = Infinity;

    unidades.forEach(store => {
        // Assume que o banco retorna 'latitude' e 'longitude'
        if (store.latitude && store.longitude) {
            const dist = getDistance(userLat, userLon, store.latitude, store.longitude);
            if (dist < minDistance) {
                minDistance = dist;
                nearestStore = store;
            }
        }
    });

    if (nearestStore) {
        setSelectedStore(nearestStore.id_loja, nearestStore.nome_loja, minDistance);
    }
}

// 4. INICIALIZAÇÃO
export function initGeolocation() {
    const locationSpan = document.getElementById('unidade-proxima');

    // Se já escolheu uma antes, mantém
    const saved = localStorage.getItem(CHATEAU_SELECTED_STORE_KEY);
    if (saved) {
        const { id, name } = JSON.parse(saved);
        setSelectedStore(id, name);
        return;
    }

    if (navigator.geolocation) {
        if (locationSpan) locationSpan.textContent = "📍 Localizando unidade mais próxima...";
        
        navigator.geolocation.getCurrentPosition(
            (pos) => findNearestStore(pos.coords.latitude, pos.coords.longitude),
            () => setSelectedStore(1, "Mooca (Padrão)"), // Fallback se negar
            { timeout: 5000 }
        );
    }
}

document.addEventListener('DOMContentLoaded', initGeolocation);