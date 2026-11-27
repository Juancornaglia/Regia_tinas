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
);

CREATE INDEX IF NOT EXISTS idx_lembretes_funcionario_data
    ON public.lembretes_funcionario (id_funcionario, data_lembrete);
