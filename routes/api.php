<?php
// routes/api.php

// Função auxiliar para enviar a resposta em formato JSON para o Javascript (Frontend)
function jsonify($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function rotear_api($request_uri, $method, $pdo) {

    // =======================================================
    // 1. ROTAS DE E-COMMERCE E RECOMENDAÇÕES
    // =======================================================
    if (strpos($request_uri, '/api/ecommerce') === 0) {
        if ($method === 'GET') {
            if ($request_uri === '/api/ecommerce/ofertas') {
                jsonify(["status" => "success", "message" => "Rota de Ofertas OK!"]);
            }
            if ($request_uri === '/api/ecommerce/novidades') {
                jsonify(["status" => "success", "message" => "Rota de Novidades OK!"]);
            }
            if ($request_uri === '/api/ecommerce/mais-vendidos') {
                jsonify(["status" => "success", "message" => "Rota de Mais Vendidos OK!"]);
            }
            if (preg_match('#^/api/ecommerce/produtos/([0-9]+)$#', $request_uri, $matches)) {
                $produto_id = (int)$matches[1];
                jsonify(["status" => "success", "message" => "Buscando o produto ID: $produto_id"]);
            }
        }
    }

    // =======================================================
    // 2. ROTAS DE AGENDAMENTO
    // =======================================================
    if (strpos($request_uri, '/api/horarios-disponiveis') === 0) {
        if ($method === 'GET') {
            jsonify(["status" => "success", "message" => "Calculando horários disponíveis..."]);
        }
    }
    
    if ($request_uri === '/api/agendar') {
        if ($method === 'POST') {
            $dados = json_decode(file_get_contents('php://input'), true);
            jsonify(["status" => "success", "message" => "Agendamento criado!", "dados" => $dados], 201);
        }
    }

    // =======================================================
    // 3. ROTAS DE USUÁRIO (PETS E PERFIL)
    // =======================================================
    if ($request_uri === '/api/usuario/pets') {
        if ($method === 'GET') {
            jsonify(["status" => "success", "message" => "Listando os pets do cliente."]);
        }
        if ($method === 'POST') {
            $dados = json_decode(file_get_contents('php://input'), true);
            jsonify(["status" => "success", "message" => "Pet cadastrado com sucesso!"], 201);
        }
    }

    if (preg_match('#^/api/usuario/pets/([0-9]+)$#', $request_uri, $matches)) {
        $pet_id = (int)$matches[1];
        if ($method === 'PUT') {
            jsonify(["status" => "success", "message" => "Pet $pet_id atualizado!"]);
        }
        if ($method === 'DELETE') {
            http_response_code(204); 
            exit;
        }
    }

    // =======================================================
    // 4. ROTAS ADMINISTRATIVAS
    // =======================================================
    if ($request_uri === '/api/admin/produtos') {
        if ($method === 'GET') {
            jsonify(["status" => "success", "message" => "Listando todos os produtos para o Admin."]);
        }
        if ($method === 'POST') {
            jsonify(["status" => "success", "message" => "Novo produto inserido!"], 201);
        }
    }

    if (preg_match('#^/api/admin/produtos/([0-9]+)$#', $request_uri, $matches)) {
        $produto_id = (int)$matches[1];
        if ($method === 'GET') jsonify(["status" => "success", "message" => "Lendo produto admin ID: $produto_id"]);
        if ($method === 'PUT') jsonify(["status" => "success", "message" => "Atualizando produto admin ID: $produto_id"]);
        if ($method === 'DELETE') { http_response_code(204); exit; }
    }

    // Se chegou até aqui, a URL digitada não existe na API
    jsonify(["error" => "Endpoint da API não encontrado ou método incorreto."], 404);
}
?>