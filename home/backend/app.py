import os
import traceback
import random
import re
import string
import threading
import psycopg2
from datetime import datetime, time, timedelta, timezone
from psycopg2.extras import RealDictCursor
from uuid import UUID

# Flask e Extensões
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

# Segurança e Banco de Dados
from werkzeug.security import generate_password_hash, check_password_hash
from db.neon_db import executar_query as _executar_query, get_db_connection


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
            "http://127.0.0.1:5000",
            "http://localhost:5000",
            "https://regia-tinas.onrender.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


@app.errorhandler(HTTPException)
def responder_erro_http_api(error):
    if request.path.startswith('/api/'):
        return jsonify({"error": error.description}), error.code
    return error

def executar_query(sql, params=None):
    """Propaga falhas de banco para que handlers nunca respondam sucesso com None."""
    resultado = _executar_query(sql, params)
    if resultado is None:
        raise RuntimeError("Falha ao executar consulta no banco de dados.")
    return resultado

def cpf_valido(cpf):
    digitos = re.sub(r"\D", "", str(cpf or ""))
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False

    for posicao in (9, 10):
        soma = sum(int(digitos[i]) * (posicao + 1 - i) for i in range(posicao))
        verificador = (soma * 10) % 11
        if verificador == 10:
            verificador = 0
        if verificador != int(digitos[posicao]):
            return False
    return True

def parse_data_hora(valor):
    if not valor:
        return None
    try:
        data_hora = datetime.fromisoformat(str(valor).replace('Z', '+00:00'))
    except ValueError:
        return None
    if data_hora.tzinfo is not None:
        data_hora = data_hora.astimezone(FUSO_LOCAL).replace(tzinfo=None)
    return data_hora

def get_db_connection():
    """Conexão centralizada com tratamento de erro para o DSN"""
    url = os.environ.get('DATABASE_URL')
    if not url:
        raise ValueError("A variável DATABASE_URL não foi encontrada. Verifique o painel do Render!")
    return psycopg2.connect(url)

HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 
FUSO_LOCAL = timezone(timedelta(hours=-3))
_LEMBRETES_SCHEMA_READY = False
_LEMBRETES_SCHEMA_LOCK = threading.Lock()


def garantir_tabela_lembretes_funcionario():
    global _LEMBRETES_SCHEMA_READY
    if _LEMBRETES_SCHEMA_READY:
        return

    with _LEMBRETES_SCHEMA_LOCK:
        if _LEMBRETES_SCHEMA_READY:
            return
        criada = executar_query("""
            CREATE TABLE IF NOT EXISTS public.lembretes_funcionario (
                id_lembrete BIGSERIAL PRIMARY KEY,
                id_funcionario UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
                titulo VARCHAR(180) NOT NULL,
                tipo VARCHAR(30) NOT NULL DEFAULT 'tarefa_interna'
                    CHECK (tipo IN ('cliente_fixo', 'retorno', 'tarefa_interna')),
                cliente_nome VARCHAR(160),
                nome_pet VARCHAR(120),
                data_lembrete DATE NOT NULL,
                hora_lembrete TIME,
                descricao TEXT,
                concluido BOOLEAN NOT NULL DEFAULT FALSE,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        if criada is None:
            raise RuntimeError("Não foi possível garantir a tabela de lembretes.")
        indice_criado = executar_query("""
            CREATE INDEX IF NOT EXISTS idx_lembretes_funcionario_data
            ON public.lembretes_funcionario (id_funcionario, data_lembrete)
        """)
        if indice_criado is None:
            raise RuntimeError("Não foi possível garantir o índice dos lembretes.")
        _LEMBRETES_SCHEMA_READY = True


def validar_acesso_lembretes(id_funcionario):
    try:
        id_normalizado = str(UUID(str(id_funcionario)))
    except (TypeError, ValueError, AttributeError):
        return None

    perfis = executar_query(
        """SELECT id FROM public.perfis
           WHERE id = %s AND role IN ('funcionario', 'admin')
             AND COALESCE(ativo, true) = true""",
        (id_normalizado,)
    )
    if perfis is None:
        raise RuntimeError("Não foi possível validar o perfil do funcionário.")
    return id_normalizado if perfis else None


def normalizar_lembrete(dados, parcial=False):
    campos = {}
    erros = []

    if not parcial or 'titulo' in dados:
        titulo = str(dados.get('titulo') or '').strip()
        if not titulo:
            erros.append('Informe o título do lembrete.')
        else:
            campos['titulo'] = titulo[:180]

    if not parcial or 'tipo' in dados:
        tipo = str(dados.get('tipo') or 'tarefa_interna').strip().lower()
        if tipo not in {'cliente_fixo', 'retorno', 'tarefa_interna'}:
            erros.append('Tipo de lembrete inválido.')
        else:
            campos['tipo'] = tipo

    for origem, destino, limite in (
        ('cliente_nome', 'cliente_nome', 160),
        ('nome_pet', 'nome_pet', 120),
        ('descricao', 'descricao', None)
    ):
        if not parcial or origem in dados:
            valor = str(dados.get(origem) or '').strip() or None
            campos[destino] = valor[:limite] if valor and limite else valor

    if not parcial or 'data_lembrete' in dados:
        try:
            campos['data_lembrete'] = datetime.strptime(
                str(dados.get('data_lembrete') or ''), '%Y-%m-%d'
            ).date()
        except ValueError:
            erros.append('Data do lembrete inválida.')

    if not parcial or 'hora_lembrete' in dados:
        valor_hora = str(dados.get('hora_lembrete') or '').strip()
        if valor_hora:
            try:
                campos['hora_lembrete'] = time.fromisoformat(valor_hora)
            except ValueError:
                erros.append('Horário do lembrete inválido.')
        else:
            campos['hora_lembrete'] = None

    if 'concluido' in dados:
        if not isinstance(dados['concluido'], bool):
            erros.append('Estado de conclusão inválido.')
        else:
            campos['concluido'] = dados['concluido']

    return campos, erros


def serializar_lembrete_sql():
    return """id_lembrete, titulo, tipo, cliente_nome, nome_pet,
              to_char(data_lembrete, 'YYYY-MM-DD') AS data_lembrete,
              to_char(hora_lembrete, 'HH24:MI') AS hora_lembrete,
              descricao, concluido"""

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/busca')
def busca():
    return send_from_directory(FRONTEND_DIR, 'busca.html')

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

@app.route('/api/login', methods=['POST'])
def login():
    try:
        dados = request.get_json(silent=True) or {}
        email = (dados.get('email') or '').lower().strip()
        senha = dados.get('senha')
        if not email or not isinstance(senha, str) or not senha:
            return jsonify({"error": "E-mail e senha são obrigatórios."}), 400
        
        user = executar_query("SELECT id, nome_completo, senha, role, ativo FROM public.perfis WHERE email = %s", (email,))
        
        if not user:
            return jsonify({"error": "Credenciais inválidas"}), 401
            
        usuario = user[0]
        if not usuario.get('ativo', True):
            return jsonify({"error": "Conta desativada."}), 403
        senha_salva = usuario.get('senha')
        if not isinstance(senha_salva, str) or not senha_salva:
            return jsonify({"error": "Credenciais inválidas"}), 401
        
        # 1. Tenta verificar se é um Hash (Agora aceita pbkdf2 e scrypt)
        if senha_salva.startswith(('pbkdf2:', 'scrypt:')):
            senha_valida = check_password_hash(senha_salva, senha)
        else:
            # 2. Se não for hash, compara direto (senhas velhas em texto puro)
            senha_valida = (senha_salva == senha)
            
        if senha_valida:
            return jsonify({
                "id": str(usuario['id']),
                "nome": usuario['nome_completo'],
                "role": usuario['role']
            }), 200
            
        return jsonify({"error": "Credenciais inválidas"}), 401
            
    except Exception as e:
        print(f"❌ ERRO NO LOGIN: {e}")
        return jsonify({"error": "Erro interno."}), 500
    
@app.route('/api/auth/cadastro', methods=['POST'])
def criar_conta():
    try:
        d = request.get_json(silent=True) or {}
        nome = (d.get('nome_completo') or '').strip()
        email = (d.get('email') or '').lower().strip()
        senha = d.get('senha')
        if not nome or not email or not isinstance(senha, str) or not senha:
            return jsonify({"error": "Nome, e-mail e senha são obrigatórios."}), 400

        # 1. Verifica se o e-mail já existe
        existe = executar_query("SELECT id FROM public.perfis WHERE email = %s", (email,))
        if existe:
            return jsonify({"error": "Este e-mail já está cadastrado. Tente fazer login."}), 409

        # 2. Gera a senha protegida (Hash)
        hash_senha = generate_password_hash(senha)

        # 3. Insere no banco
        # Note que adicionei 'cliente' como role padrão e ativo como true
        sql = """
            INSERT INTO public.perfis (nome_completo, email, senha, role, ativo)
            VALUES (%s, %s, %s, 'cliente', true)
        """
        executar_query(sql, (nome, email, hash_senha))
        
        return jsonify({"mensagem": "Conta criada com sucesso!"}), 201

    except Exception as e:
        print(f"❌ ERRO NO CADASTRO: {e}")
        return jsonify({"error": "Erro interno ao criar conta."}), 500
    
@app.route('/api/auth/sync-perfil', methods=['POST'])
def sync_perfil():
    try:
        dados = request.get_json(silent=True) or {}
        email = dados.get('email', '').lower().strip()
        nome = dados.get('nome', 'Cliente')

        if not email:
            return jsonify({"error": "E-mail obrigatório."}), 400

        # 1. Busca o usuário na tabela public.perfis (mantendo o UUID original de pets/agendamentos)
        usuario = executar_query(
            "SELECT id, nome_completo, role, ativo FROM public.perfis WHERE email = %s",
            (email,)
        )

        if usuario:
            u = usuario[0]
            if not u.get('ativo', True):
                return jsonify({"error": "Conta desativada."}), 403
            return jsonify({
                "id": str(u['id']),
                "nome": u['nome_completo'],
                "role": u['role']
            }), 200

        # 2. Se for primeiro acesso (ex: via Google), cria o perfil vinculado ao e-mail
        sql_insert = """
            INSERT INTO public.perfis (nome_completo, email, senha, role, ativo)
            VALUES (%s, %s, 'NEON_AUTH_MANAGED', 'cliente', true)
        """
        executar_query(sql_insert, (nome, email))

        novo_usuario = executar_query(
            "SELECT id, nome_completo, role FROM public.perfis WHERE email = %s",
            (email,)
        )
        u = novo_usuario[0]
        return jsonify({
            "id": str(u['id']),
            "nome": u['nome_completo'],
            "role": u['role']
        }), 201

    except Exception as e:
        print(f"❌ ERRO NO SYNC PERFIL: {e}")
        return jsonify({"error": "Erro interno ao sincronizar perfil."}), 500

@app.route('/api/auth/validar-cpf', methods=['POST'])
def validar_cpf_funcionario():
    dados = request.get_json(silent=True) or {}
    cpf = re.sub(r"\D", "", str(dados.get('cpf') or ''))
    if not cpf_valido(cpf):
        return jsonify({"autorizado": False}), 200

    try:
        usuarios = executar_query(
            """SELECT id, nome_completo FROM public.perfis
               WHERE regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = %s
                 AND role IN ('funcionario', 'admin')
                 AND COALESCE(ativo, true) = true
               LIMIT 1""",
            (cpf,)
        )
        if not usuarios:
            return jsonify({"autorizado": False}), 200

        usuario = usuarios[0]
        return jsonify({
            "autorizado": True,
            "id_funcionario": str(usuario['id']),
            "nome": usuario['nome_completo']
        }), 200
    except Exception as e:
        print(f"Erro ao validar CPF de funcionário: {e}")
        return jsonify({"error": "Falha ao validar assinatura."}), 500

@app.route('/api/auth/verificar-admin/<id_usuario>', methods=['GET'])
def verificar_admin(id_usuario):
    try:
        usuarios = executar_query(
            "SELECT role, ativo FROM public.perfis WHERE id = %s",
            (id_usuario,)
        )
        is_admin = bool(usuarios and usuarios[0]['role'] == 'admin' and usuarios[0].get('ativo', True))
        return jsonify({"isAdmin": is_admin}), 200
    except Exception as e:
        print(f"Erro ao verificar administrador: {e}")
        return jsonify({"error": "Falha ao verificar permissões."}), 500

@app.route('/api/auth/verificar-role/<id_usuario>', methods=['GET'])
def verificar_role(id_usuario):
    try:
        usuarios = executar_query(
            "SELECT role, ativo FROM public.perfis WHERE id = %s",
            (id_usuario,)
        )
        if not usuarios or not usuarios[0].get('ativo', True):
            return jsonify({"error": "Usuário não encontrado ou desativado."}), 404
        return jsonify({"role": usuarios[0]['role']}), 200
    except Exception as e:
        print(f"Erro ao consultar cargo: {e}")
        return jsonify({"error": "Falha ao verificar cargo."}), 500

@app.route('/api/recuperar-senha', methods=['POST'])
def solicitar_recuperacao():
    dados = request.get_json()
    email = dados.get('email', '').lower().strip()
    
    # Gera um código aleatório de 6 dígitos
    codigo = ''.join(random.choices(string.digits, k=6))
    
    # Salva o código no banco vinculado ao e-mail
    sql = "UPDATE public.perfis SET codigo_recuperacao = %s WHERE email = %s"
    resultado = executar_query(sql, (codigo, email))
    
    # Aqui você imprimiria o código no console para testes ou enviaria por e-mail no futuro
    print(f"🔑 CÓDIGO DE RECUPERAÇÃO PARA {email}: {codigo}")
    
    return jsonify({"mensagem": "Código gerado com sucesso!"}), 200

@app.route('/api/redefinir-senha', methods=['POST'])
def redefinir_senha():
    dados = request.get_json()
    email = dados.get('email', '').lower().strip()
    codigo = dados.get('codigo')
    nova_senha = dados.get('nova_senha')
    
    # Valida se o código confere
    user = executar_query("SELECT id FROM public.perfis WHERE email = %s AND codigo_recuperacao = %s", (email, codigo))
    
    if not user:
        return jsonify({"error": "Código inválido ou expirado."}), 401
    
    # Atualiza a senha e limpa o código
    hash_senha = generate_password_hash(nova_senha)
    sql = "UPDATE public.perfis SET senha = %s, codigo_recuperacao = NULL WHERE email = %s"
    executar_query(sql, (hash_senha, email))
    
    return jsonify({"mensagem": "Senha alterada com sucesso!"}), 200

@app.route('/api/auth/google-sync', methods=['POST'])
def google_sync():
    try:
        dados = request.get_json()
        email = dados.get('email', '').lower().strip()
        nome = dados.get('nome', 'Usuário Google')

        if not email:
            return jsonify({"error": "E-mail não fornecido pelo Google."}), 400

        usuario = executar_query("SELECT id, nome_completo, role FROM public.perfis WHERE email = %s", (email,))
        if usuario:
            u = usuario[0]
            return jsonify({"id": u['id'], "nome": u['nome_completo'], "role": u['role']}), 200

        sql_insert = """
            INSERT INTO public.perfis (nome_completo, email, senha, role, ativo)
            VALUES (%s, %s, 'GOOGLE_AUTH', 'cliente', true)
        """
        executar_query(sql_insert, (nome, email))

        novo_usuario = executar_query("SELECT id, nome_completo, role FROM public.perfis WHERE email = %s", (email,))
        u = novo_usuario[0]
        return jsonify({"id": u['id'], "nome": u['nome_completo'], "role": u['role']}), 201

    except Exception as e:
        print(f"❌ ERRO NO GOOGLE SYNC: {e}")
        return jsonify({"error": "Erro interno ao sincronizar conta Google."}), 500

@app.route('/api/usuario/dados/<id_usuario>', methods=['GET'])
def get_dados_usuario(id_usuario):
    conn = None
    cur = None
    try:
        # Log para ver o que está a chegar no backend (olha o terminal do Render!)
        print(f"DEBUG: Buscando dados para ID: {id_usuario}")
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Ajuste: usamos a query de forma segura
        query = 'SELECT nome_completo, telefone, email, role FROM public.perfis WHERE id = %s'
        cur.execute(query, (id_usuario,))
        
        usuario = cur.fetchone()
        
        if usuario:
            return jsonify(usuario), 200
        else:
            print(f"DEBUG: Usuário {id_usuario} não encontrado na tabela.")
            return jsonify({"error": "Usuário não encontrado"}), 404
            
    except Exception as e:
        print(f"❌ Erro crítico na API de dados do usuário: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/usuario/agendamentos/<id_usuario>', methods=['GET'])
@app.route('/api/agendamentos/cliente/<id_usuario>', methods=['GET']) 
def get_agendamentos_usuario(id_usuario):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT a.id_agendamento, 
                   a.id_loja,
                   a.id_servico,
                   to_char(a.data_hora_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_hora_inicio,
                   to_char(a.data_hora_fim, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_hora_fim,
                   a.valor_cobrado,
                   a.status,
                   a.observacoes_cliente,
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

@app.route('/api/perfil/atualizar', methods=['PUT'])
def atualizar_perfil():
    dados = request.get_json(silent=True) or {}
    id_usuario = dados.get('id')
    nome = (dados.get('nome_completo') or '').strip()
    telefone = (dados.get('telefone') or '').strip()
    if not id_usuario or not nome:
        return jsonify({"error": "ID e nome são obrigatórios."}), 400

    try:
        atualizado = executar_query(
            """UPDATE public.perfis SET nome_completo = %s, telefone = %s
               WHERE id = %s RETURNING id""",
            (nome, telefone or None, id_usuario)
        )
        if not atualizado:
            return jsonify({"error": "Usuário não encontrado."}), 404
        return jsonify({"message": "Perfil atualizado com sucesso."}), 200
    except Exception as e:
        print(f"Erro ao atualizar perfil: {e}")
        return jsonify({"error": "Falha ao atualizar perfil."}), 500

@app.route('/api/agendamentos/cancelar/<id_agendamento>', methods=['PUT'])
def cancelar_agendamento_cliente(id_agendamento):
    try:
        atualizado = executar_query(
            """UPDATE public.agendamentos SET status = 'cancelado'
               WHERE id_agendamento = %s AND status = 'pendente'
               RETURNING id_agendamento""",
            (id_agendamento,)
        )
        if not atualizado:
            return jsonify({"error": "Agendamento não encontrado ou não pode ser cancelado."}), 404
        return jsonify({"message": "Agendamento cancelado com sucesso."}), 200
    except Exception as e:
        print(f"Erro ao cancelar agendamento do cliente: {e}")
        return jsonify({"error": "Falha ao cancelar agendamento."}), 500



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


# Mude get_admin_stats para remover a busca de faturamento
@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        # Faturamento removido pois não há mais pedidos
        res_agendamentos = executar_query('SELECT COUNT(*) as total FROM public.agendamentos')
        total_agendamentos = res_agendamentos[0]['total'] if res_agendamentos else 0

        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0

        res_pets = executar_query("SELECT COUNT(*) as total FROM public.pets")
        total_pets = res_pets[0]['total'] if res_pets else 0
        
        return jsonify({
            "faturamento": 0.0, # Faturamento agora é zero (sem pedidos)
            "total_agendamentos": total_agendamentos,
            "total_clientes": total_clientes,
            "total_pets": total_pets
        }), 200
    except Exception as e:
        return jsonify({"error": "Falha ao carregar estatísticas"}), 500

# Mude dashboard_completo para remover faturamento e pedidos
@app.route('/api/admin/dashboard-completo', methods=['GET'])
def dashboard_completo():
    try:
        res_hoje = executar_query("SELECT COUNT(*) as total FROM public.agendamentos WHERE CAST(data_hora_inicio AS DATE) = CURRENT_DATE")
        agendamentos_hoje = res_hoje[0]['total'] if res_hoje else 0
        
        res_pets = executar_query("SELECT COUNT(*) as total FROM public.pets")
        total_pets = res_pets[0]['total'] if res_pets else 0
        
        res_clientes = executar_query("SELECT COUNT(*) as total FROM public.perfis WHERE role = 'cliente'")
        total_clientes = res_clientes[0]['total'] if res_clientes else 0
        
        # Estoque permanece pois pode ser útil para controle interno (baixa manual)
        estoque_critico = executar_query("SELECT nome_produto, quantidade_estoque FROM public.produtos WHERE quantidade_estoque < 5 LIMIT 5")
        
        return jsonify({
            "stats": {
                "faturamento": 0.0,
                "total_agendamentos": agendamentos_hoje,
                "total_pets": total_pets,
                "total_clientes": total_clientes
            },
            "agendamentos": [], # Removido histórico de pedidos daqui
            "estoque_critico": estoque_critico if estoque_critico else [],
            "graficos": [0, 0, 0, 0] 
        }), 200
    except Exception as e:
        return jsonify({"error": "Falha no painel administrativo"}), 500

@app.route('/api/admin/agendamentos', methods=['GET'])
def buscar_todos_agendamentos():
    try:
        
        servico_id = request.args.get('servico')
        funcionario_id = request.args.get('funcionario')
        status_filtro = request.args.get('status')

        base_query = '''
            SELECT 
                a.id_agendamento,
                a.id_cliente,
                a.id_loja,
                a.id_servico,
                a.data_hora_inicio, 
                a.data_hora_fim,
                a.status, 
                a.valor_cobrado,
                a.observacoes_cliente,
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

        busca = request.args.get('busca', '').strip()
        if busca:
            termo_busca = f"%{busca}%"
            base_query += " AND (per.nome_completo ILIKE %s OR p.nome_pet ILIKE %s OR s.nome_servico ILIKE %s)"
            params.extend([termo_busca, termo_busca, termo_busca])
            
        base_query += " ORDER BY a.data_hora_inicio ASC"
        
        agendamentos = executar_query(base_query, tuple(params))
        
        return jsonify(agendamentos if agendamentos else []), 200
        
    except Exception as e:
        print(f"Erro na listagem administrativa de agendamentos: {e}")
        return jsonify({"error": "Falha ao carregar lista de agendamentos"}), 500

def _agendamento_disponivel(id_loja, inicio, fim, id_funcionario=None, ignorar_id=None):
    agora = datetime.now(FUSO_LOCAL).replace(tzinfo=None)
    if inicio <= agora or inicio.time() < time(9, 0) or fim.time() > time(18, 0):
        return False
    if inicio.minute != 0 or inicio.second != 0 or inicio.microsecond != 0:
        return False

    sql = """SELECT id_agendamento FROM public.agendamentos
             WHERE id_loja = %s
               AND COALESCE(status, '') <> 'cancelado'
               AND data_hora_inicio < %s
               AND data_hora_fim > %s"""
    params = [id_loja, fim, inicio]
    if ignorar_id:
        sql += " AND id_agendamento <> %s"
        params.append(ignorar_id)
    if executar_query(sql + " LIMIT 1", tuple(params)):
        return False

    bloqueios = executar_query(
        """SELECT id_bloqueio FROM public.dias_bloqueados
           WHERE data_bloqueada = %s
             AND (id_loja IS NULL OR id_loja = %s)
             AND (id_funcionario IS NULL OR id_funcionario = %s)
           LIMIT 1""",
        (inicio.date(), id_loja, id_funcionario)
    )
    return not bloqueios

@app.route('/api/agendamentos/cliente/<id_agendamento>/solicitar-alteracao', methods=['PUT'])
def atualizar_agendamento_cliente(id_agendamento):
    dados = request.get_json(silent=True) or {}
    id_cliente = dados.get('id_cliente')
    acao = str(dados.get('acao') or '').strip().lower()
    if not id_cliente or acao not in {'cancelar', 'remarcar', 'alterar_horario'}:
        return jsonify({"error": "Cliente e ação válida são obrigatórios."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT a.id_agendamento, a.id_cliente, a.id_loja, a.id_servico,
                      a.id_funcionario, a.data_hora_inicio, a.status,
                      s.duracao_media_minutos
               FROM public.agendamentos a
               JOIN public.servicos s ON s.id_servico = a.id_servico
               WHERE a.id_agendamento = %s AND a.id_cliente = %s
               FOR UPDATE OF a""",
            (id_agendamento, id_cliente)
        )
        agendamento = cur.fetchone()
        if not agendamento:
            return jsonify({"error": "Agendamento não encontrado para este cliente."}), 404
        if str(agendamento['status'] or '').lower() not in {'pendente', 'confirmado'}:
            return jsonify({"error": "Somente agendamentos pendentes ou confirmados podem ser alterados."}), 409

        motivo = str(dados.get('motivo') or '').strip()[:500]
        agora = datetime.now(FUSO_LOCAL).strftime('%d/%m/%Y %H:%M')
        inicio_atual = agendamento['data_hora_inicio']

        if acao == 'cancelar':
            detalhe = f"Motivo: {motivo}" if motivo else "Sem motivo informado."
            observacao = f"[Solicitação cliente: CANCELAMENTO] {agora} — {detalhe}"
            cur.execute(
                """UPDATE public.agendamentos
                   SET status = 'cancelado',
                       observacoes_cliente = concat_ws(E'\\n', NULLIF(observacoes_cliente, ''), %s)
                   WHERE id_agendamento = %s""",
                (observacao, id_agendamento)
            )
            conn.commit()
            return jsonify({"status": "sucesso", "mensagem": "Agendamento cancelado."}), 200

        novo_inicio = parse_data_hora(dados.get('data_hora_inicio'))
        if not novo_inicio:
            return jsonify({"error": "Informe a nova data e horário."}), 400
        if novo_inicio == inicio_atual:
            return jsonify({"error": "Escolha um horário diferente do atual."}), 400

        duracao = agendamento['duracao_media_minutos'] or 30
        novo_fim = novo_inicio + timedelta(minutes=duracao)

        cur.execute(
            "SELECT id_loja FROM public.lojas WHERE id_loja = %s FOR UPDATE",
            (agendamento['id_loja'],)
        )
        if not cur.fetchone():
            return jsonify({"error": "Unidade do agendamento não encontrada."}), 404

        if not _agendamento_disponivel(
            agendamento['id_loja'],
            novo_inicio,
            novo_fim,
            agendamento['id_funcionario'],
            id_agendamento
        ):
            return jsonify({"error": "O novo horário não está disponível."}), 409

        cur.execute(
            """SELECT id_agendamento
               FROM public.agendamentos
               WHERE id_loja = %s
                 AND id_agendamento <> %s
                 AND COALESCE(status, '') <> 'cancelado'
                 AND data_hora_inicio < %s
                 AND data_hora_fim > %s
               LIMIT 1""",
            (agendamento['id_loja'], id_agendamento, novo_fim, novo_inicio)
        )
        if cur.fetchone():
            return jsonify({"error": "Este horário acabou de ser reservado."}), 409

        tipo_solicitacao = 'REMARCAÇÃO' if acao == 'remarcar' else 'ALTERAÇÃO DE HORÁRIO'
        detalhe = (
            f"De {inicio_atual.strftime('%d/%m/%Y %H:%M')} para "
            f"{novo_inicio.strftime('%d/%m/%Y %H:%M')}."
        )
        if motivo:
            detalhe += f" Motivo: {motivo}"
        observacao = f"[Solicitação cliente: {tipo_solicitacao}] {agora} — {detalhe}"
        cur.execute(
            """UPDATE public.agendamentos
               SET data_hora_inicio = %s,
                   data_hora_fim = %s,
                   observacoes_cliente = concat_ws(E'\\n', NULLIF(observacoes_cliente, ''), %s)
               WHERE id_agendamento = %s""",
            (novo_inicio, novo_fim, observacao, id_agendamento)
        )
        conn.commit()
        return jsonify({"status": "sucesso", "mensagem": "Horário atualizado."}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erro ao atualizar agendamento do cliente: {e}")
        return jsonify({"error": "Não foi possível atualizar o agendamento."}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/admin/agendamentos/status', methods=['PUT'])
def atualizar_status_agendamento():
    dados = request.get_json(silent=True) or {}
    id_agendamento = dados.get('id_agendamento')
    status_recebido = str(dados.get('novo_status') or '').strip().lower()
    novo_status = {
        'pronto': 'concluido',
        'aguardando': 'pendente'
    }.get(status_recebido, status_recebido)
    if not id_agendamento or novo_status not in {'pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado'}:
        return jsonify({"error": "Agendamento ou status inválido."}), 400

    try:
        atualizado = executar_query(
            """UPDATE public.agendamentos
               SET status = %s, id_funcionario = COALESCE(%s, id_funcionario)
               WHERE id_agendamento = %s
               RETURNING id_agendamento""",
            (novo_status, dados.get('id_funcionario_acao'), id_agendamento)
        )
        if not atualizado:
            return jsonify({"error": "Agendamento não encontrado."}), 404
        return jsonify({"message": "Status atualizado."}), 200
    except Exception as e:
        print(f"Erro ao atualizar status: {e}")
        return jsonify({"error": "Falha ao atualizar status."}), 500

@app.route('/api/admin/atualizar-status-pedido/<id_agendamento>', methods=['PUT'])
def atualizar_status_agendamento_legacy(id_agendamento):
    dados = request.get_json(silent=True) or {}
    status_recebido = str(dados.get('status') or '').strip().lower()
    novo_status = {
        'pronto': 'concluido',
        'aguardando': 'pendente'
    }.get(status_recebido, status_recebido)
    if novo_status not in {'pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado'}:
        return jsonify({"error": "Status inválido."}), 400
    try:
        atualizado = executar_query(
            """UPDATE public.agendamentos SET status = %s
               WHERE id_agendamento = %s RETURNING id_agendamento""",
            (novo_status, id_agendamento)
        )
        if not atualizado:
            return jsonify({"error": "Agendamento não encontrado."}), 404
        return jsonify({"message": "Status atualizado."}), 200
    except Exception as e:
        print(f"Erro ao atualizar status legado: {e}")
        return jsonify({"error": "Falha ao atualizar status."}), 500

@app.route('/api/admin/agendamentos/rapido', methods=['POST'])
def criar_agendamento_rapido():
    dados = request.get_json(silent=True) or {}
    nome_pet = (dados.get('nome_pet') or '').strip()
    nome_cliente = (dados.get('nome_cliente') or '').strip()
    nome_servico = (dados.get('nome_servico') or '').strip()
    inicio = parse_data_hora(dados.get('data_hora_inicio'))
    if not all((nome_pet, nome_cliente, nome_servico, inicio)):
        return jsonify({"error": "Tutor, pet, serviço e horário são obrigatórios."}), 400

    try:
        clientes = executar_query(
            "SELECT id FROM public.perfis WHERE nome_completo ILIKE %s AND role = 'cliente' ORDER BY nome_completo LIMIT 1",
            (nome_cliente,)
        )
        servicos = executar_query(
            "SELECT id_servico, preco_servico, duracao_media_minutos FROM public.servicos WHERE nome_servico ILIKE %s AND ativo = true LIMIT 1",
            (nome_servico,)
        )
        lojas = executar_query("SELECT id_loja FROM public.lojas WHERE ativo = true ORDER BY id_loja LIMIT 1")
        if not clientes or not servicos or not lojas:
            return jsonify({"error": "Tutor, serviço ou unidade não encontrado."}), 404

        pets = executar_query(
            "SELECT id_pet FROM public.pets WHERE id_tutor = %s AND nome_pet ILIKE %s LIMIT 1",
            (clientes[0]['id'], nome_pet)
        )
        if not pets:
            return jsonify({"error": "Pet não encontrado para este tutor."}), 404

        servico = servicos[0]
        fim = inicio + timedelta(minutes=servico['duracao_media_minutos'] or 30)
        loja_id = lojas[0]['id_loja']
        funcionario_id = dados.get('id_funcionario_acao')
        if not _agendamento_disponivel(loja_id, inicio, fim, funcionario_id):
            return jsonify({"error": "Horário indisponível ou fora do expediente."}), 409

        novo = executar_query(
            """INSERT INTO public.agendamentos
               (id_cliente, id_pet, id_loja, id_servico, id_funcionario,
                data_hora_inicio, data_hora_fim, status, valor_cobrado)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'pendente', %s)
               RETURNING id_agendamento""",
            (clientes[0]['id'], pets[0]['id_pet'], loja_id, servico['id_servico'],
             funcionario_id, inicio, fim, servico['preco_servico'])
        )
        return jsonify({"id_agendamento": novo[0]['id_agendamento'], "message": "Agendamento criado."}), 201
    except Exception as e:
        print(f"Erro ao criar agendamento rápido: {e}")
        return jsonify({"error": "Falha ao criar agendamento."}), 500

@app.route('/api/admin/agendamentos/<id_agendamento>', methods=['PUT'])
def editar_agendamento_admin(id_agendamento):
    dados = request.get_json(silent=True) or {}
    inicio = parse_data_hora(dados.get('data_hora_inicio'))
    nome_servico = (dados.get('nome_servico') or '').strip()
    nome_pet = (dados.get('nome_pet') or '').strip()
    if not inicio or not nome_servico or not nome_pet:
        return jsonify({"error": "Pet, serviço e horário são obrigatórios."}), 400

    try:
        atual = executar_query(
            "SELECT id_cliente, id_loja FROM public.agendamentos WHERE id_agendamento = %s",
            (id_agendamento,)
        )
        if not atual:
            return jsonify({"error": "Agendamento não encontrado."}), 404
        servicos = executar_query(
            "SELECT id_servico, preco_servico, duracao_media_minutos FROM public.servicos WHERE nome_servico ILIKE %s AND ativo = true LIMIT 1",
            (nome_servico,)
        )
        pets = executar_query(
            "SELECT id_pet FROM public.pets WHERE id_tutor = %s AND nome_pet ILIKE %s LIMIT 1",
            (atual[0]['id_cliente'], nome_pet)
        )
        if not servicos or not pets:
            return jsonify({"error": "Pet ou serviço não encontrado."}), 404

        servico = servicos[0]
        fim = inicio + timedelta(minutes=servico['duracao_media_minutos'] or 30)
        funcionario_id = dados.get('id_funcionario_acao')
        if not _agendamento_disponivel(atual[0]['id_loja'], inicio, fim, funcionario_id, id_agendamento):
            return jsonify({"error": "Horário indisponível ou fora do expediente."}), 409
        atualizado = executar_query(
            """UPDATE public.agendamentos SET id_pet = %s, id_servico = %s,
                      id_funcionario = COALESCE(%s, id_funcionario),
                      data_hora_inicio = %s, data_hora_fim = %s, valor_cobrado = %s
               WHERE id_agendamento = %s RETURNING id_agendamento""",
            (pets[0]['id_pet'], servico['id_servico'], funcionario_id, inicio, fim,
             servico['preco_servico'], id_agendamento)
        )
        if not atualizado:
            return jsonify({"error": "Agendamento não encontrado."}), 404
        return jsonify({"message": "Agendamento atualizado."}), 200
    except Exception as e:
        print(f"Erro ao editar agendamento: {e}")
        return jsonify({"error": "Falha ao editar agendamento."}), 500

@app.route('/api/admin/lojas', methods=['GET'])
def listar_lojas_admin():
    try:

        lojas = executar_query('SELECT id_loja, nome_loja FROM public.lojas ORDER BY nome_loja')
        return jsonify(lojas if lojas else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/funcionarios', methods=['GET'])
def listar_funcionarios_admin():
    try:
        funcionarios = executar_query(
            """SELECT id, id AS id_funcionario, nome_completo,
                      nome_completo AS nome
               FROM public.perfis
               WHERE role IN ('funcionario', 'admin')
                 AND COALESCE(ativo, true) = true
               ORDER BY nome_completo"""
        )
        return jsonify(funcionarios), 200
    except Exception as e:
        print(f"Erro ao listar funcionários: {e}")
        return jsonify({"error": "Falha ao carregar funcionários."}), 500

@app.route('/api/admin/horarios-profissional', defaults={'id_profissional': None}, methods=['GET'])
@app.route('/api/admin/horarios-profissional/<id_profissional>', methods=['GET'])
def listar_horarios_profissional(id_profissional):
    id_profissional = id_profissional or request.args.get('id_funcionario')
    if not id_profissional:
        return jsonify({"error": "Funcionário obrigatório."}), 400
    try:
        horarios = executar_query(
            """SELECT dia_semana, is_folga, observacoes,
                      to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
                      to_char(hora_fim, 'HH24:MI') AS hora_fim
               FROM public.horarios_funcionarios
               WHERE id_funcionario = %s
               ORDER BY dia_semana""",
            (id_profissional,)
        )
        return jsonify(horarios), 200
    except Exception as e:
        print(f"Erro ao listar horários do funcionário: {e}")
        return jsonify({"error": "Falha ao carregar horários."}), 500

@app.route('/api/admin/horarios-profissional', defaults={'id_profissional': None}, methods=['POST'])
@app.route('/api/admin/horarios-profissional/<id_profissional>', methods=['POST'])
def salvar_horarios_profissional(id_profissional):
    dados = request.get_json(silent=True) or {}
    id_profissional = id_profissional or dados.get('id_funcionario')
    grade = dados.get('grade')
    if not id_profissional or not isinstance(grade, list):
        return jsonify({"error": "Funcionário e grade semanal são obrigatórios."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM public.horarios_funcionarios WHERE id_funcionario = %s",
            (id_profissional,)
        )
        for horario in grade:
            if not isinstance(horario, dict) or not horario.get('dia_semana'):
                raise ValueError("Dia da semana inválido.")
            cur.execute(
                """INSERT INTO public.horarios_funcionarios
                   (id_funcionario, dia_semana, is_folga, hora_inicio, hora_fim, observacoes)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    id_profissional,
                    horario['dia_semana'],
                    bool(horario.get('is_folga')),
                    horario.get('hora_inicio') or None,
                    horario.get('hora_fim') or None,
                    horario.get('observacoes') or None
                )
            )
        conn.commit()
        return jsonify({"message": "Horários atualizados com sucesso."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erro ao salvar horários do funcionário: {e}")
        return jsonify({"error": "Falha ao salvar horários."}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/admin/ausencias-profissional', defaults={'id_profissional': None}, methods=['GET'])
@app.route('/api/admin/ausencias-profissional/<id_profissional>', methods=['GET'])
def listar_ausencias_profissional(id_profissional):
    id_profissional = id_profissional or request.args.get('id_funcionario')
    if not id_profissional:
        return jsonify({"error": "Funcionário obrigatório."}), 400
    try:
        ausencias = executar_query(
            """SELECT id_bloqueio, data_bloqueada, motivo
               FROM public.dias_bloqueados
               WHERE id_funcionario = %s
               ORDER BY data_bloqueada DESC""",
            (id_profissional,)
        )
        return jsonify(ausencias), 200
    except Exception as e:
        print(f"Erro ao listar ausências do funcionário: {e}")
        return jsonify({"error": "Falha ao carregar ausências."}), 500

def _criar_ausencia(dados, id_profissional=None):
    data_bloqueada = dados.get('data')
    if not data_bloqueada:
        return jsonify({"error": "A data da ausência é obrigatória."}), 400

    funcionario = id_profissional or dados.get('id_funcionario')
    loja = dados.get('id_loja')
    loja = None if loja in (None, '', 'ALL') else loja
    inserido = executar_query(
        """INSERT INTO public.dias_bloqueados
           (id_funcionario, id_loja, data_bloqueada, motivo)
           VALUES (%s, %s, %s, %s)
           RETURNING id_bloqueio""",
        (funcionario, loja, data_bloqueada, dados.get('motivo'))
    )
    return jsonify({"message": "Ausência registrada.", "id_bloqueio": inserido[0]['id_bloqueio']}), 201

@app.route('/api/admin/ausencias-profissional', defaults={'id_profissional': None}, methods=['POST'])
@app.route('/api/admin/ausencias-profissional/<id_profissional>', methods=['POST'])
def criar_ausencia_profissional(id_profissional):
    dados = request.get_json(silent=True) or {}
    id_profissional = id_profissional or dados.get('id_funcionario')
    if not id_profissional:
        return jsonify({"error": "Funcionário obrigatório."}), 400
    try:
        return _criar_ausencia(dados, id_profissional)
    except Exception as e:
        print(f"Erro ao salvar ausência do funcionário: {e}")
        return jsonify({"error": "Falha ao salvar ausência."}), 500


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
        
        termo = request.args.get('q', '').strip()
        categoria = request.args.get('categoria', '')
        marca = request.args.get('marca', '')
        preco_min = request.args.get('preco_min')
        preco_max = request.args.get('preco_max')

    
        sql = """
            SELECT id_produto, nome_produto, url_imagem, tipo_produto, 
                   marca, preco::float, preco_promocional::float, quantidade_estoque, 
                   descricao, status_produto 
            FROM public.produtos 
            WHERE ativo = true AND status_produto = 'Ativo'
        """
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

        # Considera dinamicamente o preço promocional se ele for menor que o de tabela
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

@app.route('/api/admin/produtos/<id_produto>', methods=['DELETE'])
def excluir_produto(id_produto):
    try:
        executar_query('DELETE FROM public.produtos WHERE id_produto = %s', (id_produto,))
        return jsonify({"message": "Produto removido com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir produto {id_produto}: {e}")
        return jsonify({"error": "Não foi possível excluir o produto. Verifique se ele possui pedidos vinculados."}), 500

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
    dados = request.get_json(silent=True) or {}
    try:
        return _criar_ausencia(dados)
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
    dados = request.get_json(silent=True) or {}
    id_usuario = dados.get('id_usuario')
    novo_role = dados.get('novo_role')
    
    especialidade = dados.get('especialidade')
    salario = dados.get('salario')

    if not id_usuario or novo_role not in {'cliente', 'funcionario', 'admin'}:
        return jsonify({"error": "Dados incompletos"}), 400

    try:
        atualizado = executar_query(
            "UPDATE public.perfis SET role = %s WHERE id = %s RETURNING id",
            (novo_role, id_usuario)
        )
        if not atualizado:
            return jsonify({"error": "Usuário não encontrado."}), 404

        if novo_role in ['funcionario', 'admin']:

            existe_rh = executar_query("SELECT id_funcionario FROM public.funcionarios_detalhes WHERE id_perfil = %s", (id_usuario,))
            
            if not existe_rh and especialidade and salario:
                # Busca o nome dele na tabela perfis para preencher o RH
                perfil = executar_query("SELECT nome_completo FROM public.perfis WHERE id = %s", (id_usuario,))
                nome = perfil[0]['nome_completo'] if perfil else 'Sem Nome'
                
                sql_rh = """
                    INSERT INTO public.funcionarios_detalhes (id_perfil, nome, especialidade, salario)
                    VALUES (%s, %s, %s, %s)
                """
                executar_query(sql_rh, (id_usuario, nome, especialidade, salario))
                
        elif novo_role == 'cliente':
            executar_query("DELETE FROM public.funcionarios_detalhes WHERE id_perfil = %s", (id_usuario,))

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

@app.route('/api/produtos', methods=['GET'])
def listar_produtos_loja():
    """Retorna todos os produtos ativos do banco de dados Neon para a vitrine digital"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = """
            SELECT id_produto, nome_produto, url_imagem, tipo_produto, 
                   marca, preco::float, preco_promocional::float, quantidade_estoque, 
                   descricao, status_produto
            FROM public.produtos 
            WHERE ativo = true AND status_produto = 'Ativo'
            ORDER BY nome_produto ASC
        """
        cur.execute(sql)
        produtos = cur.fetchall()
        
        # Log para garantir que o backend está enviando os dados
        print(f"DEBUG: Backend enviando {len(produtos)} produtos.")
        return jsonify(produtos if produtos else []), 200
        
    except Exception as e:
        print(f"❌ ERRO AO LISTAR PRODUTOS: {e}")
        return jsonify({"error": "Falha interna ao carregar catálogo."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/produtos/<int:id_produto>/estoque', methods=['GET'])
def get_estoque_produto(id_produto):
    """Busca disponibilidade do produto em cada loja"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        tabela_resultado = executar_query(
            """SELECT CASE
                   WHEN to_regclass('public.estoque_lojas') IS NOT NULL THEN 'estoque_lojas'
                   WHEN to_regclass('public.estoque') IS NOT NULL THEN 'estoque'
                   ELSE NULL
               END AS tabela"""
        )
        tabela = tabela_resultado[0]['tabela'] if tabela_resultado else None
        if not tabela:
            return jsonify({"error": "Tabela de estoque por loja não encontrada."}), 500
        query = f"""SELECT l.nome_loja, e.quantidade
                    FROM public.{tabela} e
                    JOIN public.lojas l ON e.id_loja = l.id_loja
                    WHERE e.id_produto = %s"""
        cur.execute(query, (id_produto,))
        estoque = cur.fetchall()
        
        print(f"DEBUG: Estoque encontrado para produto {id_produto}: {estoque}")
        return jsonify(estoque if estoque else []), 200
        
    except Exception as e:
        print(f"❌ ERRO AO BUSCAR ESTOQUE: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/funcionario/lembretes', methods=['GET'])
def listar_lembretes_funcionario():
    try:
        id_funcionario = validar_acesso_lembretes(request.args.get('id_funcionario'))
        if not id_funcionario:
            return jsonify({"error": "Perfil de funcionário inválido."}), 403
        garantir_tabela_lembretes_funcionario()

        inicio = request.args.get('inicio')
        fim = request.args.get('fim')
        filtros = ['id_funcionario = %s']
        parametros = [id_funcionario]
        if inicio or fim:
            try:
                data_inicio = datetime.strptime(inicio or fim, '%Y-%m-%d').date()
                data_fim = datetime.strptime(fim or inicio, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Intervalo de datas inválido."}), 400
            if data_inicio > data_fim:
                return jsonify({"error": "O início do intervalo deve anteceder o fim."}), 400
            filtros.append('data_lembrete BETWEEN %s AND %s')
            parametros.extend([data_inicio, data_fim])

        lembretes = executar_query(
            f"SELECT {serializar_lembrete_sql()} FROM public.lembretes_funcionario "
            f"WHERE {' AND '.join(filtros)} ORDER BY data_lembrete, hora_lembrete NULLS LAST, titulo",
            tuple(parametros)
        )
        if lembretes is None:
            raise RuntimeError("A consulta de lembretes não foi concluída.")
        return jsonify(lembretes), 200
    except Exception as e:
        print(f"Erro ao listar lembretes do funcionário: {e}")
        return jsonify({"error": "Falha ao carregar lembretes."}), 500


@app.route('/api/funcionario/lembretes', methods=['POST'])
def criar_lembrete_funcionario():
    dados = request.get_json(silent=True) or {}
    try:
        id_funcionario = validar_acesso_lembretes(dados.get('id_funcionario'))
        if not id_funcionario:
            return jsonify({"error": "Perfil de funcionário inválido."}), 403
        campos, erros = normalizar_lembrete(dados)
        if erros:
            return jsonify({"error": erros[0]}), 400
        garantir_tabela_lembretes_funcionario()

        nomes = ', '.join(['id_funcionario', *campos.keys()])
        placeholders = ', '.join(['%s'] * (len(campos) + 1))
        inserido = executar_query(
            f"INSERT INTO public.lembretes_funcionario ({nomes}) "
            f"VALUES ({placeholders}) RETURNING {serializar_lembrete_sql()}",
            (id_funcionario, *campos.values())
        )
        if not inserido:
            raise RuntimeError("O banco não retornou o lembrete inserido.")
        return jsonify(inserido[0]), 201
    except Exception as e:
        print(f"Erro ao criar lembrete do funcionário: {e}")
        return jsonify({"error": "Falha ao salvar lembrete."}), 500


@app.route('/api/funcionario/lembretes/<int:id_lembrete>', methods=['PUT'])
def atualizar_lembrete_funcionario(id_lembrete):
    dados = request.get_json(silent=True) or {}
    try:
        id_funcionario = validar_acesso_lembretes(dados.get('id_funcionario'))
        if not id_funcionario:
            return jsonify({"error": "Perfil de funcionário inválido."}), 403
        campos, erros = normalizar_lembrete(dados, parcial=True)
        if erros:
            return jsonify({"error": erros[0]}), 400
        if not campos:
            return jsonify({"error": "Nenhuma alteração informada."}), 400
        garantir_tabela_lembretes_funcionario()

        atribuicoes = ', '.join(f'{campo} = %s' for campo in campos)
        atualizado = executar_query(
            f"UPDATE public.lembretes_funcionario SET {atribuicoes}, atualizado_em = NOW() "
            f"WHERE id_lembrete = %s AND id_funcionario = %s "
            f"RETURNING {serializar_lembrete_sql()}",
            (*campos.values(), id_lembrete, id_funcionario)
        )
        if atualizado is None:
            raise RuntimeError("A atualização do lembrete não foi concluída.")
        if not atualizado:
            return jsonify({"error": "Lembrete não encontrado."}), 404
        return jsonify(atualizado[0]), 200
    except Exception as e:
        print(f"Erro ao atualizar lembrete do funcionário: {e}")
        return jsonify({"error": "Falha ao atualizar lembrete."}), 500


@app.route('/api/funcionario/lembretes/<int:id_lembrete>', methods=['DELETE'])
def excluir_lembrete_funcionario(id_lembrete):
    try:
        id_funcionario = validar_acesso_lembretes(request.args.get('id_funcionario'))
        if not id_funcionario:
            return jsonify({"error": "Perfil de funcionário inválido."}), 403
        garantir_tabela_lembretes_funcionario()
        excluido = executar_query(
            "DELETE FROM public.lembretes_funcionario "
            "WHERE id_lembrete = %s AND id_funcionario = %s RETURNING id_lembrete",
            (id_lembrete, id_funcionario)
        )
        if excluido is None:
            raise RuntimeError("A exclusão do lembrete não foi concluída.")
        if not excluido:
            return jsonify({"error": "Lembrete não encontrado."}), 404
        return jsonify({"message": "Lembrete apagado."}), 200
    except Exception as e:
        print(f"Erro ao apagar lembrete do funcionário: {e}")
        return jsonify({"error": "Falha ao apagar lembrete."}), 500


@app.route('/api/estoque/consumo', methods=['POST'])
def registrar_consumo_estoque():
    dados = request.get_json(silent=True) or {}
    try:
        id_produto = dados.get('id_produto')
        quantidade = int(dados.get('quantidade', 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Produto ou quantidade inválida."}), 400
    if not id_produto or quantidade <= 0 or not dados.get('id_funcionario'):
        return jsonify({"error": "Produto, quantidade e funcionário são obrigatórios."}), 400

    try:
        atualizado = executar_query(
            """UPDATE public.produtos
               SET quantidade_estoque = COALESCE(quantidade_estoque, 0) - %s
               WHERE id_produto = %s
                 AND COALESCE(quantidade_estoque, 0) >= %s
               RETURNING id_produto, quantidade_estoque""",
            (quantidade, id_produto, quantidade)
        )
        if not atualizado:
            return jsonify({"error": "Produto inexistente ou estoque insuficiente."}), 409
        return jsonify({
            "message": "Consumo registrado.",
            "quantidade_estoque": atualizado[0]['quantidade_estoque']
        }), 200
    except Exception as e:
        print(f"Erro ao registrar consumo de estoque: {e}")
        return jsonify({"error": "Falha ao registrar consumo."}), 500
        

@app.route('/api/horarios-disponiveis', methods=['GET'])
def buscar_horarios_livres():
    """Retorna horários de início sem conflito para o serviço selecionado."""
    try:
        loja_id = request.args.get('loja_id')
        data_solicitada = request.args.get('data') # Formato: YYYY-MM-DD
        servico_id = request.args.get('servico_id')
        if not loja_id or not data_solicitada or not servico_id:
            return jsonify({"error": "Loja, serviço e data são obrigatórios."}), 400

        try:
            data = datetime.strptime(data_solicitada, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Data inválida; use YYYY-MM-DD."}), 400
        servicos = executar_query(
            "SELECT duracao_media_minutos FROM public.servicos WHERE id_servico = %s AND ativo = true",
            (servico_id,)
        )
        if not servicos:
            return jsonify({"error": "Serviço não encontrado."}), 404
        duracao = servicos[0]['duracao_media_minutos'] or 30

        grade_padrao = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
        horarios_livres = []
        for horario in grade_padrao:
            inicio = datetime.combine(data, datetime.strptime(horario, '%H:%M').time())
            fim = inicio + timedelta(minutes=duracao)
            if _agendamento_disponivel(loja_id, inicio, fim):
                horarios_livres.append(horario)
        return jsonify(horarios_livres), 200

    except Exception as e:
        print(f"❌ ERRO AO CALCULAR GRADE: {e}")
        return jsonify({"error": "Erro interno ao processar a grade."}), 500


@app.route('/api/agendar', methods=['POST'])
@app.route('/api/agendamentos', methods=['POST'])
def post_agendamento():
    """Valida a disponibilidade e grava o agendamento em uma transação."""
    conn = None
    cur = None
    try:
        d = request.get_json(silent=True) or {}
        if not d:
            return jsonify({"error": "Dados inválidos"}), 400

        id_cliente = d.get('id_cliente')
        id_servico = d.get('id_servico')
        id_loja = d.get('id_loja')
        inicio = parse_data_hora(d.get('data_hora_inicio'))
        if not id_cliente or not id_servico or not id_loja or not inicio:
            return jsonify({"error": "Cliente, serviço, unidade e horário são obrigatórios."}), 400

        servicos = executar_query(
            """SELECT preco_servico, duracao_media_minutos
               FROM public.servicos WHERE id_servico = %s AND ativo = true""",
            (id_servico,)
        )
        lojas = executar_query(
            "SELECT id_loja FROM public.lojas WHERE id_loja = %s AND ativo = true",
            (id_loja,)
        )
        if not servicos:
            return jsonify({"error": "Serviço não encontrado"}), 404
        if not lojas:
            return jsonify({"error": "Unidade não encontrada."}), 404

        servico = servicos[0]
        fim = inicio + timedelta(minutes=servico['duracao_media_minutos'] or 30)
        id_pet = d.get('id_pet')
        novo_pet = d.get('novo_pet')
        nome_novo_pet = str(novo_pet.get('nome') or '').strip() if isinstance(novo_pet, dict) else ''
        if id_pet:
            pets = executar_query(
                "SELECT id_pet FROM public.pets WHERE id_pet = %s AND id_tutor = %s",
                (id_pet, id_cliente)
            )
            if not pets:
                return jsonify({"error": "O pet não pertence ao cliente informado."}), 403
        elif not nome_novo_pet:
            return jsonify({"error": "Selecione um pet ou informe os dados do novo pet."}), 400

        if not _agendamento_disponivel(id_loja, inicio, fim):
            return jsonify({"error": "Horário indisponível, passado ou fora do expediente."}), 409

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id_loja FROM public.lojas WHERE id_loja = %s FOR UPDATE", (id_loja,))
        cur.execute(
            """SELECT id_agendamento FROM public.agendamentos
               WHERE id_loja = %s AND COALESCE(status, '') <> 'cancelado'
                 AND data_hora_inicio < %s AND data_hora_fim > %s
               LIMIT 1""",
            (id_loja, fim, inicio)
        )
        if cur.fetchone():
            conn.rollback()
            return jsonify({"error": "Este horário acabou de ser reservado."}), 409

        if not id_pet:
            cur.execute(
                """INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, porte)
                   VALUES (%s, %s, 'Cão', %s, %s) RETURNING id_pet""",
                     (id_cliente, nome_novo_pet, novo_pet.get('raca') or 'SRD', novo_pet.get('porte') or 'Médio')
            )
            id_pet = cur.fetchone()['id_pet']

        cur.execute("""
            INSERT INTO public.agendamentos 
            (id_cliente, id_pet, id_loja, id_servico, data_hora_inicio, data_hora_fim, status, valor_cobrado, observacoes_cliente)
            VALUES (%s, %s, %s, %s, %s, %s, 'pendente', %s, %s)
            RETURNING id_agendamento
        """, (id_cliente, id_pet, id_loja, id_servico, inicio, fim, servico['preco_servico'], d.get('observacoes', '')))
        id_agendamento = cur.fetchone()['id_agendamento']

        conn.commit()
        return jsonify({
            "status": "sucesso",
            "mensagem": "Agendamento confirmado!",
            "id_agendamento": str(id_agendamento)
        }), 201

    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ ERRO CRÍTICO NO AGENDAMENTO: {e}")
        return jsonify({"error": "Erro no servidor ao salvar agendamento."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/pet/<id_pet>/historico', methods=['GET'])
def get_historico_pet(id_pet):
    """Retorna a linha do tempo clínica do pet."""
    try:
        sql = "SELECT * FROM public.prontuarios WHERE id_pet = %s ORDER BY data_registro DESC"
        historico = executar_query(sql, (id_pet,))
        return jsonify(historico), 200
    except Exception as e:
        print(f"Erro ao buscar historico: {e}")
        return jsonify({"error": "Falha ao carregar prontuário"}), 500

@app.route('/api/perfis', methods=['GET'])
def buscar_perfis_para_prontuario():
    termo = request.args.get('busca', '').strip()
    if not termo:
        return jsonify([]), 200
    try:
        parametro = f"%{termo}%"
        perfis = executar_query(
            """SELECT pt.id_pet, pt.id_pet AS id, pt.nome_pet, pt.raca, pt.porte,
                      p.nome_completo AS nome_tutor, p.nome_completo AS nome_cliente,
                      p.email, p.cpf
               FROM public.pets pt
               JOIN public.perfis p ON p.id = pt.id_tutor
               WHERE pt.nome_pet ILIKE %s
                  OR p.nome_completo ILIKE %s
                  OR p.email ILIKE %s
                  OR COALESCE(p.cpf, '') ILIKE %s
               ORDER BY pt.nome_pet
               LIMIT 50""",
            (parametro, parametro, parametro, parametro)
        )
        return jsonify(perfis), 200
    except Exception as e:
        print(f"Erro ao buscar pacientes: {e}")
        return jsonify({"error": "Falha ao buscar pacientes."}), 500

@app.route('/api/pet/historico', methods=['POST'])
def criar_registro_prontuario():
    dados = request.get_json(silent=True) or {}
    id_pet = dados.get('id_pet')
    id_funcionario = dados.get('id_funcionario')
    categoria = (dados.get('categoria') or 'Consulta').strip()
    titulo = (dados.get('titulo') or categoria).strip()
    descricao = (dados.get('descricao') or '').strip()
    acao = dados.get('tipo_acao', 'adicionar')
    id_registro = dados.get('id_registro')
    if not id_pet or not id_funcionario:
        return jsonify({"error": "Pet e funcionário são obrigatórios."}), 400
    if acao not in ('adicionar', 'alterar', 'cancelar'):
        return jsonify({"error": "Ação de prontuário inválida."}), 400
    if acao == 'cancelar' and not id_registro:
        return jsonify({"error": "Identificador do registro obrigatório para cancelar."}), 400
    if acao in ('adicionar', 'alterar') and not descricao:
        return jsonify({"error": "A descrição clínica é obrigatória."}), 400

    try:
        if acao == 'adicionar':
            registro = executar_query(
                """INSERT INTO public.prontuarios
                   (id_pet, id_funcionario, categoria, titulo, descricao)
                   VALUES (%s, %s, %s, %s, %s)
                   RETURNING id_prontuario""",
                (id_pet, id_funcionario, categoria, titulo, descricao)
            )
            return jsonify({
                "message": "Registro clínico gravado.",
                "id_registro": registro[0]['id_prontuario']
            }), 201

        if acao == 'alterar':
            registro = executar_query(
                """UPDATE public.prontuarios
                   SET categoria = %s, titulo = %s, descricao = %s
                   WHERE id_prontuario = %s AND id_pet = %s
                   RETURNING id_prontuario""",
                (categoria, titulo, descricao, id_registro, id_pet)
            )
            if not registro:
                return jsonify({"error": "Registro médico não encontrado."}), 404
            return jsonify({"message": "Registro clínico atualizado."}), 200

        removido = executar_query(
            """DELETE FROM public.prontuarios
               WHERE id_prontuario = %s AND id_pet = %s
               RETURNING id_prontuario""",
            (id_registro, id_pet)
        )
        if not removido:
            return jsonify({"error": "Registro médico não encontrado."}), 404
        return jsonify({"message": "Registro clínico cancelado."}), 200
    except Exception as e:
        print(f"Erro ao gravar prontuário: {e}")
        return jsonify({"error": "Falha ao gravar prontuário."}), 500

if __name__ == '__main__':
    # Configuração vital para o Render (PORT) e escuta em 0.0.0.0
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta, debug=False)