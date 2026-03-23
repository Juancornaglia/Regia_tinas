from flask import Blueprint, jsonify, request
from http import HTTPStatus
from db.neon_db import executar_query

# Define o Blueprint para rotas do usuário
api_usuario = Blueprint('api_usuario', __name__, url_prefix='/api/usuario')

# --- ROTA: CRUD de Pets (Listar e Cadastrar) ---
@api_usuario.route('/pets', methods=['GET', 'POST'])
def pets_usuario():
    # No GET, o frontend envia o ID do tutor na URL: /api/usuario/pets?cliente_id=123
    if request.method == 'GET':
        cliente_id = request.args.get('cliente_id')
        if not cliente_id: 
            return jsonify({"error": "ID do tutor não informado."}), HTTPStatus.BAD_REQUEST
        
        try:
            # Busca todos os pets vinculados ao ID do tutor no Neon
            sql = "SELECT * FROM public.pets WHERE id_tutor = %s ORDER BY nome_pet"
            pets = executar_query(sql, (cliente_id,))
            return jsonify(pets), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Erro ao carregar seus pets."}), HTTPStatus.INTERNAL_SERVER_ERROR

    # No POST, recebemos os dados do novo pet no corpo do JSON
    if request.method == 'POST':
        dados = request.get_json()
        if not dados: 
            return jsonify({"error": "Dados do pet vazios."}), HTTPStatus.BAD_REQUEST
        
        try:
            # Insere o novo pet no Neon
            sql = """
                INSERT INTO public.pets (id_tutor, nome_pet, especie, raca, idade, observacoes)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            valores = (
                dados['id_tutor'], 
                dados['nome_pet'], 
                dados.get('especie'), 
                dados.get('raca'), 
                dados.get('idade'), 
                dados.get('observacoes')
            )
            executar_query(sql, valores)
            return jsonify({"message": "Pet cadastrado com sucesso!"}), HTTPStatus.CREATED
        except Exception as e:
            return jsonify({"error": f"Erro ao inserir pet: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# --- ROTA: Atualizar e Deletar Pet por ID ---
@api_usuario.route('/pets/<int:pet_id>', methods=['PUT', 'DELETE'])
def pet_por_id(pet_id):
    
    if request.method == 'PUT':
        dados = request.get_json()
        try:
            sql = """
                UPDATE public.pets 
                SET nome_pet = %s, especie = %s, raca = %s, idade = %s, observacoes = %s
                WHERE id_pet = %s
            """
            valores = (
                dados['nome_pet'], 
                dados.get('especie'), 
                dados.get('raca'), 
                dados.get('idade'), 
                dados.get('observacoes'),
                pet_id
            )
            executar_query(sql, valores)
            return jsonify({"message": "Dados do pet atualizados!"}), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Erro ao atualizar pet."}), HTTPStatus.INTERNAL_SERVER_ERROR
    
    if request.method == 'DELETE':
        try:
            executar_query("DELETE FROM public.pets WHERE id_pet = %s", (pet_id,))
            return jsonify({"message": "Pet removido da sua conta."}), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Erro ao remover pet."}), HTTPStatus.INTERNAL_SERVER_ERROR