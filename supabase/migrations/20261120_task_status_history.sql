-- Create table to track how long each task stays in every Kanban lane
CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_status_history_task_entered
  ON public.task_status_history (task_id, entered_at);

CREATE INDEX IF NOT EXISTS idx_task_status_history_open
  ON public.task_status_history (task_id)
  WHERE exited_at IS NULL;

ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow access to task_status_history for board" ON public.task_status_history;
CREATE POLICY "Allow access to task_status_history for board"
  ON public.task_status_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'task_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_status_history;
  END IF;
END $$;

-- Backfill existing tasks so every current card starts tracking from its last update/creation time
INSERT INTO public.task_status_history (task_id, status, entered_at, exited_at)
SELECT t.id, t.status, COALESCE(t.updated_at, t.created_at, now()), NULL
FROM public.tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_status_history h WHERE h.task_id = t.id
);
