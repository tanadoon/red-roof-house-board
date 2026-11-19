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
  | "35x35 cm";

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
  month: string;
  due_date: string | null;
  delivery_date: string | null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
