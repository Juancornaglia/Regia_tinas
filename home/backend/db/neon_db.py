import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv


# DADOS DE CONEXÃO DO NEON (Pegue no seu painel do Neon)
DATABASE_URL = "postgresql://neondb_owner:npg_BpzfNxMU5gu2@ep-fragrant-brook-a44jnssw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def conectar_db():
    return psycopg2.connect(DATABASE_URL)

def get_db_connection():
    try:
        # Cria a conexão com o Neon
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erro ao conectar ao Neon: {e}")
        return None

# Função auxiliar para facilitar as buscas
def executar_query(sql, params=None):
    conn = get_db_connection()
    if conn:
        # O cursor_factory=RealDictCursor faz os dados virem como dicionário (ex: {'nome': 'Ração'})
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        
        # Se for uma busca (SELECT), retorna os dados
        if sql.strip().upper().startswith("SELECT"):
            resultado = cur.fetchall()
        else:
            # Se for Insert/Update, salva no banco
            conn.commit()
            resultado = True
            
        cur.close()
        conn.close()
        return resultado
    return None