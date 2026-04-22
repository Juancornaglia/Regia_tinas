// 1. CONFIGURAÇÃO GERAL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const section1 = document.getElementById('reset-section-1');
    const section2 = document.getElementById('reset-section-2');
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // Variável para simular o fluxo sem precisar abrir e-mail real no TCC
    let emailSolicitado = "";

    // ETAPA 1: Solicitar Recuperação
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            emailSolicitado = document.getElementById('email').value.trim();
            
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'VERIFICANDO...';

            // Simulação de envio para o TCC (1 segundo e meio de espera)
            setTimeout(() => {
                alert(`Link de recuperação enviado para ${emailSolicitado} (Simulação TCC). Redirecionando para definir nova senha...`);
                section1.style.display = 'none';
                section2.style.display = 'block';
                button.disabled = false;
                button.textContent = 'ENVIAR LINK';
            }, 1500);
        });
    }

    // ETAPA 2: Definir Nova Senha (Conecta ao Neon via Python)
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                // Rota da sua API Python que deve fazer o UPDATE da senha
                const response = await fetch(`${API_BASE_URL}/api/auth/redefinir-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: emailSolicitado, 
                        nova_senha: nova_senha 
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert("Senha redefinida com sucesso! Use sua nova senha para entrar.");
                    window.location.href = 'login.html';
                } else {
                    alert("Erro: " + (result.mensagem || result.error || "Não foi possível redefinir."));
                }
            } catch (error) {
                console.error(error);
                alert("Erro ao conectar com o servidor.");
            } finally {
                button.disabled = false;
                button.textContent = 'SALVAR SENHA';
            }
        });
    }

    // Botão de Voltar da Etapa 2 para a Etapa 1
    document.getElementById('back-to-step1')?.addEventListener('click', (e) => {
        e.preventDefault();
        section1.style.display = 'block';
        section2.style.display = 'none';
        document.getElementById('new_password').value = '';
        document.getElementById('confirm_new_password').value = '';
    });
});