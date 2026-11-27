ALTER TABLE public.horarios_funcionarios
    ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.prontuarios
    ADD COLUMN IF NOT EXISTS id_prontuario uuid DEFAULT gen_random_uuid();

UPDATE public.prontuarios
SET id_prontuario = gen_random_uuid()
WHERE id_prontuario IS NULL;

ALTER TABLE public.prontuarios
    ALTER COLUMN id_prontuario SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prontuarios_id_prontuario
    ON public.prontuarios (id_prontuario);
