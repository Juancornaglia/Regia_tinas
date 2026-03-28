// utils.js - Configurações e Funções Globais Regia & Tinas Care

// 1. CONFIGURAÇÃO DA URL (Define uma vez aqui, funciona em todo o site)
window.API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE SEU LINK DO RENDER AQUI

/**
 * Verifica se o usuário logado é um administrador
 * @param {string} userId - ID do usuário salvo no localStorage
 */
window.verificarAdmin = async (userId) => {
    if (!userId) return false;
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        const data = await response.json();
        return data.isAdmin; // O seu Flask deve retornar {"isAdmin": true/false}
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false;
    }
};

/**
 * Exibe uma notificação visual (Toast) usando Bootstrap 5
 */
window.notificar = (mensagem, tipo = 'sucesso') => {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-mensagem');
    
    if (!toastEl || !msgEl) {
        alert(mensagem);
        return;
    }

    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-dark', 'text-dark', 'text-white');
    
    switch (tipo) {
        case 'sucesso': toastEl.classList.add('bg-success', 'text-white'); break;
        case 'erro': toastEl.classList.add('bg-danger', 'text-white'); break;
        case 'aviso': toastEl.classList.add('bg-warning', 'text-dark'); break;
        default: toastEl.classList.add('bg-dark', 'text-white');
    }

    msgEl.innerText = mensagem;
    
    try {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    } catch (e) {
        alert(mensagem);
    }
};

/**
 * Proteção de Rota: Verifica se existe usuário logado
 */
window.verificarSessao = () => {
    const usuarioId = localStorage.getItem('usuario_id');
    if (!usuarioId) {
        window.location.href = '../auth/login.html';
    }
};