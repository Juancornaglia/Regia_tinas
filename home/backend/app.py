import os
import psycopg2 
import traceback 
from datetime import datetime, time, timedelta 
from psycopg2.extras import RealDictCursor 
from flask import Flask, send_from_directory, jsonify, request, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash

# Importação centralizada da sua função de query
from db.neon_db import executar_query 

# 1. Configurações Iniciais
load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Garante que o caminho para o frontend esteja correto independente de onde o script rode
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')

# Configuração do CORS unificada
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

# 3. Constantes Globais
HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 

# --- SERVIDOR DE ARQUIVOS (FRONTEND) ---

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

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

# --- ROTAS DE API (CONTEÚDO GERAL E USUÁRIO) ---

# Ajustado para aceitar UUID (String) em vez de apenas Inteiro
@app.route('/api/usuario/agendamentos/<id_usuario>', methods=['GET'])
def get_agendamentos_usuario(id_usuario):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query organizada para facilitar a leitura
        query = '''
            SELECT a.id_agendamento, a.data_hora_inicio, a.status,
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
        print(f"Erro ao buscar agendamentos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE DADOS DO USUÁRIO E PETS ---

@app.route('/api/usuario/dados/<id_usuario>', methods=['GET'])
def get_usuario_dados(id_usuario):
    try:
        # Usando executar_query para simplificar e evitar esquecer conexões abertas
        sql = "SELECT nome_completo, telefone, email FROM public.perfis WHERE id = %s"
        user = executar_query(sql, (id_usuario,))
        
        if user and len(user) > 0:
            return jsonify(user[0]), 200
        return jsonify({"error": "Usuário não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao buscar dados do usuário: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/meus-pets/<id_tutor>', methods=['GET'])
def get_meus_pets(id_tutor):
    try:
        sql = "SELECT id_pet, nome_pet, especie, raca, porte FROM public.pets WHERE id_tutor = %s"
        pets = executar_query(sql, (id_tutor,))
        return jsonify(pets), 200
    except Exception as e:
        print(f"Erro ao buscar pets: {e}")
        return jsonify({"error": str(e)}), 500

# --- LISTAGENS PÚBLICAS (AGENDAMENTO E LOJA) ---

@app.route('/api/lojas', methods=['GET'])
def listar_lojas_publico():
    try:
        lojas = executar_query('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        return jsonify(lojas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/servicos_lista', methods=['GET'])
def listar_servicos_publico():
    try:
        servicos = executar_query('SELECT id_servico, nome_servico FROM public.servicos ORDER BY nome_servico')
        return jsonify(servicos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/produtos')
def listar_produtos():
    try:
        # Retorna apenas produtos ativos para a vitrine
        produtos = executar_query("SELECT * FROM public.produtos WHERE status_produto = 'Ativo' ORDER BY nome_produto")
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ROTAS ADMIN E DASHBOARD (ESTATÍSTICAS) ---

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        # Faturamento total (Pedidos)
        res_faturamento = executar_query('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = res_faturamento[0]['faturamento'] if res_faturamento and res_faturamento[0]['faturamento'] else 0
        
        # Total de Agendamentos
        res_agendamentos = executar_query('SELECT COUNT(*) as total FROM public.agendamentos')
        total_agendamentos = res_agendamentos[0]['total'] if res_agendamentos else 0

        # Total de Clientes (Baseado na Role)
        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0

        # Total de Pets cadastrados
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
        # 1. Busca os KPIs (Estatísticas Principais)
        # Faturamento Total
        res_faturamento = executar_query('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = res_faturamento[0]['faturamento'] if res_faturamento and res_faturamento[0]['faturamento'] else 0
        
        # Agendamentos de Hoje
        res_hoje = executar_query("SELECT COUNT(*) as total FROM public.agendamentos WHERE CAST(data_hora_inicio AS DATE) = CURRENT_DATE")
        agendamentos_hoje = res_hoje[0]['total'] if res_hoje else 0
        
        # Total de Pets no Sistema
        res_pets = executar_query("SELECT COUNT(*) as total FROM public.pets")
        total_pets = res_pets[0]['total'] if res_pets else 0
        
        # Total de Clientes Cadastrados
        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0
        
        # 2. Busca Agendamentos Recentes (Próximos atendimentos)
        # Fazemos os joins para trazer nomes de clientes e pets em uma só tabela
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
        
        # 3. Alerta de Estoque Crítico (Produtos com menos de 5 unidades)
        estoque_critico = executar_query("SELECT nome_produto, quantidade_estoque FROM public.produtos WHERE quantidade_estoque < 5 LIMIT 5")
        
        # Retorno unificado para o frontend
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
    
# --- 4. ROTA ADMIN: TODOS OS AGENDAMENTOS ---
# --- ROTAS DE GESTÃO ADMINISTRATIVA (AGENDAMENTOS, LOJAS E PEDIDOS) ---

@app.route('/api/admin/agendamentos', methods=['GET'])
def buscar_todos_agendamentos():
    try:
        # 1. Capturar os filtros da URL
        servico_id = request.args.get('servico')
        funcionario_id = request.args.get('funcionario')
        status_filtro = request.args.get('status')

        # 2. Query Base com JOINs para trazer informações completas
        # O LEFT JOIN no funcionário é vital: se o pet ainda não tiver um tosador/vet atribuído, ele ainda aparece na lista.
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
        
        # 3. Construção dinâmica dos filtros
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
        
        # Executa usando sua função centralizada
        agendamentos = executar_query(base_query, tuple(params))
        
        return jsonify(agendamentos if agendamentos else []), 200
        
    except Exception as e:
        print(f"Erro na listagem administrativa de agendamentos: {e}")
        return jsonify({"error": "Falha ao carregar lista de agendamentos"}), 500

@app.route('/api/admin/lojas', methods=['GET'])
def listar_lojas_admin():
    try:
        # Simples e direto: o CORS já cuida do preflight (OPTIONS)
        lojas = executar_query('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        return jsonify(lojas if lojas else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/pedidos', methods=['GET'])
def listar_todos_pedidos():
    try:
        # Busca todos os pedidos e o nome do cliente que comprou
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

# --- ROTAS DE GESTÃO DE PRODUTOS (ADMIN) ---

# --- GESTÃO DE PRODUTOS (ADMIN) ---

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

# --- EDITOR VISUAL / CMS ---

@app.route('/api/cms/content', methods=['GET'])
def get_cms_content():
    try:
        # Busca textos e imagens configuráveis do site
        content = executar_query('SELECT element_id, content_value FROM public.cms_content')
        return jsonify(content if content else []), 200
    except Exception as e:
        print(f"Erro ao carregar conteúdo CMS: {e}")
        return jsonify({"error": "Falha ao carregar textos do site"}), 500
# --- BUSCA DINÂMICA (E-COMMERCE) ---

# --- SISTEMA DE BUSCA AVANÇADA ---

@app.route('/api/busca', methods=['GET'])
def buscar_produtos():
    try:
        # Captura os filtros da URL
        termo = request.args.get('q', '').strip()
        categoria = request.args.get('categoria', '')
        marca = request.args.get('marca', '')
        preco_min = request.args.get('preco_min')
        preco_max = request.args.get('preco_max')

        # SQL Base: Apenas produtos que o dono quer vender agora
        sql = "SELECT * FROM public.produtos WHERE status_produto = 'Ativo'"
        params = []

        # Filtro de texto (Nome, Marca ou Descrição)
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

        if preco_min:
            sql += " AND preco >= %s"
            params.append(float(preco_min))

        if preco_max:
            sql += " AND preco <= %s"
            params.append(float(preco_max))

        sql += " ORDER BY nome_produto ASC"
        
        # Executa a busca filtrada
        produtos = executar_query(sql, tuple(params))
        return jsonify(produtos if produtos else []), 200

    except Exception as e:
        print(f"Erro na busca de produtos: {e}")
        return jsonify({"error": "Falha ao processar a busca"}), 500

# --- FINALIZAÇÃO DE PEDIDOS (CHECKOUT COM TRANSAÇÃO) ---

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
        
        # Início da Transação: Se algo der errado, nada é gravado
        # 1. Cria o registro principal na tabela de pedidos
        cur.execute('''
            INSERT INTO public.pedidos (id_cliente, total_pedido, status_pedido, data_pedido)
            VALUES (%s, %s, 'processando', NOW())
            RETURNING id_pedido
        ''', (id_usuario, total))
        
        id_pedido = cur.fetchone()[0]

        # 2. Loop para registrar cada item e atualizar o estoque
        for item in itens:
            # Registra o item no pedido
            cur.execute('''
                INSERT INTO public.itens_pedido (id_pedido, id_produto, quantidade)
                VALUES (%s, %s, %s)
            ''', (id_pedido, item['id'], item['quantidade']))
            
            # Baixa a quantidade do estoque físico
            cur.execute('''
                UPDATE public.produtos 
                SET quantidade_estoque = quantidade_estoque - %s 
                WHERE id_produto = %s AND quantidade_estoque >= %s
            ''', (item['quantidade'], item['id'], item['quantidade']))

        # Se chegou aqui sem erros, grava permanentemente no Neon
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

# --- CADASTRO DE NOVOS CLIENTES ---

# --- GESTÃO DE CONTA E SEGURANÇA ---

@app.route('/api/usuario/cadastrar', methods=['POST'])
def cadastrar_usuario():
    try:
        dados = request.get_json()
        nome = dados.get('nome')
        email = dados.get('email')
        senha = dados.get('senha')

        # 1. Verifica se o e-mail já existe na tabela perfis
        usuario_existente = executar_query('SELECT id FROM public.perfis WHERE email = %s', (email,))
        if usuario_existente:
            return jsonify({"status": "erro", "mensagem": "Este e-mail já está cadastrado."}), 400

        # 2. Criptografa a senha antes de salvar (Segurança máxima)
        senha_hash = generate_password_hash(senha)

        # 3. Insere o novo cliente com role padrão 'cliente'
        sql_insert = '''
            INSERT INTO public.perfis (nome_completo, email, senha, role, ativo)
            VALUES (%s, %s, %s, 'cliente', true)
        '''
        executar_query(sql_insert, (nome, email, senha_hash))
        
        return jsonify({"status": "sucesso", "mensagem": "Conta criada com sucesso!"}), 201

    except Exception as e:
        print(f"Erro no cadastro: {e}")
        return jsonify({"status": "erro", "mensagem": "Falha ao criar conta"}), 500

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

@app.route('/api/usuario/atualizar-perfil/<id_usuario>', methods=['PUT'])
def atualizar_perfil(id_usuario):
    try:
        dados = request.get_json()
        
        # Atualiza dados básicos do perfil do cliente
        # Note que id_usuario aqui aceita o UUID do banco
        sql = '''
            UPDATE public.perfis 
            SET nome_completo = %s, telefone = %s 
            WHERE id = %s
        '''
        executar_query(sql, (dados.get('nome_completo'), dados.get('telefone'), id_usuario))
        
        return jsonify({"status": "sucesso", "message": "Perfil atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar perfil {id_usuario}: {e}")
        return jsonify({"status": "erro", "mensagem": "Falha ao atualizar os dados do perfil"}), 500

# --- SISTEMA DE FILTROS E BUSCA ---

@app.route('/api/filtros', methods=['GET'])
def get_filtros():
    try:
        # Busca categorias e marcas únicas para alimentar os filtros do front-end
        res_categorias = executar_query('SELECT DISTINCT tipo_produto FROM public.produtos WHERE tipo_produto IS NOT NULL')
        res_marcas = executar_query('SELECT DISTINCT marca FROM public.produtos WHERE marca IS NOT NULL')
        
        categorias = [r['tipo_produto'] for r in res_categorias] if res_categorias else []
        marcas = [r['marca'] for r in res_marcas] if res_marcas else []
        
        return jsonify({"categorias": categorias, "marcas": marcas}), 200
    except Exception as e:
        print(f"Erro ao carregar filtros: {e}")
        return jsonify({"error": "Falha ao carregar opções de filtro"}), 500

# --- GERENCIAMENTO DE CONTEÚDO (CMS) ---

@app.route('/api/cms/update', methods=['POST'])
def update_cms_content():
    try:
        dados = request.get_json() 
        
        # Loop para atualizar múltiplos elementos do site de uma vez (UPSERT)
        for item in dados:
            sql = '''
                INSERT INTO public.cms_content (element_id, content_value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (element_id) 
                DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()
            '''
            executar_query(sql, (item['element_id'], item['content_value']))
        
        return jsonify({"message": "Conteúdo do site atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar CMS: {e}")
        return jsonify({"error": "Falha ao salvar alterações do site"}), 500

# --- GESTÃO ADMINISTRATIVA (PRODUTOS E PEDIDOS) ---

@app.route('/api/admin/produtos/<id_produto>', methods=['DELETE'])
def excluir_produto(id_produto):
    try:
        # Exclusão física do produto (Cuidado: isso remove o item permanentemente)
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
        
        # Permite ao admin/funcionário alterar o status (ex: 'Saiu para entrega', 'Concluído')
        sql = 'UPDATE public.pedidos SET status_pedido = %s WHERE id_pedido = %s'
        executar_query(sql, (novo_status, id_pedido))
        
        return jsonify({"message": f"Status do pedido {id_pedido} atualizado para {novo_status}"}), 200
    except Exception as e:
        print(f"Erro ao atualizar pedido {id_pedido}: {e}")
        return jsonify({"error": "Falha ao atualizar o status do pedido"}), 500
    
# --- GESTÃO DE BLOQUEIOS DE CALENDÁRIO ---

# --- GESTÃO DE BLOQUEIOS (FERIADOS E MANUTENÇÃO) ---

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
        
        # Se id_loja for 'ALL', salvamos como None (NULL no banco) para bloquear todas
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
        termo = request.args.get('q', '')
        # ILIKE faz a busca ignorar se é maiúsculo ou minúsculo
        sql = """
            SELECT id, nome_completo, email, role 
            FROM public.perfis 
            WHERE (nome_completo ILIKE %s OR email ILIKE %s)
            AND ativo = true
            LIMIT 10
        """
        params = (f"%{termo}%", f"%{termo}%")
        usuarios = executar_query(sql, params)
        return jsonify(usuarios), 200
    except Exception as e:
        print(f"Erro na busca de usuários: {e}")
        return jsonify({"error": "Falha ao buscar usuários"}), 500

@app.route('/api/admin/usuarios/alterar-role', methods=['PUT'])
def alterar_role_usuario():
    try:
        dados = request.get_json()
        id_usuario = dados.get('id_usuario')
        novo_role = dados.get('novo_role')

        # Segurança: impede que o sistema fique sem nenhum admin por acidente
        if novo_role not in ['admin', 'funcionario', 'cliente']:
            return jsonify({"error": "Cargo inválido"}), 400

        sql = "UPDATE public.perfis SET role = %s WHERE id = %s"
        executar_query(sql, (novo_role, id_usuario))
        
        return jsonify({"status": "sucesso", "mensagem": f"Usuário agora é {novo_role}"}), 200
    except Exception as e:
        print(f"Erro ao alterar cargo: {e}")
        return jsonify({"error": "Falha ao atualizar cargo"}), 500

@app.route('/api/auth/verificar-admin/<id_usuario>', methods=['GET'])
def verificar_admin_db(id_usuario):
    try:
        sql = "SELECT role FROM public.perfis WHERE id = %s"
        resultado = executar_query(sql, (id_usuario,))
        
        if resultado and resultado[0]['role'] == 'admin':
            return jsonify({"isAdmin": True}), 200
        else:
            return jsonify({"isAdmin": False}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/usuarios/listar-completo', methods=['GET'])
def listar_todos_usuarios_admin():
    try:
        # Pega todos da tabela perfis que estão ativos
        sql = "SELECT id, nome_completo, email, cpf, telefone, role, ativo FROM public.perfis WHERE ativo = true ORDER BY nome_completo ASC"
        usuarios = executar_query(sql)
        return jsonify(usuarios), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/usuarios/listar-completo', methods=['GET'])
def listar_todos_usuarios():
    # Busca todos os dados necessários para a gestão, incluindo endereço e telefone
    sql = "SELECT id, nome_completo, email, role, telefone, cpf, ativo FROM public.perfis ORDER BY nome_completo ASC"
    usuarios = executar_query(sql)
    return jsonify(usuarios), 200    

@app.route('/api/admin/dias-bloqueados', methods=['GET'])
def listar_bloqueios():
    try:
        # Traz os bloqueios e o nome da loja vinculada (se houver)
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

# --- GESTÃO DE AGENDAMENTOS (AÇÕES) ---

@app.route('/api/admin/cancelar-agendamento/<id_agendamento>', methods=['POST'])
def cancelar_agendamento(id_agendamento):
    try:
        # Apenas altera o status para 'cancelado' para manter o histórico
        executar_query("UPDATE public.agendamentos SET status = 'cancelado' WHERE id_agendamento = %s", (id_agendamento,))
        return jsonify({"message": "Agendamento cancelado com sucesso"}), 200
    except Exception as e:
        print(f"Erro ao cancelar agendamento: {e}")
        return jsonify({"error": "Falha ao cancelar"}), 500

# --- GESTÃO DE PETS (CADASTRO) ---

@app.route('/api/cadastrar-pet', methods=['POST'])
def cadastrar_pet():
    try:
        dados = request.get_json()
        
        # O id_tutor aqui deve ser o UUID do cliente logado
        sql = '''
            INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, porte, observacoes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id_pet
        '''
        params = (
            dados.get('id_tutor'), 
            dados.get('nome_pet'), 
            dados.get('especie'), 
            dados.get('raca'), 
            dados.get('porte'), 
            dados.get('observacoes')
        )
        
        # Usamos a query para inserir e pegar o novo ID
        resultado = executar_query(sql, params)
        novo_id = resultado[0]['id_pet'] if resultado else None
        
        return jsonify({"message": "Pet cadastrado com sucesso!", "id": novo_id}), 201
    except Exception as e:
        print(f"Erro ao cadastrar pet: {e}")
        return jsonify({"error": "Falha ao salvar dados do pet"}), 500
    
# --- 7. GESTÃO DE PETS (EXCLUSÃO) ---

@app.route('/api/pet/excluir/<id_pet>', methods=['DELETE'])
def excluir_pet(id_pet):
    try:
        # Tenta deletar o pet. O banco vai impedir se houver agendamentos vinculados (Integridade Referencial)
        executar_query('DELETE FROM public.pets WHERE id_pet = %s', (id_pet,))
        return jsonify({"message": "Pet removido com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir pet: {e}")
        return jsonify({"error": "Não foi possível excluir o pet. Verifique se ele possui agendamentos históricos."}), 500

# --- 8. CÁLCULO DE HORÁRIOS DISPONÍVEIS (LÓGICA CORE) ---

@app.route('/api/horarios-disponiveis', methods=['GET'])
def get_available_slots():
    try:
        loja_id = request.args.get('loja_id')
        servico_id = request.args.get('servico_id')
        data_str = request.args.get('data') # Formato esperado: YYYY-MM-DD

        if not all([loja_id, servico_id, data_str]):
            return jsonify({"error": "Faltam parâmetros para calcular horários."}), 400

        data_selecionada = datetime.strptime(data_str, '%Y-%m-%d').date()

        # 1. Verifica se o dia está bloqueado (Feriados ou Folgas)
        bloqueio = executar_query('''
            SELECT motivo FROM public.dias_bloqueados 
            WHERE data_bloqueada = %s AND (id_loja = %s OR id_loja IS NULL)
        ''', (data_str, loja_id))
        
        if bloqueio:
            return jsonify([]), 200 # Retorna lista vazia se o dia estiver trancado

        # 2. Busca regras de capacidade e duração do serviço
        regra_res = executar_query('''
            SELECT r.capacidade_simultanea, s.duracao_media_minutos 
            FROM public.servicos_loja_regras r
            JOIN public.servicos s ON r.id_servico = s.id_servico
            WHERE r.id_loja = %s AND r.id_servico = %s AND r.ativo = true
        ''', (loja_id, servico_id))
        
        if not regra_res:
            return jsonify([]), 200 # Sem regra definida, sem horários

        regra = regra_res[0]
        duracao = regra['duracao_media_minutos'] or 30
        capacidade_maxima = regra['capacidade_simultanea']

        # 3. Puxa agendamentos já ocupados para este dia e loja
        agendamentos = executar_query('''
            SELECT data_hora_inicio, data_hora_fim FROM public.agendamentos 
            WHERE id_loja = %s AND CAST(data_hora_inicio AS DATE) = %s AND status != 'cancelado'
        ''', (loja_id, data_str))

        # 4. Geração Dinâmica de Slots
        slots_disponiveis = []
        
        # Combinamos a data com a hora de início e fim padrão da Regia & Tinas
        inicio_dia = datetime.combine(data_selecionada, HORA_INICIO_PADRAO)
        fim_dia = datetime.combine(data_selecionada, HORA_FIM_PADRAO)

        atual = inicio_dia
        while atual + timedelta(minutes=duracao) <= fim_dia:
            slot_inicio = atual
            slot_fim = atual + timedelta(minutes=duracao)
            
            # Conta quantos agendamentos batem com este horário (conflitos)
            conflitos = 0
            for ag in agendamentos:
                # Remove timezone se existir para evitar erro de comparação
                ag_inicio = ag['data_hora_inicio'].replace(tzinfo=None)
                ag_fim = ag['data_hora_fim'].replace(tzinfo=None) if ag['data_hora_fim'] else ag_inicio + timedelta(minutes=duracao)
                
                if slot_inicio < ag_fim and slot_fim > ag_inicio:
                    conflitos += 1

            # Se ainda houver "vaga" na loja para esse horário, adiciona à lista
            if conflitos < capacidade_maxima:
                slots_disponiveis.append(slot_inicio.strftime('%H:%M'))
            
            # Pula para o próximo intervalo (ex: de 30 em 30 min)
            atual += timedelta(minutes=INTERVALO_SLOT_MINUTOS)

        return jsonify(slots_disponiveis), 200

    except Exception as e:
        print(f"Erro no motor de horários: {e}")
        return jsonify({"error": "Falha ao calcular disponibilidade"}), 500
# --- 9. E-COMMERCE (NOVIDADES) ---

# --- 9. E-COMMERCE: PRODUTOS RECENTES (NOVIDADES) ---

@app.route('/api/ecommerce/novidades', methods=['GET'])
def get_novidades():
    try:
        # Busca os 8 produtos mais recentes cadastrados
        sql = '''
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional 
            FROM public.produtos 
            WHERE status_produto = 'Ativo'
            ORDER BY id_produto DESC LIMIT 8
        '''
        produtos = executar_query(sql)
        return jsonify(produtos if produtos else []), 200
    except Exception as e:
        print(f"Erro ao buscar novidades: {e}")
        return jsonify({"error": "Falha ao carregar novidades"}), 500

# --- 10. CRIAÇÃO DE AGENDAMENTO (CONFIRMAÇÃO) ---

@app.route('/api/agendar', methods=['POST'])
def create_appointment():
    try:
        data = request.get_json()
        
        # 1. Busca a duração do serviço para calcular o fim
        res_servico = executar_query('SELECT duracao_media_minutos FROM public.servicos WHERE id_servico = %s', (data['id_servico'],))
        
        if not res_servico:
            return jsonify({"error": "Serviço não encontrado"}), 404
            
        duracao = res_servico[0]['duracao_media_minutos'] or 30
        
        # 2. Tratamento da Data e Hora
        # Removemos o 'Z' ou offsets para garantir compatibilidade com o banco
        inicio_str = data['data_hora_inicio'].replace('Z', '').split('+')[0]
        inicio = datetime.fromisoformat(inicio_str)
        fim = inicio + timedelta(minutes=duracao)

        # 3. Insere o agendamento no banco
        # CORREÇÃO: data_hora_fim em vez de data_hora_fundo
        sql = '''
            INSERT INTO public.agendamentos 
            (id_cliente, id_pet, id_loja, id_servico, data_hora_inicio, data_hora_fim, status, observacoes_cliente)
            VALUES (%s, %s, %s, %s, %s, %s, 'confirmado', %s)
            RETURNING id_agendamento
        '''
        params = (
            data['id_cliente'], 
            data.get('id_pet'), 
            data['id_loja'], 
            data['id_servico'], 
            inicio, 
            fim, 
            data.get('observacoes_cliente')
        )
        
        resultado = executar_query(sql, params)
        id_novo = resultado[0]['id_agendamento'] if resultado else None
        
        return jsonify({"message": "Agendamento realizado com sucesso!", "id": id_novo}), 201
    except Exception as e:
        print(f"Erro ao criar agendamento: {e}")
        return jsonify({"error": "Falha ao processar o agendamento"}), 500

# --- 11. SISTEMA DE LOGIN (HÍBRIDO) ---

@app.route('/api/login', methods=['POST'])
def login():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Dados não recebidos"}), 400
            
        email = dados.get('email')
        senha_digitada = dados.get('senha') 
        
        # Busca o perfil na tabela 'perfis'
        sql = 'SELECT id, nome_completo, role, senha FROM public.perfis WHERE email = %s AND ativo = true'
        usuario_res = executar_query(sql, (email,))
        
        if usuario_res:
            usuario = usuario_res[0]
            senha_db = usuario['senha']
            senha_valida = False
            
            # Checa se é Hash ou Texto Puro (Suporte para Carlos e Admin)
            if senha_db and (senha_db.startswith('scrypt') or senha_db.startswith('pbkdf2')):
                senha_valida = check_password_hash(senha_db, senha_digitada)
            else:
                senha_valida = (str(senha_db) == str(senha_digitada))

            if senha_valida:
                return jsonify({
                    "status": "sucesso",
                    "id": str(usuario['id']), # UUID para String
                    "nome": usuario['nome_completo'],
                    "role": usuario['role']
                }), 200
        
        return jsonify({"status": "erro", "mensagem": "E-mail ou senha incorretos"}), 401
            
    except Exception as e:
        print(f"ERRO CRÍTICO NO LOGIN: {str(e)}") 
        return jsonify({"status": "erro", "mensagem": "Erro interno no servidor"}), 500

# --- 12. EXECUÇÃO DO SERVIDOR ---

if __name__ == '__main__':
    # Configuração vital para o Render (PORT) e escuta em 0.0.0.0
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta, debug=False)