const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

const NEON_AUTH_URL = "https://ep-fragrant-brook-a44jnssw.neonauth.us-east-1.aws.neon.tech/neondb/auth";

// Função única para sincronizar o perfil no Python e redirecionar pelo cargo
async function finalizarLoginE_Redirecionar(email, nome) {
    const syncRes = await fetch(`${API_BASE_URL}/api/auth/sync-perfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            nome: nome || email.split('@')[0]
        })
    });

    const data = await syncRes.json();
    if (!syncRes.ok) {
        throw new Error(data.error || "Erro ao carregar perfil do usuário.");
    }

    localStorage.setItem('usuario_id', data.id);
    localStorage.setItem('usuario_nome', data.nome);
    localStorage.setItem('usuario_role', data.role);

    const cargo = (data.role || "").toString().toLowerCase().trim();
    if (cargo === 'admin') {
        window.location.href = '../admin/dashboard.html';
    } else if (cargo === 'funcionario') {
        window.location.href = '../funcionario/dash_funcionario.html';
    } else {
        const urlRetorno = sessionStorage.getItem('url_retorno_agendamento');
        if (urlRetorno) {
            sessionStorage.removeItem('url_retorno_agendamento');
            window.location.href = urlRetorno;
        } else {
            window.location.href = 'perfil.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { 
    const loginForm = document.getElementById('loginForm'); 
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha'); 
    const emailInput = document.getElementById('email'); 
    const rememberCheckbox = document.getElementById('remember'); 
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    
    // Mostrar/Esconder senha
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
        });
    }

    // Lembrar e-mail
    if (localStorage.getItem('lembrar_email') && emailInput) { 
        emailInput.value = localStorage.getItem('lembrar_email'); 
        if (rememberCheckbox) rememberCheckbox.checked = true; 
    }

    // 1. LOGIN TRADICIONAL (E-mail e Senha validados direto no Neon Auth)
    if (loginForm) { 
        loginForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            
            const email = emailInput.value.trim().toLowerCase(); 
            const password = passwordInput.value;
            const btn = loginForm.querySelector('button[type="submit"]');

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('lembrar_email', email);
            } else {
                localStorage.removeItem('lembrar_email');
            }

            btn.disabled = true; 
            btn.textContent = 'ACESSANDO...';

            try { 
                // Autentica no Neon Auth (sempre usa a senha atualizada!)
                const neonRes = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const neonData = await neonRes.json();

                if (!neonRes.ok) {
                    // Fallback: se for uma conta muito antiga criada antes do Neon Auth, tenta no Python e migra
                    const legacyRes = await fetch(`${API_BASE_URL}/api/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, senha: password })
                    });
                    const legacyData = await legacyRes.json();
                    if (!legacyRes.ok) {
                        throw new Error(neonData.message || legacyData.error || "E-mail ou senha inválidos.");
                    }
                    // Migra automaticamente essa conta antiga para o Neon Auth
                    await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, name: legacyData.nome })
                    });
                    await finalizarLoginE_Redirecionar(email, legacyData.nome);
                    return;
                }

                const nomeUsuario = neonData.user?.name || email.split('@')[0];
                await finalizarLoginE_Redirecionar(email, nomeUsuario);

            } catch (error) { 
                console.error('Erro no login:', error); 
                alert(error.message); 
            } finally { 
                btn.disabled = false; 
                btn.textContent = 'ENTRAR'; 
            } 
        }); 
    }

    // 2. BOTÃO ENTRAR COM GOOGLE
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            btnGoogleLogin.disabled = true;
            btnGoogleLogin.innerHTML = 'CONECTANDO...';
            try {
                const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        provider: 'google',
                        callbackURL: window.location.origin + window.location.pathname
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    console.error("Erro Neon Social:", data);
                    throw new Error(data.message || "Erro ao iniciar login com Google.");
                }
                if (data.url) {
                    window.location.href = data.url;
                }
            } catch (err) {
                console.error(err);
                alert(err.message);
                btnGoogleLogin.disabled = false;
                btnGoogleLogin.innerHTML = '<i class="bi bi-google" style="color: #DB4437;"></i> ENTRAR COM GOOGLE';
            }
        });
    }

    // 3. RETORNO DO GOOGLE OAUTH
    (async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionVerifier = urlParams.get('neon_auth_session_verifier');

            // Só tenta buscar a sessão se acabou de voltar do Google com o verificador
            if (!sessionVerifier) return;

            const sessionRes = await fetch(`${NEON_AUTH_URL}/get-session?neon_auth_session_verifier=${encodeURIComponent(sessionVerifier)}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!sessionRes.ok) {
                const errText = await sessionRes.text();
                console.error("Erro ao validar verificador do Neon:", errText);
                return;
            }

            const sessionData = await sessionRes.json();
            console.log("Sessão retornada pelo Neon:", sessionData);

            if (!sessionData || !sessionData.user) return;

            // Limpa a URL para remover o neon_auth_session_verifier
            window.history.replaceState({}, document.title, window.location.pathname);

            // Envia para o Python salvar/buscar no public.perfis e redireciona
            await finalizarLoginE_Redirecionar(
                sessionData.user.email,
                sessionData.user.name
            );
        } catch (err) {
            console.error("Erro na sessão Google:", err);
        }
    })();
});