ALTER TABLE vagas ADD COLUMN IF NOT EXISTS data_conclusao date;

CREATE OR REPLACE FUNCTION set_data_conclusao() RETURNS TRIGGER AS $
BEGIN
  IF lower(NEW.status) IN ('concluída', 'concluida', 'concluídas', 'concluidas')
     AND OLD.data_conclusao IS NULL THEN
    NEW.data_conclusao := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_data_conclusao ON vagas;
CREATE TRIGGER trg_set_data_conclusao
  BEFORE UPDATE ON vagas
  FOR EACH ROW EXECUTE FUNCTION set_data_conclusao();

UPDATE vagas
SET data_conclusao = updated_at::date
WHERE data_conclusao IS NULL
  AND lower(status) IN ('concluída','concluida','concluídas','concluidas')
  AND updated_at IS NOT NULL;
