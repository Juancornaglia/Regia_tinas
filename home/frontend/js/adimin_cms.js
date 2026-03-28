// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

// Elementos do DOM
const editBannerModal = document.getElementById('editBannerModal');
const saveBannerButton = document.getElementById('saveBannerButton');
const modalLoadingSpinner = document.getElementById('modal-loading-spinner');
const modalFormContent = document.getElementById('modal-form-content');
const bannerImgUrlInput = document.getElementById('banner_img_url');
const bannerTituloInput = document.getElementById('banner_titulo');

async function loadBannerData() {
    modalLoadingSpinner.style.display = 'block';
    modalFormContent.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/content`);
        const data = await response.json();

        if (data) {
            const imgData = data.find(el => el.element_id === 'banner_principal_img');
            const tituloData = data.find(el => el.element_id === 'banner_principal_titulo');

            if (imgData) bannerImgUrlInput.value = imgData.content_value;
            if (tituloData) bannerTituloInput.value = tituloData.content_value;
        }
    } catch (error) {
        console.error("Erro ao carregar CMS:", error);
    } finally {
        modalLoadingSpinner.style.display = 'none';
        modalFormContent.style.display = 'block';
    }
}

async function saveBannerData() {
    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    const payload = [
        { element_id: 'banner_principal_img', content_value: bannerImgUrlInput.value },
        { element_id: 'banner_principal_titulo', content_value: bannerTituloInput.value }
    ];

    try {
        const response = await fetch(`${API_URL}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Banner atualizado com sucesso!');
            bootstrap.Modal.getInstance(editBannerModal).hide();
            
            // Recarrega o iframe para ver a mudança no "Preview"
            const iframe = document.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        }
    } catch (error) {
        alert('Erro ao salvar no servidor.');
    } finally {
        saveBannerButton.disabled = false;
        saveBannerButton.textContent = 'Salvar Alterações';
    }
}

// Listeners
if (editBannerModal) {
    editBannerModal.addEventListener('show.bs.modal', loadBannerData);
}

if (saveBannerButton) {
    saveBannerButton.addEventListener('click', saveBannerData);
}