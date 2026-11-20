export type TaskStatus =
  | "todo"
  | "draft"
  | "cutting"
  | "framing"
  | "backdrop"
  | "ready_to_ship"
  | "delivered";

export type TaskPriority = "low" | "medium" | "high";

export type WorkSize =
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "10x15 cm"
  | "20x25 cm"
  | "25x25 cm"
  | "35x35 cm"
  | "อื่นๆ";

export type PaymentStatus = "unpaid_deposit" | "deposit_paid" | "fully_paid";

export const DEFAULT_WORK_SIZES: WorkSize[] = [
  "A2",
  "A3",
  "A4",
  "A5",
  "10x15 cm",
  "20x25 cm",
  "25x25 cm",
  "35x35 cm",
  "อื่นๆ",
];

export type QuotaMap = Record<WorkSize, number>;

export interface Task {
  id: string;
  title: string;
  customer_name: string;
  customer_phone: string; // เบอร์โทรศัพท์ลูกค้า (บังคับใส่)
  customer_email: string; // อีเมลลูกค้า (ไม่บังคับ)
  shipping_address: string; // ที่อยู่จัดส่งของลูกค้า
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  work_size: WorkSize;
  agreed_price: number;
  payment_status: PaymentStatus;
  deposit_amount: number;
  shipping_paid: boolean;
  month: string; // Format: "YYYY-MM"
  due_date: string | null;
  delivery_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  work_size: WorkSize;
  agreed_price: number;
  payment_status: PaymentStatus;
  deposit_amount: number;
  shipping_paid?: boolean;
  month: string;
  due_date: string | null;
  delivery_date: string | null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type ShippingType = "normal" | "special";

export const SHIPPING_CARRIERS = [
  "Flash",
  "KEX",
  "J&T",
  "ไปรษณีย์ไทย (ธรรมดา)",
  "ไปรษณีย์ไทย (EMS)",
  "นครชัยแอร์",
  "Grab",
  "Lalamove",
  "DHL",
  "อื่นๆ",
] as const;

export interface ShippingHop {
  id: string;
  task_id: string;
  hop_order: number;
  carrier: string;
  shipping_type: ShippingType;
  route_note: string;
  tracking_no: string;
  shop_cost: number;
  customer_cost: number;
  shipped_at: string; // YYYY-MM-DD
  created_at?: string;
}

export interface ShippingHopDraft {
  id?: string;
  hop_order: number;
  carrier: string;
  shipping_type: ShippingType;
  route_note: string;
  tracking_no: string;
  total_cost?: number;
  shop_cost: number;
  customer_cost: number;
  shipped_at: string;
}

export type UserRole = "owner" | "viewer";

export interface TaskStatusHistory {
  id: string;
  task_id: string;
  status: TaskStatus;
  entered_at: string;
  exited_at: string | null;
  created_at?: string;
}
