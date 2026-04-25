// js/admin_cms.js - CONECTADO À API REAL EM PYTHON

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

const editBannerModal = document.getElementById('editBannerModal');
const saveBannerButton = document.getElementById('saveBannerButton');
const modalLoadingSpinner = document.getElementById('modal-loading-spinner');
const modalFormContent = document.getElementById('modal-form-content');
const bannerImgUrlInput = document.getElementById('banner_img_url');

document.addEventListener('DOMContentLoaded', () => {
    // Quando abrir o modal, busca os dados reais do banco
    if (editBannerModal) editBannerModal.addEventListener('show.bs.modal', loadBannerData);
    
    // Quando clicar em salvar, envia os dados para o banco
    if (saveBannerButton) saveBannerButton.addEventListener('click', saveBannerData);
});

// 1. CARREGAR OS DADOS DO BANCO (GET)
async function loadBannerData() {
    if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'block';
    if (modalFormContent) modalFormContent.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/cms/content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json(); // Array de objetos do banco
            
            // Procura o item específico do banner
            const bannerItem = data.find(item => item.element_id === 'banner_principal_img');
            
            if (bannerItem && bannerImgUrlInput) {
                bannerImgUrlInput.value = bannerItem.content_value;
            } else if (bannerImgUrlInput) {
                bannerImgUrlInput.value = ''; // Fica vazio se não achar nada
            }
        } else {
            console.warn("Erro ao buscar dados do CMS no servidor.");
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
    } finally {
        if (modalLoadingSpinner) modalLoadingSpinner.style.display = 'none';
        if (modalFormContent) modalFormContent.style.display = 'block';
    }
}

// 2. SALVAR OS DADOS NO BANCO (POST)
async function saveBannerData() {
    if (!saveBannerButton) return;
    
    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';

    // Monta o payload exatamente como o seu Python espera (uma lista de dicionários)
    const payload = [
        {
            element_id: 'banner_principal_img',
            content_value: bannerImgUrlInput.value
        }
    ];

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/cms/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Banner atualizado com sucesso!');
            
            // Fecha o Modal
            const modalInstance = bootstrap.Modal.getInstance(editBannerModal);
            if(modalInstance) modalInstance.hide();
            
            // Atualiza o iFrame para ver a mudança ao vivo
            const iframe = document.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        } else {
            const erro = await response.json();
            alert("Erro ao salvar: " + (erro.error || erro.mensagem || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
        alert("Erro ao conectar com o servidor Python. Verifique se ele está rodando.");
    } finally {
        saveBannerButton.disabled = false;
        saveBannerButton.textContent = 'Salvar Alterações';
    }
}