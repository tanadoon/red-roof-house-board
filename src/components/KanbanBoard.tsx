"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import {
  CreateTaskInput,
  DEFAULT_WORK_SIZES,
  PaymentStatus,
  QuotaMap,
  SHIPPING_CARRIERS,
  ShippingHop,
  ShippingHopDraft,
  ShippingType,
  Task,
  TaskPriority,
  TaskStatus,
  TaskStatusHistory,
  UserRole,
  WorkSize,
} from "@/types/task";
import {
  createTask,
  deleteTask,
  fetchAllShippingHops,
  fetchAllStatusHistory,
  fetchCurrentUserRole,
  fetchQuotas,
  fetchTasksByMonth,
  getDefaultQuotas,
  getSupabaseClient,
  loadQuotas,
  recordTaskStatusTransition,
  reopenDeliveredTimer,
  replaceTaskShippingHops,
  signInWithEmailPassword,
  signInWithGoogleOAuth,
  signOutUser,
  signUpWithEmailPassword,
  stopDeliveredTimer,
  subscribeToRealtimeChanges,
  updateQuota,
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
    title: "ยังไม่เริ่ม",
    accent: "border-t-[#77585e]",
    headerBg: "bg-[#77585e]/10",
    badgeBg: "bg-[#77585e] text-white border border-[#5f454a]",
  },
  {
    id: "draft",
    title: "วาดดราฟ",
    accent: "border-t-[#b794f4]",
    headerBg: "bg-[#f3e8ff]/90",
    badgeBg: "bg-[#e9d5ff] text-[#5b3b8c] border border-[#d8b4fe]",
  },
  {
    id: "cutting",
    title: "รับดราฟแล้ว",
    accent: "border-t-[#789ea5]",
    headerBg: "bg-[#789ea5]/15",
    badgeBg: "bg-[#789ea5] text-white border border-[#61838a]",
  },
  {
    id: "framing",
    title: "ทำกรอบ",
    accent: "border-t-[#cc8867]",
    headerBg: "bg-[#cc8867]/15",
    badgeBg: "bg-[#cc8867] text-white border border-[#b37252]",
  },
  {
    id: "backdrop",
    title: "ทำคน",
    accent: "border-t-[#ffc0b8]",
    headerBg: "bg-[#ffc0b8]/30",
    badgeBg: "bg-[#ffc0b8] text-[#77585e] border border-[#f2a79e]",
  },
  {
    id: "ready_to_ship",
    title: "รอส่ง",
    accent: "border-t-[#ffd590]",
    headerBg: "bg-[#ffd590]/35",
    badgeBg: "bg-[#ffd590] text-[#77585e] border border-[#eec073]",
  },
  {
    id: "delivered",
    title: "ส่งแล้ว",
    accent: "border-t-[#6b9078]",
    headerBg: "bg-[#6b9078]/15",
    badgeBg: "bg-[#6b9078] text-white border border-[#557560]",
  },
];

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; badge: string; dot: string }
> = {
  high: {
    label: "High",
    badge: "bg-[#ca5151]/15 text-[#ca5151] border-[#ca5151]/35 font-semibold",
    dot: "bg-[#ca5151]",
  },
  medium: {
    label: "Medium",
    badge: "bg-[#f3e8ff] text-[#6b46c1] border-[#d8b4fe]",
    dot: "bg-[#9f7aea]",
  },
  low: {
    label: "Low",
    badge: "bg-[#789ea5]/20 text-[#4a6b72] border-[#789ea5]/40",
    dot: "bg-[#789ea5]",
  },
};

const SIZE_BADGE_STYLES: Record<WorkSize, string> = {
  A2: "bg-[#ca5151] text-white border-[#b03e3e]",
  A3: "bg-[#789ea5] text-white border-[#60848b]",
  A4: "bg-[#cc8867] text-white border-[#b57253]",
  A5: "bg-[#77585e] text-white border-[#5e4449]",
  "10x15 cm": "bg-[#f3e8ff] text-[#5b3b8c] border-[#d8b4fe]",
  "20x25 cm": "bg-[#ffc0b8]/80 text-[#5e3a3a] border-[#f2a79e]",
  "25x25 cm": "bg-[#ffd590]/85 text-[#664920] border-[#e8bc72]",
  "35x35 cm": "bg-[#f9e1d3] text-[#77585e] border-[#e6c3af]",
  "อื่นๆ": "bg-[#fdf7f2] text-[#77585e] border-[#cc8867]/60",
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

function getDurationMs(
  startIso?: string | null,
  endIso: string | null = null,
  nowMs = Date.now()
): number {
  if (!startIso) return 0;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : nowMs;
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

function formatDuration(
  startIso?: string | null,
  endIso: string | null = null,
  nowMs = Date.now()
): string {
  const diffMs = getDurationMs(startIso, endIso, nowMs);
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 1) return "< 1 นาที";
  if (totalMins < 60) return `${totalMins} นาที`;
  const totalHours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (totalHours < 24) {
    return mins > 0 ? `${totalHours} ชม. ${mins} น.` : `${totalHours} ชม.`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days} วัน ${hours} ชม.` : `${days} วัน`;
}

function formatDateTimeTH(isoStr?: string | null): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(
    null
  );
  const [authRole, setAuthRole] = useState<UserRole>("viewer");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authNotice, setAuthNotice] = useState<string>("");
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  const isOwner = authRole === "owner";

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allShippingHops, setAllShippingHops] = useState<ShippingHop[]>([]);
  const [allStatusHistory, setAllStatusHistory] = useState<TaskStatusHistory[]>(
    []
  );
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [quotas, setQuotas] = useState<QuotaMap>(getDefaultQuotas);
  const [isEditingQuotas, setIsEditingQuotas] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Mobile/Tablet active column tab
  const [mobileStageTab, setMobileStageTab] = useState<TaskStatus | "all">("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sizeFilter, setSizeFilter] = useState<WorkSize | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "paid_all" | "unpaid_any"
  >("all");
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Delivery Payment Prompt Modal
  const [pendingDeliveryTask, setPendingDeliveryTask] = useState<Task | null>(
    null
  );

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCustomerName, setFormCustomerName] = useState<string>("");
  const [formCustomerPhone, setFormCustomerPhone] = useState<string>("");
  const [formCustomerEmail, setFormCustomerEmail] = useState<string>("");
  const [formShippingAddress, setFormShippingAddress] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
  const [formPriority, setFormPriority] = useState<TaskPriority>("medium");
  const [formWorkSize, setFormWorkSize] = useState<WorkSize>("A4");
  const [formAgreedPrice, setFormAgreedPrice] = useState<string>("");
  const [formPaymentStatus, setFormPaymentStatus] =
    useState<PaymentStatus>("unpaid_deposit");
  const [formDepositAmount, setFormDepositAmount] = useState<string>("");
  const [formShippingPaid, setFormShippingPaid] = useState<boolean>(false);
  const [formMonth, setFormMonth] = useState<string>(selectedMonth);
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formDeliveryDate, setFormDeliveryDate] = useState<string>("");
  const [formHops, setFormHops] = useState<ShippingHopDraft[]>([]);

  const loadBoard = async (
    monthToLoad = selectedMonth,
    roleOverride: UserRole = authRole
  ) => {
    setLoading(true);
    setBannerError(null);
    try {
      const result = await fetchTasksByMonth(monthToLoad, roleOverride);
      setTasks(result.tasks);
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setAuthBusy(true);
    try {
      if (authMode === "login") {
        await signInWithEmailPassword(authEmail, authPassword);
      } else {
        const res = await signUpWithEmailPassword(authEmail, authPassword);
        if (!res.session) {
          setAuthNotice(
            "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี จากนั้นเข้าสู่ระบบ"
          );
        }
      }
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : "ไม่สามารถดำเนินการได้"
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthNotice("");
    setAuthBusy(true);
    try {
      await signInWithGoogleOAuth();
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถเข้าสู่ระบบด้วย Google ได้"
      );
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setAuthUser(null);
    setAuthRole("viewer");
    setTasks([]);
    setAllShippingHops([]);
    setAllStatusHistory([]);
  };

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    const syncSession = async (
      session: { user?: { id: string; email?: string } } | null
    ) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) {
        const role = await fetchCurrentUserRole(user.id);
        if (!mounted) return;
        setAuthRole(role);
        if (role !== "owner") {
          setSelectedMonth(getCurrentMonthStr());
        }
      } else {
        setAuthRole("viewer");
      }
      setAuthLoading(false);
    };

    client.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: authSub } = client.auth.onAuthStateChange(
      (_event, session) => {
        syncSession(session);
      }
    );

    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const effectiveMonth = isOwner ? selectedMonth : getCurrentMonthStr();
    if (!isOwner && selectedMonth !== effectiveMonth) {
      setSelectedMonth(effectiveMonth);
      return;
    }

    setQuotas(loadQuotas());
    fetchQuotas().then(setQuotas).catch(() => {});
    fetchAllShippingHops(authRole).then(setAllShippingHops).catch(() => {});
    fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
    loadBoard(effectiveMonth, authRole);

    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchTasksByMonth(effectiveMonth, authRole)
        .then((res) => {
          setTasks(res.tasks);
        })
        .catch(() => {});
      fetchQuotas()
        .then(setQuotas)
        .catch(() => {});
      fetchAllShippingHops(authRole)
        .then(setAllShippingHops)
        .catch(() => {});
      fetchAllStatusHistory()
        .then(setAllStatusHistory)
        .catch(() => {});
    });

    return () => {
      unsubscribe();
    };
  }, [authUser, authRole, selectedMonth]);

  const handleQuotaChange = (size: WorkSize, newLimit: number) => {
    if (!isOwner) return;
    const safeLimit = Math.max(0, Math.min(999, Number(newLimit) || 0));
    const updated = { ...quotas, [size]: safeLimit };
    setQuotas(updated);
    updateQuota(size, safeLimit).catch(() => {});
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
        const matchPhone = (task.customer_phone || "")
          .toLowerCase()
          .includes(q);
        const matchEmail = (task.customer_email || "")
          .toLowerCase()
          .includes(q);
        const matchAddress = (task.shipping_address || "")
          .toLowerCase()
          .includes(q);
        const matchDesc = (task.description || "").toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchCustomer &&
          !matchPhone &&
          !matchEmail &&
          !matchAddress &&
          !matchDesc
        )
          return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (sizeFilter !== "all" && task.work_size !== sizeFilter) {
        return false;
      }
      if (paymentFilter !== "all") {
        const workUnpaid = getRemainingBalance(task) > 0;
        const custShip = allShippingHops
          .filter((h) => h.task_id === task.id)
          .reduce((s, h) => s + (Number(h.customer_cost) || 0), 0);
        const shipUnpaid = custShip > 0 && !task.shipping_paid;
        const isAllPaid = !workUnpaid && !shipUnpaid;
        if (paymentFilter === "paid_all" && !isAllPaid) return false;
        if (paymentFilter === "unpaid_any" && isAllPaid) return false;
      }
      if (onlyOverdue) {
        const checkDate = task.delivery_date || task.due_date;
        if (getDueStatus(checkDate, task.status) !== "overdue") {
          return false;
        }
      }
      return true;
    });
  }, [
    tasks,
    allShippingHops,
    searchQuery,
    priorityFilter,
    sizeFilter,
    paymentFilter,
    onlyOverdue,
  ]);

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

    const getTaskCustShip = (taskId: string) =>
      allShippingHops
        .filter((h) => h.task_id === taskId)
        .reduce((s, h) => s + (Number(h.customer_cost) || 0), 0);

    const totalRevenue = tasks.reduce(
      (sum, t) => sum + (Number(t.agreed_price) || 0),
      0
    );
    const totalRemainingWorkToCollect = tasks.reduce(
      (sum, t) => sum + getRemainingBalance(t),
      0
    );
    const totalCollected = Math.max(
      0,
      totalRevenue - totalRemainingWorkToCollect
    );
    const totalRemainingShippingToCollect = tasks.reduce((sum, t) => {
      if (t.shipping_paid) return sum;
      return sum + getTaskCustShip(t.id);
    }, 0);
    const totalRemainingToCollect =
      totalRemainingWorkToCollect + totalRemainingShippingToCollect;
    const deliveredUnpaidCount = tasks.filter((t) => {
      if (t.status !== "delivered") return false;
      const workUnpaid = getRemainingBalance(t) > 0;
      const shipUnpaid = !t.shipping_paid && getTaskCustShip(t.id) > 0;
      return workUnpaid || shipUnpaid;
    }).length;

    return {
      total,
      done,
      inProgress,
      overdue,
      percent,
      totalRevenue,
      totalCollected,
      totalRemainingWorkToCollect,
      totalRemainingShippingToCollect,
      totalRemainingToCollect,
      deliveredUnpaidCount,
    };
  }, [tasks, allShippingHops]);

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

  const monthlyShippingStats = useMemo(() => {
    const monthHops = allShippingHops.filter((h) =>
      (h.shipped_at || "").startsWith(selectedMonth)
    );
    const shopTotal = monthHops.reduce(
      (s, h) => s + (Number(h.shop_cost) || 0),
      0
    );
    const customerTotal = monthHops.reduce(
      (s, h) => s + (Number(h.customer_cost) || 0),
      0
    );
    const normalTotal = monthHops
      .filter((h) => (h.shipping_type || "normal") === "normal")
      .reduce(
        (s, h) =>
          s + (Number(h.shop_cost) || 0) + (Number(h.customer_cost) || 0),
        0
      );
    const specialTotal = monthHops
      .filter((h) => h.shipping_type === "special")
      .reduce(
        (s, h) =>
          s + (Number(h.shop_cost) || 0) + (Number(h.customer_cost) || 0),
        0
      );
    return {
      total: shopTotal + customerTotal,
      shopTotal,
      customerTotal,
      normalTotal,
      specialTotal,
      hopCount: monthHops.length,
    };
  }, [allShippingHops, selectedMonth]);

  const modalShippingTotals = useMemo(() => {
    const shopTotal = formHops.reduce(
      (s, h) => s + (Number(h.shop_cost) || 0),
      0
    );
    const customerTotal = formHops.reduce(
      (s, h) => s + (Number(h.customer_cost) || 0),
      0
    );
    return { shopTotal, customerTotal, total: shopTotal + customerTotal };
  }, [formHops]);

  const isNormalCarrier = (carrier: string) =>
    carrier === "Flash" || carrier === "KEX";
  const isSpecialShippingLocked = (hops: ShippingHopDraft[]) =>
    hops.length > 1 || (hops.length === 1 && !isNormalCarrier(hops[0].carrier));

  const addEmptyHop = (
    carrier = "Flash",
    shippingType: ShippingType = "normal",
    routeNote = ""
  ) => {
    setFormHops((prev) => {
      const next: ShippingHopDraft[] = [
        ...prev,
        {
          hop_order: prev.length + 1,
          carrier,
          shipping_type: shippingType,
          route_note: routeNote,
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: getTodayStr(),
        },
      ];
      if (isSpecialShippingLocked(next)) {
        return next.map((h) => ({ ...h, shipping_type: "special" as const }));
      }
      return next;
    });
  };

  const applyShippingPreset = (presetType: "normal" | "nca_grab" | "inter") => {
    const today = getTodayStr();
    if (presetType === "normal") {
      setFormHops([
        {
          hop_order: 1,
          carrier: "Flash",
          shipping_type: "normal",
          route_note: "ร้าน → ลูกค้า",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
      ]);
    } else if (presetType === "nca_grab") {
      setFormHops([
        {
          hop_order: 1,
          carrier: "นครชัยแอร์",
          shipping_type: "special",
          route_note: "ร้าน → กรุงเทพฯ",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
        {
          hop_order: 2,
          carrier: "Grab",
          shipping_type: "special",
          route_note: "กรุงเทพฯ → ลูกค้า",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
      ]);
    } else if (presetType === "inter") {
      setFormHops([
        {
          hop_order: 1,
          carrier: "นครชัยแอร์",
          shipping_type: "special",
          route_note: "ร้าน → กรุงเทพฯ",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
        {
          hop_order: 2,
          carrier: "Lalamove",
          shipping_type: "special",
          route_note: "กรุงเทพฯ → บ้านน้องดุล",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
        {
          hop_order: 3,
          carrier: "DHL",
          shipping_type: "special",
          route_note: "ไทย → ต่างประเทศ",
          tracking_no: "",
          total_cost: 0,
          shop_cost: 0,
          customer_cost: 0,
          shipped_at: today,
        },
      ]);
    }
  };

  const updateHopField = (
    idx: number,
    field: keyof ShippingHopDraft,
    value: string | number
  ) => {
    setFormHops((prev) => {
      if (field === "carrier" && idx === 0) {
        const nextCarrier = String(value);
        const next = prev.map((h, i) =>
          i === 0 ? { ...h, carrier: nextCarrier } : h
        );
        if (isSpecialShippingLocked(next)) {
          return next.map((h) => ({ ...h, shipping_type: "special" as const }));
        }
        return next.map((h) => ({ ...h, shipping_type: "normal" as const }));
      }

      if (field === "shipping_type" && isSpecialShippingLocked(prev)) {
        return prev;
      }

      return prev.map((h, i) => {
        if (i !== idx) return h;

        if (field === "total_cost") {
          const num = Math.max(0, Number(value) || 0);
          if (num === 0) {
            return { ...h, total_cost: 0, shop_cost: 0, customer_cost: 0 };
          }
          const curCustomer = Number(h.customer_cost) || 0;
          if (curCustomer > 0 && curCustomer <= num) {
            return {
              ...h,
              total_cost: num,
              shop_cost: num - curCustomer,
              customer_cost: curCustomer,
            };
          }
          return { ...h, total_cost: num, shop_cost: num, customer_cost: 0 };
        }

        if (field === "shop_cost") {
          const num = Math.max(0, Number(value) || 0);
          const curTotal = Number(h.total_cost) || 0;
          if (curTotal > 0) {
            if (num <= curTotal) {
              return { ...h, shop_cost: num, customer_cost: curTotal - num };
            }
            return { ...h, total_cost: num, shop_cost: num, customer_cost: 0 };
          }
          const curCustomer = Number(h.customer_cost) || 0;
          return { ...h, shop_cost: num, total_cost: num + curCustomer };
        }

        if (field === "customer_cost") {
          const num = Math.max(0, Number(value) || 0);
          const curTotal = Number(h.total_cost) || 0;
          if (curTotal > 0) {
            if (num <= curTotal) {
              return { ...h, customer_cost: num, shop_cost: curTotal - num };
            }
            return { ...h, total_cost: num, customer_cost: num, shop_cost: 0 };
          }
          const curShop = Number(h.shop_cost) || 0;
          return { ...h, customer_cost: num, total_cost: curShop + num };
        }

        return { ...h, [field]: value };
      });
    });
  };

  const removeHop = (idx: number) => {
    setFormHops((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (isSpecialShippingLocked(next)) {
        return next.map((h) => ({ ...h, shipping_type: "special" as const }));
      }
      if (next.length === 1 && isNormalCarrier(next[0].carrier)) {
        return next.map((h) => ({ ...h, shipping_type: "normal" as const }));
      }
      return next;
    });
  };

  // Open Modal for New Task
  const openCreateModal = (defaultStatus: TaskStatus = "todo") => {
    if (!isOwner) return;
    setEditingTask(null);
    setFormTitle("");
    setFormCustomerName("");
    setFormCustomerPhone("");
    setFormCustomerEmail("");
    setFormShippingAddress("");
    setFormDesc("");
    setFormStatus(defaultStatus);
    setFormPriority("medium");
    setFormWorkSize("A4");
    setFormAgreedPrice("");
    setFormPaymentStatus("unpaid_deposit");
    setFormDepositAmount("");
    setFormShippingPaid(false);
    setFormMonth(selectedMonth);
    setFormDueDate(`${selectedMonth}-20`);
    setFormDeliveryDate(`${selectedMonth}-25`);
    setFormHops([]);
    setIsTaskModalOpen(true);
  };

  // Open Modal for Editing Task
  const openEditModal = (task: Task) => {
    if (!isOwner) return;
    setEditingTask(task);
    setFormTitle(task.title);
    setFormCustomerName(task.customer_name || "");
    setFormCustomerPhone(task.customer_phone || "");
    setFormCustomerEmail(task.customer_email || "");
    setFormShippingAddress(task.shipping_address || "");
    setFormDesc(task.description || "");
    setFormStatus(task.status || "todo");
    setFormPriority(task.priority || "medium");
    setFormWorkSize(task.work_size || "A4");
    setFormAgreedPrice(String(task.agreed_price ?? ""));
    setFormPaymentStatus(task.payment_status || "unpaid_deposit");
    setFormDepositAmount(String(task.deposit_amount ?? ""));
    setFormShippingPaid(Boolean(task.shipping_paid));
    setFormMonth(task.month);
    setFormDueDate(task.due_date || "");
    setFormDeliveryDate(task.delivery_date || "");
    const existingHops = allShippingHops
      .filter((h) => h.task_id === task.id)
      .sort((a, b) => (a.hop_order || 0) - (b.hop_order || 0))
      .map((h) => ({
        ...h,
        total_cost: (Number(h.shop_cost) || 0) + (Number(h.customer_cost) || 0),
      }));
    setFormHops(
      isSpecialShippingLocked(existingHops)
        ? existingHops.map((h) => ({ ...h, shipping_type: "special" as const }))
        : existingHops
    );
    setIsTaskModalOpen(true);
  };

  const modalRemainingPreview = useMemo(() => {
    const price = Number(formAgreedPrice) || 0;
    const deposit = Number(formDepositAmount) || 0;
    if (formPaymentStatus === "fully_paid") return 0;
    if (formPaymentStatus === "deposit_paid") return Math.max(0, price - deposit);
    return price;
  }, [formAgreedPrice, formPaymentStatus, formDepositAmount]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCustomerPhone.trim()) return;

    const agreedPriceNum = Math.max(0, Number(formAgreedPrice) || 0);
    const depositNum =
      formPaymentStatus === "unpaid_deposit"
        ? 0
        : formPaymentStatus === "fully_paid"
        ? agreedPriceNum
        : Math.min(agreedPriceNum, Math.max(0, Number(formDepositAmount) || 0));

    try {
      let savedTaskId = editingTask ? editingTask.id : "";
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formTitle.trim(),
          customer_name: formCustomerName.trim(),
          customer_phone: formCustomerPhone.trim(),
          customer_email: formCustomerEmail.trim(),
          shipping_address: formShippingAddress.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          work_size: formWorkSize,
          agreed_price: agreedPriceNum,
          payment_status: formPaymentStatus,
          deposit_amount: depositNum,
          shipping_paid: formShippingPaid,
          month: formMonth,
          due_date: formDueDate || null,
          delivery_date: formDeliveryDate || null,
        });
        const isNowAllPaid =
          getRemainingBalance({
            agreed_price: agreedPriceNum,
            payment_status: formPaymentStatus,
            deposit_amount: depositNum,
          }) === 0 &&
          (modalShippingTotals.customerTotal === 0 || formShippingPaid);
        if (editingTask.status !== formStatus) {
          await recordTaskStatusTransition(
            editingTask.id,
            formStatus,
            formStatus === "delivered" && isNowAllPaid
          );
        } else if (formStatus === "delivered") {
          if (isNowAllPaid) {
            await stopDeliveredTimer(editingTask.id);
          } else {
            await reopenDeliveredTimer(editingTask.id);
          }
        }
      } else {
        const payload: CreateTaskInput = {
          title: formTitle.trim(),
          customer_name: formCustomerName.trim(),
          customer_phone: formCustomerPhone.trim(),
          customer_email: formCustomerEmail.trim(),
          shipping_address: formShippingAddress.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          work_size: formWorkSize,
          agreed_price: agreedPriceNum,
          payment_status: formPaymentStatus,
          deposit_amount: depositNum,
          shipping_paid: formShippingPaid,
          month: formMonth,
          due_date: formDueDate || null,
          delivery_date: formDeliveryDate || null,
        };
        const created = await createTask(payload);
        savedTaskId = created.id;
        const isNewAllPaid =
          getRemainingBalance({
            agreed_price: agreedPriceNum,
            payment_status: formPaymentStatus,
            deposit_amount: depositNum,
          }) === 0 &&
          (modalShippingTotals.customerTotal === 0 || formShippingPaid);
        await recordTaskStatusTransition(
          created.id,
          formStatus,
          formStatus === "delivered" && isNewAllPaid
        );
      }

      if (savedTaskId) {
        await replaceTaskShippingHops(savedTaskId, formHops);
      }

      setIsTaskModalOpen(false);
      await loadBoard(selectedMonth);
      fetchAllShippingHops().then(setAllShippingHops).catch(() => {});
      fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
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

  const getTaskCustomerShippingCost = (taskId: string) =>
    allShippingHops
      .filter((h) => h.task_id === taskId)
      .reduce((sum, h) => sum + (Number(h.customer_cost) || 0), 0);

  const commitStatusChange = async (
    taskId: string,
    newStatus: TaskStatus,
    alsoMarkPaid = false,
    alsoMarkShippingPaid = false
  ) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updatedMonth =
      newStatus === "delivered" && target.month < selectedMonth
        ? selectedMonth
        : target.month;

    const extraPayment: Partial<Task> = {
      ...(alsoMarkPaid
        ? {
            payment_status: "fully_paid",
            deposit_amount: Number(target.agreed_price) || 0,
          }
        : {}),
      ...(alsoMarkShippingPaid ? { shipping_paid: true } : {}),
    };

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
      if (target.status !== newStatus) {
        const afterWorkPaid =
          alsoMarkPaid || getRemainingBalance(target) === 0;
        const custShip = getTaskCustomerShippingCost(taskId);
        const afterShipPaid =
          custShip === 0 ||
          alsoMarkShippingPaid ||
          Boolean(target.shipping_paid);
        await recordTaskStatusTransition(
          taskId,
          newStatus,
          newStatus === "delivered" && afterWorkPaid && afterShipPaid
        );
        fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
      }
    } catch (err: unknown) {
      await loadBoard(selectedMonth);
      alert(err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!isOwner) return;
    const target = tasks.find((t) => t.id === taskId);
    if (!target || target.status === newStatus) return;

    const hasUnpaidWork = getRemainingBalance(target) > 0;
    const custShipCost = getTaskCustomerShippingCost(target.id);
    const hasUnpaidShipping = custShipCost > 0 && !target.shipping_paid;

    if (newStatus === "delivered" && (hasUnpaidWork || hasUnpaidShipping)) {
      setPendingDeliveryTask(target);
      return;
    }

    await commitStatusChange(taskId, newStatus, false, false);
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
      if (task.status === "delivered") {
        const custShip = getTaskCustomerShippingCost(task.id);
        if (custShip === 0 || task.shipping_paid) {
          await stopDeliveredTimer(task.id);
          fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
        }
      }
    } catch {
      await loadBoard(selectedMonth);
    }
  };

  const handleToggleShippingPaid = async (task: Task, paid: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, shipping_paid: paid } : t))
    );
    try {
      await updateTask(task.id, { shipping_paid: paid });
      if (task.status === "delivered") {
        if (paid && getRemainingBalance(task) === 0) {
          await stopDeliveredTimer(task.id);
          fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
        } else if (!paid) {
          await reopenDeliveredTimer(task.id);
          fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
        }
      }
    } catch {
      await loadBoard(selectedMonth);
    }
  };

  const handleMarkAllPaid = async (task: Task) => {
    const price = Number(task.agreed_price) || 0;
    const updates: Partial<Task> = {
      payment_status: "fully_paid",
      deposit_amount: price,
      shipping_paid: true,
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t))
    );
    try {
      await updateTask(task.id, updates);
      if (task.status === "delivered") {
        await stopDeliveredTimer(task.id);
        fetchAllStatusHistory().then(setAllStatusHistory).catch(() => {});
      }
    } catch {
      await loadBoard(selectedMonth);
    }
  };

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

  const visibleColumns = useMemo(() => {
    if (mobileStageTab === "all") return COLUMNS;
    return COLUMNS.filter((c) => c.id === mobileStageTab);
  }, [mobileStageTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/95 border-2 border-[#f9e1d3] rounded-3xl p-8 shadow-xl text-center space-y-3 max-w-sm w-full">
          <img
            src="/logo-v2.jpg?v=2"
            alt="Redroof House"
            className="h-16 w-auto mx-auto rounded-xl"
          />
          <p className="text-sm font-bold text-[#77585e]">
            กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
          </p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/95 border-2 border-[#f9e1d3] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-5">
          <div className="text-center space-y-2">
            <img
              src="/logo-v2.jpg?v=2"
              alt="Redroof House Logo"
              className="h-16 w-auto mx-auto rounded-2xl object-contain bg-white border border-[#f9e1d3] px-3 py-1.5 shadow-sm"
            />
            <h1 className="text-lg font-bold text-[#77585e]">
              Red Roof House Board
            </h1>
            <p className="text-xs text-[#789ea5] font-medium">
              เข้าสู่ระบบ
            </p>
          </div>

          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#fdf7f2] border-2 border-[#f9e1d3] hover:border-[#cc8867] text-xs sm:text-sm font-bold text-[#77585e] flex items-center justify-center gap-2.5 shadow-sm transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 20.4 7.4 23 12 23z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          <div className="flex items-center gap-3 text-[11px] text-[#77585e]/60">
            <div className="h-px bg-[#f9e1d3] flex-1" />
            <span>หรือใช้อีเมล</span>
            <div className="h-px bg-[#f9e1d3] flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f9e1d3]/50">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthNotice("");
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition ${
                authMode === "login"
                  ? "bg-white text-[#ca5151] shadow-sm"
                  : "text-[#77585e]/75"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setAuthNotice("");
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition ${
                authMode === "signup"
                  ? "bg-white text-[#ca5151] shadow-sm"
                  : "text-[#77585e]/75"
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#77585e] mb-1">
                อีเมล
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77585e] mb-1">
                รหัสผ่าน
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
              />
            </div>

            {authError && (
              <p className="text-xs font-semibold text-[#ca5151] bg-[#ffc0b8]/35 border border-[#ca5151]/40 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}
            {authNotice && (
              <p className="text-xs font-semibold text-[#4c6b57] bg-[#6b9078]/15 border border-[#6b9078]/40 rounded-xl px-3 py-2">
                {authNotice}
              </p>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-2.5 px-4 rounded-xl bg-[#ca5151] hover:bg-[#b54242] text-white text-sm font-bold shadow-md shadow-[#ca5151]/25 transition disabled:opacity-50"
            >
              {authBusy
                ? "กำลังดำเนินการ..."
                : authMode === "login"
                ? "เข้าสู่ระบบ"
                : "สมัครสมาชิก"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#4a3539] flex flex-col">
      {/* Top Navigation Header (No Cloud DB Settings Button) */}
      <header className="sticky top-0 z-30 border-b-2 border-[#f9e1d3] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1850px] mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo-v2.jpg?v=2"
              alt="Redroof House Logo"
              className="h-12 sm:h-14 w-auto rounded-xl object-contain bg-white border border-[#f9e1d3] px-2 py-1 shadow-sm shrink-0"
            />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#77585e]">
                Red Roof House Board
              </h1>
            </div>
          </div>

          {/* Month Switcher (Locked for Viewer) */}
          <div className="flex items-center gap-1.5 bg-[#f9e1d3]/60 border border-[#cc8867]/30 rounded-xl p-1.5 w-full sm:w-auto justify-between sm:justify-start">
            {isOwner ? (
              <>
                <button
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                  className="p-1.5 rounded-lg hover:bg-[#f9e1d3] text-[#77585e] transition"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="w-4 h-4 text-[#ca5151] hidden sm:inline" />
                  <span className="text-xs sm:text-sm font-bold text-[#77585e] text-center">
                    {formatThaiMonth(selectedMonth)}
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) =>
                      e.target.value && setSelectedMonth(e.target.value)
                    }
                    className="bg-white text-xs font-semibold text-[#77585e] rounded-lg px-2 py-1 border border-[#cc8867]/40 focus:outline-none focus:border-[#ca5151]"
                  />
                </div>
                <button
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                  className="p-1.5 rounded-lg hover:bg-[#f9e1d3] text-[#77585e] transition"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1">
                <Calendar className="w-4 h-4 text-[#ca5151]" />
                <span className="text-xs sm:text-sm font-bold text-[#77585e]">
                  เดือนปัจจุบัน: {formatThaiMonth(selectedMonth)}
                </span>
              </div>
            )}
          </div>

          {/* Right Action (Role Badge + Sign Out + Owner Add Task) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#fdf7f2] border border-[#f9e1d3] text-xs">
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  isOwner
                    ? "bg-[#ca5151]/15 text-[#ca5151]"
                    : "bg-[#789ea5]/20 text-[#4a6b72]"
                }`}
              >
                {isOwner ? "Owner" : "Viewer"}
              </span>
              <span className="text-[11px] text-[#77585e]/80 max-w-[140px] truncate hidden md:inline">
                {authUser.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] font-bold text-[#ca5151] hover:underline ml-1"
              >
                ออกจากระบบ
              </button>
            </div>

            {isOwner && (
              <button
                onClick={() => openCreateModal("todo")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#ca5151] hover:bg-[#b03e3e] text-white shadow-md shadow-[#ca5151]/25 transition"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มงานใหม่</span>
              </button>
            )}
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
        {/* Work Size Quota Dashboard (8 Sizes) */}
        <div className="bg-white/90 backdrop-blur-sm border border-[#cc8867]/25 rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-[#ca5151]" />
              <h2 className="text-xs sm:text-sm font-bold text-[#77585e]">
                โควต้างานแต่ละขนาด — {formatThaiMonth(selectedMonth)}
              </h2>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsEditingQuotas((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isEditingQuotas
                    ? "bg-[#77585e] text-white border-[#77585e] shadow-sm"
                    : "bg-[#f3e8ff] text-[#5b3b8c] border-[#d8b4fe] hover:bg-[#e9d5ff]"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>
                  {isEditingQuotas ? "บันทึกโควต้าเรียบร้อย" : "ปรับจำนวนโควต้า"}
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
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
                  className={`rounded-xl p-2.5 border transition ${
                    !isEditingQuotas ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "bg-[#f9e1d3]/60 border-[#ca5151] ring-2 ring-[#ca5151]/30"
                      : q.isFull
                      ? "bg-[#ffc0b8]/35 border-[#ca5151]"
                      : q.isNearFull
                      ? "bg-[#ffd590]/35 border-[#cc8867]"
                      : "bg-white border-[#f9e1d3] hover:border-[#cc8867]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                        SIZE_BADGE_STYLES[q.size]
                      }`}
                    >
                      {q.size}
                    </span>

                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          q.isFull ? "text-[#ca5151]" : "text-[#77585e]"
                        }`}
                      >
                        {q.used}
                      </span>
                      <span className="text-[10px] text-[#77585e]/70">
                        /{q.limit}
                      </span>
                    </div>
                  </div>

                  <div className="mb-1.5">
                    {q.isFull ? (
                      <span className="text-[10px] font-bold text-[#ca5151]">
                        เต็มแล้ว!
                      </span>
                    ) : q.isNearFull ? (
                      <span className="text-[10px] font-semibold text-[#cc8867]">
                        เหลือ {q.remaining} คิว
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#789ea5] font-semibold">
                        ว่าง {q.remaining} คิว
                      </span>
                    )}
                  </div>

                  {/* Solid Color Progress Bar */}
                  <div className="w-full h-1.5 bg-[#f9e1d3] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        q.isFull
                          ? "bg-[#ca5151]"
                          : q.isNearFull
                          ? "bg-[#cc8867]"
                          : "bg-[#789ea5]"
                      }`}
                      style={{ width: `${q.percent}%` }}
                    />
                  </div>

                  {/* Inline Quota Limit Editor */}
                  {isEditingQuotas && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-[#f9e1d3] flex items-center justify-between gap-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleQuotaChange(q.size, q.limit - 1)}
                        className="w-5 h-5 rounded bg-[#77585e] text-white text-xs font-bold"
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
                        className="w-10 bg-white border border-[#cc8867] rounded px-1 py-0.5 text-center text-[11px] font-bold text-[#77585e]"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuotaChange(q.size, q.limit + 1)}
                        className="w-5 h-5 rounded bg-[#77585e] text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Progress & Financial Summary Cards */}
        <div
          className={`grid gap-2.5 sm:gap-3.5 ${
            isOwner ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2"
          }`}
        >
          <div className="bg-white/90 border border-[#789ea5]/45 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#77585e] font-semibold mb-1.5">
              <span>ส่งงานแล้วเดือนนี้</span>
              <span className="font-bold text-[#5d878f] text-sm">
                {stats.percent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#789ea5]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#789ea5] transition-all duration-300"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-[#77585e]/80 mt-2">
              ส่งแล้ว {stats.done} / {stats.total} งาน (กำลังทำ {stats.inProgress})
            </p>
          </div>

          {isOwner && (
            <>
              <div className="bg-white/90 border border-[#789ea5]/40 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
                <p className="text-xs text-[#789ea5] font-semibold">
                  ยอดรวมที่ตกลงเดือนนี้
                </p>
                <p className="text-lg sm:text-xl font-bold text-[#77585e] mt-1">
                  ฿{formatTHB(stats.totalRevenue)}
                </p>
                <p className="text-[11px] text-[#789ea5] font-semibold mt-0.5">
                  รับมาแล้ว: ฿{formatTHB(stats.totalCollected)}
                </p>
              </div>

              <div
                className={`rounded-2xl p-3.5 shadow-sm flex flex-col justify-between border ${
                  stats.deliveredUnpaidCount > 0
                    ? "bg-[#ffd590]/35 border-[#cc8867]"
                    : "bg-white/90 border-[#d8b4fe]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-[#6b46c1] font-semibold">
                    รอเก็บส่วนที่เหลือตอนส่ง
                  </p>
                  {stats.deliveredUnpaidCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ca5151] text-white">
                      🚨 ส่งแล้วค้างจ่าย {stats.deliveredUnpaidCount} งาน
                    </span>
                  )}
                </div>
                <p className="text-lg sm:text-xl font-bold text-[#ca5151] mt-1">
                  ฿{formatTHB(stats.totalRemainingToCollect)}
                </p>
                <p className="text-[11px] text-[#77585e]/80 mt-0.5">
                  {stats.totalRemainingShippingToCollect > 0
                    ? `ค่างาน ฿${formatTHB(stats.totalRemainingWorkToCollect)} • ค่าส่ง ฿${formatTHB(stats.totalRemainingShippingToCollect)}`
                    : "ยอดค้างชำระเมื่อส่งมอบ"}
                </p>
              </div>
            </>
          )}

          {/* Overdue Card: Dimmed & No Icon when 0 */}
          <div
            onClick={() => {
              if (stats.overdue > 0 || onlyOverdue) {
                setOnlyOverdue((v) => !v);
              }
            }}
            className={`rounded-2xl p-3.5 flex items-center justify-between border transition ${
              onlyOverdue
                ? "cursor-pointer bg-[#ca5151] text-white border-[#b03e3e] shadow-sm"
                : stats.overdue > 0
                ? "cursor-pointer bg-[#ffc0b8]/35 border-[#ca5151] shadow-sm"
                : "bg-white/45 border-[#f9e1d3] opacity-55"
            }`}
          >
            <div>
              <p
                className={`text-xs font-semibold flex items-center gap-1 ${
                  onlyOverdue
                    ? "text-white/90"
                    : stats.overdue > 0
                    ? "text-[#77585e]"
                    : "text-slate-400"
                }`}
              >
                <span>เลยกำหนดส่ง</span>
                {onlyOverdue && (
                  <span className="text-[10px] bg-white text-[#ca5151] font-bold px-1.5 py-0.2 rounded">
                    กรองอยู่
                  </span>
                )}
              </p>
              <p
                className={`text-xl sm:text-2xl font-bold mt-1 ${
                  onlyOverdue
                    ? "text-white"
                    : stats.overdue > 0
                    ? "text-[#ca5151]"
                    : "text-slate-400"
                }`}
              >
                {stats.overdue} งาน
              </p>
            </div>
            {stats.overdue > 0 && <span className="text-2xl">🚨</span>}
          </div>

          {/* Monthly Shipping Cost Card (Owner only) */}
          {isOwner && (
            <div className="col-span-2 lg:col-span-1 bg-white/90 border border-[#cc8867]/45 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-[#77585e] font-semibold">
                  ค่าขนส่งเดือนนี้ (วันส่งจริง)
                </p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f9e1d3] text-[#77585e]">
                  {monthlyShippingStats.hopCount} ขั้น
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-[#77585e] mt-1">
                ฿{formatTHB(monthlyShippingStats.total)}
              </p>
              <div className="text-[11px] text-[#77585e]/85 mt-0.5 space-y-0.5">
                <p>
                  ปกติ ฿{formatTHB(monthlyShippingStats.normalTotal)} •
                  ด่วน/พิเศษ ฿{formatTHB(monthlyShippingStats.specialTotal)}
                </p>
                <p className="text-[#77585e]/75">
                  ร้านออก ฿{formatTHB(monthlyShippingStats.shopTotal)} • ลูกค้า ฿
                  {formatTHB(monthlyShippingStats.customerTotal)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 border border-[#f9e1d3] rounded-2xl p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[#77585e]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่องาน, ชื่อลูกค้า, เบอร์โทร หรือที่อยู่..."
                className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#77585e] placeholder:text-[#77585e]/50 focus:outline-none focus:border-[#ca5151] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#789ea5]/15 border border-[#789ea5]/40 rounded-xl px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-[#789ea5]" />
              <span className="text-xs text-[#77585e] font-medium">
                ขนาดงาน:
              </span>
              <select
                value={sizeFilter}
                onChange={(e) =>
                  setSizeFilter(e.target.value as WorkSize | "all")
                }
                className="bg-transparent text-xs font-bold text-[#77585e] focus:outline-none"
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

            <div className="flex items-center gap-1.5 bg-[#f3e8ff] border border-[#d8b4fe] rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[#6b46c1]" />
              <span className="text-xs text-[#77585e] font-medium">
                Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as TaskPriority | "all")
                }
                className="bg-transparent text-xs font-bold text-[#77585e] focus:outline-none"
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

            {isOwner && (
              <div className="flex items-center gap-1.5 bg-[#ffd590]/45 border border-[#cc8867]/50 rounded-xl px-2.5 py-1.5">
                <span className="text-xs text-[#77585e] font-medium">
                  การชำระเงิน:
                </span>
                <select
                  value={paymentFilter}
                  onChange={(e) =>
                    setPaymentFilter(
                      e.target.value as "all" | "paid_all" | "unpaid_any"
                    )
                  }
                  className="bg-transparent text-xs font-bold text-[#77585e] focus:outline-none"
                >
                  <option value="all" className="bg-white">
                    ทั้งหมด
                  </option>
                  <option value="paid_all" className="bg-white">
                    ✓ จ่ายครบทุกอย่างแล้ว
                  </option>
                  <option value="unpaid_any" className="bg-white">
                    🚨 ยังไม่จ่ายค่าสินค้า / ค่าส่ง
                  </option>
                </select>
              </div>
            )}

            {(searchQuery ||
              priorityFilter !== "all" ||
              sizeFilter !== "all" ||
              paymentFilter !== "all" ||
              onlyOverdue) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("all");
                  setSizeFilter("all");
                  setPaymentFilter("all");
                  setOnlyOverdue(false);
                }}
                className="text-xs text-[#ca5151] hover:text-[#77585e] underline px-2 font-semibold"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <button
            onClick={() => loadBoard(selectedMonth)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#77585e] bg-[#f9e1d3]/60 hover:bg-[#f9e1d3] transition"
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
                ? "bg-[#ca5151] text-white border-[#b03e3e] shadow-sm"
                : "bg-white/90 text-[#77585e] border-[#f9e1d3]"
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
                    ? "bg-[#ca5151] text-white border-[#b03e3e] shadow-sm"
                    : "bg-white/90 text-[#77585e] border-[#f9e1d3]"
                }`}
              >
                <span>{col.title}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    mobileStageTab === col.id
                      ? "bg-white/25 text-white"
                      : "bg-[#f9e1d3] text-[#77585e]"
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
                } rounded-2xl bg-white/85 backdrop-blur-sm border-t-4 ${
                  col.accent
                } border-x border-b border-[#f9e1d3] shadow-sm flex flex-col min-h-[520px] transition ${
                  isOver ? "ring-2 ring-[#ca5151] bg-[#f9e1d3]/30" : ""
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3 border-b border-[#f9e1d3] rounded-t-xl flex items-center justify-between ${col.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-[#77585e]">
                      {col.title}
                    </h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => openCreateModal(col.id)}
                      className="p-1.5 rounded-lg bg-white/80 hover:bg-[#ca5151] text-[#77585e] hover:text-white transition shadow-sm"
                      title={`เพิ่มงานใน ${col.title}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-36 rounded-xl border border-dashed border-[#cc8867]/40 bg-[#fdf7f2]/60 flex flex-col items-center justify-center text-[#77585e]/60 text-xs p-3 text-center">
                      <p>ไม่มีงานในสถานะนี้</p>
                      {isOwner && (
                        <button
                          onClick={() => openCreateModal(col.id)}
                          className="mt-1.5 text-[#ca5151] font-semibold hover:underline"
                        >
                          + เพิ่มงาน
                        </button>
                      )}
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
                      const taskHops = isOwner
                        ? allShippingHops
                            .filter((h) => h.task_id === task.id)
                            .sort((a, b) => (a.hop_order || 0) - (b.hop_order || 0))
                        : [];
                      const taskHopShopCost = taskHops.reduce(
                        (s, h) => s + (Number(h.shop_cost) || 0),
                        0
                      );
                      const taskHopCustCost = taskHops.reduce(
                        (s, h) => s + (Number(h.customer_cost) || 0),
                        0
                      );
                      const taskHopTotalCost =
                        taskHopShopCost + taskHopCustCost;
                      const hasCustomerShipping =
                        isOwner && taskHopCustCost > 0;
                      const isShippingUnpaid =
                        hasCustomerShipping && !task.shipping_paid;
                      const isDeliveredButUnpaid =
                        isOwner &&
                        task.status === "delivered" &&
                        (remainingBalance > 0 || isShippingUnpaid);

                      return (
                        <div
                          key={task.id}
                          draggable={isOwner}
                          onDragStart={(e) => {
                            if (!isOwner) return;
                            onDragStart(e, task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={`rounded-2xl border p-3.5 shadow-sm transition space-y-2.5 ${
                            isOwner
                              ? "hover:shadow-md cursor-grab active:cursor-grabbing"
                              : ""
                          } ${
                            isDeliveredButUnpaid
                              ? "border-2 border-[#cc8867] bg-[#ffd590]/20"
                              : task.status === "delivered"
                              ? "border-[#6b9078]/45 bg-[#6b9078]/[0.06] hover:border-[#6b9078]/70"
                              : dueState === "overdue"
                              ? "border-[#ca5151] bg-[#ffc0b8]/20 ring-1 ring-[#ca5151]/20"
                              : "bg-white border-[#f9e1d3] hover:border-[#cc8867]"
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
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#f3e8ff] text-[#5b3b8c] border border-[#d8b4fe]">
                                  ยกมาจาก {task.month}
                                </span>
                              )}

                              {hasCustomerShipping && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f3e8ff] text-[#5b3b8c] border border-[#d8b4fe]">
                                  คิดค่าส่ง ฿{formatTHB(taskHopCustCost)}
                                </span>
                              )}

                              {dueState === "overdue" && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ca5151] text-white animate-pulse">
                                  🚨 เลยกำหนด
                                </span>
                              )}
                            </div>

                            {isOwner && (
                              <button
                                onClick={() => openEditModal(task)}
                                className="text-xs px-1.5 py-0.5 rounded hover:bg-[#f9e1d3]/60 text-[#77585e] hover:text-[#ca5151] font-semibold shrink-0"
                              >
                                แก้ไข
                              </button>
                            )}
                          </div>

                          {/* Row 2: Title, Customer Name, Phone & Shipping Address */}
                          <div className="space-y-1">
                            <h3
                              onClick={() => {
                                if (isOwner) openEditModal(task);
                              }}
                              className={`font-bold text-sm leading-relaxed transition ${
                                isOwner
                                  ? "cursor-pointer hover:text-[#ca5151]"
                                  : ""
                              } ${
                                task.status === "delivered"
                                  ? "text-[#77585e]/75"
                                  : "text-[#4a3539]"
                              }`}
                            >
                              {task.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.customer_name && (
                                <span className="text-xs font-semibold text-[#4a6b72] bg-[#789ea5]/15 border border-[#789ea5]/30 px-2 py-0.5 rounded-md truncate max-w-full">
                                  {task.customer_name}
                                </span>
                              )}
                              {isOwner && task.customer_phone && (
                                <a
                                  href={`tel:${task.customer_phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-bold text-[#77585e] bg-[#f9e1d3]/80 border border-[#cc8867]/40 px-2 py-0.5 rounded-md hover:bg-[#ffd590]/60 transition"
                                >
                                  โทร: {task.customer_phone}
                                </a>
                              )}
                              {isOwner && task.customer_email && (
                                <a
                                  href={`mailto:${task.customer_email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] font-medium text-[#5b3b8c] bg-[#f3e8ff] border border-[#d8b4fe] px-2 py-0.5 rounded-md hover:bg-[#e9d5ff] transition truncate max-w-full"
                                >
                                  {task.customer_email}
                                </a>
                              )}
                            </div>

                            {isOwner && task.shipping_address && (
                              <p className="text-[11px] text-[#77585e]/85 bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2 py-1 line-clamp-2">
                                ที่อยู่: {task.shipping_address}
                              </p>
                            )}

                            {task.description && (
                              <p
                                className={`text-xs text-[#77585e]/80 ${
                                  isOwner
                                    ? "line-clamp-1"
                                    : "line-clamp-3 bg-[#fdf7f2]/70 rounded-lg px-2 py-1 border border-[#f9e1d3]/70"
                                }`}
                              >
                                {task.description}
                              </p>
                            )}

                            {!isOwner && (
                              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-[#77585e]">
                                <span className="bg-[#f9e1d3]/40 px-2 py-0.5 rounded-md">
                                  กำหนดเสร็จ:{" "}
                                  <strong>{formatShortDate(task.due_date)}</strong>
                                </span>
                                <span className="bg-[#f9e1d3]/40 px-2 py-0.5 rounded-md">
                                  ส่งถึงมือลูกค้า:{" "}
                                  <strong>
                                    {formatShortDate(task.delivery_date)}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Row 3: Compact Payment Summary (Owner only) */}
                          {isOwner && (task.status === "delivered" ? (
                            <div
                              className={`p-2.5 rounded-xl border space-y-1.5 ${
                                isDeliveredButUnpaid
                                  ? "bg-[#ffd590]/55 border-[#cc8867]"
                                  : "bg-[#6b9078]/12 border-[#6b9078]/35"
                              }`}
                            >
                              {/* Work Balance Status in Delivered Lane */}
                              <div className="flex items-center justify-between gap-2">
                                {remainingBalance > 0 ? (
                                  <>
                                    <div>
                                      <p className="text-[11px] font-bold text-[#ca5151]">
                                        🚨 ค่างานที่เหลือ: ยังไม่เก็บ
                                      </p>
                                      <p className="text-xs font-bold text-[#77585e]">
                                        ค้าง ฿{formatTHB(remainingBalance)}{" "}
                                        <span className="font-normal text-[10px] text-[#77585e]/75">
                                          (จาก ฿{formatTHB(agreedPrice)})
                                        </span>
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkFullyPaid(task)}
                                      className="shrink-0 text-[11px] px-2 py-1 rounded-lg bg-[#ca5151] hover:bg-[#b03e3e] text-white font-bold shadow-sm transition"
                                    >
                                      เก็บค่างานแล้ว
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[11px] text-[#4a6b72] font-bold">
                                      ✓ ค่างานมัดจำที่เหลือ: เก็บครบแล้ว
                                    </span>
                                    <span className="text-xs font-bold text-[#77585e]">
                                      ฿{formatTHB(agreedPrice)}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Shipping Cost Collection Status in Delivered Lane */}
                              <div className="pt-1 border-t border-[#77585e]/15 flex items-center justify-between gap-2">
                                {hasCustomerShipping ? (
                                  task.shipping_paid ? (
                                    <>
                                      <span className="text-[11px] text-[#4a6b72] font-bold">
                                        ✓ ค่าส่งลูกค้าออก: เก็บแล้ว (฿
                                        {formatTHB(taskHopCustCost)})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleShippingPaid(task, false)
                                        }
                                        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-[#77585e] border border-[#cc8867]/40 transition"
                                      >
                                        ยกเลิก
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[11px] text-[#ca5151] font-bold">
                                        🚨 ค่าส่งลูกค้าออก: ยังไม่เก็บ ฿
                                        {formatTHB(taskHopCustCost)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleShippingPaid(task, true)
                                        }
                                        className="shrink-0 text-[11px] px-2 py-1 rounded-lg bg-[#5b3b8c] hover:bg-[#472c70] text-white font-bold shadow-sm transition"
                                      >
                                        เก็บค่าส่งแล้ว
                                      </button>
                                    </>
                                  )
                                ) : (
                                  <span className="text-[11px] text-[#77585e]/70 font-medium">
                                    ✓ ค่าส่ง: ไม่มีเก็บเพิ่มจากลูกค้า
                                  </span>
                                )}
                              </div>

                              {remainingBalance > 0 && isShippingUnpaid && (
                                <div className="pt-1.5 border-t border-[#cc8867]/40 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-[#ca5151]">
                                    รวมเก็บก้อนเดียว: ฿
                                    {formatTHB(
                                      remainingBalance + taskHopCustCost
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAllPaid(task)}
                                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-[#ca5151] hover:bg-[#b03e3e] text-white font-bold shadow-sm transition"
                                  >
                                    รับครบทั้งก้อน
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {remainingBalance === 0 ? (
                                <div className="px-2.5 py-1.5 rounded-xl bg-[#789ea5]/15 border border-[#789ea5]/35 flex items-center justify-between text-xs">
                                  <span className="text-[#4a6b72] font-semibold">
                                    ค่างานชำระครบแล้ว
                                  </span>
                                  <span className="font-bold text-[#77585e]">
                                    ฿{formatTHB(agreedPrice)}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2 rounded-xl bg-[#f3e8ff]/70 border border-[#d8b4fe] flex items-center justify-between gap-2">
                                  <div className="text-xs">
                                    <span className="text-[#5b3b8c] font-medium">
                                      {paymentStatus === "deposit_paid"
                                        ? "คงเหลือตอนส่ง: "
                                        : "ยังไม่มัดจำ: "}
                                    </span>
                                    <span className="font-bold text-[#ca5151]">
                                      ฿{formatTHB(remainingBalance)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkFullyPaid(task)}
                                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-[#ca5151] hover:bg-[#b03e3e] text-white font-semibold transition"
                                  >
                                    รับครบ
                                  </button>
                                </div>
                              )}

                              {hasCustomerShipping && (
                                <div
                                  className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                                    task.shipping_paid
                                      ? "bg-[#789ea5]/15 border-[#789ea5]/35 text-[#4a6b72]"
                                      : "bg-[#ffd590]/40 border-[#cc8867]/60 text-[#77585e]"
                                  }`}
                                >
                                  <span className="font-semibold">
                                    {task.shipping_paid
                                      ? `✓ เก็บค่าส่งแล้ว: ฿${formatTHB(taskHopCustCost)}`
                                      : `+ ค่าส่งที่ต้องเก็บเพิ่ม: ฿${formatTHB(taskHopCustCost)}`}
                                  </span>
                                  {!task.shipping_paid && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleShippingPaid(task, true)
                                      }
                                      className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-[#5b3b8c] hover:bg-[#472c70] text-white font-semibold transition"
                                    >
                                      เก็บค่าส่งแล้ว
                                    </button>
                                  )}
                                </div>
                              )}

                              {remainingBalance > 0 && isShippingUnpaid && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAllPaid(task)}
                                  className="w-full py-1 px-2.5 rounded-lg bg-[#ca5151] hover:bg-[#b03e3e] text-white text-[11px] font-bold shadow-sm transition"
                                >
                                  รับครบทั้งก้อน (ค่างาน + ค่าส่ง ฿
                                  {formatTHB(
                                    remainingBalance + taskHopCustCost
                                  )}
                                  )
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Row 4: Compact Shipping Hops Summary (Owner only) */}
                          {isOwner && taskHops.length > 0 && (
                            <div
                              onClick={() => openEditModal(task)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#f9e1d3]/45 border border-[#cc8867]/35 text-[11px] cursor-pointer hover:bg-[#f9e1d3]/75 transition"
                            >
                              <div className="flex items-center justify-between gap-1 font-semibold text-[#77585e]">
                                <span className="truncate">
                                  ขนส่ง:{" "}
                                  {taskHops.map((h) => h.carrier).join(" → ")}
                                </span>
                                <span className="shrink-0 font-bold text-[#ca5151]">
                                  ฿{formatTHB(taskHopTotalCost)}
                                </span>
                              </div>
                              {(taskHopShopCost > 0 || taskHopCustCost > 0) && (
                                <div className="text-[10px] text-[#77585e]/80 mt-0.5">
                                  ร้านออก ฿{formatTHB(taskHopShopCost)} •
                                  ลูกค้าออก ฿{formatTHB(taskHopCustCost)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 5: Lane Duration Pill + Footer (Short Delivery Date + Status Dropdown) */}
                          {(() => {
                            const taskHistory = allStatusHistory
                              .filter((h) => h.task_id === task.id)
                              .sort(
                                (a, b) =>
                                  new Date(a.entered_at).getTime() -
                                  new Date(b.entered_at).getTime()
                              );
                            const activeHist =
                              [...taskHistory]
                                .reverse()
                                .find((h) => !h.exited_at) ||
                              taskHistory[taskHistory.length - 1];
                            const enteredAt =
                              activeHist?.entered_at ||
                              task.updated_at ||
                              task.created_at;
                            const isDeliveredPaidStopped =
                              task.status === "delivered" &&
                              !isDeliveredButUnpaid;
                            const stoppedAt = isDeliveredPaidStopped
                              ? activeHist?.exited_at || null
                              : null;
                            const durMs = getDurationMs(
                              enteredAt,
                              stoppedAt,
                              nowTick
                            );
                            const isStaleInLane =
                              (task.status !== "delivered" ||
                                isDeliveredButUnpaid) &&
                              durMs >= 3 * 24 * 60 * 60 * 1000;
                            const durText = formatDuration(
                              enteredAt,
                              stoppedAt,
                              nowTick
                            );
                            return (
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(task)}
                                  title="คลิกเพื่อดูประวัติเวลาทุกเลน"
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition ${
                                    isDeliveredPaidStopped
                                      ? "bg-[#6b9078]/12 text-[#4c6b57] border-[#6b9078]/35"
                                      : task.status === "delivered" &&
                                        isDeliveredButUnpaid
                                      ? "bg-[#ffd590]/60 text-[#ca5151] border-[#cc8867]"
                                      : isStaleInLane
                                      ? "bg-[#ffd590]/60 text-[#ca5151] border-[#cc8867]"
                                      : "bg-[#fdf7f2] text-[#77585e]/85 border-[#f9e1d3] hover:border-[#cc8867]"
                                  }`}
                                >
                                  <span>
                                    {isDeliveredPaidStopped ? "✓" : "⏱"}
                                  </span>
                                  <span>
                                    {isDeliveredPaidStopped
                                      ? stoppedAt
                                        ? `จ่ายครบแล้ว (หยุดที่ ${durText})`
                                        : "จ่ายครบแล้ว (หยุดจับเวลา)"
                                      : task.status === "delivered" &&
                                        isDeliveredButUnpaid
                                      ? `รอเก็บเงิน ${durText}`
                                      : isStaleInLane
                                      ? `ค้างเลนนี้ ${durText}`
                                      : `ในเลนนี้ ${durText}`}
                                  </span>
                                </button>
                                {taskHistory.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(task)}
                                    className="text-[10px] text-[#789ea5] hover:text-[#4a6b72] font-semibold underline"
                                  >
                                    ดูประวัติ ({taskHistory.length})
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          <div className="pt-2 border-t border-[#f9e1d3] flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] shrink-0 ${
                                dueState === "overdue"
                                  ? "text-[#ca5151] font-bold"
                                  : "text-[#77585e]/80 font-medium"
                              }`}
                            >
                              ส่ง: {formatShortDate(task.delivery_date)}
                            </span>

                            {isOwner ? (
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    task.id,
                                    e.target.value as TaskStatus
                                  )
                                }
                                className="bg-[#f9e1d3]/50 border border-[#cc8867]/40 text-[#77585e] font-semibold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#ca5151]"
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
                            ) : (
                              <span className="text-[11px] font-semibold text-[#77585e]/80 px-2 py-0.5 rounded-lg bg-[#f9e1d3]/40">
                                {COLUMNS.find((c) => c.id === task.status)
                                  ?.title || task.status}
                              </span>
                            )}
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
        <div className="fixed inset-0 z-50 bg-[#4a3539]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#ca5151] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ffd590]/60 text-[#ca5151] border border-[#cc8867] mb-2">
                  🚨 แจ้งเตือนยอดค้างชำระก่อนส่งงาน
                </span>
                <h3 className="text-base font-bold text-[#77585e]">
                  {pendingDeliveryTask.title}
                </h3>
                <p className="text-xs text-[#789ea5] font-semibold mt-0.5">
                  ลูกค้า: {pendingDeliveryTask.customer_name || "-"} (
                  {pendingDeliveryTask.customer_phone || "-"})
                </p>
              </div>
              <button
                onClick={() => setPendingDeliveryTask(null)}
                className="text-[#77585e]/60 hover:text-[#ca5151]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const workRem = getRemainingBalance(pendingDeliveryTask);
              const custShip = getTaskCustomerShippingCost(
                pendingDeliveryTask.id
              );
              const shipRem =
                custShip > 0 && !pendingDeliveryTask.shipping_paid
                  ? custShip
                  : 0;
              const totalRem = workRem + shipRem;
              return (
                <>
                  <div className="p-3.5 rounded-xl bg-[#f9e1d3]/50 border border-[#cc8867]/40 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#77585e]">ราคางานที่ตกลง:</span>
                      <span className="font-bold text-[#77585e]">
                        ฿{formatTHB(pendingDeliveryTask.agreed_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#77585e]">
                        ค่างานที่ต้องเก็บเพิ่ม:
                      </span>
                      <span
                        className={`font-bold ${
                          workRem > 0 ? "text-[#ca5151]" : "text-[#4a6b72]"
                        }`}
                      >
                        {workRem > 0
                          ? `฿${formatTHB(workRem)}`
                          : "เก็บครบแล้ว"}
                      </span>
                    </div>
                    {custShip > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#5b3b8c]">
                          ค่าส่งที่ลูกค้าออก (แยกจากราคางาน):
                        </span>
                        <span
                          className={`font-bold ${
                            shipRem > 0 ? "text-[#5b3b8c]" : "text-[#4a6b72]"
                          }`}
                        >
                          {shipRem > 0
                            ? `฿${formatTHB(shipRem)}`
                            : "เก็บค่าส่งแล้ว"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1.5 border-t border-[#cc8867]/30">
                      <span className="font-bold text-[#ca5151]">
                        รวมยอดต้องเก็บทั้งหมด:
                      </span>
                      <span className="font-bold text-[#ca5151]">
                        ฿{formatTHB(totalRem)} บาท
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#77585e] leading-relaxed">
                    คุณกำลังย้ายงานนี้ไปที่สถานะ{" "}
                    <strong>&quot;ส่งแล้ว&quot;</strong>{" "}
                    ลูกค้าได้ชำระค่างานและค่าส่งครบเรียบร้อยแล้วหรือยังครับ?
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const t = pendingDeliveryTask;
                        setPendingDeliveryTask(null);
                        await commitStatusChange(
                          t.id,
                          "delivered",
                          workRem > 0,
                          shipRem > 0
                        );
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ca5151] hover:bg-[#b03e3e] text-white shadow-md transition"
                    >
                      รับครบทั้งหมดแล้ว + ย้ายไปส่งแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const t = pendingDeliveryTask;
                        setPendingDeliveryTask(null);
                        await commitStatusChange(
                          t.id,
                          "delivered",
                          false,
                          false
                        );
                      }}
                      className="py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-[#ffd590]/60 hover:bg-[#ffd590] text-[#77585e] border border-[#cc8867] transition"
                    >
                      ยังไม่ได้รับ (ติดป้ายเตือนไว้)
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#4a3539]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-2 border-[#f9e1d3] rounded-t-3xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f9e1d3]">
              <h2 className="text-base font-bold text-[#77585e]">
                {editingTask ? "แก้ไขรายละเอียดงาน" : "เพิ่มคิวงานใหม่"}
              </h2>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-[#77585e]/60 hover:text-[#ca5151] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#77585e] mb-1">
                  ชื่องาน (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น กรอบรูปป๊อปอัพแต่งงาน"
                  className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    ชื่อลูกค้า (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="เช่น คุณพลอย (Line / IG)"
                    className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#ca5151] mb-1">
                    เบอร์โทรศัพท์ลูกค้า (สำคัญมาก) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full bg-[#ffc0b8]/20 border-2 border-[#ca5151]/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#77585e] mb-1">
                  อีเมลลูกค้า (Email)
                </label>
                <input
                  type="email"
                  value={formCustomerEmail}
                  onChange={(e) => setFormCustomerEmail(e.target.value)}
                  placeholder="เช่น customer@email.com (ถ้ามี)"
                  className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#77585e] mb-1">
                  ที่อยู่จัดส่งของลูกค้า
                </label>
                <textarea
                  rows={2}
                  value={formShippingAddress}
                  onChange={(e) => setFormShippingAddress(e.target.value)}
                  placeholder="กรอกบ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด และรหัสไปรษณีย์..."
                  className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    ขนาดงาน
                  </label>
                  <select
                    value={formWorkSize}
                    onChange={(e) =>
                      setFormWorkSize(e.target.value as WorkSize)
                    }
                    className="w-full bg-[#f3e8ff]/60 border border-[#d8b4fe] rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  >
                    {DEFAULT_WORK_SIZES.map((size) => {
                      const used = tasks.filter(
                        (t) => (t.work_size || "A4") === size
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
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    สถานะ (Status)
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as TaskStatus)
                    }
                    className="w-full bg-[#f3e8ff]/60 border border-[#d8b4fe] rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    ความสำคัญ
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as TaskPriority)
                    }
                    className="w-full bg-[#f3e8ff]/60 border border-[#d8b4fe] rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  >
                    <option value="high">High (ด่วน)</option>
                    <option value="medium">Medium (กลาง)</option>
                    <option value="low">Low (ทั่วไป)</option>
                  </select>
                </div>
              </div>

              {/* Price & Deposit Section */}
              <div className="p-3.5 rounded-2xl bg-[#f3e8ff]/50 border border-[#d8b4fe] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#77585e]">
                    ข้อมูลราคาและการมัดจำ
                  </span>
                  <span className="text-xs text-[#6b46c1] font-medium">
                    คำนวณยอดคงเหลืออัตโนมัติ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#77585e] mb-1">
                      ราคาที่ตกลงกับลูกค้า (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formAgreedPrice}
                      onChange={(e) => setFormAgreedPrice(e.target.value)}
                      placeholder="เช่น 2500"
                      className="w-full bg-white border border-[#f9e1d3] rounded-xl px-3 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#77585e] mb-1">
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
                      className="w-full bg-white border border-[#f9e1d3] rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                    >
                      <option value="unpaid_deposit">ยังไม่เก็บมัดจำ</option>
                      <option value="deposit_paid">เก็บมัดจำแล้ว</option>
                      <option value="fully_paid">ชำระครบแล้ว (100%)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#77585e]">
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
                            className="text-[10px] text-[#ca5151] font-bold hover:underline"
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
                      className="w-full bg-white border border-[#f9e1d3] disabled:opacity-50 rounded-xl px-3 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                    />
                  </div>
                </div>

                {/* Auto-calculated Remaining Balance Banner */}
                <div className="px-3 py-2 rounded-xl bg-white border border-[#d8b4fe] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#77585e] font-semibold">
                      ค่างานคงเหลือที่ต้องเก็บเพิ่ม:
                    </span>
                    <span
                      className={`font-bold ${
                        modalRemainingPreview > 0
                          ? "text-[#ca5151]"
                          : "text-[#789ea5]"
                      }`}
                    >
                      ฿{formatTHB(modalRemainingPreview)} บาท
                    </span>
                  </div>
                  {modalShippingTotals.customerTotal > 0 && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#5b3b8c] font-semibold">
                          ค่าส่งที่ลูกค้าออก (
                          {formShippingPaid ? "เก็บแล้ว" : "ต้องเก็บเพิ่ม"}):
                        </span>
                        <span
                          className={`font-bold ${
                            formShippingPaid
                              ? "text-[#4a6b72]"
                              : "text-[#5b3b8c]"
                          }`}
                        >
                          ฿{formatTHB(modalShippingTotals.customerTotal)} บาท
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#d8b4fe]/60">
                        <span className="text-[#77585e] font-bold">
                          รวมยอดค้างเก็บทั้งหมด (ค่างาน + ค่าส่ง):
                        </span>
                        <span className="text-sm font-bold text-[#ca5151]">
                          ฿
                          {formatTHB(
                            modalRemainingPreview +
                              (formShippingPaid
                                ? 0
                                : modalShippingTotals.customerTotal)
                          )}{" "}
                          บาท
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    ประจำเดือน
                  </label>
                  <input
                    type="month"
                    required
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#77585e] mb-1">
                    วันครบกำหนดทำเสร็จ
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#ca5151] mb-1">
                    วันที่ต้องส่งถึงมือลูกค้า *
                  </label>
                  <input
                    type="date"
                    value={formDeliveryDate}
                    onChange={(e) => setFormDeliveryDate(e.target.value)}
                    className="w-full bg-[#789ea5]/15 border border-[#789ea5] rounded-xl px-3 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#77585e] mb-1">
                  รายละเอียดบรีฟเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="จดบันทึกบรีฟลูกค้า สีกรอบ หรือข้อความการ์ด..."
                  className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-xl px-3.5 py-2 text-sm text-[#4a3539] focus:outline-none focus:border-[#ca5151] focus:bg-white"
                />
              </div>

              {/* Multi-Hop Shipping Log Section */}
              <div className="p-3.5 rounded-2xl bg-[#fdf7f2] border border-[#cc8867]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#77585e]">
                      ประวัติการจัดส่ง &amp; ค่าขนส่ง ({formHops.length} ขั้น)
                    </span>
                    <p className="text-[11px] text-[#77585e]/75">
                      บันทึกได้หลายต่อ (นับยอดรายเดือนตามวันที่ส่งจริงของแต่ละขั้น)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addEmptyHop(
                        "Flash",
                        formHops.length > 0 ? "special" : "normal",
                        ""
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#789ea5] hover:bg-[#61838a] text-white transition"
                  >
                    + เพิ่มขั้นขนส่ง
                  </button>
                </div>

                {/* Quick Preset Templates */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#77585e]/70 self-center mr-1">
                    เทมเพลตด่วน:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyShippingPreset("normal")}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#f9e1d3] text-[#77585e] hover:border-[#ca5151]"
                  >
                    + ปกติ (Flash)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShippingPreset("nca_grab")}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#f9e1d3] text-[#77585e] hover:border-[#ca5151]"
                  >
                    + นครชัยแอร์ → Grab
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShippingPreset("inter")}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#f9e1d3] text-[#77585e] hover:border-[#ca5151]"
                  >
                    + ตปท. (NCA → Lalamove → DHL)
                  </button>
                </div>

                {formHops.length === 0 ? (
                  <div className="text-center py-3 text-xs text-[#77585e]/60 bg-white/70 rounded-xl border border-dashed border-[#cc8867]/30">
                    ยังไม่มีบันทึกการจัดส่ง กด &quot;+ เพิ่มขั้นขนส่ง&quot; หรือเลือกเทมเพลตด้านบน
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formHops.map((hop, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-[#f9e1d3] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#ca5151]">
                            ขั้นที่ {idx + 1} (Hop {idx + 1})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeHop(idx)}
                            className="text-[11px] text-[#ca5151] hover:underline font-semibold"
                          >
                            ลบขั้นนี้
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              ขนส่ง
                            </label>
                            <select
                              value={hop.carrier}
                              onChange={(e) =>
                                updateHopField(idx, "carrier", e.target.value)
                              }
                              className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#4a3539]"
                            >
                              {SHIPPING_CARRIERS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              ประเภทการส่ง{" "}
                              {isSpecialShippingLocked(formHops) && (
                                <span className="text-[9px] text-[#ca5151]">
                                  (ล็อก: พิเศษ)
                                </span>
                              )}
                            </label>
                            <select
                              value={hop.shipping_type}
                              disabled={isSpecialShippingLocked(formHops)}
                              onChange={(e) =>
                                updateHopField(
                                  idx,
                                  "shipping_type",
                                  e.target.value as ShippingType
                                )
                              }
                              className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#4a3539] disabled:opacity-65 disabled:cursor-not-allowed disabled:bg-[#f9e1d3]/40"
                            >
                              <option value="normal">ปกติ</option>
                              <option value="special">ด่วน / พิเศษ</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              วันที่ส่งจริง
                            </label>
                            <input
                              type="date"
                              value={hop.shipped_at || ""}
                              onChange={(e) =>
                                updateHopField(idx, "shipped_at", e.target.value)
                              }
                              className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2 py-1.5 text-xs text-[#4a3539]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              เส้นทาง / หมายเหตุ
                            </label>
                            <input
                              type="text"
                              value={hop.route_note || ""}
                              onChange={(e) =>
                                updateHopField(idx, "route_note", e.target.value)
                              }
                              placeholder="เช่น ร้าน → กทม. หรือ ส่งไปสิงคโปร์"
                              className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2.5 py-1.5 text-xs text-[#4a3539]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              เลขพัสดุ (Tracking)
                            </label>
                            <input
                              type="text"
                              value={hop.tracking_no || ""}
                              onChange={(e) =>
                                updateHopField(idx, "tracking_no", e.target.value)
                              }
                              placeholder="เลขพัสดุ / ลิงก์ Grab (ถ้ามี)"
                              className="w-full bg-[#fdf7f2] border border-[#f9e1d3] rounded-lg px-2.5 py-1.5 text-xs text-[#4a3539]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#6b484f] mb-0.5">
                              ค่าส่งทั้งหมด (บาท)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={hop.total_cost ?? 0}
                              onChange={(e) =>
                                updateHopField(
                                  idx,
                                  "total_cost",
                                  Number(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-full bg-[#fffaf6] border border-[#cc8867]/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#4a3539]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#77585e] mb-0.5">
                              ร้านออก (บาท)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={hop.shop_cost}
                              onChange={(e) =>
                                updateHopField(
                                  idx,
                                  "shop_cost",
                                  Number(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-full bg-[#f9e1d3]/35 border border-[#cc8867]/40 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4a3539]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5b3b8c] mb-0.5">
                              ลูกค้าออก (บาท)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={hop.customer_cost}
                              onChange={(e) =>
                                updateHopField(
                                  idx,
                                  "customer_cost",
                                  Number(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-full bg-[#f3e8ff]/60 border border-[#d8b4fe] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4a3539]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formHops.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#cc8867]/40 text-xs">
                      <span className="font-bold text-[#77585e]">
                        ค่าส่งรวมชิ้นนี้: ฿{formatTHB(modalShippingTotals.total)}
                      </span>
                      <span className="text-[11px] text-[#77585e]/85">
                        ร้านออก ฿{formatTHB(modalShippingTotals.shopTotal)} •
                        ลูกค้าออก ฿{formatTHB(modalShippingTotals.customerTotal)}
                      </span>
                    </div>
                    {modalShippingTotals.customerTotal > 0 && (
                      <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#f3e8ff]/70 border border-[#d8b4fe] cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formShippingPaid}
                            onChange={(e) =>
                              setFormShippingPaid(e.target.checked)
                            }
                            className="w-4 h-4 accent-[#5b3b8c] rounded"
                          />
                          <span className="font-bold text-[#5b3b8c]">
                            เก็บค่าส่งส่วนที่ลูกค้าออกแล้ว (฿
                            {formatTHB(modalShippingTotals.customerTotal)})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#5b3b8c] border border-[#d8b4fe]">
                          TAG: คิดค่าส่ง
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Lane Duration History Timeline (when editing existing task) */}
              {editingTask &&
                (() => {
                  const taskTimeline = allStatusHistory
                    .filter((h) => h.task_id === editingTask.id)
                    .sort(
                      (a, b) =>
                        new Date(a.entered_at).getTime() -
                        new Date(b.entered_at).getTime()
                    );
                  const totalFirstEntered =
                    taskTimeline.length > 0
                      ? taskTimeline[0].entered_at
                      : editingTask.created_at;
                  const isTimerStopped =
                    taskTimeline.length > 0 &&
                    taskTimeline.every((h) => Boolean(h.exited_at));
                  const lastStoppedAt = isTimerStopped
                    ? taskTimeline[taskTimeline.length - 1].exited_at
                    : null;
                  return (
                    <div className="p-3.5 rounded-2xl bg-[#789ea5]/10 border border-[#789ea5]/35 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#4a6b72]">
                          ⏱ ประวัติระยะเวลาแต่ละเลน (Timeline)
                        </span>
                        <span className="text-[11px] font-semibold text-[#77585e]">
                          รวมตั้งแต่เปิดงาน:{" "}
                          {formatDuration(
                            totalFirstEntered,
                            lastStoppedAt,
                            nowTick
                          )}
                          {isTimerStopped && (
                            <span className="ml-1 text-[#6b9078] font-bold">
                              (หยุดจับเวลาแล้ว)
                            </span>
                          )}
                        </span>
                      </div>
                      {taskTimeline.length === 0 ? (
                        <p className="text-[11px] text-[#77585e]/75">
                          กำลังเริ่มจับเวลาเลนปัจจุบัน (
                          {COLUMNS.find((c) => c.id === editingTask.status)
                            ?.title || editingTask.status}
                          ) —{" "}
                          {formatDuration(
                            editingTask.updated_at || editingTask.created_at,
                            null,
                            nowTick
                          )}
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {taskTimeline.map((item) => {
                            const colTitle =
                              COLUMNS.find((c) => c.id === item.status)
                                ?.title || item.status;
                            const isCurrent = !item.exited_at;
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] ${
                                  isCurrent
                                    ? "bg-white border-[#6b9078]/50 font-semibold"
                                    : "bg-white/70 border-[#f9e1d3]"
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-[#77585e]">
                                    {colTitle}
                                  </span>
                                  <span className="text-[10px] text-[#77585e]/75 ml-1.5">
                                    ({formatDateTimeTH(item.entered_at)} →{" "}
                                    {item.exited_at
                                      ? formatDateTimeTH(item.exited_at)
                                      : "ปัจจุบัน"}
                                    )
                                  </span>
                                </div>
                                <span
                                  className={`shrink-0 font-bold ${
                                    isCurrent
                                      ? "text-[#6b9078]"
                                      : "text-[#77585e]"
                                  }`}
                                >
                                  {formatDuration(
                                    item.entered_at,
                                    item.exited_at,
                                    nowTick
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

              <div className="flex items-center justify-between pt-3 border-t border-[#f9e1d3]">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#ca5151] hover:text-rose-700 font-bold"
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
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f9e1d3] text-[#77585e] hover:bg-[#f2cfb9]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ca5151] hover:bg-[#b03e3e] text-white shadow-md shadow-[#ca5151]/25"
                  >
                    บันทึกงาน
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
