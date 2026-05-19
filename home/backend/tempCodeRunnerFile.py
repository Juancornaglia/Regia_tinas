import os
import psycopg2 
import traceback 
from datetime import datetime, time, timedelta 
from psycopg2.extras import RealDictCursor 
from flask import Flask, send_from_directory, jsonify, request, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from flask import Flask, send_from_directory 
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
from db.neon_db import executar_query 

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Garante que o caminho para o frontend esteja correto independente de onde o script rode
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:5501",
            "http://localhost:5501",
            "https://regia-tinas.onrender.com" 
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

def get_db_connection():
    """Conexão centralizada com tratamento de erro para o DSN"""
    url = os.environ.get('DATABASE_URL')
    if not url:
        raise ValueError("A variável DATABASE_URL não foi encontrada. Verifique o painel do Render!")
    return psycopg2.connect(url)

HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/busca')
def busca():
    return send_from_directory(FRONTEND_DIR, 'busca.html')

@app.route('/catalogo')
def catalogo():
    return send_from_directory(FRONTEND_DIR, 'catalogo.html')

@app.route('/img/<path:filename>')
def imagens(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'img'), filename)

@app.route('/videos/<path:filename>')
def videos(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'videos'), filename)

@app.route('/usuario/<path:path>')
def servir_usuario(path):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'usuario'), path)

@app.route('/<path:path>')
def servir_paginas(path):
    return send_from_directory(FRONTEND_DIR, path)

@app.route('/api/usuario/agendamentos/<id_usuario>', methods=['GET'])
def get_agendamentos_usuario(id_usuario):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT a.id_agendamento, 
                   to_char(a.data_hora_inicio, 'DD/MM/YYYY HH24:MI') as data_hora_inicio, 
                   a.status,
                   pt.nome_pet, s.nome_servico, l.nome_loja
            FROM public.agendamentos a
            JOIN public.pets pt ON a.id_pet = pt.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            LEFT JOIN public.lojas l ON a.id_loja = l.id_loja
            WHERE a.id_cliente = %s
            ORDER BY a.data_hora_inicio DESC
        '''
        cur.execute(query, (id_usuario,))
        
        agendamentos = cur.fetchall()
        return jsonify(agendamentos), 200
    except Exception as e:
        print(f"❌ Erro ao buscar agendamentos do usuário {id_usuario}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/usuario/dados/<id_usuario>', methods=['GET'])
def get_usuario_dados(id_usuario):
    try:

        sql = "SELECT nome_completo, telefone, email FROM public.perfis WHERE id = %s"
        user = executar_query(sql, (id_usuario,))
        
        if user and len(user) > 0:
            return jsonify(user[0]), 200
        return jsonify({"error": "Usuário não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao buscar dados do usuário: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/servicos', methods=['GET'])
def listar_servicos_agendamento():
    """Retorna os serviços ativos para o select do agendamento"""
    try:
        sql = "SELECT id_servico, nome_servico, preco_servico, duracao_media_minutos FROM public.servicos WHERE ativo = true ORDER BY nome_servico ASC"
        servicos = executar_query(sql)
        return jsonify(servicos if servicos else []), 200
    except Exception as e:
        print(f"Erro ao listar serviços: {e}")
        return jsonify({"error": "Falha ao carregar serviços"}), 500

@app.route('/api/lojas', methods=['GET'])
def listar_lojas_unificado():
    """
    Rota Unificada e Corrigida para Unidades Físicas (Regia & Tinas Care).
    Lê direto do Neon sem travar o argumento da query.
    """
    try:

        sql = """
            SELECT id_loja, nome_loja, endereco, telefone 
            FROM public.lojas 
            WHERE ativo = true 
            ORDER BY nome_loja ASC
        """
        
        lojas = executar_query(sql)
        
        return jsonify(lojas if lojas else []), 200
        
    except Exception as e:
        print(f"❌ ERRO REAL NA ROTA DE LOJAS: {e}")
        return jsonify({"error": f"Erro interno no Neon: {str(e)} "}), 500

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:

        res_faturamento = executar_query('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = res_faturamento[0]['faturamento'] if res_faturamento and res_faturamento[0]['faturamento'] else 0
        
        res_agendamentos = executar_query('SELECT COUNT(*) as total FROM public.agendamentos')
        total_agendamentos = res_agendamentos[0]['total'] if res_agendamentos else 0

        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0

        res_pets = executar_query("SELECT COUNT(*) as total FROM public.pets")
        total_pets = res_pets[0]['total'] if res_pets else 0
        
        return jsonify({
            "faturamento": float(faturamento), 
            "total_agendamentos": total_agendamentos,
            "total_clientes": total_clientes,
            "total_pets": total_pets
        }), 200
    except Exception as e:
        print(f"Erro no Dashboard Admin: {e}")
        return jsonify({"error": "Falha ao carregar estatísticas do painel"}), 500
    
@app.route('/api/admin/dashboard-completo', methods=['GET'])
def dashboard_completo():
    try:

        res_faturamento = executar_query('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = res_faturamento[0]['faturamento'] if res_faturamento and res_faturamento[0]['faturamento'] else 0
        
        res_hoje = executar_query("SELECT COUNT(*) as total FROM public.agendamentos WHERE CAST(data_hora_inicio AS DATE) = CURRENT_DATE")
        agendamentos_hoje = res_hoje[0]['total'] if res_hoje else 0
        
        res_pets = executar_query("SELECT COUNT(*) as total FROM public.pets")
        total_pets = res_pets[0]['total'] if res_pets else 0
        
        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0
        
        query_recentes = '''
            SELECT a.id_agendamento as id, a.data_hora_inicio, a.status, 
                   p.nome_completo as cliente_nome, p.telefone as cliente_tel,
                   pt.nome_pet, pt.raca as pet_raca, s.nome_servico
            FROM public.agendamentos a
            JOIN public.perfis p ON a.id_cliente = p.id
            JOIN public.pets pt ON a.id_pet = pt.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            WHERE CAST(a.data_hora_inicio AS DATE) >= CURRENT_DATE
            ORDER BY a.data_hora_inicio ASC LIMIT 10
        '''
        lista_agendamentos = executar_query(query_recentes)
        
        estoque_critico = executar_query("SELECT nome_produto, quantidade_estoque FROM public.produtos WHERE quantidade_estoque < 5 LIMIT 5")
        
        return jsonify({
            "stats": {
                "faturamento": float(faturamento),
                "total_agendamentos": agendamentos_hoje,
                "total_pets": total_pets,
                "total_clientes": total_clientes
            },
            "agendamentos": lista_agendamentos if lista_agendamentos else [],
            "estoque_critico": estoque_critico if estoque_critico else [],
            "graficos": [1200, 950, 400, 600] # Dados fixos para o gráfico de exemplo
        }), 200
        
    except Exception as e:
        print(f"Erro Crítico no Dashboard Completo: {e}")
        return jsonify({"error": "Falha ao processar dados do painel administrativo"}), 500

@app.route('/api/admin/agendamentos', methods=['GET'])
def buscar_todos_agendamentos():
    try:
        # 1. Capturar os filtros da URL
        servico_id = request.args.get('servico')
        funcionario_id = request.args.get('funcionario')
        status_filtro = request.args.get('status')

        base_query = '''
            SELECT 
                a.id_agendamento,
                a.data_hora_inicio, 
                a.status, 
                per.nome_completo AS cliente_nome,
                per.telefone AS cliente_tel,
                p.nome_pet, 
                p.raca,
                s.nome_servico, 
                l.nome_loja,
                func.nome_completo AS nome_funcionario
            FROM public.agendamentos a
            JOIN public.perfis per ON a.id_cliente = per.id
            JOIN public.pets p ON a.id_pet = p.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            JOIN public.lojas l ON a.id_loja = l.id_loja
            LEFT JOIN public.perfis func ON a.id_funcionario = func.id
            WHERE 1=1
        '''
        
        params = []
        
        if servico_id:
            base_query += " AND a.id_servico = %s"
            params.append(servico_id)
            
        if funcionario_id:
            base_query += " AND a.id_funcionario = %s"
            params.append(funcionario_id)

        if status_filtro:
            base_query += " AND a.status = %s"
            params.append(status_filtro)
            
        base_query += " ORDER BY a.data_hora_inicio ASC"
        
        agendamentos = executar_query(base_query, tuple(params))
        
        return jsonify(agendamentos if agendamentos else []), 200
        
    except Exception as e:
        print(f"Erro na listagem administrativa de agendamentos: {e}")
        return jsonify({"error": "Falha ao carregar lista de agendamentos"}), 500

@app.route('/api/admin/lojas', methods=['GET'])
def listar_lojas_admin():
    try:

        lojas = executar_query('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        return jsonify(lojas if lojas else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/pedidos', methods=['GET'])
def listar_todos_pedidos():
    try:

        query_pedidos = '''
            SELECT p.*, per.nome_completo 
            FROM public.pedidos p
            JOIN public.perfis per ON p.id_cliente = per.id
            ORDER BY p.data_pedido DESC
        '''
        pedidos = executar_query(query_pedidos)
        return jsonify(pedidos if pedidos else []), 200
    except Exception as e:
        print(f"Erro na listagem de pedidos: {e}")
        return jsonify({"error": "Falha ao carregar histórico de vendas"}), 500

@app.route('/api/admin/produtos', methods=['GET'])
def listar_produtos_admin():
    try:
        # Busca todos os produtos, incluindo os inativos, para o gerenciamento
        produtos = executar_query('SELECT * FROM public.produtos ORDER BY nome_produto ASC')
        return jsonify(produtos if produtos else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/produtos', methods=['POST'])
def criar_produto():
    try:
        dados = request.get_json()
        
        # Query completa incluindo os campos que você definiu no seu Modal do Frontend
        sql = '''
            INSERT INTO public.produtos (
                nome_produto, preco, quantidade_estoque, url_imagem, 
                descricao, marca, tipo_produto, status_produto, preco_promocional
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        '''
        params = (
            dados.get('nome_produto'), dados.get('preco'), 
            dados.get('quantidade_estoque'), dados.get('url_imagem'), 
            dados.get('descricao'), dados.get('marca'), 
            dados.get('tipo_produto'), dados.get('status_produto', 'Ativo'),
            dados.get('preco_promocional')
        )
        
        executar_query(sql, params)
        return jsonify({"message": "Produto cadastrado com sucesso!"}), 201
    except Exception as e:
        print(f"Erro ao criar produto: {e}")
        return jsonify({"error": "Falha ao salvar o produto"}), 500

@app.route('/api/admin/produtos/<id_produto>', methods=['PUT'])
def editar_produto(id_produto):
    try:
        dados = request.get_json()
        
        sql = '''
            UPDATE public.produtos 
            SET nome_produto=%s, preco=%s, quantidade_estoque=%s, 
                url_imagem=%s, descricao=%s, marca=%s, tipo_produto=%s,
                status_produto=%s, preco_promocional=%s
            WHERE id_produto = %s
        '''
        params = (
            dados.get('nome_produto'), dados.get('preco'), 
            dados.get('quantidade_estoque'), dados.get('url_imagem'), 
            dados.get('descricao'), dados.get('marca'), 
            dados.get('tipo_produto'), dados.get('status_produto'),
            dados.get('preco_promocional'),
            id_produto
        )
        
        executar_query(sql, params)
        return jsonify({"message": "Produto atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao editar produto {id_produto}: {e}")
        return jsonify({"error": "Falha ao atualizar os dados do produto"}), 500



@app.route('/api/busca', methods=['GET'])
def buscar_produtos():
    try:
        # Captura os filtros enviados pelos seletores do Frontend
        termo = request.args.get('q', '').strip()
        categoria = request.args.get('categoria', '')
        marca = request.args.get('marca', '')
        preco_min = request.args.get('preco_min')
        preco_max = request.args.get('preco_max')

        sql = "SELECT * FROM public.produtos WHERE ativo = true AND status_produto = 'Ativo'"
        params = []


        if termo:
            sql += " AND (nome_produto ILIKE %s OR marca ILIKE %s OR descricao ILIKE %s)"
            search_param = f"%{termo}%"
            params.extend([search_param, search_param, search_param])

        if categoria:
            sql += " AND tipo_produto = %s"
            params.append(categoria)
        
        if marca:
            sql += " AND marca = %s"
            params.append(marca)

        # CORREÇÃO 2: Considera dinamicamente o preço promocional se ele for menor que o de tabela
        if preco_min:
            sql += " AND LEAST(preco, COALESCE(preco_promocional, preco)) >= %s"
            params.append(float(preco_min))

        if preco_max:
            sql += " AND LEAST(preco, COALESCE(preco_promocional, preco)) <= %s"
            params.append(float(preco_max))

        sql += " ORDER BY nome_produto ASC"

        produtos = executar_query(sql, tuple(params))
        
        return jsonify(produtos if produtos else []), 200

    except Exception as e:
        print(f"❌ ERRO NA BUSCA DE PRODUTOS (NEON): {e}")
        return jsonify({"error": "Falha interna ao processar a busca no catálogo"}), 500

@app.route('/api/finalizar-pedido', methods=['POST'])
def finalizar_pedido():
    dados = request.get_json()
    id_usuario = dados.get('id_usuario') # Espera o UUID do cliente
    itens = dados.get('itens') 
    total = dados.get('total')

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO public.pedidos (id_cliente, total_pedido, status_pedido, data_pedido)
            VALUES (%s, %s, 'processando', NOW())
            RETURNING id_pedido
        ''', (id_usuario, total))
        
        id_pedido = cur.fetchone()[0]

        for item in itens:
            cur.execute('''
                INSERT INTO public.itens_pedido (id_pedido, id_produto, quantidade)
                VALUES (%s, %s, %s)
            ''', (id_pedido, item['id'], item['quantidade']))
            
            cur.execute('''
                UPDATE public.produtos 
                SET quantidade_estoque = quantidade_estoque - %s 
                WHERE id_produto = %s AND quantidade_estoque >= %s
            ''', (item['quantidade'], item['id'], item['quantidade']))

        conn.commit()
        return jsonify({"status": "sucesso", "id_pedido": id_pedido}), 201

    except Exception as e:
        # Se houve erro (ex: falta de estoque), desfaz tudo o que foi tentado
        if conn: conn.rollback()
        print(f"Erro Crítico no Checkout: {e}")
        return jsonify({"status": "erro", "mensagem": "Falha ao finalizar o pedido. Verifique o estoque."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/auth/verificar-admin/<id_usuario>', methods=['GET'])
def verificar_admin_api(id_usuario): 
    try:
        # Busca o cargo do usuário usando o UUID
        resultado = executar_query('SELECT role FROM public.perfis WHERE id = %s', (id_usuario,))
        
        if resultado and len(resultado) > 0:
            usuario = resultado[0]
            is_admin = (usuario['role'] == 'admin')
            return jsonify({
                "isAdmin": is_admin, 
                "role": usuario['role']
            }), 200
            
        return jsonify({"isAdmin": False, "message": "Usuário não encontrado"}), 404
            
    except Exception as e:
        print(f"Erro na verificação de admin: {e}")
        return jsonify({"error": "Erro interno", "isAdmin": False}), 500 

@app.route('/api/usuario/redefinir-senha', methods=['POST'])
def redefinir_senha():
    try:
        dados = request.get_json()
        email = dados.get('email')
        nova_senha = dados.get('nova_senha')

        # 1. Verifica se o usuário existe na base
        usuario = executar_query('SELECT id FROM public.perfis WHERE email = %s', (email,))
        
        if not usuario:
            return jsonify({"status": "erro", "mensagem": "E-mail não encontrado."}), 404

        # 2. Gera o novo hash da senha redefinida
        senha_hash = generate_password_hash(nova_senha)

        # 3. Atualiza o banco de dados
        executar_query('UPDATE public.perfis SET senha = %s WHERE email = %s', (senha_hash, email))
        
        return jsonify({"status": "sucesso", "mensagem": "Senha alterada com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao redefinir senha para {email}: {e}")
        return jsonify({"status": "erro", "mensagem": "Falha ao processar a redefinição"}), 500

@app.route('/api/perfil/atualizar', methods=['PUT'])
@app.route('/api/usuario/atualizar-perfil/<id_usuario>', methods=['PUT'])
def atualizar_perfil(id_usuario=None):
    """
    Rota Unificada de Atualização Cadastral.
    Suporta tanto a passagem do ID via URL quanto dentro do payload JSON do Frontend.
    """
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Dados cadastrais não recebidos."}), 400
            
        user_id = id_usuario if id_usuario else dados.get('id')
        
        if not user_id:
            return jsonify({"status": "erro", "mensagem": "Identificador único do tutor ausente na requisição."}), 400
            
        nome_completo = dados.get('nome_completo')
        telefone = dados.get('telefone')

        sql = '''
            UPDATE public.perfis 
            SET nome_completo = %s, telefone = %s 
            WHERE id = %s AND ativo = true
        '''
        
        # Executa a atualização segura no Neon
        executar_query(sql, (nome_completo, telefone, user_id))
        
        return jsonify({"status": "sucesso", "mensagem": "Dados cadastrais atualizados com sucesso no Neon!"}), 200
        
    except Exception as e:
        print(f"❌ ERRO CRÍTICO AO ATUALIZAR PERFIL DO TUTOR: {e}")
        return jsonify({"status": "erro", "mensagem": "Falha interna ao processar a atualização no servidor."}), 500

@app.route('/api/filtros', methods=['GET'])
def get_filtros():
    try:
        res_categorias = executar_query('SELECT DISTINCT tipo_produto FROM public.produtos WHERE tipo_produto IS NOT NULL')
        res_marcas = executar_query('SELECT DISTINCT marca FROM public.produtos WHERE marca IS NOT NULL')
        
        categorias = [r['tipo_produto'] for r in res_categorias] if res_categorias else []
        marcas = [r['marca'] for r in res_marcas] if res_marcas else []
        
        return jsonify({"categorias": categorias, "marcas": marcas}), 200
    except Exception as e:
        print(f"Erro ao carregar filtros: {e}")
        return jsonify({"error": "Falha ao carregar opções de filtro"}), 500

@app.route('/api/cms/content', methods=['GET'])
def get_cms_content():
    """Rota que o JS chama para carregar a imagem atual do banner no painel"""
    conn = None
    cursor = None
    try:

        conn = get_db_connection() 
        cursor = conn.cursor()
        
        cursor.execute('SELECT element_id, content_type, content_value FROM "cms_content";')
        rows = cursor.fetchall()
        

        cms_data = []
        for row in rows:
            cms_data.append({
                "element_id": row[0],
                "content_type": row[1],
                "content_value": row[2]
            })
            
        return jsonify(cms_data), 200

    except Exception as e:
        print(f"Erro ao buscar dados do CMS: {e}")
        return jsonify({"error": "Erro interno ao aceder ao banco Neon."}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/cms/update', methods=['POST'])
def update_cms_content():
    """Rota que o JS chama para salvar o novo link da imagem enviado pelo Admin"""
    payload = request.get_json()
    
    if not payload or not isinstance(payload, list):
        return jsonify({"error": "Dados inválidos. Esperada uma lista de alterações."}), 400
        
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Faz um loop pelas alterações enviadas (no nosso caso, o banner_principal_img)
        for item in payload:
            element_id = item.get('element_id')
            content_value = item.get('content_value')
            
            if not element_id or not content_value:
                continue
                
            cursor.execute('''
                INSERT INTO "cms_content" (element_id, content_value, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (element_id) 
                DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = CURRENT_TIMESTAMP;
            ''', (element_id, content_value))
            
        conn.commit() # Salva as alterações permanentemente no Neon
        return jsonify({"message": "Conteúdo do CMS atualizado com sucesso!"}), 200

    except Exception as e:
        if conn: conn.rollback() # Cancela a operação em caso de falha catastrófica
        print(f"Erro ao atualizar o CMS: {e}")
        return jsonify({"error": "Falha ao gravar as alterações no banco de dados."}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/admin/produtos/<id_produto>', methods=['DELETE'])
def excluir_produto(id_produto):
    try:
        executar_query('DELETE FROM public.produtos WHERE id_produto = %s', (id_produto,))
        return jsonify({"message": "Produto removido com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir produto {id_produto}: {e}")
        return jsonify({"error": "Não foi possível excluir o produto. Verifique se ele possui pedidos vinculados."}), 500

@app.route('/api/admin/atualizar-status-pedido/<id_pedido>', methods=['PUT'])
def atualizar_status_pedido(id_pedido):
    try:
        dados = request.get_json()
        novo_status = dados.get('status')
        
        sql = 'UPDATE public.pedidos SET status_pedido = %s WHERE id_pedido = %s'
        executar_query(sql, (novo_status, id_pedido))
        
        return jsonify({"message": f"Status do pedido {id_pedido} atualizado para {novo_status}"}), 200
    except Exception as e:
        print(f"Erro ao atualizar pedido {id_pedido}: {e}")
        return jsonify({"error": "Falha ao atualizar o status do pedido"}), 500

@app.route('/api/admin/remover-bloqueio/<id_bloqueio>', methods=['DELETE'])
def remover_bloqueio(id_bloqueio):
    try:
        # Remove o bloqueio de data específica
        executar_query('DELETE FROM public.dias_bloqueados WHERE id_bloqueio = %s', (id_bloqueio,))
        return jsonify({"message": "Bloqueio removido com sucesso"}), 200
    except Exception as e:
        print(f"Erro ao remover bloqueio: {e}")
        return jsonify({"error": "Falha ao processar exclusão"}), 500

@app.route('/api/admin/bloquear-dia', methods=['POST'])
def bloquear_dia():
    try:
        dados = request.get_json()
        
        id_loja = None if dados.get('id_loja') == 'ALL' else dados.get('id_loja')
        
        sql = '''
            INSERT INTO public.dias_bloqueados (id_loja, data_bloqueada, motivo)
            VALUES (%s, %s, %s)
        '''
        executar_query(sql, (id_loja, dados.get('data'), dados.get('motivo')))
        
        return jsonify({"message": "Dia bloqueado com sucesso!"}), 201
    except Exception as e:
        print(f"Erro ao bloquear dia: {e}")
        return jsonify({"error": "Falha ao salvar bloqueio"}), 500

@app.route('/api/admin/usuarios/busca', methods=['GET'])
def buscar_usuarios_admin():
    try:
        # Pega o termo digitado na barra de busca (?q=termo)
        termo = request.args.get('q', '').strip()
        
        sql = """
            SELECT id, nome_completo, email, role, cpf, telefone, ativo
            FROM public.perfis 
            WHERE (nome_completo ILIKE %s OR email ILIKE %s OR cpf ILIKE %s)
            AND ativo = true
            ORDER BY nome_completo ASC
            LIMIT 50
        """
        termo_busca = f"%{termo}%"
        params = (termo_busca, termo_busca, termo_busca)
        
        # Executa a query segura no banco Neon
        usuarios = executar_query(sql, params)
        
        return jsonify(usuarios), 200
        
    except Exception as e:
        print(f"❌ ERRO GRAVE NA BUSCA DE USUÁRIOS: {e}")
        return jsonify({"error": "Falha interna ao processar a busca de usuários no Neon."}), 500
    
@app.route('/api/admin/usuarios/alterar-role', methods=['PUT'])
def alterar_role_usuario():
    dados = request.json
    id_usuario = dados.get('id_usuario')
    novo_role = dados.get('novo_role')
    
    especialidade = dados.get('especialidade')
    salario = dados.get('salario')

    if not id_usuario or not novo_role:
        return jsonify({"error": "Dados incompletos"}), 400

    try:
        sql_perfil = "UPDATE public.perfis SET role = %s WHERE id = %s"
        executar_query(sql_perfil, (novo_role, id_usuario))

        if novo_role in ['funcionario', 'admin']:

            existe_rh = executar_query("SELECT id_funcionario FROM public.funcionario WHERE id_perfil = %s", (id_usuario,))
            
            if not existe_rh and especialidade and salario:
                # Busca o nome dele na tabela perfis para preencher o RH
                perfil = executar_query("SELECT nome_completo FROM public.perfis WHERE id = %s", (id_usuario,))
                nome = perfil[0]['nome_completo'] if perfil else 'Sem Nome'
                
                sql_rh = """
                    INSERT INTO public.funcionario (id_perfil, nome, especialidade, salario) 
                    VALUES (%s, %s, %s, %s)
                """
                executar_query(sql_rh, (id_usuario, nome, especialidade, salario))
                
        elif novo_role == 'cliente':
            executar_query("DELETE FROM public.funcionario WHERE id_perfil = %s", (id_usuario,))

        return jsonify({"message": "Permissões atualizadas com sucesso!"}), 200

    except Exception as e:
        print(f"ERRO AO ALTERAR ROLE: {str(e)}")
        return jsonify({"error": "Erro interno do servidor"}), 500


@app.route('/api/pets/usuario/<id_usuario>', methods=['GET'])
def listar_pets_por_tutor(id_usuario):
    """Lista todos os pets ativos de um cliente específico no banco Neon"""
    try:

        sql = """
            SELECT id_pet, nome_pet, especie, raca, porte, observacoes 
            FROM public.pets 
            WHERE id_tutor = %s
            ORDER BY nome_pet ASC
        """
        
        pets = executar_query(sql, (id_usuario,))
        
        return jsonify(pets if pets else []), 200
        
    except Exception as e:
        print(f"❌ ERRO CRÍTICO AO LISTAR PETS DO TUTOR {id_usuario}: {e}")
        return jsonify({"error": "Falha interna do servidor ao carregar a lista de pets."}), 500


    
@app.route('/api/admin/usuarios/listar-tudo', methods=['GET'])
def listar_usuarios_final():
    try:

        sql = """
            SELECT id, nome_completo, email, role, cpf, telefone 
            FROM public.perfis 
            WHERE ativo = true 
            ORDER BY role ASC, nome_completo ASC
        """
        usuarios = executar_query(sql)
        return jsonify(usuarios), 200
    except Exception as e:
        print(f"Erro ao listar usuários: {e}")
        return jsonify({"error": "Falha interna no servidor"}), 500

@app.route('/api/admin/dias-bloqueados', methods=['GET'])
def listar_bloqueios():
    try:
        query = '''
            SELECT b.*, l.nome_loja 
            FROM public.dias_bloqueados b
            LEFT JOIN public.lojas l ON b.id_loja = l.id_loja
            ORDER BY b.data_bloqueada DESC
        '''
        bloqueios = executar_query(query)
        return jsonify(bloqueios if bloqueios else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/cancelar-agendamento/<id_agendamento>', methods=['POST'])
def cancelar_agendamento(id_agendamento):
    try:
        executar_query("UPDATE public.agendamentos SET status = 'cancelado' WHERE id_agendamento = %s", (id_agendamento,))
        return jsonify({"message": "Agendamento cancelado com sucesso"}), 200
    except Exception as e:
        print(f"Erro ao cancelar agendamento: {e}")
        return jsonify({"error": "Falha ao cancelar"}), 500

@app.route('/api/pets', methods=['POST'])
@app.route('/api/cadastrar-pet', methods=['POST'])
def cadastrar_pet_unificado():
    """
    Rota Unificada de Cadastro de Pets.
    Suporta tanto a rota RESTful limpa (/api/pets) quanto o endpoint antigo (/api/cadastrar-pet).
    """
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Dados do animal não foram recebidos."}), 400
            
        # Captura os parâmetros enviados pelo formulário do Frontend
        id_tutor = dados.get('id_tutor')
        nome_pet = dados.get('nome_pet')
        especie = dados.get('especie')
        raca = dados.get('raca', 'SRD') # Se vier vazio, assume Sem Raça Definida de segurança
        porte = dados.get('porte')
        observacoes = dados.get('observacoes')

        # Validação rápida de campos obrigatórios no servidor
        if not id_tutor or not nome_pet or not especie:
            return jsonify({"status": "erro", "mensagem": "Campos obrigatórios ausentes (Tutor, Nome ou Espécie)."}), 400

        sql = '''
            INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, porte, observacoes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id_pet
        '''
        params = (id_tutor, nome_pet, especie, raca, porte, observacoes)
        
        resultado = executar_query(sql, params)
        novo_id = resultado[0]['id_pet'] if resultado else None
        
        # Retorna o JSON de sucesso com o padrão de chaves limpo esperado pelo Frontend
        return jsonify({
            "status": "sucesso", 
            "mensagem": f"🐾 {nome_pet} foi cadastrado com sucesso no banco Neon!", 
            "id": novo_id
        }), 201
        
    except Exception as e:
        print(f"❌ ERRO GRAVE AO CADASTRAR PET NO NEON: {e}")
        return jsonify({"status": "erro", "error": "Falha interna no servidor ao salvar os dados do pet."}), 500
    
@app.route('/api/pets/<id_pet>', methods=['DELETE'])
@app.route('/api/pet/excluir/<id_pet>', methods=['DELETE'])
def excluir_pet_unificado(id_pet):
    """
    Rota Unificada para Exclusão de Pets.
    Suporta tanto a rota RESTful limpa (/api/pets/<id>) quanto o endpoint antigo (/api/pet/excluir/<id>).
    """
    try:

        sql = 'DELETE FROM public.pets WHERE id_pet = %s'
        executar_query(sql, (id_pet,))
        
        # Retorna o JSON de sucesso casado com as chaves que o JavaScript lê para disparar os Toasts
        return jsonify({
            "status": "sucesso", 
            "mensagem": "Ficha do pet removida com sucesso do banco Neon!"
        }), 200
        
    except Exception as e:
        print(f"❌ ERRO CONTROLADO AO DELETAR PET {id_pet}: {e}")
        # Se cair aqui, o banco barrou a exclusão para não quebrar a consistência dos relatórios da clínica
        return jsonify({
            "status": "erro", 
            "error": "Este pet possui históricos de agendamentos vinculados e não pode ser removido fisicamente."
        }), 500

@app.route('/api/horarios-disponiveis', methods=['GET'])
def buscar_horarios_livres():
    """
    Motor Inteligente de Grade de Agendamento.
    Devolve os horários livres da clínica (09:00 às 17:00), 
    removendo os que já estão ocupados no banco Neon para o mesmo dia e loja.
    """
    try:
        loja_id = request.args.get('loja_id')
        data_solicitada = request.args.get('data') # Formato: YYYY-MM-DD

        if not loja_id or not data_solicitada:
            return jsonify({"error": "Faltam parâmetros de loja ou data."}), 400

        grade_padrao = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

        sql = '''
            SELECT to_char(data_hora_inicio, 'HH24:MI') as hora_ocupada
            FROM public.agendamentos
            WHERE id_loja = %s 
              AND DATE(data_hora_inicio) = %s 
              AND status NOT IN ('cancelado')
        '''
        ocupados_raw = executar_query(sql, (loja_id, data_solicitada))
        
        horas_ocupadas = [item['hora_ocupada'] for item in ocupados_raw] if ocupados_raw else []

        horarios_livres = [h for h in grade_padrao if h not in horas_ocupadas]

        return jsonify(horarios_livres), 200

    except Exception as e:
        print(f"❌ ERRO AO CALCULAR GRADE DE HORÁRIOS: {e}")
        return jsonify({"error": "Erro interno ao processar a grade."}), 500

@app.route('/api/produtos', methods=['GET'])
def listar_produtos_loja():
    """Retorna todos os produtos ativos do banco de dados Neon para a vitrine digital"""
    try:
        # CORREÇÃO: Usamos ::float nos preços para o jsonify() do Flask não travar (Erro de Decimal)
        sql = """
            SELECT id_produto, nome_produto, url_imagem, tipo_produto, 
                   marca, preco::float, preco_promocional::float, quantidade_estoque, 
                   descricao, status_produto
            FROM public.produtos 
            WHERE ativo = true AND status_produto = 'Ativo'
            ORDER BY nome_produto ASC
        """
        
        produtos = executar_query(sql)
        
        return jsonify(produtos if produtos else []), 200
        
    except Exception as e:
        print(f"❌ ERRO AO LISTAR PRODUTOS NA VITRINE: {e}")
        return jsonify({"error": "Falha interna ao carregar o catálogo de produtos."}), 500

@app.route('/api/agendar', methods=['POST'])
def post_agendamento():
    """Processa o agendamento com Transação Segura (Rollback) e conexão direta ao Neon"""
    conn = None
    cur = None
    try:
        d = request.get_json()
        if not d:
            return jsonify({"error": "Dados do agendamento não recebidos."}), 400
            
        id_servico = int(d['id_servico'])
        id_loja = int(d['id_loja'])

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
            
        cur.execute('SELECT preco_servico, duracao_media_minutos FROM public.servicos WHERE id_servico = %s', (id_servico,))
        serv = cur.fetchone()
        if not serv:
            return jsonify({"error": "O serviço selecionado não foi localizado na base."}), 404
            
        preco = serv['preco_servico']
        dur = serv['duracao_media_minutos'] or 30

        inicio_str = d['data_hora_inicio'].split('.')[0] 
        inicio = datetime.strptime(inicio_str, '%Y-%m-%dT%H:%M:%S')
        fim = inicio + timedelta(minutes=dur)

        id_pet = d.get('id_pet')
        novo_pet_dados = d.get('novo_pet')

        if not id_pet and novo_pet_dados:
            cur.execute("""
                INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, porte, observacoes)
                VALUES (%s, %s, 'Cão', %s, %s, 'Cadastrado automaticamente no agendamento')
                RETURNING id_pet
            """, (
                d['id_cliente'],
                novo_pet_dados.get('nome', 'Pet Sem Nome'),
                novo_pet_dados.get('raca', 'SRD'),
                novo_pet_dados.get('porte', 'Médio')
            ))
            
            res_pet = cur.fetchone()
            if res_pet:
                id_pet = res_pet['id_pet']
            else:
                raise Exception("O banco inseriu o pet, mas não devolveu o ID.")

        cur.execute("""
            INSERT INTO public.agendamentos 
            (id_cliente, id_pet, id_loja, id_servico, data_hora_inicio, data_hora_fim, status, valor_cobrado, observacoes_cliente)
            VALUES (%s, %s, %s, %s, %s, %s, 'pendente', %s, %s)
        """, (
            d['id_cliente'], 
            int(id_pet) if id_pet else None, 
            id_loja, 
            id_servico, 
            inicio, 
            fim, 
            preco, 
            d.get('observacoes', '')
        ))
        
        conn.commit()
        return jsonify({"status": "sucesso", "mensagem": "Agendamento registrado com sucesso!"}), 201
        
    except Exception as e:
        # Se QUALQUER coisa der errado (falha no agendamento, formato errado), 
        # ele desfaz a criação do pet para não sujar o seu banco!
        if conn: conn.rollback()
        print(f"❌ ERRO CRÍTICO NO AGENDAMENTO: {e}")
        return jsonify({"error": f"Erro interno no servidor: {str(e)}"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
    
@app.route('/api/auth/cadastro', methods=['POST'])
def criar_conta():
    try:
        d = request.json
        # 1. Verifica se o e-mail já existe no banco
        existe = executar_query("SELECT id FROM public.perfis WHERE email = %s", (d['email'],))
        if existe:
            return jsonify({"mensagem": "Este e-mail já está cadastrado. Tente fazer login."}), 409

        hash_senha = generate_password_hash(d['senha'])

        sql = """
            INSERT INTO public.perfis (nome_completo, email, senha, role, ativo) 
            VALUES (%s, %s, %s, 'cliente', true)
        """
        executar_query(sql, (d['nome_completo'], d['email'], hash_senha))
        
        return jsonify({"mensagem": "Conta criada com sucesso!"}), 201

    except Exception as e:
        print(f"ERRO NO CADASTRO: {str(e)}")
        return jsonify({"mensagem": "Erro interno no servidor ao criar conta."}), 500

if __name__ == '__main__':
    # Configuração vital para o Render (PORT) e escuta em 0.0.0.0
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta, debug=False)