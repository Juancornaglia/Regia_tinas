// 1. DEFINIÇÃO DA URL DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. SEGURANÇA: VERIFICAR ADMIN
async function verificarAdmin(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${token}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        return false;
    }
}

// Elementos do DOM
const editBannerModal = document.getElementById('editBannerModal');
const saveBannerButton = document.getElementById('saveBannerButton');
const modalLoadingSpinner = document.getElementById('modal-loading-spinner');
const modalFormContent = document.getElementById('modal-form-content');
const bannerImgUrlInput = document.getElementById('banner_img_url');
const bannerTituloInput = document.getElementById('banner_titulo');

// 3. INICIALIZAÇÃO E SEGURANÇA
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token'); 
    
    if (!token) {
        window.location.href = '../usuario/login.html';
        return;
    }

    const isAdmin = await verificarAdmin(token);
    if (!isAdmin) {
        alert("Acesso restrito!");
        window.location.href = '../usuario/login.html';
        return; 
    }

    document.getElementById('logout-button')?.addEventListener('click', () => {
        if(confirm('Deseja sair?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });

    // Ao abrir o modal, carrega os dados
    if (editBannerModal) {
        editBannerModal.addEventListener('show.bs.modal', loadBannerData);
    }

    if (saveBannerButton) {
        saveBannerButton.addEventListener('click', saveBannerData);
    }
});

// 4. CARREGAR DADOS DO CMS
async function loadBannerData() {
    modalLoadingSpinner.style.display = 'block';
    modalFormContent.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        
        // Buscando da API de conteúdo (ajuste a rota se no seu app.py estiver diferente)
        const response = await fetch(`${API_BASE_URL}/api/content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
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

// 5. SALVAR DADOS NO CMS
async function saveBannerData() {
    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    const payload = [
        { element_id: 'banner_principal_img', content_value: bannerImgUrlInput.value },
        { element_id: 'banner_principal_titulo', content_value: bannerTituloInput.value }
    ];

    try {
        const token = localStorage.getItem('token');
        
        // Atualizando na API (ajuste a rota se no seu app.py estiver diferente)
        const response = await fetch(`${API_BASE_URL}/api/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Banner atualizado com sucesso!');
            
            // Fecha o modal do Bootstrap
            const modalInstance = bootstrap.Modal.getInstance(editBannerModal);
            if(modalInstance) modalInstance.hide();
            
            // Tenta recarregar o iframe para ver a mudança ao vivo
            const iframe = document.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        } else {
            alert('Erro ao atualizar o conteúdo no banco de dados.');
        }
    } catch (error) {
        alert('Erro ao conectar com o servidor Python.');
    } finally {
        saveBannerButton.disabled = false;
        saveBannerButton.textContent = 'Salvar Alterações';
    }
}