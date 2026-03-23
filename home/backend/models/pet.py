from typing import Optional
from uuid import UUID

class Pet:
    """
    Representa um animal de estimação na tabela 'pets' do Neon.
    Reflete as colunas: id_pet, id_tutor, nome_pet, raca, porte, etc.
    """
    def __init__(self,
                 id_pet: Optional[int],
                 id_tutor: UUID,
                 nome_pet: str,
                 especie: str,
                 raca: str,
                 porte: Optional[str] = None,
                 data_nascimento: Optional[str] = None, 
                 observacoes: Optional[str] = None):
        
        self.id_pet = id_pet
        self.id_tutor = id_tutor
        self.nome_pet = nome_pet
        self.especie = especie
        self.raca = raca
        self.porte = porte
        self.data_nascimento = data_nascimento
        self.observacoes = observacoes

    @classmethod
    def from_row(cls, row: dict):
        """
        Cria um objeto Pet a partir de um dicionário retornado pelo Neon (RealDictCursor).
        """
        return cls(
            id_pet=row.get('id_pet'),
            # Garante que o ID do tutor seja um objeto UUID válido
            id_tutor=UUID(str(row['id_tutor'])),
            nome_pet=row['nome_pet'],
            especie=row.get('especie', 'Não informada'),
            raca=row.get('raca', 'SRD'),
            porte=row.get('porte'),
            # No Neon, campos DATE vêm como objetos date; convertemos para string se necessário
            data_nascimento=str(row['data_nascimento']) if row.get('data_nascimento') else None,
            observacoes=row.get('observacoes')
        )

    def to_dict(self) -> dict:
        """
        Converte o objeto para um dicionário, ideal para enviar como JSON para o Frontend.
        """
        return {
            'id_pet': self.id_pet,
            'id_tutor': str(self.id_tutor),
            'nome_pet': self.nome_pet,
            'especie': self.especie,
            'raca': self.raca,
            'porte': self.porte,
            'data_nascimento': self.data_nascimento,
            'observacoes': self.observacoes,
        }

    def __repr__(self):
        return f"<Pet ID={self.id_pet} | Nome={self.nome_pet} | Espécie={self.especie}>"