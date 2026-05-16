/**
 * js/admin_cms.js - Motor de Gestão de Conteúdo
 * Conectado ao Backend Python + Neon
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

const editBannerModal = document.getElementById('editBannerModal');
const saveBannerButton = document.getElementById('saveBannerButton');
const modalLoadingSpinner = document.getElementById('modal-loading-spinner');
const modalFormContent = document.getElementById('modal-form-content');
const bannerImgUrlInput = document.getElementById('banner_img_url');

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAMENTO INICIAL DO MODAL
    if (editBannerModal) {
        editBannerModal.addEventListener('show.bs.modal', loadBannerData);
    }
    
    // 2. EVENTO DE SALVAR
    if (saveBannerButton) {
        saveBannerButton.addEventListener('click', saveBannerData);
    }

    // 3. PREVIEW EM TEMPO REAL (Para não salvar link quebrado)
    bannerImgUrlInput?.addEventListener('input', (e) => {
        const url = e.target.value;
        updateLivePreview(url);
    });
});

// --- FUNÇÃO: BUSCAR DADOS DO NEON ---
async function loadBannerData() {
    if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'block';
    if (modalFormContent) modalFormContent.style.display = 'none';

    try {
        // Buscamos todo o conteúdo do CMS do banco Neon
        const response = await fetch(`${API_BASE_URL}/api/cms/content`);

        if (response.ok) {
            const data = await response.json();
            
            // Localiza a configuração do banner principal
            const bannerItem = data.find(item => item.element_id === 'banner_principal_img');
            
            if (bannerItem && bannerImgUrlInput) {
                bannerImgUrlInput.value = bannerItem.content_value;
                updateLivePreview(bannerItem.content_value); // Renderiza a imagem atual no modal
            }
        } else {
            console.error("Erro ao carregar dados do CMS vindos do servidor.");
        }
    } catch (error) {
        console.error("Erro de conexão com a API Neon/Render:", error);
    } finally {
        if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'none';
        if (modalFormContent) modalFormContent.style.display = 'block';
    }
}

// --- FUNÇÃO: SALVAR NO BANCO (POST) ---
async function saveBannerData() {
    if (!bannerImgUrlInput || !bannerImgUrlInput.value.startsWith('http')) {
        alert("Por favor, insira uma URL válida (começando com http ou https).");
        return;
    }

    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> PUBLICANDO...';

    // Payload em formato de array estruturado para a tabela cms_content
    const payload = [
        {
            element_id: 'banner_principal_img',
            content_value: bannerImgUrlInput.value
        }
    ];

    try {
        const response = await fetch(`${API_BASE_URL}/api/cms/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Autenticação JWT do Admin
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('🚀 Sucesso! O novo banner já está salvo no Neon e ao vivo no site.');
            
            // Fecha o modal do Bootstrap de forma limpa
            const modalInstance = bootstrap.Modal.getInstance(editBannerModal);
            modalInstance?.hide();
            
            // Atualiza o iFrame de preview do painel automaticamente
            refreshSitePreview();
        } else {
            const errorData = await response.json();
            alert("Erro ao salvar no banco: " + (errorData.error || "Tente novamente."));
        }
    } catch (error) {
        alert("Falha na comunicação com o servidor Render. Verifique sua conexão.");
    } finally {
        saveBannerButton.disabled = false;
        saveBannerButton.textContent = 'PUBLICAR ALTERAÇÃO'; // Mantém o padrão do HTML original
    }
}

// --- HELPERS (AUXILIARES) ---

function updateLivePreview(url) {
    let previewContainer = document.getElementById('banner-preview-box');
    
    // Se não existir o box de preview, cria ele estruturado
    if (!previewContainer && bannerImgUrlInput) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'banner-preview-box';
        previewContainer.className = 'mt-3 text-center border rounded-3 p-2 bg-white shadow-sm';
        
        // CORRIGIDO: Inserido logo após o grupo do input para não quebrar o layout flex do Bootstrap
        const inputGroup = bannerImgUrlInput.closest('.input-group');
        if (inputGroup) {
            inputGroup.after(previewContainer);
        }
    }

    if (previewContainer) {
        if (url && url.startsWith('http')) {
            previewContainer.innerHTML = `<img src="${url}" class="img-fluid rounded shadow-sm" style="max-height: 140px; object-fit: cover;" onerror="this.src='../img/placeholder-error.png'">`;
        } else {
            previewContainer.innerHTML = '<small class="text-muted">Aguardando link de imagem válido...</small>';
        }
    }
}

function refreshSitePreview() {
    // CORRIGIDO: Seleção direta via ID do iframe otimizado no passo anterior
    const iframe = document.getElementById('previewIframe');
    if (iframe) {
        // Recarrega o conteúdo do iframe para aplicar a alteração instantaneamente
        iframe.src = iframe.src;
    }
}