import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Carrega localmente, mas no Render ele usa o Painel Environment
load_dotenv()

# PEGA A URL DO AMBIENTE - SEM TEXTO MANUAL AQUI
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        # O SSLMODE é obrigatório para o Neon
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erro de conexão: {e}")
        return None

def executar_query(sql, params=None):
    conn = get_db_connection()
    if not conn:
        return None
    
    resultado = None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if cur.description is not None:
                resultado = cur.fetchall()
            conn.commit()
            if cur.description is None:
                resultado = True
    except Exception as e:
        print(f"Erro na query: {e}")
        conn.rollback()
    finally:
        conn.close()
    return resultado