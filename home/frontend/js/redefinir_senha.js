// 1. CONFIGURAÇÃO GERAL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const section1 = document.getElementById('reset-section-1');
    const section2 = document.getElementById('reset-section-2');
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    let emailSolicitado = "";

    // ETAPA 1: Solicitar Código (Conecta ao Python)
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            emailSolicitado = document.getElementById('email').value.trim();
            
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'VERIFICANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/recuperar-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailSolicitado })
                });

                if (response.ok) {
                    alert("✨ Código gerado! (Para o TCC, olhe o terminal do seu VS Code para pegar os 6 dígitos).");
                    section1.style.display = 'none';
                    section2.style.display = 'block';
                } else {
                    const data = await response.json();
                    alert(data.error || "Erro: E-mail não encontrado na base de dados.");
                }
            } catch (error) {
                console.error(error);
                alert("Erro ao conectar com o servidor.");
            } finally {
                button.disabled = false;
                button.textContent = 'ENVIAR CÓDIGO';
            }
        });
    }

    // ETAPA 2: Definir Nova Senha (Usa o Código de 6 dígitos)
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Pega os dados da tela (lembre-se que adicionamos o campo do código no HTML)
            const codigo = document.getElementById('verification_code').value.trim();
            const nova_senha = document.getElementById('new_password').value;
            const confirmar = document.getElementById('confirm_new_password').value;

            if (nova_senha !== confirmar) {
                alert("As senhas não coincidem!");
                return;
            }

            if (nova_senha.length < 6) {
                alert("A senha deve ter pelo menos 6 caracteres.");
                return;
            }

            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'SALVANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/redefinir-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: emailSolicitado, 
                        codigo: codigo,
                        nova_senha: nova_senha 
                    })
                });

                // Excelente sacada sua de verificar o "ok" antes do json()
                if (response.ok) {
                    alert("Senha redefinida com sucesso! Use sua nova senha para entrar.");
                    window.location.href = 'login.html';
                } else {
                    const data = await response.json().catch(() => null);
                    alert((data && data.error) ? data.error : "Código inválido ou expirado.");
                }
            } catch (error) {
                console.error(error);
                alert("Erro ao conectar com o servidor.");
            } finally {
                button.disabled = false;
                button.textContent = 'SALVAR NOVA SENHA';
            }
        });
    }

    // Botão de Voltar da Etapa 2 para a Etapa 1
    document.getElementById('back-to-step1')?.addEventListener('click', (e) => {
        e.preventDefault();
        section1.style.display = 'block';
        section2.style.display = 'none';
        
        // Limpa os campos se o usuário desistir e voltar
        if(document.getElementById('verification_code')) document.getElementById('verification_code').value = '';
        document.getElementById('new_password').value = '';
        document.getElementById('confirm_new_password').value = '';
    });
});