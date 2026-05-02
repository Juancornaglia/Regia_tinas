import os
import psycopg2 
import traceback 
from datetime import datetime, time, timedelta 
from psycopg2.extras import RealDictCursor 
from flask import Flask, send_from_directory, jsonify, request, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from db.neon_db import executar_query
from flask import request, jsonify
from psycopg2.extras import RealDictCursor
from werkzeug.security import check_password_hash, generate_password_hash
check_password_hash

# Importação da sua função de query simplificada
from db.neon_db import executar_query 

# 1. Configurações Iniciais
load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')

# Configuração do CORS (Unificada e Segura para o seu Front-end)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:5501",
            "http://localhost:5501", # Adicionado para evitar erro local
            "https://regia-tinas.onrender.com" 
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

def get_db_connection():
    # Conexão centralizada com o Neon via variável de ambiente
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    return conn

# 3. Constantes Globais
HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 

# --- SERVIDO DE ARQUIVOS (FRONTEND) ---

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
@app.route('/api/usuario/agendamentos/<int:id_usuario>', methods=['GET'])
def get_agendamentos_usuario(id_usuario):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Junta as tabelas para entregar o nome do pet, serviço e loja
        cur.execute('''
            SELECT a.id_agendamento, a.data_hora_inicio, a.status,
                   pt.nome_pet, s.nome_servico, l.nome_loja
            FROM public.agendamentos a
            JOIN public.pets pt ON a.id_pet = pt.id_pet
            JOIN public.servicos s ON a.id_servico = s.id_servico
            LEFT JOIN public.lojas l ON a.id_loja = l.id_loja
            WHERE a.id_cliente = %s
            ORDER BY a.data_hora_inicio DESC
        ''', (id_usuario,))
        
        agendamentos = cur.fetchall()
        return jsonify(agendamentos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/usuario/dados/<int:id_usuario>', methods=['GET'])
def get_usuario_dados(id_usuario):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT nome_completo, telefone, email FROM public.perfis WHERE id = %s", (id_usuario,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if user:
            return jsonify(user), 200
        return jsonify({"error": "Usuário não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/meus-pets/<int:id_tutor>', methods=['GET'])
def get_meus_pets(id_tutor):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id_pet, nome_pet, especie, raca, porte FROM public.pets WHERE id_tutor = %s", (id_tutor,))
        pets = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(pets), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# --- ADICIONE ESTAS DUAS NO SEU APP.PY ---

@app.route('/api/lojas', methods=['GET'])
def listar_lojas_publico():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # O agendamento.js espera 'id_loja' e 'nome_loja'
        cur.execute('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        lojas = cur.fetchall()
        return jsonify(lojas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/servicos_lista', methods=['GET'])
def listar_servicos_publico():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # O agendamento.js espera 'id_servico' e 'nome_servico'
        cur.execute('SELECT id_servico, nome_servico FROM public.servicos ORDER BY nome_servico')
        servicos = cur.fetchall()
        return jsonify(servicos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/produtos')
def listar_produtos():
    # Usando sua função executar_query
    produtos = executar_query("SELECT * FROM public.produtos WHERE status_produto = 'Ativo'")
    return jsonify(produtos)

# --- ROTAS ADMIN E DASHBOARD ---

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        res_faturamento = cur.fetchone()['faturamento'] or 0
        
        cur.execute('SELECT COUNT(*) as total FROM public.agendamentos')
        total_agendamentos = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) as total FROM public.pets")
        total_pets = cur.fetchone()['total']
        
        cur.close()
        conn.close()
        
        return jsonify({
            "faturamento": float(res_faturamento), 
            "total_agendamentos": total_agendamentos,
            "total_clientes": total_clientes,
            "total_pets": total_pets
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/dashboard-completo', methods=['GET'])
def dashboard_completo():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. KPIs
        cur.execute('SELECT SUM(total_pedido) as faturamento FROM public.pedidos')
        faturamento = cur.fetchone()['faturamento'] or 0
        
        cur.execute("SELECT COUNT(*) as total FROM public.agendamentos WHERE CAST(data_hora_inicio AS DATE) = CURRENT_DATE")
        agendamentos_hoje = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as total FROM public.pets")
        total_pets = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = cur.fetchone()['total']
        
        # 2. Agendamentos Recentes
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
        
        # 3. Estoque Crítico
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
            "graficos": [1200, 950, 400, 600] 
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
# --- 4. ROTA ADMIN: TODOS OS AGENDAMENTOS ---
@app.route('/api/admin/agendamentos', methods=['GET'])
def buscar_todos_agendamentos():
    conn = None
    cur = None
    try:
        # 1. Capturar os filtros da URL (se existirem)
        servico_id = request.args.get('servico')
        funcionario_id = request.args.get('funcionario')
        status_filtro = request.args.get('status') # Bônus: Já deixei preparado caso você queira filtrar por status!

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 2. Query Base (com o LEFT JOIN para o funcionário e ajustando os nomes para bater com o JS)
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
        
        # 3. Adicionar os filtros dinamicamente na query de forma segura
        if servico_id:
            base_query += " AND a.id_servico = %s"
            params.append(servico_id)
            
        if funcionario_id:
            base_query += " AND a.id_funcionario = %s"
            params.append(funcionario_id)

        if status_filtro:
            base_query += " AND a.status = %s"
            params.append(status_filtro)
            
        # 4. Finalizar a query com a ordenação
        base_query += " ORDER BY a.data_hora_inicio ASC"
        
        # Passamos a tuple(params) para evitar ataques de SQL Injection
        cur.execute(base_query, tuple(params))
        
        agendamentos = cur.fetchall()
        return jsonify(agendamentos), 200
        
    except Exception as e:
        print("Erro na rota de agendamentos:", e) # Ajuda a debugar no terminal
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/lojas', methods=['GET', 'OPTIONS'])
def listar_lojas_admin():
    if request.method == 'OPTIONS': 
        return jsonify({}), 200
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        lojas = cur.fetchall()
        return jsonify(lojas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE GESTÃO DE PEDIDOS ---

@app.route('/api/admin/pedidos', methods=['GET'])
def listar_todos_pedidos():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('''
            SELECT p.*, per.nome_completo 
            FROM public.pedidos p
            JOIN public.perfis per ON p.id_cliente = per.id
            ORDER BY p.data_pedido DESC
        ''')
        
        pedidos = cur.fetchall()
        return jsonify(pedidos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE GESTÃO DE PRODUTOS (ADMIN) ---

@app.route('/api/admin/produtos', methods=['GET'])
def listar_produtos_admin():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM public.produtos ORDER BY nome_produto ASC')
        produtos = cur.fetchall()
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/produtos', methods=['POST'])
def criar_produto():
    dados = request.get_json()
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO public.produtos (nome_produto, preco, quantidade_estoque, url_imagem, descricao, marca, tipo_produto)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (dados['nome_produto'], dados['preco'], dados['quantidade_estoque'], dados['url_imagem'], 
              dados['descricao'], dados['marca'], dados['tipo_produto']))
        
        conn.commit()
        return jsonify({"message": "Produto criado!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/produtos/<int:id>', methods=['PUT'])
def editar_produto(id):
    dados = request.get_json()
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            UPDATE public.produtos 
            SET nome_produto=%s, preco=%s, quantidade_estoque=%s, 
                url_imagem=%s, descricao=%s, marca=%s, tipo_produto=%s
            WHERE id_produto = %s
        ''', (dados['nome_produto'], dados['preco'], dados['quantidade_estoque'], 
              dados['url_imagem'], dados['descricao'], dados['marca'], dados['tipo_produto'], id))
        
        conn.commit()
        return jsonify({"message": "Produto atualizado!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/cms/content', methods=['GET'])
def get_cms_content():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT element_id, content_value FROM public.cms_content')
        content = cur.fetchall()
        return jsonify(content), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- BUSCA DINÂMICA (E-COMMERCE) ---

@app.route('/api/busca', methods=['GET'])
def buscar_produtos():
    termo = request.args.get('q', '').strip()
    categoria = request.args.get('categoria', '')
    marca = request.args.get('marca', '')
    preco_min = request.args.get('preco_min')
    preco_max = request.args.get('preco_max')

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = "SELECT * FROM public.produtos WHERE status_produto = 'Ativo'"
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

        if preco_min:
            sql += " AND preco >= %s"
            params.append(float(preco_min))

        if preco_max:
            sql += " AND preco <= %s"
            params.append(float(preco_max))

        sql += " ORDER BY nome_produto ASC"
        
        cur.execute(sql, tuple(params))
        produtos = cur.fetchall()
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE FINALIZAÇÃO DE PEDIDOS E CHECKOUT ---

@app.route('/api/finalizar-pedido', methods=['POST'])
def finalizar_pedido():
    dados = request.get_json()
    id_usuario = dados.get('id_usuario')
    itens = dados.get('itens') 
    total = dados.get('total')

    conn = None
    cur = None
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

        # 2. Registra os Itens e Baixa Estoque
        for item in itens:
            cur.execute('''
                INSERT INTO public.itens_pedido (id_pedido, id_produto, quantidade)
                VALUES (%s, %s, %s)
            ''', (id_pedido, item['id'], item['quantidade']))
            
            cur.execute('''
                UPDATE public.produtos 
                SET quantidade_estoque = quantidade_estoque - %s 
                WHERE id_produto = %s
            ''', (item['quantidade'], item['id']))

        conn.commit()
        return jsonify({"status": "sucesso", "id_pedido": id_pedido}), 201

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/checkout/finalizar', methods=['POST'])
def finalizar_checkout():
    dados = request.get_json()
    id_usuario = dados.get('id_usuario')
    carrinho = dados.get('itens') 

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        total_venda = 0
        
        # 1. Validar Estoque e Somar Total
        for item in carrinho:
            cur.execute('SELECT preco, quantidade_estoque, nome_produto FROM public.produtos WHERE id_produto = %s', (item['id'],))
            prod = cur.fetchone()
            
            if not prod or prod['quantidade_estoque'] < item['quantidade']:
                return jsonify({"error": f"Estoque insuficiente: {prod['nome_produto'] if prod else 'Produto'}"}), 400
            
            total_venda += float(prod['preco']) * item['quantidade']

        # 2. Registrar Pedido Principal
        cur.execute('''
            INSERT INTO public.pedidos (id_cliente, total_pedido, status_pedido, data_pedido)
            VALUES (%s, %s, 'pago', NOW()) RETURNING id_pedido
        ''', (id_usuario, total_venda))
        
        id_pedido = cur.fetchone()['id_pedido']

        # 3. Baixar Estoque e 4. Fidelidade
        for item in carrinho:
            cur.execute('UPDATE public.produtos SET quantidade_estoque = quantidade_estoque - %s WHERE id_produto = %s',
                        (item['quantidade'], item['id']))

        pontos_ganhos = int(total_venda)
        cur.execute('''
            INSERT INTO public.fidelidade_pontos (id_cliente, saldo_pontos, data_atualizacao)
            VALUES (%s, %s, NOW())
            ON CONFLICT (id_cliente) 
            DO UPDATE SET saldo_pontos = fidelidade_pontos.saldo_pontos + %s, data_atualizacao = NOW()
        ''', (id_usuario, pontos_ganhos, pontos_ganhos))

        conn.commit()
        return jsonify({
            "status": "sucesso", 
            "id_pedido": id_pedido, 
            "pontos": pontos_ganhos
        }), 201

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE AUTENTICAÇÃO E FIDELIDADE ---

@app.route('/api/auth/verificar-admin/<id_usuario>', methods=['GET'])
def verificar_admin_api(id_usuario): 
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT role FROM public.perfis WHERE id = %s', (id_usuario,))
        usuario = cur.fetchone()
        
        if usuario:
            is_admin = (usuario['role'] == 'admin')
            return jsonify({"isAdmin": is_admin, "role": usuario['role']}), 200
        return jsonify({"isAdmin": False, "message": "Usuário não encontrado"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e), "isAdmin": False}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/usuario/cadastrar', methods=['POST'])
def cadastrar_usuario():
    dados = request.get_json()
    nome = dados.get('nome')
    email = dados.get('email')
    senha = dados.get('senha')

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT id FROM public.perfis WHERE email = %s', (email,))
        if cur.fetchone():
            return jsonify({"status": "erro", "mensagem": "Este e-mail já está cadastrado."}), 400

        senha_hash = generate_password_hash(senha)

        cur.execute('''
            INSERT INTO public.perfis (nome_completo, email, senha, role)
            VALUES (%s, %s, %s, 'cliente')
        ''', (nome, email, senha_hash))
        
        conn.commit()
        return jsonify({"status": "sucesso", "mensagem": "Conta criada com sucesso!"}), 201
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/fidelidade/adicionar', methods=['POST'])
def adicionar_pontos():
    dados = request.get_json()
    id_cliente = dados.get('id_cliente')
    valor_gasto = float(dados.get('valor_gasto', 0))
    tipo = dados.get('tipo') 
    id_referencia = dados.get('id_referencia')

    pontos_ganhos = int(valor_gasto)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.execute('''
            INSERT INTO public.fidelidade_pontos (id_cliente, saldo_pontos, data_atualizacao)
            VALUES (%s, %s, NOW())
            ON CONFLICT (id_cliente) 
            DO UPDATE SET saldo_pontos = fidelidade_pontos.saldo_pontos + %s, data_atualizacao = NOW()
        ''', (id_cliente, pontos_ganhos, pontos_ganhos))

        conn.commit()
        return jsonify({"status": "sucesso", "pontos_ganhos": pontos_ganhos}), 200

    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE PERFIL E SEGURANÇA ---

@app.route('/api/usuario/redefinir-senha', methods=['POST'])
def redefinir_senha():
    dados = request.get_json()
    email = dados.get('email')
    nova_senha = dados.get('nova_senha')

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT id FROM public.perfis WHERE email = %s', (email,))
        usuario = cur.fetchone()
        
        if not usuario:
            return jsonify({"status": "erro", "mensagem": "E-mail não encontrado."}), 404

        senha_hash = generate_password_hash(nova_senha)

        cur.execute('UPDATE public.perfis SET senha = %s WHERE email = %s', (senha_hash, email))
        conn.commit()
        
        return jsonify({"status": "sucesso", "mensagem": "Senha alterada com sucesso!"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/usuario/atualizar-perfil/<int:id_usuario>', methods=['PUT'])
def atualizar_perfil(id_usuario):
    dados = request.get_json()
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            UPDATE public.perfis 
            SET nome_completo = %s, telefone = %s 
            WHERE id = %s
        ''', (dados['nome_completo'], dados['telefone'], id_usuario))
        
        conn.commit()
        return jsonify({"message": "Perfil atualizado!"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/filtros', methods=['GET'])
def get_filtros():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT DISTINCT tipo_produto FROM public.produtos WHERE tipo_produto IS NOT NULL')
        categorias = [r['tipo_produto'] for r in cur.fetchall()]
        
        cur.execute('SELECT DISTINCT marca FROM public.produtos WHERE marca IS NOT NULL')
        marcas = [r['marca'] for r in cur.fetchall()]
        
        return jsonify({"categorias": categorias, "marcas": marcas}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/cms/update', methods=['POST'])
def update_cms_content():
    dados = request.get_json() 
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        for item in dados:
            cur.execute('''
                INSERT INTO public.cms_content (element_id, content_value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (element_id) 
                DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()
            ''', (item['element_id'], item['content_value']))
        
        conn.commit()
        return jsonify({"message": "Conteúdo atualizado com sucesso!"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- ROTAS DE GESTÃO DE PRODUTOS E PEDIDOS (ADMIN) ---

@app.route('/api/admin/produtos/<int:id>', methods=['DELETE'])
def excluir_produto(id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM public.produtos WHERE id_produto = %s', (id,))
        conn.commit()
        return jsonify({"message": "Produto excluído!"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/atualizar-status-pedido/<int:id_pedido>', methods=['PUT'])
def atualizar_status_pedido(id_pedido):
    novo_status = request.get_json().get('status')
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            UPDATE public.pedidos 
            SET status_pedido = %s 
            WHERE id_pedido = %s
        ''', (novo_status, id_pedido))
        conn.commit()
        return jsonify({"message": "Status atualizado"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- GESTÃO DE BLOQUEIOS DE CALENDÁRIO ---

@app.route('/api/admin/remover-bloqueio/<int:id_bloqueio>', methods=['DELETE'])
def remover_bloqueio(id_bloqueio):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM public.dias_bloqueados WHERE id_bloqueio = %s', (id_bloqueio,))
        conn.commit()
        return jsonify({"message": "Removido"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/bloquear-dia', methods=['POST'])
def bloquear_dia():
    dados = request.get_json()
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        id_loja = None if dados['id_loja'] == 'ALL' else int(dados['id_loja'])
        
        cur.execute('''
            INSERT INTO public.dias_bloqueados (id_loja, data_bloqueada, motivo)
            VALUES (%s, %s, %s)
        ''', (id_loja, dados['data'], dados['motivo']))
        
        conn.commit()
        return jsonify({"message": "Dia bloqueado com sucesso!"}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/dias-bloqueados', methods=['GET'])
def listar_bloqueios():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('''
            SELECT b.*, l.nome_loja 
            FROM public.dias_bloqueados b
            LEFT JOIN public.lojas l ON b.id_loja = l.id_loja
            ORDER BY b.data_bloqueada DESC
        ''')
        bloqueios = cur.fetchall()
        return jsonify(bloqueios), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/admin/cancelar-agendamento/<int:id_agendamento>', methods=['POST'])
def cancelar_agendamento(id_agendamento):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE public.agendamentos SET status = 'cancelado' WHERE id_agendamento = %s", (id_agendamento,))
        conn.commit()
        return jsonify({"message": "Agendamento cancelado com sucesso"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- 7. GESTÃO DE PETS ---

@app.route('/api/cadastrar-pet', methods=['POST'])
def cadastrar_pet():
    dados = request.get_json()
    conn = None
    cur = None
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
        return jsonify({"message": "Pet cadastrado!", "id": novo_id}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
    
    @app.route('/api/pet/excluir/<int:id_pet>', methods=['DELETE'])
    def excluir_pet(id_pet):
        conn = None
        cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Deleta o pet do banco de dados Neon
        cur.execute('DELETE FROM public.pets WHERE id_pet = %s', (id_pet,))
        conn.commit()
        return jsonify({"message": "Pet excluído com sucesso!"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": "Não foi possível excluir o pet. Verifique se ele não possui agendamentos ativos."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
# --- 8. CÁLCULO DE HORÁRIOS DISPONÍVEIS (LÓGICA CORE) ---

HORA_INICIO_PADRAO = time(8, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30

def get_db_connection():
    # Substitua pela sua string de conexão real do Neon
    return psycopg2.connect("sua_string_de_conexao_do_neon")

# --- ROTA: BUSCAR HORÁRIOS DISPONÍVEIS ---
@app.route('/api/horarios-disponiveis', methods=['GET'])
def get_available_slots():
    conn = None
    cur = None
    try:
        loja_id = request.args.get('loja_id')
        servico_id = request.args.get('servico_id')
        data_str = request.args.get('data')

        if not all([loja_id, servico_id, data_str]):
            return jsonify({"error": "Parâmetros faltando."}), 400

        data_selecionada = datetime.strptime(data_str, '%Y-%m-%d').date()
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Verifica se o dia está bloqueado
        cur.execute('SELECT motivo FROM public.dias_bloqueados WHERE data_bloqueada = %s AND (id_loja = %s OR id_loja IS NULL)', (data_str, loja_id))
        if cur.fetchone(): return jsonify([]), 200

        # 2. Puxa regras de capacidade
        cur.execute('''
            SELECT r.capacidade_simultanea, s.duracao_media_minutos 
            FROM public.servicos_loja_regras r
            JOIN public.servicos s ON r.id_servico = s.id_servico
            WHERE r.id_loja = %s AND r.id_servico = %s AND r.ativo = true
        ''', (loja_id, servico_id))
        
        regra = cur.fetchone()
        if not regra: return jsonify([]), 200

        duracao = regra['duracao_media_minutos'] or 30

        # 3. Puxa agendamentos já feitos
        cur.execute('''
            SELECT data_hora_inicio, data_hora_fim FROM public.agendamentos 
            WHERE id_loja = %s AND CAST(data_hora_inicio AS DATE) = %s AND status != 'cancelado'
        ''', (loja_id, data_str))
        agendamentos = cur.fetchall()

        # 4. Gera os slots
        slots = []
        atual = datetime.combine(data_selecionada, HORA_INICIO_PADRAO)
        fim_dia = datetime.combine(data_selecionada, HORA_FIM_PADRAO)

        while atual + timedelta(minutes=duracao) <= fim_dia:
            slot_inicio = atual
            slot_fim = atual + timedelta(minutes=duracao)
            
            conflitos = 0
            for ag in agendamentos:
                ag_inicio = ag['data_hora_inicio'].replace(tzinfo=None)
                ag_fim = ag['data_hora_fim'].replace(tzinfo=None) if ag['data_hora_fim'] else ag_inicio + timedelta(minutes=duracao)
                if slot_inicio < ag_fim and slot_fim > ag_inicio:
                    conflitos += 1

            if conflitos < regra['capacidade_simultanea']:
                slots.append(slot_inicio.strftime('%H:%M'))
            
            atual += timedelta(minutes=INTERVALO_SLOT_MINUTOS)

        return jsonify(slots), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()
# --- 9. E-COMMERCE (NOVIDADES) ---

@app.route('/api/ecommerce/novidades', methods=['GET'])
def get_novidades():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('''
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional 
            FROM public.produtos 
            ORDER BY data_cadastro DESC LIMIT 8
        ''')
        produtos = cur.fetchall()
        return jsonify(produtos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- 10. CRIAÇÃO DE AGENDAMENTO ---

@app.route('/api/agendar', methods=['POST'])
def create_appointment():
    data = request.get_json()
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT duracao_media_minutos FROM public.servicos WHERE id_servico = %s', (data['id_servico'],))
        resultado = cur.fetchone()
        
        if not resultado:
            return jsonify({"error": "Serviço não encontrado"}), 404
            
        duracao = resultado[0]
        inicio = datetime.fromisoformat(data['data_hora_inicio'].replace('Z', '+00:00')).replace(tzinfo=None)
        fim = inicio + timedelta(minutes=duracao)

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
        return jsonify({"message": "Agendado!", "id": id_novo}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# --- 11. LOGIN ---

@app.route('/api/login', methods=['POST'])
def login():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Dados não recebidos"}), 400
            
        email = dados.get('email')
        senha_digitada = dados.get('senha') 
        
        # Log de depuração (aparece no painel de logs do Render)
        print(f"Tentativa de login para: {email}")

        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "erro", "mensagem": "Falha ao conectar ao banco"}), 500

        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta na tabela 'perfis'
        cur.execute('SELECT id, nome_completo, role, senha FROM public.perfis WHERE email = %s AND ativo = true', (email,))
        usuario = cur.fetchone()
        
        if usuario:
            # Lógica híbrida: aceita senha pura (Carlos) ou Hash (Admin/Usuários novos)
            senha_db = usuario['senha']
            senha_valida = False
            
            if senha_db and (senha_db.startswith('scrypt') or senha_db.startswith('pbkdf2')):
                senha_valida = check_password_hash(senha_db, senha_digitada)
            else:
                # Comparação direta para senhas inseridas manualmente via SQL
                senha_valida = (senha_db == senha_digitada)

            if senha_valida:
                return jsonify({
                    "status": "sucesso",
                    "id": str(usuario['id']), # Convertendo UUID para string para evitar erro de JSON
                    "nome": usuario['nome_completo'],
                    "role": usuario['role']
                }), 200
        
        return jsonify({"status": "erro", "mensagem": "E-mail ou senha incorretos"}), 401
            
    except Exception as e:
        # Este print é seu melhor amigo para debugar no painel do Render
        print(f"ERRO CRÍTICO NO LOGIN: {str(e)}") 
        return jsonify({"status": "erro", "mensagem": "Erro interno no servidor"}), 500
    finally:
        # Fecha as conexões com segurança
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --- 12. EXECUÇÃO ---

if __name__ == '__main__':
    # Pegamos a porta do ambiente (Render) ou usamos a 5000 local
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)