document.addEventListener('DOMContentLoaded', () => {
    const role = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();
    if (role !== 'funcionario' && role !== 'admin') {
        window.location.href = '../usuario/login.html';
        return;
    }

    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (!confirm('Deseja encerrar a sessão?')) return;
        localStorage.clear();
        window.location.href = '../usuario/login.html';
    });
});
