"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sliders,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  CreateTaskInput,
  DEFAULT_WORK_SIZES,
  PaymentStatus,
  QuotaMap,
  Task,
  TaskPriority,
  TaskStatus,
  WorkSize,
} from "@/types/task";
import {
  createTask,
  deleteTask,
  fetchTasksByMonth,
  getActiveSupabaseConfig,
  getDefaultQuotas,
  loadQuotas,
  saveQuotas,
  saveRuntimeSupabaseConfig,
  syncLocalTasksToSupabase,
  updateTask,
} from "@/lib/storage";

const COLUMNS: {
  id: TaskStatus;
  title: string;
  accent: string;
  headerBg: string;
  badgeBg: string;
}[] = [
  {
    id: "todo",
    title: "To Do",
    accent: "border-t-[#7b1e34]",
    headerBg: "bg-[#7b1e34]/10",
    badgeBg: "bg-[#7b1e34] text-pink-50 border border-[#611527]",
  },
  {
    id: "draft",
    title: "วาดดราฟ",
    accent: "border-t-purple-400",
    headerBg: "bg-purple-100/75",
    badgeBg: "bg-purple-200/90 text-purple-900 border border-purple-300",
  },
  {
    id: "cutting",
    title: "ตัดกระดาษ",
    accent: "border-t-sky-400",
    headerBg: "bg-sky-100/80",
    badgeBg: "bg-sky-200/90 text-sky-900 border border-sky-300",
  },
  {
    id: "framing",
    title: "ทำกรอบ",
    accent: "border-t-pink-400",
    headerBg: "bg-pink-100/75",
    badgeBg: "bg-pink-200/90 text-pink-900 border border-pink-300",
  },
  {
    id: "backdrop",
    title: "ทำแบคดรอป",
    accent: "border-t-violet-400",
    headerBg: "bg-violet-100/75",
    badgeBg: "bg-violet-200/90 text-violet-900 border border-violet-300",
  },
  {
    id: "ready_to_ship",
    title: "รอส่ง",
    accent: "border-t-[#9e2a45]",
    headerBg: "bg-rose-100/80",
    badgeBg: "bg-[#8c223b] text-white border border-[#70192d]",
  },
  {
    id: "delivered",
    title: "ส่งแล้ว",
    accent: "border-t-sky-500",
    headerBg: "bg-sky-100/70",
    badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  },
];

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; badge: string; dot: string }
> = {
  high: {
    label: "High",
    badge: "bg-[#7b1e34]/15 text-[#7b1e34] border-[#7b1e34]/30 font-semibold",
    dot: "bg-[#7b1e34]",
  },
  medium: {
    label: "Medium",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    dot: "bg-purple-500",
  },
  low: {
    label: "Low",
    badge: "bg-sky-100 text-sky-800 border-sky-300",
    dot: "bg-sky-500",
  },
};

const SIZE_BADGE_STYLES: Record<WorkSize, string> = {
  A2: "bg-[#7b1e34] text-pink-50 border-[#5e1426]",
  A3: "bg-sky-100 text-sky-900 border-sky-300",
  A4: "bg-pink-100 text-[#7b1e34] border-pink-300",
  A5: "bg-purple-100 text-purple-900 border-purple-300",
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatThaiMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${THAI_MONTHS[m - 1]} ${y} (พ.ศ. ${y + 543})`;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "ไม่ระบุ";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return dateStr;
  const [, m, d] = parts;
  return `${d} ${THAI_SHORT_MONTHS[m - 1] || ""}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDueStatus(
  targetDate: string | null,
  status: TaskStatus
): "overdue" | "due_today" | "upcoming" | "completed" | "none" {
  if (!targetDate) return "none";
  if (status === "delivered") return "completed";
  const today = getTodayStr();
  if (targetDate < today) return "overdue";
  if (targetDate === today) return "due_today";
  return "upcoming";
}

function formatTHB(amount: number): string {
  return Number(amount || 0).toLocaleString("th-TH");
}

function getRemainingBalance(task: {
  agreed_price?: number;
  payment_status?: PaymentStatus;
  deposit_amount?: number;
}): number {
  const price = Number(task.agreed_price) || 0;
  const status = task.payment_status || "unpaid_deposit";
  const deposit = Number(task.deposit_amount) || 0;
  if (status === "fully_paid") return 0;
  if (status === "deposit_paid") return Math.max(0, price - deposit);
  return price;
}

export default function KanbanBoard() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quotas, setQuotas] = useState<QuotaMap>(getDefaultQuotas);
  const [isEditingQuotas, setIsEditingQuotas] = useState<boolean>(false);
  const [storageMode, setStorageMode] = useState<"local" | "supabase">("local");
  const [loading, setLoading] = useState<boolean>(true);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Mobile/Tablet active column tab ("all" shows horizontal swipe board, or specific status)
  const [mobileStageTab, setMobileStageTab] = useState<TaskStatus | "all">("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sizeFilter, setSizeFilter] = useState<WorkSize | "all">("all");
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Delivery Payment Prompt Modal (when moving to "delivered" with unpaid balance)
  const [pendingDeliveryTask, setPendingDeliveryTask] = useState<Task | null>(
    null
  );

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCustomerName, setFormCustomerName] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
  const [formPriority, setFormPriority] = useState<TaskPriority>("medium");
  const [formWorkSize, setFormWorkSize] = useState<WorkSize>("A4");
  const [formAgreedPrice, setFormAgreedPrice] = useState<string>("");
  const [formPaymentStatus, setFormPaymentStatus] =
    useState<PaymentStatus>("unpaid_deposit");
  const [formDepositAmount, setFormDepositAmount] = useState<string>("");
  const [formMonth, setFormMonth] = useState<string>(selectedMonth);
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formDeliveryDate, setFormDeliveryDate] = useState<string>("");

  // Cloud Config Modal state
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string>("");
  const [supabaseKey, setSupabaseKey] = useState<string>("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadBoard = async (monthToLoad = selectedMonth) => {
    setLoading(true);
    setBannerError(null);
    try {
      const result = await fetchTasksByMonth(monthToLoad);
      setTasks(result.tasks);
      setStorageMode(result.mode);
      if (result.error) {
        setBannerError(result.error);
      }
    } catch (err: unknown) {
      setBannerError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuotas(loadQuotas());
  }, []);

  useEffect(() => {
    loadBoard(selectedMonth);
    const activeCfg = getActiveSupabaseConfig();
    if (activeCfg) {
      setSupabaseUrl(activeCfg.url);
      setSupabaseKey(activeCfg.anonKey);
    }
  }, [selectedMonth]);

  const handleQuotaChange = (size: WorkSize, newLimit: number) => {
    const safeLimit = Math.max(0, Math.min(999, Number(newLimit) || 0));
    const updated = { ...quotas, [size]: safeLimit };
    setQuotas(updated);
    saveQuotas(updated);
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchCustomer = (task.customer_name || "")
          .toLowerCase()
          .includes(q);
        const matchDesc = (task.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCustomer && !matchDesc) return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (sizeFilter !== "all" && task.work_size !== sizeFilter) {
        return false;
      }
      if (onlyOverdue) {
        const checkDate = task.delivery_date || task.due_date;
        if (getDueStatus(checkDate, task.status) !== "overdue") {
          return false;
        }
      }
      return true;
    });
  }, [tasks, searchQuery, priorityFilter, sizeFilter, onlyOverdue]);

  // Monthly statistics & financial summary
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "delivered").length;
    const inProgress = tasks.filter((t) => t.status !== "delivered").length;
    const overdue = tasks.filter((t) => {
      const checkDate = t.delivery_date || t.due_date;
      return getDueStatus(checkDate, t.status) === "overdue";
    }).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const totalRevenue = tasks.reduce(
      (sum, t) => sum + (Number(t.agreed_price) || 0),
      0
    );
    const totalRemainingToCollect = tasks.reduce(
      (sum, t) => sum + getRemainingBalance(t),
      0
    );
    const totalCollected = Math.max(0, totalRevenue - totalRemainingToCollect);
    const deliveredUnpaidCount = tasks.filter(
      (t) => t.status === "delivered" && getRemainingBalance(t) > 0
    ).length;

    return {
      total,
      done,
      inProgress,
      overdue,
      percent,
      totalRevenue,
      totalCollected,
      totalRemainingToCollect,
      deliveredUnpaidCount,
    };
  }, [tasks]);

  // Size Quota summary for the selected month
  const quotaSummary = useMemo(() => {
    return DEFAULT_WORK_SIZES.map((size) => {
      const used = tasks.filter((t) => (t.work_size || "A4") === size).length;
      const limit = quotas[size] ?? 10;
      const remaining = Math.max(0, limit - used);
      const isFull = limit > 0 && used >= limit;
      const isNearFull = !isFull && limit > 0 && used / limit >= 0.8;
      const percent =
        limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
      return { size, used, limit, remaining, isFull, isNearFull, percent };
    });
  }, [tasks, quotas]);

  // Open Modal for New Task (default status is "todo")
  const openCreateModal = (defaultStatus: TaskStatus = "todo") => {
    setEditingTask(null);
    setFormTitle("");
    setFormCustomerName("");
    setFormDesc("");
    setFormStatus(defaultStatus);
    setFormPriority("medium");
    setFormWorkSize("A4");
    setFormAgreedPrice("");
    setFormPaymentStatus("unpaid_deposit");
    setFormDepositAmount("");
    setFormMonth(selectedMonth);
    setFormDueDate(`${selectedMonth}-20`);
    setFormDeliveryDate(`${selectedMonth}-25`);
    setIsTaskModalOpen(true);
  };

  // Open Modal for Editing Task
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormCustomerName(task.customer_name || "");
    setFormDesc(task.description || "");
    setFormStatus(task.status || "todo");
    setFormPriority(task.priority || "medium");
    setFormWorkSize(task.work_size || "A4");
    setFormAgreedPrice(String(task.agreed_price ?? ""));
    setFormPaymentStatus(task.payment_status || "unpaid_deposit");
    setFormDepositAmount(String(task.deposit_amount ?? ""));
    setFormMonth(task.month);
    setFormDueDate(task.due_date || "");
    setFormDeliveryDate(task.delivery_date || "");
    setIsTaskModalOpen(true);
  };

  // Live preview of remaining balance inside modal
  const modalRemainingPreview = useMemo(() => {
    const price = Number(formAgreedPrice) || 0;
    const deposit = Number(formDepositAmount) || 0;
    if (formPaymentStatus === "fully_paid") return 0;
    if (formPaymentStatus === "deposit_paid") return Math.max(0, price - deposit);
    return price;
  }, [formAgreedPrice, formPaymentStatus, formDepositAmount]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const agreedPriceNum = Math.max(0, Number(formAgreedPrice) || 0);
    const depositNum =
      formPaymentStatus === "unpaid_deposit"
        ? 0
        : formPaymentStatus === "fully_paid"
        ? agreedPriceNum
        : Math.min(agreedPriceNum, Math.max(0, Number(formDepositAmount) || 0));

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formTitle.trim(),
          customer_name: formCustomerName.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          work_size: formWorkSize,
          agreed_price: agreedPriceNum,
          payment_status: formPaymentStatus,
          deposit_amount: depositNum,
          month: formMonth,
          due_date: formDueDate || null,
          delivery_date: formDeliveryDate || null,
        });
      } else {
        const payload: CreateTaskInput = {
          title: formTitle.trim(),
          customer_name: formCustomerName.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          work_size: formWorkSize,
          agreed_price: agreedPriceNum,
          payment_status: formPaymentStatus,
          deposit_amount: depositNum,
          month: formMonth,
          due_date: formDueDate || null,
          delivery_date: formDeliveryDate || null,
        };
        await createTask(payload);
      }
      setIsTaskModalOpen(false);
      await loadBoard(selectedMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "ไม่สามารถบันทึกงานได้");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (editingTask?.id === id) {
        setIsTaskModalOpen(false);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "ไม่สามารถลบงานได้");
    }
  };

  const commitStatusChange = async (
    taskId: string,
    newStatus: TaskStatus,
    alsoMarkPaid = false
  ) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updatedMonth =
      newStatus === "delivered" && target.month < selectedMonth
        ? selectedMonth
        : target.month;

    const extraPayment: Partial<Task> = alsoMarkPaid
      ? {
          payment_status: "fully_paid",
          deposit_amount: Number(target.agreed_price) || 0,
        }
      : {};

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, month: updatedMonth, ...extraPayment }
          : t
      )
    );

    try {
      await updateTask(taskId, {
        status: newStatus,
        month: updatedMonth,
        ...extraPayment,
      });
    } catch (err: unknown) {
      await loadBoard(selectedMonth);
      alert(err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || target.status === newStatus) return;

    // ถ้าย้ายเข้าเลน "ส่งแล้ว" แต่ยังเก็บเงินไม่ครบ ให้เด้งถามเตือนทันที!
    if (newStatus === "delivered" && getRemainingBalance(target) > 0) {
      setPendingDeliveryTask(target);
      return;
    }

    await commitStatusChange(taskId, newStatus, false);
  };

  const handleMarkFullyPaid = async (task: Task) => {
    const price = Number(task.agreed_price) || 0;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, payment_status: "fully_paid", deposit_amount: price }
          : t
      )
    );
    try {
      await updateTask(task.id, {
        payment_status: "fully_paid",
        deposit_amount: price,
      });
    } catch {
      await loadBoard(selectedMonth);
    }
  };

  // Drag & Drop handlers
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const onDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (taskId) {
      await handleStatusChange(taskId, status);
    }
  };

  const handleSaveCloudSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncMessage(null);
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      saveRuntimeSupabaseConfig(null);
      setSyncMessage("สลับกลับมาใช้โหมด LocalStorage ในเครื่องเรียบร้อยแล้ว");
      await loadBoard(selectedMonth);
      return;
    }
    saveRuntimeSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseKey.trim(),
    });
    setSyncMessage("บันทึกค่า Supabase แล้ว กำลังตรวจสอบการเชื่อมต่อ...");
    await loadBoard(selectedMonth);
    setSyncMessage("เชื่อมต่อสำเร็จ!");
  };

  const handleSyncLocalToCloud = async () => {
    setSyncMessage("กำลังอัปโหลดข้อมูลจากเครื่องขึ้น Supabase...");
    try {
      const res = await syncLocalTasksToSupabase();
      setSyncMessage(
        `ซิงค์สำเร็จ! อัปโหลดงานจำนวน ${res.uploaded} รายการขึ้น Cloud แล้ว`
      );
      await loadBoard(selectedMonth);
    } catch (err: unknown) {
      setSyncMessage(
        `ซิงค์ไม่สำเร็จ: ${
          err instanceof Error
            ? err.message
            : "โปรดตรวจสอบว่าสร้างตาราง tasks ใน Supabase หรือยัง"
        }`
      );
    }
  };

  const visibleColumns = useMemo(() => {
    if (mobileStageTab === "all") return COLUMNS;
    return COLUMNS.filter((c) => c.id === mobileStageTab);
  }, [mobileStageTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf2f4] via-[#f6f0ff] to-[#e8f4fe] text-[#3d1320] flex flex-col">
      {/* Top Navigation Header (Rich Burgundy Primary) */}
      <header className="sticky top-0 z-30 border-b border-[#8c243b] bg-gradient-to-r from-[#581322] via-[#6e182a] to-[#4a1228] text-pink-50 shadow-lg shadow-[#581322]/20">
        <div className="max-w-[1850px] mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title & Studio Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Red Roof House Logo"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-pink-200 shadow-md shadow-black/30 bg-amber-50 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Red Roof House Board
                </h1>
                <button
                  onClick={() => setIsCloudModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition ${
                    storageMode === "supabase"
                      ? "bg-sky-200 text-sky-950 border-sky-300 hover:bg-sky-100"
                      : "bg-pink-200/90 text-[#581322] border-pink-300 hover:bg-pink-100"
                  }`}
                  title="คลิกเพื่อตั้งค่าฐานข้อมูล Supabase Cloud"
                >
                  {storageMode === "supabase" ? (
                    <>
                      <Cloud className="w-3 h-3" />
                      <span>Supabase Cloud</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3" />
                      <span>LocalStorage Mode</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-pink-200/90">
                ระบบแทรกกิ้งคิวงาน โควต้ารายเดือน มัดจำ และสถานะการจัดส่งลูกค้า
              </p>
            </div>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1.5 bg-[#420d19]/80 border border-pink-300/30 rounded-xl p-1.5 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
              className="p-1.5 rounded-lg hover:bg-[#7b1e34] text-pink-100 transition"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-sky-300 hidden sm:inline" />
              <span className="text-xs sm:text-sm font-semibold text-white text-center">
                {formatThaiMonth(selectedMonth)}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) =>
                  e.target.value && setSelectedMonth(e.target.value)
                }
                className="bg-pink-100 text-xs font-semibold text-[#581322] rounded-lg px-2 py-1 border border-pink-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <button
              onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
              className="p-1.5 rounded-lg hover:bg-[#7b1e34] text-pink-100 transition"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#420d19]/70 hover:bg-[#420d19] text-pink-100 border border-pink-300/30 transition"
            >
              <Settings className="w-4 h-4 text-sky-300" />
              <span>ตั้งค่า Cloud DB</span>
            </button>
            <button
              onClick={() => openCreateModal("todo")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pink-100 hover:bg-white text-[#581322] shadow-md shadow-black/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มงานใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Optional Warning Banner */}
      {bannerError && (
        <div className="max-w-[1850px] mx-auto w-full px-3 sm:px-6 pt-3">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-sm">
            <span>{bannerError}</span>
            <button
              onClick={() => setBannerError(null)}
              className="text-amber-600 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dashboards Section */}
      <section className="max-w-[1850px] mx-auto w-full px-3 sm:px-6 py-4 space-y-4">
        {/* Work Size Quota Dashboard */}
        <div className="bg-white/90 backdrop-blur-sm border-2 border-[#7b1e34]/15 rounded-2xl p-3.5 sm:p-4 shadow-sm shadow-[#7b1e34]/5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-[#7b1e34]" />
              <h2 className="text-xs sm:text-sm font-bold text-[#581322]">
                โควต้างานแต่ละขนาดประจำเดือน ({formatThaiMonth(selectedMonth)})
              </h2>
            </div>
            <button
              onClick={() => setIsEditingQuotas((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isEditingQuotas
                  ? "bg-[#7b1e34] text-white border-[#581322] shadow-sm"
                  : "bg-purple-100/80 text-purple-900 border-purple-300 hover:bg-purple-200/80"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {isEditingQuotas ? "บันทึกโควต้าเรียบร้อย" : "ปรับจำนวนโควต้า"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {quotaSummary.map((q) => {
              const isSelected = sizeFilter === q.size;
              return (
                <div
                  key={q.size}
                  onClick={() => {
                    if (!isEditingQuotas) {
                      setSizeFilter((prev) =>
                        prev === q.size ? "all" : q.size
                      );
                    }
                  }}
                  className={`rounded-xl p-3 border transition ${
                    !isEditingQuotas ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "bg-pink-100/80 border-[#7b1e34] ring-2 ring-[#7b1e34]/30"
                      : q.isFull
                      ? "bg-rose-100/70 border-rose-400 hover:border-[#7b1e34]"
                      : q.isNearFull
                      ? "bg-amber-50/90 border-amber-300 hover:border-amber-400"
                      : "bg-white border-purple-200 hover:border-[#7b1e34]/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                          SIZE_BADGE_STYLES[q.size]
                        }`}
                      >
                        {q.size}
                      </span>
                      {q.isFull ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#7b1e34] text-white">
                          เต็มแล้ว!
                        </span>
                      ) : q.isNearFull ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          เหลือ {q.remaining}
                        </span>
                      ) : (
                        <span className="text-[11px] text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-md border border-sky-200 font-semibold">
                          ว่าง {q.remaining} คิว
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          q.isFull
                            ? "text-[#7b1e34]"
                            : q.isNearFull
                            ? "text-amber-700"
                            : "text-[#581322]"
                        }`}
                      >
                        {q.used}
                      </span>
                      <span className="text-[11px] text-purple-800/80">
                        /{q.limit} งาน
                      </span>
                    </div>
                  </div>

                  {/* Solid Color Progress Bar (No Gradient) */}
                  <div className="w-full h-2 bg-pink-100/90 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        q.isFull
                          ? "bg-[#7b1e34]"
                          : q.isNearFull
                          ? "bg-amber-500"
                          : "bg-[#8c243b]"
                      }`}
                      style={{ width: `${q.percent}%` }}
                    />
                  </div>

                  {/* Inline Quota Limit Editor */}
                  {isEditingQuotas && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2.5 pt-2 border-t border-pink-200 flex items-center justify-between gap-1"
                    >
                      <span className="text-[11px] font-medium text-[#581322]">
                        โควต้า ({q.size}):
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuotaChange(q.size, q.limit - 1)}
                          className="w-6 h-6 rounded bg-[#7b1e34] hover:bg-[#581322] text-white text-xs font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={q.limit}
                          onChange={(e) =>
                            handleQuotaChange(q.size, Number(e.target.value))
                          }
                          className="w-12 bg-white border border-[#7b1e34]/40 rounded px-1 py-0.5 text-center text-xs font-bold text-[#581322]"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuotaChange(q.size, q.limit + 1)}
                          className="w-6 h-6 rounded bg-[#7b1e34] hover:bg-[#581322] text-white text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Progress & Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Solid Progress Bar */}
          <div className="bg-white/90 border border-pink-200 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#7b1e34] font-medium mb-1.5">
              <span>ส่งงานแล้วเดือนนี้</span>
              <span className="font-bold text-[#7b1e34] text-sm">
                {stats.percent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7b1e34] transition-all duration-300"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-purple-900/80 mt-2">
              ส่งแล้ว {stats.done} / {stats.total} งาน (กำลังทำ {stats.inProgress})
            </p>
          </div>

          {/* Card 2: Baby Blue Accent */}
          <div className="bg-white/90 border border-sky-200 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
            <p className="text-xs text-sky-900/80 font-medium">
              ยอดรวมที่ตกลงเดือนนี้
            </p>
            <p className="text-lg sm:text-xl font-bold text-[#581322] mt-1">
              ฿{formatTHB(stats.totalRevenue)}
            </p>
            <p className="text-[11px] text-sky-800 font-semibold mt-0.5">
              รับมาแล้ว: ฿{formatTHB(stats.totalCollected)}
            </p>
          </div>

          {/* Card 3: Pastel Purple Accent + Delivered Unpaid Alert */}
          <div
            className={`rounded-2xl p-3.5 shadow-sm flex flex-col justify-between border ${
              stats.deliveredUnpaidCount > 0
                ? "bg-amber-50/95 border-amber-400"
                : "bg-white/90 border-purple-200"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs text-purple-900/80 font-medium">
                รอเก็บส่วนที่เหลือตอนส่ง
              </p>
              {stats.deliveredUnpaidCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7b1e34] text-white">
                  🚨 ส่งแล้วค้างจ่าย {stats.deliveredUnpaidCount} งาน
                </span>
              )}
            </div>
            <p className="text-lg sm:text-xl font-bold text-[#7b1e34] mt-1">
              ฿{formatTHB(stats.totalRemainingToCollect)}
            </p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              ยอดค้างชำระรวมของเดือนนี้
            </p>
          </div>

          {/* Card 4: Overdue Status (Dimmed & No Icon when 0) */}
          <div
            onClick={() => {
              if (stats.overdue > 0 || onlyOverdue) {
                setOnlyOverdue((v) => !v);
              }
            }}
            className={`rounded-2xl p-3.5 flex items-center justify-between border transition ${
              onlyOverdue
                ? "cursor-pointer bg-[#7b1e34] text-white border-[#581322] shadow-sm"
                : stats.overdue > 0
                ? "cursor-pointer bg-rose-50/95 border-rose-300 hover:border-[#7b1e34] shadow-sm"
                : "bg-white/45 border-pink-200/50 opacity-55"
            }`}
          >
            <div>
              <p
                className={`text-xs font-medium flex items-center gap-1 ${
                  onlyOverdue
                    ? "text-pink-100"
                    : stats.overdue > 0
                    ? "text-[#581322]"
                    : "text-slate-400"
                }`}
              >
                <span>เลยกำหนดส่ง</span>
                {onlyOverdue && (
                  <span className="text-[10px] bg-pink-200 text-[#581322] font-bold px-1.5 py-0.2 rounded">
                    กรองอยู่
                  </span>
                )}
              </p>
              <p
                className={`text-xl sm:text-2xl font-bold mt-1 ${
                  onlyOverdue
                    ? "text-white"
                    : stats.overdue > 0
                    ? "text-[#7b1e34]"
                    : "text-slate-400"
                }`}
              >
                {stats.overdue} งาน
              </p>
            </div>
            {stats.overdue > 0 && <span className="text-2xl">🚨</span>}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 border border-purple-200 rounded-2xl p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[#7b1e34]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่องาน, ชื่อลูกค้า หรือรายละเอียด..."
                className="w-full bg-pink-50/50 border border-pink-200 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#4a1220] placeholder:text-purple-400 focus:outline-none focus:border-[#7b1e34] focus:bg-white"
              />
            </div>

            {/* Work Size Filter (Baby Blue) */}
            <div className="flex items-center gap-1.5 bg-sky-100/70 border border-sky-300 rounded-xl px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-700" />
              <span className="text-xs text-sky-900 font-medium">ขนาดงาน:</span>
              <select
                value={sizeFilter}
                onChange={(e) =>
                  setSizeFilter(e.target.value as WorkSize | "all")
                }
                className="bg-transparent text-xs font-bold text-[#581322] focus:outline-none"
              >
                <option value="all" className="bg-white">
                  ทั้งหมด
                </option>
                {DEFAULT_WORK_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-white">
                    ขนาด {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter (Pastel Purple) */}
            <div className="flex items-center gap-1.5 bg-purple-100/70 border border-purple-300 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-700" />
              <span className="text-xs text-purple-900 font-medium">
                Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as TaskPriority | "all")
                }
                className="bg-transparent text-xs font-bold text-[#581322] focus:outline-none"
              >
                <option value="all" className="bg-white">
                  ทั้งหมด
                </option>
                <option value="high" className="bg-white">
                  High (ด่วน)
                </option>
                <option value="medium" className="bg-white">
                  Medium (กลาง)
                </option>
                <option value="low" className="bg-white">
                  Low (ทั่วไป)
                </option>
              </select>
            </div>

            {(searchQuery ||
              priorityFilter !== "all" ||
              sizeFilter !== "all" ||
              onlyOverdue) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("all");
                  setSizeFilter("all");
                  setOnlyOverdue(false);
                }}
                className="text-xs text-[#7b1e34] hover:text-[#4a1220] underline px-2 font-semibold"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <button
            onClick={() => loadBoard(selectedMonth)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7b1e34] bg-pink-100/70 hover:bg-pink-200/70 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* Mobile & iPad Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 2xl:hidden no-scrollbar">
          <button
            onClick={() => setMobileStageTab("all")}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              mobileStageTab === "all"
                ? "bg-[#7b1e34] text-white border-[#581322] shadow-sm"
                : "bg-white/90 text-[#581322] border-pink-200"
            }`}
          >
            ทุกเลน ({filteredTasks.length})
          </button>
          {COLUMNS.map((col) => {
            const count = filteredTasks.filter(
              (t) => t.status === col.id
            ).length;
            return (
              <button
                key={col.id}
                onClick={() => setMobileStageTab(col.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  mobileStageTab === col.id
                    ? "bg-[#7b1e34] text-white border-[#581322] shadow-sm"
                    : "bg-white/90 text-[#581322] border-pink-200"
                }`}
              >
                <span>{col.title}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    mobileStageTab === col.id
                      ? "bg-pink-200 text-[#581322]"
                      : "bg-purple-100 text-purple-900"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Kanban Columns (7 Workflow Stages) */}
      <main className="max-w-[1850px] mx-auto w-full px-3 sm:px-6 pb-12 flex-1">
        <div
          className={
            mobileStageTab === "all"
              ? "flex 2xl:grid 2xl:grid-cols-7 gap-3.5 overflow-x-auto pb-4 snap-x snap-mandatory items-start"
              : "grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start"
          }
        >
          {visibleColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => onDrop(e, col.id)}
                className={`snap-start shrink-0 ${
                  mobileStageTab === "all"
                    ? "w-[85vw] sm:w-[300px] 2xl:w-auto"
                    : "w-full"
                } rounded-2xl bg-white/80 backdrop-blur-sm border-t-4 ${
                  col.accent
                } border-x border-b border-pink-200/90 shadow-sm shadow-[#7b1e34]/5 flex flex-col min-h-[520px] transition ${
                  isOver ? "ring-2 ring-[#7b1e34] bg-pink-50/70" : ""
                }`}
              >
                {/* Column Header (No Subtitle) */}
                <div
                  className={`p-3 border-b border-pink-200/60 rounded-t-xl flex items-center justify-between ${col.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-[#4a1220]">
                      {col.title}
                    </h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateModal(col.id)}
                    className="p-1.5 rounded-lg bg-white/70 hover:bg-[#7b1e34] text-[#7b1e34] hover:text-white transition shadow-sm"
                    title={`เพิ่มงานใน ${col.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-36 rounded-xl border border-dashed border-purple-200 bg-purple-50/30 flex flex-col items-center justify-center text-purple-500 text-xs p-3 text-center">
                      <p>ไม่มีงานในสถานะนี้</p>
                      <button
                        onClick={() => openCreateModal(col.id)}
                        className="mt-1.5 text-[#7b1e34] font-semibold hover:underline"
                      >
                        + เพิ่มงาน
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const checkDate = task.delivery_date || task.due_date;
                      const dueState = getDueStatus(checkDate, task.status);
                      const pStyle =
                        PRIORITY_STYLES[task.priority] ||
                        PRIORITY_STYLES.medium;
                      const workSize: WorkSize = task.work_size || "A4";
                      const agreedPrice = Number(task.agreed_price) || 0;
                      const paymentStatus: PaymentStatus =
                        task.payment_status || "unpaid_deposit";
                      const remainingBalance = getRemainingBalance(task);
                      const isCarriedOver = task.month < selectedMonth;
                      const isDeliveredButUnpaid =
                        task.status === "delivered" && remainingBalance > 0;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, task.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={`rounded-2xl bg-white border p-3.5 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2.5 ${
                            isDeliveredButUnpaid
                              ? "border-2 border-amber-500 bg-amber-50/40"
                              : dueState === "overdue"
                              ? "border-[#7b1e34] bg-rose-50/70 ring-1 ring-[#7b1e34]/20"
                              : "border-pink-200/90 hover:border-[#7b1e34]/60"
                          }`}
                        >
                          {/* Row 1: Badges + Edit Button */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                  SIZE_BADGE_STYLES[workSize] ||
                                  SIZE_BADGE_STYLES.A4
                                }`}
                              >
                                {workSize}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${pStyle.badge}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`}
                                />
                                {pStyle.label}
                              </span>

                              {isCarriedOver && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300">
                                  ยกมาจาก {task.month}
                                </span>
                              )}

                              {dueState === "overdue" && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7b1e34] text-white animate-pulse">
                                  🚨 เลยกำหนด
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => openEditModal(task)}
                              className="text-xs px-1.5 py-0.5 rounded hover:bg-pink-50 text-purple-600 hover:text-[#7b1e34] font-semibold shrink-0"
                            >
                              แก้ไข
                            </button>
                          </div>

                          {/* Row 2: Title & Customer (No Strikethrough on Thai text!) */}
                          <div>
                            <h3
                              onClick={() => openEditModal(task)}
                              className={`font-bold text-sm leading-relaxed cursor-pointer hover:text-[#7b1e34] transition ${
                                task.status === "delivered"
                                  ? "text-[#4a1220]/75"
                                  : "text-[#4a1220]"
                              }`}
                            >
                              {task.title}
                            </h3>

                            {task.customer_name && (
                              <p className="mt-1 text-xs font-semibold text-sky-900 bg-sky-100/80 border border-sky-200/80 inline-block px-2 py-0.5 rounded-md max-w-full truncate">
                                {task.customer_name}
                              </p>
                            )}

                            {task.description && (
                              <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Row 3: Compact 1-Block Payment Summary (With Alert if Delivered & Unpaid!) */}
                          {isDeliveredButUnpaid ? (
                            <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-400 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-bold text-[#7b1e34]">
                                  🚨 ส่งแล้ว • ยังไม่เก็บส่วนที่เหลือ
                                </p>
                                <p className="text-xs font-bold text-[#581322] mt-0.5">
                                  ค้างชำระ ฿{formatTHB(remainingBalance)}{" "}
                                  <span className="font-normal text-[11px] text-purple-900/70">
                                    (จาก ฿{formatTHB(agreedPrice)})
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMarkFullyPaid(task)}
                                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-[#7b1e34] hover:bg-[#581322] text-white font-bold shadow-sm transition"
                              >
                                รับครบแล้ว
                              </button>
                            </div>
                          ) : remainingBalance === 0 ? (
                            <div className="px-2.5 py-1.5 rounded-xl bg-sky-50/90 border border-sky-200/80 flex items-center justify-between text-xs">
                              <span className="text-sky-900 font-semibold">
                                ชำระครบแล้ว
                              </span>
                              <span className="font-bold text-[#581322]">
                                ฿{formatTHB(agreedPrice)}
                              </span>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between gap-2">
                              <div className="text-xs">
                                <span className="text-purple-900/80 font-medium">
                                  {paymentStatus === "deposit_paid"
                                    ? "คงเหลือตอนส่ง: "
                                    : "ยังไม่มัดจำ: "}
                                </span>
                                <span className="font-bold text-[#7b1e34]">
                                  ฿{formatTHB(remainingBalance)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMarkFullyPaid(task)}
                                className="shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-[#7b1e34] hover:bg-[#581322] text-white font-semibold transition"
                              >
                                รับครบ
                              </button>
                            </div>
                          )}

                          {/* Row 4: Footer (Short Delivery Date + Status Dropdown on 1 clean row) */}
                          <div className="pt-2 border-t border-pink-100 flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] shrink-0 ${
                                dueState === "overdue"
                                  ? "text-[#7b1e34] font-bold"
                                  : "text-purple-900/75 font-medium"
                              }`}
                            >
                              ส่ง: {formatShortDate(task.delivery_date)}
                            </span>

                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  task.id,
                                  e.target.value as TaskStatus
                                )
                              }
                              className="bg-purple-50/90 border border-purple-200 text-[#4a1220] font-semibold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#7b1e34]"
                            >
                              {COLUMNS.map((c) => (
                                <option
                                  key={c.id}
                                  value={c.id}
                                  className="bg-white"
                                >
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Delivery Unpaid Confirmation Modal */}
      {pendingDeliveryTask && (
        <div className="fixed inset-0 z-50 bg-[#3d0d18]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#7b1e34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#7b1e34] border border-amber-300 mb-2">
                  🚨 แจ้งเตือนยอดค้างชำระก่อนส่งงาน
                </span>
                <h3 className="text-base font-bold text-[#581322]">
                  {pendingDeliveryTask.title}
                </h3>
                <p className="text-xs text-purple-900 mt-0.5">
                  ลูกค้า: {pendingDeliveryTask.customer_name || "-"}
                </p>
              </div>
              <button
                onClick={() => setPendingDeliveryTask(null)}
                className="text-purple-400 hover:text-[#7b1e34]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-purple-900">ราคาที่ตกลง:</span>
                <span className="font-bold text-[#581322]">
                  ฿{formatTHB(pendingDeliveryTask.agreed_price)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-rose-200">
                <span className="font-bold text-[#7b1e34]">
                  ยอดที่ต้องเก็บเพิ่มตอนส่ง:
                </span>
                <span className="font-bold text-[#7b1e34]">
                  ฿{formatTHB(getRemainingBalance(pendingDeliveryTask))} บาท
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              คุณกำลังย้ายงานนี้ไปที่สถานะ <strong>&quot;ส่งแล้ว&quot;</strong>{" "}
              ลูกค้าได้ชำระเงินส่วนที่เหลือครบเรียบร้อยแล้วหรือยังครับ?
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const t = pendingDeliveryTask;
                  setPendingDeliveryTask(null);
                  await commitStatusChange(t.id, "delivered", true);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#7b1e34] hover:bg-[#581322] text-white shadow-md transition"
              >
                รับเงินครบแล้ว + ย้ายไปส่งแล้ว
              </button>
              <button
                type="button"
                onClick={async () => {
                  const t = pendingDeliveryTask;
                  setPendingDeliveryTask(null);
                  await commitStatusChange(t.id, "delivered", false);
                }}
                className="py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition"
              >
                ยังไม่ได้รับ (ติดป้ายเตือนไว้)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3d0d18]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-2 border-[#7b1e34]/20 rounded-t-3xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-pink-200">
              <h2 className="text-base font-bold text-[#581322]">
                {editingTask ? "แก้ไขรายละเอียดงาน" : "เพิ่มคิวงานใหม่"}
              </h2>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-purple-500 hover:text-[#7b1e34] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    ชื่องาน (Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="เช่น กรอบรูปป๊อปอัพแต่งงาน"
                    className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3.5 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    ชื่อลูกค้า (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="เช่น คุณพลอย (Line / IG)"
                    className="w-full bg-sky-50/50 border border-sky-200 rounded-xl px-3.5 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    ขนาดงาน
                  </label>
                  <select
                    value={formWorkSize}
                    onChange={(e) =>
                      setFormWorkSize(e.target.value as WorkSize)
                    }
                    className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  >
                    {DEFAULT_WORK_SIZES.map((size) => {
                      const used = tasks.filter(
                        (t) =>
                          t.work_size === size && t.id !== editingTask?.id
                      ).length;
                      const max = quotas[size] ?? 10;
                      return (
                        <option key={size} value={size}>
                          {size} ({used}/{max})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    สถานะ (Status)
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as TaskStatus)
                    }
                    className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    ความสำคัญ
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as TaskPriority)
                    }
                    className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  >
                    <option value="high">High (ด่วน)</option>
                    <option value="medium">Medium (กลาง)</option>
                    <option value="low">Low (ทั่วไป)</option>
                  </select>
                </div>
              </div>

              {/* Price & Deposit Section */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#581322]">
                    ข้อมูลราคาและการมัดจำ
                  </span>
                  <span className="text-xs text-purple-800 font-medium">
                    คำนวณยอดคงเหลืออัตโนมัติ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#581322] mb-1">
                      ราคาที่ตกลงกับลูกค้า (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formAgreedPrice}
                      onChange={(e) => setFormAgreedPrice(e.target.value)}
                      placeholder="เช่น 2500"
                      className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#581322] mb-1">
                      สถานะมัดจำ
                    </label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => {
                        const nextStatus = e.target.value as PaymentStatus;
                        setFormPaymentStatus(nextStatus);
                        const price = Number(formAgreedPrice) || 0;
                        if (nextStatus === "unpaid_deposit") {
                          setFormDepositAmount("0");
                        } else if (nextStatus === "fully_paid") {
                          setFormDepositAmount(String(price));
                        } else if (
                          nextStatus === "deposit_paid" &&
                          (!Number(formDepositAmount) ||
                            Number(formDepositAmount) === 0)
                        ) {
                          setFormDepositAmount(String(Math.round(price * 0.5)));
                        }
                      }}
                      className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                    >
                      <option value="unpaid_deposit">ยังไม่เก็บมัดจำ</option>
                      <option value="deposit_paid">เก็บมัดจำแล้ว</option>
                      <option value="fully_paid">ชำระครบแล้ว (100%)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#581322]">
                        ยอดมัดจำที่รับแล้ว (บาท)
                      </label>
                      {formPaymentStatus === "deposit_paid" &&
                        Number(formAgreedPrice) > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormDepositAmount(
                                String(
                                  Math.round(Number(formAgreedPrice) * 0.5)
                                )
                              )
                            }
                            className="text-[10px] text-[#7b1e34] font-bold hover:underline"
                          >
                            คิด 50%
                          </button>
                        )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      disabled={formPaymentStatus !== "deposit_paid"}
                      value={
                        formPaymentStatus === "unpaid_deposit"
                          ? "0"
                          : formPaymentStatus === "fully_paid"
                          ? formAgreedPrice
                          : formDepositAmount
                      }
                      onChange={(e) => setFormDepositAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-pink-200 disabled:opacity-50 rounded-xl px-3 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                    />
                  </div>
                </div>

                {/* Auto-calculated Remaining Balance Banner */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs">
                  <span className="text-[#581322] font-semibold">
                    ยอดที่ต้องเก็บเพิ่มเมื่อส่งมอบงาน:
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      modalRemainingPreview > 0
                        ? "text-[#7b1e34]"
                        : "text-sky-700"
                    }`}
                  >
                    ฿{formatTHB(modalRemainingPreview)} บาท
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    ประจำเดือน
                  </label>
                  <input
                    type="month"
                    required
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#581322] mb-1">
                    วันครบกำหนดทำเสร็จ
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7b1e34] mb-1">
                    วันที่ต้องส่งถึงมือลูกค้า *
                  </label>
                  <input
                    type="date"
                    value={formDeliveryDate}
                    onChange={(e) => setFormDeliveryDate(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-300 rounded-xl px-3 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#581322] mb-1">
                  รายละเอียดบรีฟ / ที่อยู่จัดส่ง
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="จดบันทึกบรีฟลูกค้า สีกรอบ ข้อความการ์ด หรือที่อยู่จัดส่ง..."
                  className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3.5 py-2 text-sm text-[#4a1220] focus:outline-none focus:border-[#7b1e34] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-pink-200">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#7b1e34] hover:text-rose-700 font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ลบงานนี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-100 text-purple-900 hover:bg-purple-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7b1e34] hover:bg-[#581322] text-white shadow-md shadow-[#7b1e34]/30"
                  >
                    บันทึกงาน
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase Cloud Settings Modal */}
      {isCloudModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3d0d18]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#7b1e34]/20 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-pink-200">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#7b1e34]" />
                <h2 className="text-base font-bold text-[#581322]">
                  ตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase (Hybrid Mode)
                </h2>
              </div>
              <button
                onClick={() => setIsCloudModalOpen(false)}
                className="text-purple-400 hover:text-[#7b1e34]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#4a1220] leading-relaxed">
              ระบบนี้ออกแบบให้ทำงานได้ทันทีด้วย <strong>LocalStorage</strong>{" "}
              และเมื่อคุณใส่ค่า <strong>Supabase URL</strong> กับ{" "}
              <strong>Anon Key</strong> ระบบจะสลับไปอ่าน/เขียนบน Cloud Database
              ทันที
            </p>

            <form onSubmit={handleSaveCloudSettings} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#581322] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3.5 py-2 text-xs text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#581322] mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-pink-50/40 border border-pink-200 rounded-xl px-3.5 py-2 text-xs text-[#4a1220] focus:outline-none focus:border-[#7b1e34]"
                />
              </div>

              {syncMessage && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 font-medium">
                  {syncMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSyncLocalToCloud}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 hover:bg-sky-200/80"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>ซิงค์งานจากเครื่องขึ้น Supabase</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl("");
                      setSupabaseKey("");
                    }}
                    className="px-3 py-2 rounded-xl text-xs text-purple-700 hover:text-[#581322]"
                  >
                    ล้างค่า (ใช้โหมดในเครื่อง)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7b1e34] text-white hover:bg-[#581322] shadow-sm"
                  >
                    บันทึกการเชื่อมต่อ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
