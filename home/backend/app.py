import os
import psycopg2 
import traceback 
from datetime import datetime, time, timedelta 
from psycopg2.extras import RealDictCursor 
from flask import Flask, send_from_directory, jsonify, request, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# Importação da sua função de query simplificada
from db.neon_db import executar_query 
# 1. Configurações Iniciais
load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))
# O static_folder aponta para a pasta onde estão seus HTMLs, CSS e Imagens
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
# Configuração do CORS (Unificada e Segura)
# Configuração do CORS
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:5501",
            "https://regia-tinas.onrender.com" 
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
def get_db_connection():
    # Ele pega o link que você colocou no arquivo .env ou no Render
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    return conn
# 2. Importação das Rotas (Blueprints)
from routes.api_admin import api_admin
from routes.api_agendamento import api_agendamento
from routes.api_ecommerce import api_ecommerce
from routes.api_usuario import api_usuario

# 3. Constantes Globais
HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))

# 4. Registro dos Blueprints
app.register_blueprint(api_admin, url_prefix='/api/admin')
app.register_blueprint(api_agendamento, url_prefix='/api/agendamento')
app.register_blueprint(api_ecommerce, url_prefix='/api/ecommerce')
app.register_blueprint(api_usuario, url_prefix='/api/usuario')


@app.route('/img/<path:filename>')
def imagens(filename):
 return send_from_directory(os.path.join(FRONTEND_DIR, 'img'), filename)

@app.route('/videos/<path:filename>')
def videos(filename):
    # Dê um TAB antes do return abaixo:
    return send_from_directory(os.path.join(FRONTEND_DIR, 'videos'), filename)

@app.route('/<path:path>')
def servir_paginas(path):
    # Dê um TAB antes do return abaixo:
    return send_from_directory(FRONTEND_DIR, path)

# --- ROTAS DE API (CONTEÚDO GERAL) ---

@app.route('/api/produtos')
def listar_produtos():
    # Dê um TAB em todas as linhas dentro da função:
    produtos = executar_query("SELECT * FROM public.produtos WHERE status_produto = 'Ativo'")
    return jsonify(produtos)

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        res_faturamento = cur.fetchone()['faturamento'] or 0
        
        cur.execute('SELECT COUNT(*) as total FROM public.agendamentos')
        total_agendamentos = cur.fetchone()['total']

        # Adicionei Clientes e Pets para completar seus KPIs
        cur.execute("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) as total FROM public.pets")
        total_pets = cur.fetchone()['total']
        
        cur.close()
        conn.close()
        
        # Retorne com os nomes que o seu JS espera
        return jsonify({
            "faturamento": float(res_faturamento), 
            "total_agendamentos": total_agendamentos,
            "total_clientes": total_clientes,
            "total_pets": total_pets
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')
@app.route('/usuario/<path:path>')
def servir_usuario(path):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'usuario'), path)
# --- ROTA MESTRE DO DASHBOARD (KPIs, TABELA, ESTOQUE E GRÁFICOS) ---
@app.route('/api/admin/dashboard-completo', methods=['GET'])
def dashboard_completo():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        # Usamos o RealDictCursor para o JS entender os nomes das colunas (ex: dados.stats)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Estatísticas Principais (KPIs)
        cur.execute('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = cur.fetchone()['faturamento'] or 0
        
        cur.execute("SELECT COUNT(*) as total FROM public.agendamentos WHERE CAST(data_hora_inicio AS DATE) = CURRENT_DATE")
        agendamentos_hoje = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as total FROM public.pets")
        total_pets = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = cur.fetchone()['total']
        
        # 2. Lista de Agendamentos para a Tabela (Hoje em diante)
        cur.execute('''
            SELECT a.id_agendamento as id, a.data_hora_inicio, a.status, 
                   p.nome_completo as cliente_nome, p.telefone as cliente_tel,
                   pt.nome_pet, pt.raca as pet_raca, s.nome_servico
            FROM public.agendamentos a
            JOIN public.perfis p ON a.id_cliente = p.id
            JOIN public.pets pt ON a.id_pet = pt.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            WHERE CAST(a.data_hora_inicio AS DATE) >= CURRENT_DATE
            ORDER BY a.data_hora_inicio ASC LIMIT 10
        ''')
        lista_agendamentos = cur.fetchall()
        
        # 3. Estoque Crítico (Produtos com menos de 5 unidades)
        cur.execute("SELECT nome_produto, quantidade_estoque FROM public.produtos WHERE quantidade_estoque < 5 LIMIT 5")
        estoque_critico = cur.fetchall()
        
        return jsonify({
            "stats": {
                "faturamento": float(faturamento),
                "total_agendamentos": agendamentos_hoje,
                "total_pets": total_pets,
                "total_clientes": total_clientes
            },
            "agendamentos": lista_agendamentos,
            "estoque_critico": estoque_critico,
            "graficos": [1200, 950, 400, 600] # Exemplo: Banho, Tosa, Hotel, Vet
        }), 200
        
    except Exception as e:
        print(f"Erro no dashboard: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
# --- 4. ROTA ADMIN: TODOS OS AGENDAMENTOS ---
@app.route('/api/admin/agendamentos', methods=['GET'])
def buscar_todos_agendamentos():
    try:
        # Tudo aqui dentro tem 1 TAB (4 espaços)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # O SQL precisa estar bem recuado dentro das aspas
        cur.execute('''
            SELECT 
                a.id_agendamento,
                a.data_hora_inicio, 
                a.status, 
                per.nome_completo as dono_nome,
                per.telefone as dono_tel,
                p.nome_pet, 
                s.nome_servico, 
                l.nome_loja
            FROM public.agendamentos a
            JOIN public.perfis per ON a.id_cliente = per.id
            JOIN public.pets p ON a.id_pet = p.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            JOIN public.lojas l ON a.id_loja = l.id_loja
            ORDER BY a.data_hora_inicio ASC
        ''')
        
        agendamentos = cur.fetchall()
        cur.close()
        conn.close()
        
        # O retorno bem alinhado
        return jsonify(agendamentos), 200

    except Exception as e:
        # O except fica na mesma linha do try
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/lojas', methods=['GET', 'OPTIONS']) # Adicionei OPTIONS
def listar_lojas_admin():
    if request.method == 'OPTIONS': return jsonify({}), 200 # Adicionei esta linha
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        lojas = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(lojas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 
    
# --- ROTAS DE GESTÃO DE PEDIDOS ---

@app.route('/api/admin/pedidos', methods=['GET'])
def listar_todos_pedidos():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # JOIN para trazer o nome do cliente que fez a compra
        cur.execute('''
            SELECT p.*, per.nome_completo 
            FROM public.pedidos p
            JOIN public.perfis per ON p.id_cliente = per.id
            ORDER BY p.data_pedido DESC
        ''')
        
        pedidos = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify(pedidos), 200
    except Exception as e:
        # O except deve estar na mesma coluna do try acima
        return jsonify({"error": str(e)}), 500

# --- ROTAS DE GESTÃO DE PRODUTOS ---

@app.route('/api/admin/produtos', methods=['GET'])
def listar_produtos_admin():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Lista todos os produtos cadastrados para edição/exclusão
        cur.execute('SELECT * FROM public.produtos ORDER BY nome_produto ASC')
        
        produtos = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/produtos', methods=['POST'])
def criar_produto():
    dados = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Inserção de novo produto no Neon
        cur.execute('''
            INSERT INTO public.produtos (nome_produto, preco, quantidade_estoque, url_imagem, descricao, marca, tipo_produto)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (dados['nome_produto'], dados['preco'], dados['quantidade_estoque'], dados['url_imagem'], 
              dados['descricao'], dados['marca'], dados['tipo_produto']))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Produto criado!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/produtos/<int:id>', methods=['PUT'])
def editar_produto(id):
    dados = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Atualização de produto existente usando o ID
        cur.execute('''
            UPDATE public.produtos 
            SET nome_produto=%s, preco=%s, quantidade_estoque=%s, 
                url_imagem=%s, descricao=%s, marca=%s, tipo_produto=%s
            WHERE id_produto = %s
        ''', (dados['nome_produto'], dados['preco'], dados['quantidade_estoque'], 
              dados['url_imagem'], dados['descricao'], dados['marca'], dados['tipo_produto'], id))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Produto atualizado!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cms/content', methods=['GET'])
def get_cms_content():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Busca todas as configurações de design do site (Textos, cores, banners)
        cur.execute('SELECT element_id, content_value FROM public.cms_content')
        content = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(content), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ROTAS DE BUSCA E E-COMMERCE ---

@app.route('/api/busca', methods=['GET'])
def buscar_produtos():
    # Pega os filtros que vêm da URL (ex: ?q=racao&preco_min=50)
    termo = request.args.get('q', '').strip()
    categoria = request.args.get('categoria', '')
    marca = request.args.get('marca', '')
    preco_min = request.args.get('preco_min')
    preco_max = request.args.get('preco_max')

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Base da Query
        sql = "SELECT * FROM public.produtos WHERE status_produto = 'Ativo'"
        params = []

        # Filtro de Nome/Marca/Descrição (ILIKE para ignorar maiúsculas/minúsculas)
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
        
        # Executa a query montada dinamicamente
        cur.execute(sql, tuple(params))
        produtos = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/finalizar-pedido', methods=['POST'])
def finalizar_pedido():
    dados = request.get_json()
    id_usuario = dados.get('id_usuario')
    itens = dados.get('itens') # Lista de {id, quantidade}
    total = dados.get('total')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Cria o Pedido Principal
        cur.execute('''
            INSERT INTO public.pedidos (id_cliente, total_pedido, status_pedido, data_pedido)
            VALUES (%s, %s, 'processando', NOW())
            RETURNING id_pedido
        ''', (id_usuario, total))
        
        id_pedido = cur.fetchone()[0]

        # 2. Registra os Itens do Pedido
        for item in itens:
            # Tudo dentro do FOR precisa de 8 espaços (2 TABs)
            cur.execute('''
                INSERT INTO public.itens_pedido (id_pedido, id_produto, quantidade)
                VALUES (%s, %s, %s)
            ''', (id_pedido, item['id'], item['quantidade']))
            
            # 3. Baixa o estoque automaticamente
            cur.execute('''
                UPDATE public.produtos 
                SET quantidade_estoque = quantidade_estoque - %s 
                WHERE id_produto = %s
            ''', (item['quantidade'], item['id']))

        # 4. Finalização (volta para 4 espaços/1 TAB)
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "sucesso", "id_pedido": id_pedido}), 201

    except Exception as e:
        # Importante: o except alinhado com o try
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/api/checkout/finalizar', methods=['POST'])
def finalizar_checkout():
    dados = request.get_json()
    id_usuario = dados.get('id_usuario')
    carrinho = dados.get('itens') # Lista de {id, quantidade}

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        total_venda = 0
        
        # 1. Validar Estoque e Somar Total
        for item in carrinho:
            cur.execute('SELECT preco, quantidade_estoque, nome_produto FROM public.produtos WHERE id_produto = %s', (item['id'],))
            prod = cur.fetchone()
            
            # Verificação de segurança (8 espaços para o if, 12 para o return)
            if not prod or prod['quantidade_estoque'] < item['quantidade']:
                return jsonify({"error": f"Estoque insuficiente: {prod['nome_produto'] if prod else 'Produto'}"}), 400
            
            total_venda += float(prod['preco']) * item['quantidade']

        # 2. Registrar Pedido Principal
        cur.execute('''
            INSERT INTO public.pedidos (id_cliente, total_pedido, status_pedido, data_pedido)
            VALUES (%s, %s, 'pago', NOW()) RETURNING id_pedido
        ''', (id_usuario, total_venda))
        
        id_pedido = cur.fetchone()['id_pedido']

        # 3. Baixar Estoque dos Itens
        for item in carrinho:
            cur.execute('UPDATE public.produtos SET quantidade_estoque = quantidade_estoque - %s WHERE id_produto = %s',
                        (item['quantidade'], item['id']))

        # 4. Lógica de Fidelidade (1 Real = 1 Ponto)
        pontos_ganhos = int(total_venda)
        cur.execute('''
            INSERT INTO public.fidelidade_pontos (id_cliente, saldo_pontos, data_atualizacao)
            VALUES (%s, %s, NOW())
            ON CONFLICT (id_cliente) 
            DO UPDATE SET saldo_pontos = fidelidade_pontos.saldo_pontos + %s, data_atualizacao = NOW()
        ''', (id_usuario, pontos_ganhos, pontos_ganhos))

        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "status": "sucesso", 
            "id_pedido": id_pedido, 
            "pontos": pontos_ganhos
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ROTAS DE AUTENTICAÇÃO E SEGURANÇA ---

# --- ROTA DE VERIFICAÇÃO DE ADMIN (UNIFICADA COM O JS) ---

@app.route('/api/auth/verificar-admin/<id_usuario>', methods=['GET'])
def verificar_admin_api(id_usuario): 
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Busca a role do usuário no Neon
        cur.execute('SELECT role FROM public.perfis WHERE id = %s', (id_usuario,))
        usuario = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if usuario:
            # O JavaScript do frontend espera "isAdmin" para permitir a entrada
            # Verifica se a string no banco é exatamente 'admin'
            is_admin = (usuario['role'] == 'admin')
            
            return jsonify({
                "isAdmin": is_admin, 
                "role": usuario['role']
            }), 200
        else:
            return jsonify({"isAdmin": False, "message": "Usuário não encontrado"}), 404
            
    except Exception as e:
        print(f"Erro na verificação de admin: {e}")
        return jsonify({"error": str(e), "isAdmin": False}), 500

@app.route('/api/usuario/cadastrar', methods=['POST'])
def cadastrar_usuario():
    dados = request.get_json()
    nome = dados.get('nome')
    email = dados.get('email')
    senha = dados.get('senha')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Verifica se o e-mail já existe
        cur.execute('SELECT id FROM public.perfis WHERE email = %s', (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "erro", "mensagem": "Este e-mail já está cadastrado."}), 400

        # 2. Criptografa a senha (Segurança é tudo!)
        # Certifique-se de que o import generate_password_hash está no topo do arquivo
        senha_hash = generate_password_hash(senha)

        # 3. Insere na tabela perfis
        cur.execute('''
            INSERT INTO public.perfis (nome_completo, email, senha, role)
            VALUES (%s, %s, %s, 'cliente')
        ''', (nome, email, senha_hash))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "sucesso", "mensagem": "Conta criada com sucesso!"}), 201
    except Exception as e:
        print(f"Erro ao cadastrar: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/api/fidelidade/adicionar', methods=['POST'])
def adicionar_pontos():
    dados = request.get_json()
    id_cliente = dados.get('id_cliente')
    valor_gasto = float(dados.get('valor_gasto', 0))
    tipo = dados.get('tipo') # 'pedido' ou 'agendamento'
    id_referencia = dados.get('id_referencia')

    pontos_ganhos = int(valor_gasto) # Regra: 1 Real = 1 Ponto

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Registra no Histórico (8 espaços para cur.execute)
        cur.execute('''
            INSERT INTO public.fidelidade_historico 
            (id_cliente, pontos, tipo, id_referencia_pedido, id_referencia_agendamento, data_registro)
            VALUES (%s, %s, %s, %s, %s, NOW())
        ''', (
            id_cliente, 
            pontos_ganhos, 
            tipo, 
            id_referencia if tipo == 'pedido' else None,
            id_referencia if tipo == 'agendamento' else None
        ))

        # 2. Atualiza o Saldo Total (Upsert)
        cur.execute('''
            INSERT INTO public.fidelidade_pontos (id_cliente, saldo_pontos, data_atualizacao)
            VALUES (%s, %s, NOW())
            ON CONFLICT (id_cliente) 
            DO UPDATE SET saldo_pontos = fidelidade_pontos.saldo_pontos + %s, data_atualizacao = NOW()
        ''', (id_cliente, pontos_ganhos, pontos_ganhos))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "sucesso", "pontos_ganhos": pontos_ganhos}), 200

    except Exception as e:
        # Alinhado com o try
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/api/usuario/redefinir-senha', methods=['POST'])
def redefinir_senha():
    dados = request.get_json()
    email = dados.get('email')
    nova_senha = dados.get('nova_senha')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Verifica se o usuário existe no Neon
        cur.execute('SELECT id FROM public.perfis WHERE email = %s', (email,))
        usuario = cur.fetchone()
        
        if not usuario:
            cur.close()
            conn.close()
            return jsonify({"status": "erro", "mensagem": "E-mail não encontrado."}), 404

        # 2. Criptografa a nova senha antes de salvar
        senha_hash = generate_password_hash(nova_senha)

        # 3. Atualiza a senha no banco
        cur.execute('UPDATE public.perfis SET senha = %s WHERE email = %s', (senha_hash, email))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "sucesso", "mensagem": "Senha alterada com sucesso!"}), 200
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/api/usuario/atualizar-perfil/<id_usuario>', methods=['PUT'])
def atualizar_perfil(id_usuario):
    dados = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Atualiza apenas nome e telefone
        cur.execute('''
            UPDATE public.perfis 
            SET nome_completo = %s, telefone = %s 
            WHERE id = %s
        ''', (dados['nome_completo'], dados['telefone'], id_usuario))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Perfil atualizado!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/filtros', methods=['GET'])
def get_filtros():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Busca categorias únicas que realmente existem no estoque
        cur.execute('SELECT DISTINCT tipo_produto FROM public.produtos WHERE tipo_produto IS NOT NULL')
        categorias = [r['tipo_produto'] for r in cur.fetchall()]
        
        # Busca marcas únicas que realmente existem no estoque
        cur.execute('SELECT DISTINCT marca FROM public.produtos WHERE marca IS NOT NULL')
        marcas = [r['marca'] for r in cur.fetchall()]
        
        cur.close()
        conn.close()
        return jsonify({"categorias": categorias, "marcas": marcas}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cms/update', methods=['POST'])
def update_cms_content():
    # Espera uma lista de objetos: [{"element_id": "topo_banner", "content_value": "Promoção!"}]
    dados = request.get_json() 
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # O loop FOR precisa de 4 espaços, e o que está DENTRO dele precisa de 8 espaços
        for item in dados:
            cur.execute('''
                INSERT INTO public.cms_content (element_id, content_value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (element_id) 
                DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()
            ''', (item['element_id'], item['content_value']))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Conteúdo atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/produtos/<int:id>', methods=['DELETE'])
def excluir_produto(id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Remove o produto usando o ID da URL
        cur.execute('DELETE FROM public.produtos WHERE id_produto = %s', (id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Produto excluído!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/atualizar-status-pedido/<int:id_pedido>', methods=['PUT'])
def atualizar_status_pedido(id_pedido):
    # Pega o novo status (ex: 'cancelado', 'entregue') do JSON enviado
    novo_status = request.get_json().get('status')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            UPDATE public.pedidos 
            SET status_pedido = %s 
            WHERE id_pedido = %s
        ''', (novo_status, id_pedido))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Status atualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- GESTÃO DE BLOQUEIOS DE CALENDÁRIO ---

@app.route('/api/admin/remover-bloqueio/<int:id_bloqueio>', methods=['DELETE'])
def remover_bloqueio(id_bloqueio):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM public.dias_bloqueados WHERE id_bloqueio = %s', (id_bloqueio,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Removido"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/bloquear-dia', methods=['POST'])
def bloquear_dia():
    dados = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Lógica para bloqueio global ou por loja específica
        id_loja = None if dados['id_loja'] == 'ALL' else int(dados['id_loja'])
        
        cur.execute('''
            INSERT INTO public.dias_bloqueados (id_loja, data_bloqueada, motivo)
            VALUES (%s, %s, %s)
        ''', (id_loja, dados['data'], dados['motivo']))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Dia bloqueado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/dias-bloqueados', methods=['GET'])
def listar_bloqueios():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # O LEFT JOIN garante que bloqueios globais (sem loja) também apareçam
        cur.execute('''
            SELECT b.*, l.nome_loja 
            FROM public.dias_bloqueados b
            LEFT JOIN public.lojas l ON b.id_loja = l.id_loja
            ORDER BY b.data_bloqueada DESC
        ''')
        bloqueios = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(bloqueios), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- GESTÃO DE LOJAS E CANCELAMENTOS ---
@app.route('/api/admin/cancelar-agendamento/<int:id_agendamento>', methods=['POST'])
def cancelar_agendamento(id_agendamento):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Apenas muda o status para cancelado (não deletamos para manter o histórico)
        cur.execute("UPDATE public.agendamentos SET status = 'cancelado' WHERE id_agendamento = %s", (id_agendamento,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Agendamento cancelado com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cadastrar-pet', methods=['POST'])
def cadastrar_pet():
    dados = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, porte, observacoes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id_pet
        ''', (
            dados['id_tutor'], 
            dados['nome_pet'], 
            dados.get('especie'), 
            dados.get('raca'), 
            dados.get('porte'), 
            dados.get('observacoes')
        ))
        
        novo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Pet cadastrado!", "id": novo_id}), 201
    except Exception as e:
        print(f"Erro ao cadastrar pet: {e}")
        return jsonify({"error": str(e)}), 500
    
# --- 5. ROTA DE CÁLCULO DE HORÁRIOS ---
@app.route('/api/horarios-disponiveis', methods=['GET'])
def get_available_slots():
    try:
        loja_id = request.args.get('loja_id')
        servico_id = request.args.get('servico_id')
        data_str = request.args.get('data')

        if not all([loja_id, servico_id, data_str]):
            return jsonify({"error": "Parâmetros obrigatórios faltando."}), 400

        data_selecionada = datetime.strptime(data_str, '%Y-%m-%d').date()
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Verificar se o dia está bloqueado (Feriados/Folgas)
        cur.execute('''
            SELECT motivo FROM public.dias_bloqueados 
            WHERE data_bloqueada = %s AND (id_loja = %s OR id_loja IS NULL)
        ''', (data_str, loja_id))
        
        if cur.fetchone():
            return jsonify([]), 200

        # 2. Buscar regra de capacidade (Quantos pets cabem por vez)
        cur.execute('''
            SELECT r.capacidade_simultanea, s.duracao_media_minutos 
            FROM public.servicos_loja_regras r
            JOIN public.servicos s ON r.id_servico = s.id_servico
            WHERE r.id_loja = %s AND r.id_servico = %s AND r.ativo = true
        ''', (loja_id, servico_id))
        
        regra = cur.fetchone()
        if not regra: 
            return jsonify([]), 200

        duracao = regra['duracao_media_minutos'] or INTERVALO_SLOT_MINUTOS

        # 3. Buscar agendamentos já existentes para comparar
        cur.execute('''
            SELECT data_hora_inicio, data_hora_fundo FROM public.agendamentos 
            WHERE id_loja = %s AND CAST(data_hora_inicio AS DATE) = %s AND status != 'cancelado'
        ''', (loja_id, data_str))
        agendamentos = cur.fetchall()

        # 4. Lógica de varredura de horários
        horarios_disponiveis = []
        hora_atual = datetime.combine(data_selecionada, HORA_INICIO_PADRAO)
        hora_fim_dia = datetime.combine(data_selecionada, HORA_FIM_PADRAO)

        while hora_atual < hora_fim_dia:
            slot_inicio = hora_atual
            slot_fim = hora_atual + timedelta(minutes=duracao)
            
            if slot_fim.time() > HORA_FIM_PADRAO: 
                break

            conflitos = 0
            for ag in agendamentos:
                # Remove timezone para comparação segura
                ag_inicio = ag['data_hora_inicio'].replace(tzinfo=None)
                ag_fim = ag['data_hora_fundo'].replace(tzinfo=None) if ag['data_hora_fundo'] else ag_inicio + timedelta(minutes=duracao)
                
                # Verifica se o horário pretendido bate com algum já ocupado
                if slot_inicio < ag_fim and slot_fim > ag_inicio:
                    conflitos += 1
            
            # Só adiciona se a loja ainda tiver "vagas" (capacidade) naquele horário
            if conflitos < regra['capacidade_simultanea']:
                horarios_disponiveis.append(slot_inicio.strftime('%H:%M'))
            
            hora_atual += timedelta(minutes=INTERVALO_SLOT_MINUTOS)

        cur.close()
        conn.close()
        return jsonify(horarios_disponiveis), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- 6. ROTA DE E-COMMERCE (Novidades e Ofertas) ---
@app.route('/api/ecommerce/novidades', methods=['GET'])
def get_novidades():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Busca os 8 produtos mais recentes para a Home
        cur.execute('''
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional 
            FROM public.produtos 
            ORDER BY data_cadastro DESC LIMIT 8
        ''')
        produtos = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 7. ROTA DE AGENDAR (POST) ---
@app.route('/api/agendar', methods=['POST'])
def create_appointment():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Busca a duração para calcular o horário de fim automaticamente
        cur.execute('SELECT duracao_media_minutos FROM public.servicos WHERE id_servico = %s', (data['id_servico'],))
        resultado_servico = cur.fetchone()
        
        if not resultado_servico:
            return jsonify({"error": "Serviço não encontrado"}), 404
            
        duracao = resultado_servico[0]
        
        # 2. Converte a string da data para objeto datetime do Python
        inicio = datetime.fromisoformat(data['data_hora_inicio'].replace('Z', '+00:00'))
        fim = inicio + timedelta(minutes=duracao)

        # 3. Insere o agendamento no banco Neon
        cur.execute('''
            INSERT INTO public.agendamentos 
            (id_cliente, id_pet, id_loja, id_servico, data_hora_inicio, data_hora_fundo, status, observacoes_cliente)
            VALUES (%s, %s, %s, %s, %s, %s, 'confirmado', %s)
            RETURNING id_agendamento
        ''', (
            data['id_cliente'], 
            data.get('id_pet'), 
            data['id_loja'], 
            data['id_servico'], 
            inicio, 
            fim, 
            data.get('observacoes_cliente')
        ))
        
        id_novo = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Agendado!", "id": id_novo}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    dados = request.get_json()
    email = dados.get('email')
    senha_digitada = dados.get('senha') 
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Agora buscamos também a senha (hash) guardada no banco
        cur.execute('SELECT id, nome_completo, role, senha FROM public.perfis WHERE email = %s', (email,))
        usuario = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if usuario:
            # COMPARAÇÃO DE SEGURANÇA:
            # check_password_hash compara a senha digitada com o hash do banco
            if check_password_hash(usuario['senha'], senha_digitada):
                return jsonify({
                    "status": "sucesso",
                    "id": usuario['id'],
                    "nome": usuario['nome_completo'],
                    "role": usuario['role']
                }), 200
            else:
                return jsonify({"status": "erro", "mensagem": "Senha incorreta"}), 401
        else:
            return jsonify({"status": "erro", "mensagem": "E-mail não encontrado"}), 404
            
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
# --- 8. EXECUÇÃO (SEMPRE A ÚLTIMA LINHA DO ARQUIVO) ---
if __name__ == '__main__':
    print("🚀 Servidor Regia & Tina's Care ON em http://127.0.0.1:5000")
    app.run(debug=True, port=5000)