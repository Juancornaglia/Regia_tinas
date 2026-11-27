(() => {
    const BACK_SELECTOR = '.site-back-button';
    const FRONTEND_HOME_URL = new URL('index.html', new URL('../', document.currentScript.src)).href;

    function safeGetReturnUrl() {
        try {
            const value = sessionStorage.getItem('url_retorno_anterior');
            if (!value) return null;
            const destination = new URL(value, window.location.href);
            return destination.origin === window.location.origin ? destination.href : null;
        } catch (error) {
            console.warn('Não foi possível ler o destino anterior da sessão.', error);
            return null;
        }
    }

    function clearReturnUrl() {
        try {
            sessionStorage.removeItem('url_retorno_anterior');
        } catch (error) {
            console.warn('Não foi possível limpar o destino anterior da sessão.', error);
        }
    }

    function saveCurrentUrl() {
        try {
            sessionStorage.setItem('url_retorno_anterior', window.location.href);
        } catch (error) {
            console.warn('Não foi possível guardar a página de origem.', error);
        }
    }

    function addPageBackButton() {
        const main = document.querySelector('.admin-main-content, .worker-main-content, main');
        if (document.getElementById('sidebar') ||
            window.location.pathname === new URL(FRONTEND_HOME_URL).pathname) return;
        if (!main || document.querySelector(BACK_SELECTOR)) return;

        const back = document.createElement('a');
        back.className = 'site-back-button';
        back.href = FRONTEND_HOME_URL;
        back.setAttribute('aria-label', 'Voltar');
        back.innerHTML = '<i class="bi bi-arrow-left" aria-hidden="true"></i><span>Voltar</span>';
        main.prepend(back);
    }

    function normalizeBackControls() {
        document.querySelectorAll('a, button').forEach((control) => {
            if (control.id === 'back-to-step1') {
                control.classList.add('site-back-button');
                return;
            }

            const isBackControl = control.matches(
                '.back-button, .back-arrow, .btn-voltar-home, .btn-prev'
            ) || (control.tagName === 'A' && control.querySelector('.bi-arrow-left, .bi-arrow-left-short'));
            if (!isBackControl) return;

            control.classList.add('site-back-button');
            if (!control.textContent.trim() && !control.hasAttribute('aria-label')) {
                control.setAttribute('aria-label', 'Voltar');
            }
            const icon = control.querySelector('.bi-arrow-left, .bi-arrow-left-short');
            if (icon) {
                icon.classList.remove('bi-arrow-left-short');
                icon.classList.add('bi-arrow-left');
            }
        });
    }

    document.addEventListener('click', (event) => {
        const back = event.target.closest(BACK_SELECTOR);
        if (back && back.tagName === 'A' && back.id !== 'back-to-step1') {
            const destination = safeGetReturnUrl();
            if (destination && new URL(destination).href !== window.location.href) {
                event.preventDefault();
                clearReturnUrl();
                window.location.assign(destination);
            } else {
                clearReturnUrl();
            }
            return;
        }

        const link = event.target.closest('a[href]');
        if (!link || link.hasAttribute('download') || link.target === '_blank') return;

        try {
            const destination = new URL(link.href, window.location.href);
            if (destination.origin !== window.location.origin) return;
            if (destination.pathname === window.location.pathname &&
                destination.search === window.location.search &&
                destination.hash) return;
            saveCurrentUrl();
        } catch (error) {
            console.warn('Não foi possível interpretar o destino do link.', error);
        }
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            normalizeBackControls();
            addPageBackButton();
        }, { once: true });
    } else {
        normalizeBackControls();
        addPageBackButton();
    }
})();
