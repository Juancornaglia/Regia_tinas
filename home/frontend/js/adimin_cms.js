// 1. DEFINIÇÃO DA URL DO BACKEND
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 2. SEGURANÇA: VERIFICAR ADMIN
async function verificarAdmin(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        // CORREÇÃO: Verifica status antes de tentar ler JSON
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro na segurança CMS:", error);
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
    const userId = localStorage.getItem('usuario_id'); 
    
    if (!userId) {
        window.location.href = '../usuario/login.html';
        return;
    }

    const isAdmin = await verificarAdmin(userId);
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
    if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'block';
    if (modalFormContent) modalFormContent.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // BLINDAGEM: Verifica erro de servidor antes do JSON
        if (!response.ok) throw new Error("Falha ao carregar conteúdo editável.");

        const data = await response.json();

        if (Array.isArray(data)) {
            const imgData = data.find(el => el.element_id === 'banner_principal_img');
            const tituloData = data.find(el => el.element_id === 'banner_principal_titulo');

            if (imgData && bannerImgUrlInput) bannerImgUrlInput.value = imgData.content_value;
            if (tituloData && bannerTituloInput) bannerTituloInput.value = tituloData.content_value;
        }
    } catch (error) {
        console.error("Erro ao carregar CMS:", error);
        alert("Não foi possível carregar os dados atuais do banner.");
    } finally {
        if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'none';
        if (modalFormContent) modalFormContent.style.display = 'block';
    }
}

// 5. SALVAR DADOS NO CMS
async function saveBannerData() {
    if (!saveBannerButton) return;
    
    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> SALVANDO...';

    const payload = [
        { element_id: 'banner_principal_img', content_value: bannerImgUrlInput?.value || "" },
        { element_id: 'banner_principal_titulo', content_value: bannerTituloInput?.value || "" }
    ];

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        // BLINDAGEM HÍBRIDA: Trata erro HTML ou lê mensagem do JSON
        if (!response.ok) {
            let errorMsg = "Erro ao atualizar o conteúdo.";
            try {
                const errData = await response.json();
                errorMsg = errData.mensagem || errData.error || errorMsg;
            } catch (e) {
                if (response.status === 404) errorMsg = "Rota de atualização não encontrada.";
            }
            throw new Error(errorMsg);
        }

        alert('Banner atualizado com sucesso!');
        
        // Fecha o modal do Bootstrap
        const modalInstance = bootstrap.Modal.getInstance(editBannerModal);
        if(modalInstance) modalInstance.hide();
        
        // Tenta recarregar o iframe ou a página para ver a mudança ao vivo
        const iframe = document.querySelector('iframe');
        if (iframe) {
            iframe.src = iframe.src;
        } else {
            // Se não houver iframe (visualização direta), recarrega a página após 1s
            setTimeout(() => location.reload(), 1000);
        }

    } catch (error) {
        console.error("Erro ao salvar CMS:", error);
        alert(`Erro: ${error.message}`);
    } finally {
        saveBannerButton.disabled = false;
        saveBannerButton.textContent = 'Salvar Alterações';
    }
}