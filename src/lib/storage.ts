import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  CreateTaskInput,
  DEFAULT_WORK_SIZES,
  QuotaMap,
  SupabaseConfig,
  Task,
  WorkSize,
} from "@/types/task";

const LOCAL_TASKS_KEY = "red_roof_house_tasks_v4";
const LOCAL_QUOTAS_KEY = "red_roof_house_quotas_v2";
const LOCAL_SUPABASE_CONFIG_KEY = "kanban_supabase_config_v1";

const DEFAULT_SUPABASE_URL = "https://wlhxsjvopbpxwhxyocvi.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaHhzanZvcGJweHdoeHlvY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDU3MDQsImV4cCI6MjExMDQyMTcwNH0.HD65cftiSeOvnaZNU4ahmDGwspct3yshwvquiC6sHV0";

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getDefaultQuotas(): QuotaMap {
  return {
    A2: 10,
    A3: 10,
    A4: 10,
    A5: 10,
    "10x15 cm": 10,
    "20x25 cm": 10,
    "25x25 cm": 10,
    "35x35 cm": 10,
  };
}

export function loadQuotas(): QuotaMap {
  if (typeof window === "undefined") return getDefaultQuotas();
  try {
    const raw = localStorage.getItem(LOCAL_QUOTAS_KEY);
    if (!raw) {
      const defaults = getDefaultQuotas();
      localStorage.setItem(LOCAL_QUOTAS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return { ...getDefaultQuotas(), ...parsed };
  } catch {
    return getDefaultQuotas();
  }
}

export function saveQuotas(quotas: QuotaMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_QUOTAS_KEY, JSON.stringify(quotas));
}

export async function fetchQuotas(): Promise<QuotaMap> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from("size_quotas")
      .select("work_size, max_quota");
    if (!error && data && data.length > 0) {
      const merged: QuotaMap = { ...getDefaultQuotas() };
      data.forEach((row: { work_size: string; max_quota: number }) => {
        if (row.work_size in merged) {
          merged[row.work_size as WorkSize] = Number(row.max_quota) || 0;
        }
      });
      saveQuotas(merged);
      return merged;
    }
  }
  return loadQuotas();
}

export async function updateQuota(
  size: WorkSize,
  maxQuota: number
): Promise<void> {
  const current = loadQuotas();
  const updated = { ...current, [size]: maxQuota };
  saveQuotas(updated);

  const client = getSupabaseClient();
  if (client) {
    await client
      .from("size_quotas")
      .upsert(
        {
          work_size: size,
          max_quota: maxQuota,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "work_size" }
      );
  }
}

export function subscribeToRealtimeChanges(onUpdate: () => void): () => void {
  const client = getSupabaseClient();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_TASKS_KEY || e.key === LOCAL_QUOTAS_KEY) {
      onUpdate();
    }
  };
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      onUpdate();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
  }

  if (!client) {
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }

  const channel = client
    .channel(`red-roof-realtime-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => {
        onUpdate();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "size_quotas" },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
}

export function getDefaultSampleTasks(): Task[] {
  const ym = getCurrentYearMonth();
  const nowIso = new Date().toISOString();
  return [
    {
      id: "sample-0",
      title: "ฉากร้านดอกไม้ของขวัญวันครบรอบ",
      customer_name: "คุณแพรว (Line: praew_p)",
      customer_phone: "081-234-5678",
      shipping_address: "123/45 ซ.สุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กทม. 10110",
      description: "เพิ่งสรุปบรีฟ รอคิวเริ่มวาดดราฟ",
      status: "todo",
      priority: "medium",
      work_size: "20x25 cm",
      agreed_price: 2500,
      payment_status: "unpaid_deposit",
      deposit_amount: 0,
      month: ym,
      due_date: `${ym}-24`,
      delivery_date: `${ym}-28`,
      position: 0,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-1",
      title: "งานป๊อปอัพคู่รักแต่งงาน + สัตว์เลี้ยง",
      customer_name: "คุณพลอย (IG: ploy_wed)",
      customer_phone: "089-456-1234",
      shipping_address: "88 หมู่บ้านแกรนด์ ถ.ราชพฤกษ์ ต.บางรักน้อย อ.เมือง จ.นนทบุรี 11000",
      description: "โทนสีพาสเทล เพิ่มน้องหมาคอร์กี้ด้านหน้า 2 ตัว",
      status: "draft",
      priority: "high",
      work_size: "A3",
      agreed_price: 3800,
      payment_status: "deposit_paid",
      deposit_amount: 1900,
      month: ym,
      due_date: `${ym}-18`,
      delivery_date: `${ym}-22`,
      position: 1,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-2",
      title: "กรอบรูปบ้านหลังคาแดง ของขวัญขึ้นบ้านใหม่",
      customer_name: "คุณนนท์ (Line: non_k)",
      customer_phone: "092-888-9999",
      shipping_address: "55/9 คอนโดเดอะไลน์ พหลโยธิน แขวงจอมพล เขตจตุจักร กทม. 10900",
      description: "เน้นรายละเอียดสวนหน้าบ้านและป้ายชื่อบ้าน",
      status: "cutting",
      priority: "high",
      work_size: "35x35 cm",
      agreed_price: 5200,
      payment_status: "deposit_paid",
      deposit_amount: 2500,
      month: ym,
      due_date: `${ym}-15`,
      delivery_date: `${ym}-19`,
      position: 2,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-3",
      title: "งานวันเกิดธีมคาเฟ่ญี่ปุ่น",
      customer_name: "คุณมายด์",
      customer_phone: "086-777-3322",
      shipping_address: "19/2 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
      description: "กรอบไม้สีอ่อน ติดไฟแฟรี่ไลท์ด้านใน",
      status: "framing",
      priority: "medium",
      work_size: "A4",
      agreed_price: 2600,
      payment_status: "deposit_paid",
      deposit_amount: 1300,
      month: ym,
      due_date: `${ym}-14`,
      delivery_date: `${ym}-16`,
      position: 3,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-4",
      title: "ของขวัญรับปริญญา มศว",
      customer_name: "คุณเจมส์",
      customer_phone: "095-111-2233",
      shipping_address: "42 ซ.อารีย์ 1 แขวงสามเสนใน เขตพญาไท กทม. 10400",
      description: "ฉากหลังตึกคณะ พร้อมช่อดอกไม้จิ๋ว",
      status: "backdrop",
      priority: "medium",
      work_size: "25x25 cm",
      agreed_price: 2400,
      payment_status: "deposit_paid",
      deposit_amount: 1000,
      month: ym,
      due_date: `${ym}-21`,
      delivery_date: `${ym}-25`,
      position: 4,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-5",
      title: "มินิการ์ดครบรอบแต่งงาน",
      customer_name: "คุณแอน",
      customer_phone: "084-555-6677",
      shipping_address: "101/8 หมู่ 4 ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300",
      description: "แพ็คกล่องของขวัญผูกโบว์สีแดง พร้อมการ์ดอวยพร",
      status: "ready_to_ship",
      priority: "low",
      work_size: "10x15 cm",
      agreed_price: 1500,
      payment_status: "deposit_paid",
      deposit_amount: 750,
      month: ym,
      due_date: `${ym}-16`,
      delivery_date: `${ym}-18`,
      position: 5,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "sample-6",
      title: "ฉากครอบครัว 5 คน ทริปภูเขา",
      customer_name: "คุณกิตติ",
      customer_phone: "081-999-8877",
      shipping_address: "77/3 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
      description: "ส่ง EMS แล้ว แจ้งเลขพัสดุเรียบร้อย",
      status: "delivered",
      priority: "medium",
      work_size: "A3",
      agreed_price: 3900,
      payment_status: "fully_paid",
      deposit_amount: 3900,
      month: ym,
      due_date: `${ym}-08`,
      delivery_date: `${ym}-10`,
      position: 6,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];
}

export function getActiveSupabaseConfig(): SupabaseConfig | null {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    !envUrl.includes("your-project-id") &&
    !envKey.includes("your-anon-public-key")
  ) {
    return { url: envUrl.trim(), anonKey: envKey.trim() };
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_SUPABASE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SupabaseConfig;
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getActiveSupabaseConfig();
  if (!cfg) return null;
  try {
    return createClient(cfg.url, cfg.anonKey);
  } catch {
    return null;
  }
}

export function loadLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    if (!raw) {
      const defaults = getDefaultSampleTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw) as Task[];
  } catch {
    return getDefaultSampleTasks();
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

function filterTasksWithCarryOver(allTasks: Task[], targetMonth: string): Task[] {
  return allTasks.filter(
    (t) =>
      t.month === targetMonth ||
      (t.month < targetMonth && t.status !== "delivered")
  );
}

export async function fetchTasksByMonth(month: string): Promise<{
  tasks: Task[];
  mode: "supabase" | "local";
  error?: string;
}> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from("tasks")
      .select("*")
      .or(`month.eq.${month},and(month.lt.${month},status.neq.delivered)`)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data) {
      return { tasks: data as Task[], mode: "supabase" };
    }
    return {
      tasks: filterTasksWithCarryOver(loadLocalTasks(), month),
      mode: "local",
      error:
        error?.message ||
        "ไม่สามารถเชื่อมต่อ Supabase ได้ ระบบสลับมาใช้ LocalStorage ชั่วคราว",
    };
  }

  const allLocal = loadLocalTasks();
  return {
    tasks: filterTasksWithCarryOver(allLocal, month),
    mode: "local",
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const nowIso = new Date().toISOString();
  const client = getSupabaseClient();

  if (client) {
    const { data, error } = await client
      .from("tasks")
      .insert([
        {
          title: input.title,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_email: input.customer_email || "",
          shipping_address: input.shipping_address,
          description: input.description,
          status: input.status,
          priority: input.priority,
          work_size: input.work_size,
          agreed_price: input.agreed_price,
          payment_status: input.payment_status,
          deposit_amount: input.deposit_amount,
          month: input.month,
          due_date: input.due_date || null,
          delivery_date: input.delivery_date || null,
          position: Date.now() % 1000000,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      return data as Task;
    }
    throw new Error(error?.message || "Failed to create task in Supabase");
  }

  const allLocal = loadLocalTasks();
  const newTask: Task = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}`,
    title: input.title,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email || "",
    shipping_address: input.shipping_address,
    description: input.description,
    status: input.status,
    priority: input.priority,
    work_size: input.work_size || DEFAULT_WORK_SIZES[2],
    agreed_price: Number(input.agreed_price) || 0,
    payment_status: input.payment_status || "unpaid_deposit",
    deposit_amount: Number(input.deposit_amount) || 0,
    month: input.month,
    due_date: input.due_date || null,
    delivery_date: input.delivery_date || null,
    position: allLocal.length,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const updated = [...allLocal, newTask];
  saveLocalTasks(updated);
  return newTask;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "created_at">>
): Promise<Task> {
  const client = getSupabaseClient();

  if (client) {
    const { data, error } = await client
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      return data as Task;
    }
    throw new Error(error?.message || "Failed to update task in Supabase");
  }

  const allLocal = loadLocalTasks();
  let updatedTask: Task | null = null;
  const nextTasks = allLocal.map((t) => {
    if (t.id === id) {
      updatedTask = {
        ...t,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) {
    throw new Error("Task not found");
  }

  saveLocalTasks(nextTasks);
  return updatedTask;
}

export async function deleteTask(id: string): Promise<void> {
  const client = getSupabaseClient();

  if (client) {
    const { error } = await client.from("tasks").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const allLocal = loadLocalTasks();
  saveLocalTasks(allLocal.filter((t) => t.id !== id));
}
