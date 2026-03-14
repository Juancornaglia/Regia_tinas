// static/js/admin_cms.js (Versão CORRIGIDA)

import { supabase } from './supabaseClient.js';

// Função para recarregar o iframe de preview
function reloadIframe() {
    const iframe = document.getElementById('previewIframe');
    if (iframe) {
        iframe.contentWindow.location.reload();
    }
}

// --- Funções Genéricas para CMS ---
async function fetchCmsComponent(componentName) {
    const response = await fetch(`/api/cms/componente/${componentName}`);
    if (response.ok) {
        return response.json();
    } else if (response.status === 404) {
        console.warn(`Componente CMS '${componentName}' não encontrado, retornando vazio.`);
        return {}; // Retorna um objeto vazio se não for encontrado
    } else {
        const errorData = await response.json();
        throw new Error(`Erro ao buscar ${componentName}: ${errorData.error}`);
    }
}

async function saveCmsComponent(componentName, data) {
    const response = await fetch(`/api/cms/componente/${componentName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao salvar ${componentName}: ${errorData.error}`);
    }
    return response.json();
}

// --- Lógica do Banner Principal ---
document.getElementById('btn-edit-banner').addEventListener('click', async () => {
    const loadingSpinner = document.getElementById('modal-banner-loading-spinner');
    const formContent = document.getElementById('modal-banner-form-content');
    
    loadingSpinner.style.display = 'block';
    formContent.style.display = 'none';

    try {
        const data = await fetchCmsComponent('banner_principal');
        document.getElementById('banner_img_url').value = data.img_url || '';
        document.getElementById('banner_titulo').value = data.titulo || '';
        document.getElementById('banner_texto').value = data.texto || '';
        document.getElementById('banner_link').value = data.link || '';
    } catch (error) {
        console.error("Erro ao carregar banner:", error);
        alert(`Erro ao carregar banner: ${error.message}`);
    } finally {
        loadingSpinner.style.display = 'none';
        formContent.style.display = 'block';
    }
});

document.getElementById('saveBannerButton').addEventListener('click', async () => {
    const button = document.getElementById('saveBannerButton');
    button.disabled = true;
    button.textContent = 'Salvando...';

    const img_url = document.getElementById('banner_img_url').value;
    const titulo = document.getElementById('banner_titulo').value;
    const texto = document.getElementById('banner_texto').value;
    const link = document.getElementById('banner_link').value;

    try {
        await saveCmsComponent('banner_principal', { img_url, titulo, texto, link });
        alert('Banner principal salvo com sucesso!');
        reloadIframe();
        // Fecha o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editBannerModal'));
        if (modal) modal.hide();
    } catch (error) {
        console.error("Erro ao salvar banner:", error);
        alert(`Erro ao salvar banner: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar Alterações';
    }
});

// --- Lógica do Bloco de Texto ---
document.getElementById('btn-edit-text').addEventListener('click', async () => {
    const loadingSpinner = document.getElementById('modal-text-loading-spinner');
    const formContent = document.getElementById('modal-text-form-content');
    
    loadingSpinner.style.display = 'block';
    formContent.style.display = 'none';

    try {
        const data = await fetchCmsComponent('bloco_de_texto');
        document.getElementById('text_titulo').value = data.titulo || '';
        document.getElementById('text_conteudo').value = data.conteudo || '';
    } catch (error) {
        console.error("Erro ao carregar bloco de texto:", error);
        alert(`Erro ao carregar bloco de texto: ${error.message}`);
    } finally {
        loadingSpinner.style.display = 'none';
        formContent.style.display = 'block';
    }
});

document.getElementById('saveTextButton').addEventListener('click', async () => {
    const button = document.getElementById('saveTextButton');
    button.disabled = true;
    button.textContent = 'Salvando...';

    const titulo = document.getElementById('text_titulo').value;
    const conteudo = document.getElementById('text_conteudo').value;

    try {
        await saveCmsComponent('bloco_de_texto', { titulo, conteudo });
        alert('Bloco de texto salvo com sucesso!');
        reloadIframe();
        // Fecha o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTextModal'));
        if (modal) modal.hide();
    } catch (error) {
        console.error("Erro ao salvar bloco de texto:", error);
        alert(`Erro ao salvar bloco de texto: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar Alterações';
    }
});

// --- Lógica da Imagem Simples ---
document.getElementById('btn-edit-image').addEventListener('click', async () => {
    const loadingSpinner = document.getElementById('modal-image-loading-spinner');
    const formContent = document.getElementById('modal-image-form-content');
    
    loadingSpinner.style.display = 'block';
    formContent.style.display = 'none';

    try {
        const data = await fetchCmsComponent('imagem_simples');
        document.getElementById('image_url').value = data.url || '';
        document.getElementById('image_alt').value = data.alt || '';
        document.getElementById('image_link').value = data.link || '';
    } catch (error) {
        console.error("Erro ao carregar imagem simples:", error);
        alert(`Erro ao carregar imagem simples: ${error.message}`);
    } finally {
        loadingSpinner.style.display = 'none';
        formContent.style.display = 'block';
    }
});

document.getElementById('saveImageButton').addEventListener('click', async () => {
    const button = document.getElementById('saveImageButton');
    button.disabled = true;
    button.textContent = 'Salvando...';

    const url = document.getElementById('image_url').value;
    const alt = document.getElementById('image_alt').value;
    const link = document.getElementById('image_link').value;

    try {
        await saveCmsComponent('imagem_simples', { url, alt, link });
        alert('Imagem simples salva com sucesso!');
        reloadIframe();
        // Fecha o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editImageModal'));
        if (modal) modal.hide();
    } catch (error) {
        console.error("Erro ao salvar imagem simples:", error);
        alert(`Erro ao salvar imagem simples: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar Alterações';
    }
});