// utils.js - Funções utilitárias globais para o Chateau du Pet

/**
 * Exibe uma notificação visual (Toast) usando Bootstrap 5
 * @param {string} mensagem - O texto que aparecerá na tela
 * @param {string} tipo - 'sucesso', 'erro' ou 'aviso'
 */
window.notificar = (mensagem, tipo = 'sucesso') => {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-mensagem');
    
    // Verifica se os elementos do Toast existem no HTML da página atual
    if (!toastEl || !msgEl) {
        console.warn("Toast elements not found in this page. Falling back to alert().");
        alert(mensagem);
        return;
    }

    // Limpa classes de cores anteriores
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-dark', 'text-white');
    
    // Define a cor e o contraste do texto conforme o tipo
    if (tipo === 'sucesso') {
        toastEl.classList.add('bg-success', 'text-white');
    } else if (tipo === 'erro') {
        toastEl.classList.add('bg-danger', 'text-white');
    } else if (tipo === 'aviso') {
        toastEl.classList.add('bg-warning', 'text-dark');
    } else {
        toastEl.classList.add('bg-dark', 'text-white');
    }

    msgEl.innerText = mensagem;
    
    // Inicializa e exibe o Toast do Bootstrap
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
};