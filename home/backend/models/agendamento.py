from datetime import datetime
from typing import Optional
from uuid import UUID

class Agendamento:
    """
    Representa um registro de agendamento na tabela 'agendamentos' do Neon.
    """
    def __init__(self,
                 id_agendamento: Optional[int],
                 id_cliente: UUID,
                 id_pet: Optional[int],
                 id_loja: int,
                 id_servico: int,
                 data_hora_inicio: datetime,
                 data_hora_fim: datetime,
                 status: str = 'pendente',
                 observacoes_cliente: Optional[str] = None,
                 data_criacao: Optional[datetime] = None):
        
        self.id_agendamento = id_agendamento
        self.id_cliente = id_cliente
        self.id_pet = id_pet
        self.id_loja = id_loja
        self.id_servico = id_servico
        self.data_hora_inicio = data_hora_inicio
        self.data_hora_fim = data_hora_fim
        self.status = status
        self.observacoes_cliente = observacoes_cliente
        self.data_criacao = data_criacao

    @classmethod
    def from_row(cls, row: dict):
        """
        Cria um objeto Agendamento a partir de um dicionário retornado pelo Neon (RealDictCursor).
        """
        # O PostgreSQL/Neon já costuma retornar objetos datetime prontos, 
        # mas adicionamos tratamento caso venham como string.
        inicio = row['data_hora_inicio']
        if isinstance(inicio, str):
            inicio = datetime.fromisoformat(inicio.replace('Z', '+00:00'))

        fim = row['data_hora_fim']
        if isinstance(fim, str):
            fim = datetime.fromisoformat(fim.replace('Z', '+00:00'))

        criacao = row.get('data_criacao')
        if isinstance(criacao, str):
            criacao = datetime.fromisoformat(criacao.replace('Z', '+00:00'))

        return cls(
            id_agendamento=row.get('id_agendamento'),
            id_cliente=UUID(str(row['id_cliente'])), # Garante conversão de string/UUID para objeto UUID
            id_pet=row.get('id_pet'),
            id_loja=row['id_loja'],
            id_servico=row['id_servico'],
            data_hora_inicio=inicio,
            data_hora_fim=fim,
            status=row.get('status', 'pendente'),
            observacoes_cliente=row.get('observacoes_cliente'),
            data_criacao=criacao
        )

    def to_dict(self) -> dict:
        """
        Converte o objeto para um dicionário para enviar como JSON para o Frontend.
        """
        return {
            'id_agendamento': self.id_agendamento,
            'id_cliente': str(self.id_cliente),
            'id_pet': self.id_pet,
            'id_loja': self.id_loja,
            'id_servico': self.id_servico,
            'data_hora_inicio': self.data_hora_inicio.isoformat(),
            'data_hora_fim': self.data_hora_fim.isoformat(),
            'status': self.status,
            'observacoes_cliente': self.observacoes_cliente,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

    def __repr__(self):
        return f"<Agendamento ID={self.id_agendamento} | Status={self.status} | Inicio={self.data_hora_inicio}>"