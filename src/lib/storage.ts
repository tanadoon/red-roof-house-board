import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  CreateTaskInput,
  DEFAULT_WORK_SIZES,
  QuotaMap,
  SupabaseConfig,
  Task,
  WorkSize,
} from "@/types/task";

const LOCAL_TASKS_KEY = "red_roof_house_tasks_v3";
const LOCAL_QUOTAS_KEY = "red_roof_house_quotas_v1";
const LOCAL_SUPABASE_CONFIG_KEY = "kanban_supabase_config_v1";

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

export function getDefaultSampleTasks(): Task[] {
  const ym = getCurrentYearMonth();
  const nowIso = new Date().toISOString();
  return [
    {
      id: "sample-0",
      title: "ฉากร้านดอกไม้ของขวัญวันครบรอบ",
      customer_name: "คุณแพรว (Line: praew_p)",
      description: "เพิ่งสรุปบรีฟ รอคิวเริ่มวาดดราฟ",
      status: "todo",
      priority: "medium",
      work_size: "A4",
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
      description: "เน้นรายละเอียดสวนหน้าบ้านและป้ายชื่อบ้าน",
      status: "cutting",
      priority: "high",
      work_size: "A2",
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
      description: "ฉากหลังตึกคณะ พร้อมช่อดอกไม้จิ๋ว",
      status: "backdrop",
      priority: "medium",
      work_size: "A4",
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
      description: "แพ็คกล่องของขวัญผูกโบว์สีแดง พร้อมการ์ดอวยพร",
      status: "ready_to_ship",
      priority: "low",
      work_size: "A5",
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

const DEFAULT_SUPABASE_URL = "https://wlhxsjvopbpxwhxyocvi.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaHhzanZvcGJweHdoeHlvY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDU3MDQsImV4cCI6MjExMDQyMTcwNH0.HD65cftiSeOvnaZNU4ahmDGwspct3yshwvquiC6sHV0";

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

export function saveRuntimeSupabaseConfig(config: SupabaseConfig | null): void {
  if (typeof window === "undefined") return;
  if (!config || !config.url.trim() || !config.anonKey.trim()) {
    localStorage.removeItem(LOCAL_SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(
      LOCAL_SUPABASE_CONFIG_KEY,
      JSON.stringify({
        url: config.url.trim(),
        anonKey: config.anonKey.trim(),
      })
    );
  }
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

/**
 * ดึงงานประจำเดือนที่เลือก:
 * - งานที่สร้างในเดือนนั้น (month === targetMonth)
 * - งานจากเดือนก่อนหน้า (month < targetMonth) ที่ยังไม่ได้ส่ง (status !== 'delivered') จะตามมาเดือนใหม่ด้วยอัตโนมัติ
 * - ส่วนงานที่ส่งแล้ว (status === 'delivered') จะค้างอยู่ที่เดือนของตัวเองเท่านั้น
 */
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

export async function syncLocalTasksToSupabase(): Promise<{ uploaded: number }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase");
  }

  const localTasks = loadLocalTasks();
  if (localTasks.length === 0) {
    return { uploaded: 0 };
  }

  const payload = localTasks.map((t, index) => ({
    title: t.title,
    customer_name: t.customer_name || "",
    description: t.description,
    status: t.status,
    priority: t.priority,
    work_size: t.work_size || ("A4" as WorkSize),
    agreed_price: Number(t.agreed_price) || 0,
    payment_status: t.payment_status || "unpaid_deposit",
    deposit_amount: Number(t.deposit_amount) || 0,
    month: t.month,
    due_date: t.due_date || null,
    delivery_date: t.delivery_date || null,
    position: index,
  }));

  const { data, error } = await client.from("tasks").insert(payload).select();
  if (error) {
    throw new Error(error.message);
  }

  return { uploaded: data?.length ?? payload.length };
}
