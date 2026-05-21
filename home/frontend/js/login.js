<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const togglePassword = document.getElementById('togglePassword');

    // 1. Lógica para Mostrar/Esconder a Senha no ícone do olhinho
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            // Alterna o tipo do input entre 'password' e 'text'
            const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            senhaInput.setAttribute('type', type);
            
            // Alterna o ícone do Bootstrap
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
        });
    }

    // 2. Lógica de Autenticação e Redirecionamento de Perfis
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Evita que a página recarregue ao clicar em "Entrar"

            const email = emailInput.value.trim().toLowerCase();
            const senha = senhaInput.value;

            // Validação básica
            if (!email || !senha) {
                alert("Por favor, preencha seu e-mail e senha.");
                return;
            }

            /* * SIMULAÇÃO DE BANCO DE DADOS
             * Como é o Frontend, estamos simulando as rotas baseadas no e-mail.
             * Depois, isso será substituído pela chamada real da sua API (fetch/axios).
             */
            
            // Regra para login de ADMINISTRADOR
            if (email === 'admin@regiatinas.com' && senha === 'admin123') {
                localStorage.setItem('usuarioLogado', JSON.stringify({ perfil: 'admin', nome: 'Administrador' }));
                alert("Acesso autorizado. Redirecionando para o Painel do Administrador...");
                // Ajuste os '../' abaixo dependendo de onde o painel admin está salvo
                window.location.href = '../../admin/painel_admin.html'; 
            } 
            
            // Regra para login de PROFISSIONAL / FUNCIONÁRIO
            else if (email === 'funcionario@regiatinas.com' && senha === 'func123') {
                localStorage.setItem('usuarioLogado', JSON.stringify({ perfil: 'funcionario', nome: 'Profissional' }));
                alert("Acesso autorizado. Redirecionando para sua Agenda...");
                window.location.href = '../../funcionario/painel_profissional.html'; 
            } 
            
            // Regra para login de USUÁRIO COMUM (Cliente do Petshop/E-commerce)
            else if (email === 'cliente@gmail.com' && senha === 'cliente123') {
                localStorage.setItem('usuarioLogado', JSON.stringify({ perfil: 'cliente', nome: 'Cliente' }));
                alert("Bem-vindo(a) ao Regia & Tinas Care!");
                window.location.href = '../../index.html'; 
            } 
            
            // Tratamento de Erro
            else {
                alert("Credenciais inválidas! Tente novamente ou crie uma conta.");
                senhaInput.value = ''; // Limpa o campo de senha para tentar de novo
            }
        });
    }
=======
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.mensagem);
            return;
        }

        // REDIRECIONAMENTO PELO CARGO
        if (data.role === 'admin') {
            window.location.href = '../admin/dashboard.html';
        } 
        
        else if (data.role === 'funcionario') {
            window.location.href = '../funcionario/dash_funcionario.html';
        } 
        
        else {
            window.location.href = '../usuario/perfil.html';
        }

    } catch (error) {
        console.error(error);
        alert('Erro ao conectar com o servidor');
    }
>>>>>>> 081b402 (Atualizacao do projeto)
});