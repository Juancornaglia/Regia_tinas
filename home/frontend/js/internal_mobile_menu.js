document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.admin-sidebar, .worker-sidebar');
    const toggle = document.querySelector('.mobile-menu-toggle');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (!sidebar || !toggle || !backdrop) {
        return;
    }

    const setMenuOpen = (isOpen) => {
        sidebar.classList.toggle('is-open', isOpen);
        backdrop.classList.toggle('is-visible', isOpen);
        document.body.classList.toggle('sidebar-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    };

    toggle.addEventListener('click', () => {
        setMenuOpen(!sidebar.classList.contains('is-open'));
    });

    backdrop.addEventListener('click', () => setMenuOpen(false));
    sidebar.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuOpen(false);
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            setMenuOpen(false);
        }
    });
});
