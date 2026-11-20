-- 1. Create user_roles table (default role for every new user = 'viewer')
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role; owners can read all roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Helper function to check if current user is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- 3. Trigger: automatically assign 'viewer' role when a new user signs up (Email or Google)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill any existing auth.users into user_roles as 'viewer' (you can promote owner afterwards)
INSERT INTO public.user_roles (user_id, email, role)
SELECT id, email, 'viewer'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. Lock down tasks, shipping_hops, size_quotas, task_status_history (remove anon access!)
DROP POLICY IF EXISTS "Allow all access to tasks for board" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Allow access to tasks for board" ON public.tasks;
DROP POLICY IF EXISTS "Owners full access to tasks" ON public.tasks;
CREATE POLICY "Owners full access to tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Allow access to shipping_hops for board" ON public.shipping_hops;
DROP POLICY IF EXISTS "Owners full access to shipping_hops" ON public.shipping_hops;
CREATE POLICY "Owners full access to shipping_hops"
  ON public.shipping_hops
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Allow all access to size_quotas for board" ON public.size_quotas;
DROP POLICY IF EXISTS "Allow access to size_quotas for board" ON public.size_quotas;
DROP POLICY IF EXISTS "Authenticated read size_quotas" ON public.size_quotas;
DROP POLICY IF EXISTS "Owners write size_quotas" ON public.size_quotas;
CREATE POLICY "Authenticated read size_quotas"
  ON public.size_quotas
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Owners write size_quotas"
  ON public.size_quotas
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Allow access to task_status_history for board" ON public.task_status_history;
DROP POLICY IF EXISTS "Authenticated read task_status_history" ON public.task_status_history;
DROP POLICY IF EXISTS "Owners write task_status_history" ON public.task_status_history;
CREATE POLICY "Authenticated read task_status_history"
  ON public.task_status_history
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Owners write task_status_history"
  ON public.task_status_history
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- 5. Safe restricted VIEW for viewers (current month only, NO prices/shipping/phone/email/address)
DROP VIEW IF EXISTS public.viewer_tasks;
CREATE VIEW public.viewer_tasks AS
SELECT
  id,
  title,
  customer_name,
  description,
  status,
  priority,
  work_size,
  month,
  due_date,
  delivery_date,
  position,
  created_at,
  updated_at
FROM public.tasks
WHERE auth.role() = 'authenticated'
  AND (
    month = to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM')
    OR (month < to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM') AND status <> 'delivered')
  );

GRANT SELECT ON public.viewer_tasks TO authenticated;
REVOKE ALL ON public.viewer_tasks FROM anon;
