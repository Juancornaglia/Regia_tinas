import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env que configuramos
load_dotenv()

# Puxa a URL do banco direto do ambiente (segurança máxima)
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Cria e retorna uma conexão com o banco de dados Neon."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        # Em produção, poderíamos logar isso em um arquivo
        print(f"Erro crítico ao conectar ao Neon: {e}")
        return None

def executar_query(sql, params=None):
    """
    Função mestre para interagir com o banco.
    Trata abertura, fechamento e commits automaticamente.
    """
    conn = get_db_connection()
    if not conn:
        return None
        
    resultado = None
    try:
        # Usamos o RealDictCursor para que os dados cheguem no JS como objetos fáceis de ler
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            
            # Se for uma busca, pegamos os dados
            if sql.strip().upper().startswith("SELECT"):
                resultado = cur.fetchall()
            else:
                # Se for Insert, Update ou Delete, salvamos a alteração
                conn.commit()
                resultado = True
    except Exception as e:
        print(f"Erro na execução da query: {e}")
        conn.rollback() # Cancela a operação em caso de erro para não corromper o banco
    finally:
        conn.close()
        
    return resultado