// js/auth_guard.js
// Esse arquivo protege as páginas para que clientes não entrem no Admin e vice-versa.

const API_URL = 'http://localhost:5000/api';

export async function verificarAcesso(roleNecessaria) {
    // 1. Pega o ID salvo no navegador durante o login
    const userId = localStorage.getItem('usuario_id');

    // 2. Se não houver ID, nem tenta verificar, manda direto para o login
    if (!userId) {
        console.warn("Acesso negado: Usuário não está logado.");
        window.location.href = '../usuario/login.html';
        return;
    }

    try {
        // 3. Pergunta ao servidor Python qual é o cargo (role) desse usuário
        const response = await fetch(`${API_URL}/auth/verificar-role/${userId}`);
        
        if (!response.ok) {
            throw new Error("Erro ao validar permissões no servidor.");
        }

        const data = await response.json(); // Retorna algo como { "role": "admin" }

        // 4. Validação de permissão
        if (roleNecessaria === 'admin' && data.role !== 'admin') {
            alert("Acesso Negado: Esta área é exclusiva para administradores.");
            window.location.href = '../index.html'; // Manda para a home se for cliente curioso
        } else if (roleNecessaria === 'cliente' && !data.role) {
            // Se a página for de cliente e o usuário nem cargo tiver (erro de banco)
            window.location.href = '../usuario/login.html';
        }

        console.log(`Acesso autorizado para: ${data.role}`);

    } catch (error) {
        console.error("Erro crítico na verificação de acesso:", error);
        // Em caso de erro de rede ou servidor, por segurança, desloga o usuário localmente
        localStorage.clear();
        window.location.href = '../usuario/login.html';
    }
}