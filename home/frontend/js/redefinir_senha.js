// 1. COLOQUE ISSO NO TOPO DO ARQUIVO (FORA DE QUALQUER FUNÇÃO)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://seu-backend-regia-tinas.onrender.com"; // <--- COLOQUE O SEU LINK DO RENDER AQUI

// 2. AGORA VEJA COMO FICA A SUA FUNÇÃO DE VERIFICAR ADMIN:
async function verificarAdmin(userId) {
    try {
        // Você apaga o link antigo e usa a variável nova:
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        
        const data = await response.json();
        return data.isAdmin;
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const section1 = document.getElementById('reset-section-1'); // Parte de pedir email
    const section2 = document.getElementById('reset-section-2'); // Parte de nova senha
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // Variável para simular o fluxo sem precisar abrir e-mail real no TCC
    let emailSolicitado = "";

    // ETAPA 1: Solicitar Recuperação
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            emailSolicitado = document.getElementById('email').value.trim();
            
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'VERIFICANDO...';

            // Simulação de envio para o TCC
            setTimeout(() => {
                alert("Link de recuperação enviado para " + emailSolicitado + " (Simulação). Redirecionando para definir nova senha...");
                section1.style.display = 'none';
                section2.style.display = 'block';
                button.disabled = false;
                button.textContent = 'ENVIAR CÓDIGO';
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

            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'SALVANDO...';

            try {
                const response = await fetch(`${API_URL}/usuario/redefinir-senha`, {
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
                    alert("Erro: " + result.mensagem);
                }
            } catch (error) {
                alert("Erro ao conectar com o servidor.");
            } finally {
                button.disabled = false;
                button.textContent = 'SALVAR SENHA';
            }
        });
    }

    // Botão de Voltar
    document.getElementById('back-to-step1')?.addEventListener('click', (e) => {
        e.preventDefault();
        section1.style.display = 'block';
        section2.style.display = 'none';
    });
});