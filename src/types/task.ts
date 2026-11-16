export type TaskStatus =
  | "todo"
  | "draft"
  | "cutting"
  | "framing"
  | "backdrop"
  | "ready_to_ship"
  | "delivered";

export type TaskPriority = "low" | "medium" | "high";

export type WorkSize = "A2" | "A3" | "A4" | "A5";

export type PaymentStatus = "unpaid_deposit" | "deposit_paid" | "fully_paid";

export const DEFAULT_WORK_SIZES: WorkSize[] = ["A2", "A3", "A4", "A5"];

export type QuotaMap = Record<WorkSize, number>;

export interface Task {
  id: string;
  title: string;
  customer_name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  work_size: WorkSize;
  agreed_price: number; // ราคาที่ตกลงกับลูกค้า (บาท)
  payment_status: PaymentStatus; // สถานะการชำระเงิน / มัดจำ
  deposit_amount: number; // ยอดมัดจำที่เก็บมาแล้ว (บาท)
  month: string; // Format: "YYYY-MM"
  due_date: string | null; // วันครบกำหนดทำเสร็จ ("YYYY-MM-DD")
  delivery_date: string | null; // วันที่ต้องส่งถึงมือลูกค้า ("YYYY-MM-DD")
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  customer_name: string;
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
