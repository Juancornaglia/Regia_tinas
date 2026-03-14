<?php
// routes/web.php

function rotear_web($request_uri) {
    switch ($request_uri) {
        
        // --- Telas Públicas ---
        case '/':
        case '/home':
            include '../views/publico/home.php'; 
            break;
            
        case '/busca':
            include '../views/layouts/busca.html';
            break;

        // --- Institucional ---
        case '/institucional/sobre':
            include '../views/publico/sobre.html';
            break;
        case '/institucional/contatos':
            include '../views/publico/contatos.html';
            break;
        case '/institucional/lojas':
            include '../views/publico/lojas.html';
            break;

        // --- E-commerce ---
        case '/produtos':
            include '../views/layouts/produtos.html';
            break;
        case '/produto_detalhe':
            include '../views/layouts/produto_detalhe.html';
            break;

        // --- Usuário e Autenticação ---
        case '/usuario/login':
            include '../views/usuario/login.html';
            break;
        case '/usuario/criar_conta':
            include '../views/usuario/criar_conta.html';
            break;
        case '/usuario/perfil':
            include '../views/usuario/perfil.html';
            break;

        // --- Serviços ---
        case '/servicos':
            include '../views/servicos/servicos.html';
            break;
        case '/servicos/veterinaria':
            include '../views/servicos/veterinaria.html';
            break;
        case '/servicos/hotel':
            include '../views/servicos/hotel.html';
            break;
        case '/servicos/day_care':
            include '../views/servicos/day_care.html';
            break;
        case '/servicos/agendamento-fluxo':
            include '../views/servicos/agendamento-fluxo.html';
            break;

        // --- Admin (Painel Administrativo) ---
        case '/admin/dashboard':
            include '../views/admin/dashboard.html';
            break;
        case '/admin/agendamentos':
            include '../views/admin/gestao_agendamentos.html';
            break;
        case '/admin/produtos':
            include '../views/admin/gestao_produtos.html';
            break;

        // --- Rota não encontrada ---
        default:
            http_response_code(404);
            echo "<div style='text-align:center; padding:50px; font-family: sans-serif;'>";
            echo "<h1 style='color: #89006A;'>404 - Página não encontrada</h1>";
            echo "<p>O caminho <strong>" . htmlspecialchars($request_uri) . "</strong> não existe no sistema Regia & Tinas Care.</p>";
            echo "<a href='/regia_tinas_care/public/' style='color: #89006A; text-decoration: none; font-weight: bold;'>Voltar para a Home</a>";
            echo "</div>";
            break;
    }
}
?>