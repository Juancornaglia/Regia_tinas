// js/geolocator.js

// CAMINHO DE IMPORT CORRIGIDO
import { supabase } from './supabaseClient.js';

// --- DEFINIÇÃO DAS LOJAS ---
// Esta lista agora é um FALLBACK, caso o Supabase falhe.
let UNIDADES = [
    { id_loja: 1, nome_loja: 'Mooca', coords: { lat: -23.5670, lon: -46.5997 } },
    { id_loja: 2, nome_loja: 'Tatuapé', coords: { lat: -23.5420, lon: -46.5610 } },
    { id_loja: 3, nome_loja: 'Ipiranga', coords: { lat: -23.5900, lon: -46.6110 } },
    { id_loja: 4, nome_loja: 'Santos', coords: { lat: -23.9630, lon: -46.3360 } }
];
export const CHATEAU_SELECTED_STORE_KEY = 'chateau_selected_store';

/**
 * =========================================================================
 * NOVA FUNÇÃO: Tenta carregar as lojas do Supabase.
 * Se falhar, usa a lista de fallback acima.
 * =========================================================================
 */
async function loadStoresFromSupabase() {
    try {
        // ======================================================
        // == CORREÇÃO 1 AQUI ==
        // Trocado 'lat' e 'lon' pelos nomes corretos (ex: 'latitude', 'longitude')
        // ======================================================
        const { data, error } = await supabase
            .from('lojas')
            .select('id_loja, nome_loja, latitude, longitude'); // <-- CORRIGIDO

        if (error) throw error;

        if (data && data.length > 0) {
            // Mapeia os dados do Supabase para o formato que o script espera
            UNIDADES = data
                .filter(store => store.latitude && store.longitude) // Garante que a loja tenha coordenadas
                .map(store => ({
                    id_loja: store.id_loja,
                    nome_loja: store.nome_loja,
                    // ======================================================
                    // == CORREÇÃO 2 AQUI ==
                    // Trocado 'store.lat' e 'store.lon'
                    // ======================================================
                    coords: { lat: store.latitude, lon: store.longitude } // <-- CORRIGIDO
                }));
            console.log("Geolocator: Lojas carregadas com sucesso do Supabase.");
        } else {
            console.warn("Geolocator: Nenhuma loja encontrada no Supabase (ou sem coords), usando lista de fallback.");
        }
    } catch (error) {
        console.error("Geolocator: Erro ao carregar lojas do Supabase. Usando fallback.", error.message);
        // Em caso de erro, a lista 'UNIDADES' de fallback já está definida.
    }
}


// --- FUNÇÕES AUXILIARES DE CÁLCULO GEOGRÁFICO (Haversine) ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- FUNÇÕES DE ARMAZENAMENTO E INTERFACE ---
function setSelectedStore(storeId, storeName, distance = null) {
    const locationSpan = document.getElementById('unidade-proxima');
    const changeBtn = document.getElementById('change-store-btn');
    
    localStorage.setItem(CHATEAU_SELECTED_STORE_KEY, JSON.stringify({ id: storeId, name: storeName }));
    
    let display = `📍 ${storeName}`;
    if (distance !== null) {
        display += ` (${distance.toFixed(1)} km)`;
    
    }

    if (locationSpan) locationSpan.textContent = display;
    if (changeBtn) changeBtn.style.display = 'inline'; 
    
    // Dispara um evento customizado para que o home.js saiba que deve recarregar
    window.dispatchEvent(new Event('chateauStoreChanged'));
}

function loadInitialStore() {
    const savedStore = localStorage.getItem(CHATEAU_SELECTED_STORE_KEY);
    if (savedStore) {
        const { id, name } = JSON.parse(savedStore);
        setSelectedStore(id, name);
        return true;
    }
    return false;
}

function findNearestStore(userLat, userLon) {
    let nearestStore = null;
    let minDistance = Infinity;

    UNIDADES.forEach(store => {
        const dist = getDistance(userLat, userLon, store.coords.lat, store.coords.lon);
        if (dist < minDistance) {
            minDistance = dist;
            nearestStore = store;
        }
    });

    if (nearestStore) {
        setSelectedStore(nearestStore.id_loja, nearestStore.nome_loja, minDistance);
    }
}


// --- FUNÇÃO PRINCIPAL DE GEOLOCALIZAÇÃO ---
/**
 * =========================================================================
 * FUNÇÃO MODIFICADA: Agora é 'async' para esperar o Supabase
 * =========================================================================
 */
export async function initGeolocation() {
    // 1. PRIMEIRO, carrega a lista de lojas (do DB ou fallback)
    await loadStoresFromSupabase();

    const locationSpan = document.getElementById('unidade-proxima');
    
    // 2. Tenta carregar do LocalStorage (se já foi salvo)
    if (loadInitialStore()) {
        return; 
    }

    if (locationSpan) locationSpan.textContent = "Buscando localização (Aguarde permissão)...";

    // 3. Tenta obter a localização via navegador
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                findNearestStore(lat, lon); 
            },
            (error) => {
                // Usuário negou ou houve erro - Define padrão (primeira loja da lista)
                console.warn("[GeoLocator] Erro/Negação:", error.message);
                if (locationSpan) locationSpan.textContent = `📍 Geolocalização negada. Usando ${UNIDADES[0].nome_loja} (Padrão)`;
                setSelectedStore(UNIDADES[0].id_loja, UNIDADES[0].nome_loja, null); 
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
        );
    } else {
        // 4. Navegador não suporta - Define padrão (primeira loja da lista)
        if (locationSpan) locationSpan.textContent = `📍 Geolocalização não suportada. Usando ${UNIDADES[0].nome_loja} (Padrão)`;
        setSelectedStore(UNIDADES[0].id_loja, UNIDADES[0].nome_loja, null);
    }
}

// --- FUNÇÃO DE TROCA MANUAL DE LOJA ---

function setupManualStoreChange() {
    const storeModal = new bootstrap.Modal(document.getElementById('storeModal'));
    
    // ATENÇÃO: A lógica do 'prompt' foi trocada pela lógica do Modal
    // que já existe no seu 'home.html'
    
    document.querySelectorAll('.store-select-btn').forEach(button => {
        button.addEventListener('click', () => {
            const storeId = parseInt(button.dataset.storeId);
            const storeName = button.dataset.storeName;
            
            if (storeId && storeName) {
                setSelectedStore(storeId, storeName, null);
                alert(`Troca realizada! Agora você vê os produtos de ${storeName}.`);
                storeModal.hide();
                // window.location.reload(); // Recarrega para ver os produtos da nova loja
            } else {
                alert("ID de loja inválido.");
            }
        });
    });

    // O código antigo do 'prompt' foi removido
}


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // initGeolocation é 'async' mas não precisamos esperar
    initGeolocation(); 
    setupManualStoreChange();
});