const NEON_AUTH_URL = "https://ep-fragrant-brook-a44jnssw.neonauth.us-east-1.aws.neon.tech/neondb/auth";

document.addEventListener('DOMContentLoaded', () => {
    const section1 = document.getElementById('reset-section-1');
    const section2 = document.getElementById('reset-section-2');
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const codeInput = document.getElementById('verification_code');

    // Garante que apenas números sejam digitados no campo de 6 dígitos
    if (codeInput) {
        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    // ETAPA 1: Enviar o código numérico de 6 dígitos para o e-mail via Neon Auth
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email').value.trim().toLowerCase();
            if (!emailInput) {
                alert("Por favor, digite seu e-mail.");
                return;
            }

            sessionStorage.setItem('email_recuperacao', emailInput);
            
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'ENVIANDO...';

            try {
                const response = await fetch(`${NEON_AUTH_URL}/email-otp/send-verification-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailInput,
                        type: 'forget-password'
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || "Não foi possível enviar o código para este e-mail.");
                }

                alert("Código de 6 dígitos enviado! Verifique sua caixa de entrada ou spam.");
                
                if (section1 && section2) {
                    section1.style.display = 'none';
                    section2.style.display = 'block';
                }

            } catch (error) {
                console.error("Erro na recuperação:", error.message);
                alert(error.message);
            } finally {
                button.disabled = false;
                button.textContent = 'ENVIAR CÓDIGO';
            }
        });
    }

    // ETAPA 2: Validar os 6 dígitos e salvar a nova senha no Neon Auth
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailSalvo = sessionStorage.getItem('email_recuperacao') || document.getElementById('email')?.value.trim().toLowerCase();
            const codigo = codeInput?.value.trim();
            const nova_senha = document.getElementById('new_password')?.value;
            const confirmar = document.getElementById('confirm_new_password')?.value;

            if (!emailSalvo) {
                alert("Sessão expirada. Por favor, solicite o código novamente.");
                window.location.reload();
                return;
            }

            if (!codigo || codigo.length !== 6) {
                alert("Por favor, insira o código numérico de 6 dígitos enviado para o seu e-mail.");
                return;
            }

            if (nova_senha !== confirmar) {
                alert("As senhas não coincidem!");
                return;
            }

            if (nova_senha.length < 6) {
                alert("A nova senha deve ter pelo menos 6 caracteres.");
                return;
            }

            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'SALVANDO...';

            try {
                const response = await fetch(`${NEON_AUTH_URL}/email-otp/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: emailSalvo, 
                        otp: codigo,
                        password: nova_senha 
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || "Código inválido ou expirado.");
                }

                alert("Senha redefinida com sucesso! Use sua nova senha para entrar.");
                sessionStorage.removeItem('email_recuperacao');
                window.location.href = 'login.html';

            } catch (error) {
                console.error("Erro na redefinição:", error.message);
                alert(error.message);
            } finally {
                button.disabled = false;
                button.textContent = 'SALVAR NOVA SENHA';
            }
        });
    }

    // Botão de Voltar da Etapa 2 para a Etapa 1
    document.getElementById('back-to-step1')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (section1 && section2) {
            section1.style.display = 'block';
            section2.style.display = 'none';
        }
        
        const passField = document.getElementById('new_password');
        const confirmField = document.getElementById('confirm_new_password');
        
        if (codeInput) codeInput.value = '';
        if (passField) passField.value = '';
        if (confirmField) confirmField.value = '';
    });
});