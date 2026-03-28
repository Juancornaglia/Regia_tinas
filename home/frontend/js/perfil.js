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

document.addEventListener('DOMContentLoaded', async () => {
    const tutorId = localStorage.getItem('usuario_id');
    
    // 1. VERIFICAÇÃO DE SESSÃO
    if (!tutorId) {
        window.location.href = '../login.html';
        return;
    }

    // --- 2. FUNÇÃO PARA CARREGAR DADOS DO PERFIL ---
    async function carregarPerfil() {
        try {
            // Chamamos a rota que busca os dados do usuário no Neon
            const response = await fetch(`${API_URL}/auth/verificar-role/${tutorId}`);
            const perfil = await response.json();

            if (response.ok) {
                // Preenche os campos do formulário (Garanta que os IDs existam no HTML)
                if (document.getElementById('nome_completo')) 
                    document.getElementById('nome_completo').value = perfil.nome_completo || '';
                
                if (document.getElementById('telefone')) 
                    document.getElementById('telefone').value = perfil.telefone || '';
                
                if (document.getElementById('email_display')) 
                    document.getElementById('email_display').value = perfil.email || '';
            }
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
        }
    }

    // --- 3. FUNÇÃO PARA SALVAR ALTERAÇÕES ---
    const btnSalvar = document.getElementById('btnSalvarPerfil');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const dadosAtualizados = {
                nome_completo: document.getElementById('nome_completo').value,
                telefone: document.getElementById('telefone').value
            };

            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

            try {
                // Criaremos esta rota 'atualizar-perfil' no seu Python
                const response = await fetch(`${API_URL}/usuario/atualizar-perfil/${tutorId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosAtualizados)
                });

                if (response.ok) {
                    alert("Perfil atualizado com sucesso!");
                    // Atualiza o nome salvo no navegador também
                    localStorage.setItem('usuario_nome', dadosAtualizados.nome_completo);
                } else {
                    alert("Erro ao atualizar os dados.");
                }
            } catch (error) {
                alert("Erro de conexão com o servidor.");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = 'Salvar Alterações';
            }
        });
    }

    carregarPerfil();
});