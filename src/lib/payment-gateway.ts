// Mock payment gateway for BNPL auto-repayment
// Frontend-only prototype using localStorage. Simulates UPI AutoPay (NPCI),
// e-NACH bank mandate, and card-on-file for scheduled debits.

import type { CreditLine, ScheduleInstallment } from "./bnpl";

export type PaymentMethodKind = "upi_autopay" | "enach" | "card";
export type MandateStatus = "pending" | "active" | "paused" | "revoked" | "failed";
export type GatewayProvider = "Razorpay" | "Cashfree" | "PayU" | "BillDesk";

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;          // "HDFC •• 4521" / "rahul@okhdfc"
  bankOrIssuer: string;
  maskedRef: string;      // masked account / VPA / card
  provider: GatewayProvider;
  mandateStatus: MandateStatus;
  mandateId: string;      // UMRN-like id
  maxDebitInr: number;    // mandate cap per debit
  validUntil: string;     // ISO
  isDefault: boolean;
  createdAt: string;
}

export type AutoDebitStatus =
  | "scheduled"
  | "processing"
  | "success"
  | "failed"
  | "retry_scheduled"
  | "cancelled";

export interface AutoDebitAttempt {
  id: string;
  creditLineId: string;
  installmentNo: number;
  amount: number;
  scheduledFor: string;   // ISO date (T-1 morning of dueDate)
  attemptedAt?: string;
  status: AutoDebitStatus;
  paymentMethodId: string;
  provider: GatewayProvider;
  gatewayRef: string;     // pg_xxx
  failureCode?: string;
  failureReason?: string;
  retryNo: number;        // 0 = first attempt
  nextRetryAt?: string;
}

export interface AutoPayConfig {
  enabled: boolean;
  defaultPaymentMethodId?: string;
  debitOffsetDays: number;     // debit T-N before due date
  maxRetries: number;
  retryGapHours: number;
  notifyEmail: boolean;
  notifySms: boolean;
}

const STORE = {
  methods: "vyapar_pg_methods",
  attempts: "vyapar_pg_attempts",
  config: "vyapar_pg_config",
  enrolledLines: "vyapar_pg_enrolled_lines",
};

const FAILURE_CATALOG: Array<{ code: string; reason: string }> = [
  { code: "INSUFFICIENT_FUNDS", reason: "Insufficient balance in linked account" },
  { code: "MANDATE_PAUSED", reason: "Mandate paused by buyer's bank" },
  { code: "BANK_TIMEOUT", reason: "Issuing bank did not respond within SLA" },
  { code: "LIMIT_EXCEEDED", reason: "Debit amount exceeds mandate cap" },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}
function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- Config ----------
const DEFAULT_CONFIG: AutoPayConfig = {
  enabled: true,
  debitOffsetDays: 1,
  maxRetries: 3,
  retryGapHours: 24,
  notifyEmail: true,
  notifySms: true,
};

export function getAutoPayConfig(): AutoPayConfig {
  return { ...DEFAULT_CONFIG, ...load<Partial<AutoPayConfig>>(STORE.config, {}) };
}
export function setAutoPayConfig(patch: Partial<AutoPayConfig>) {
  const next = { ...getAutoPayConfig(), ...patch };
  save(STORE.config, next);
  return next;
}

// ---------- Payment Methods ----------
const SEED_METHODS: PaymentMethod[] = [
  {
    id: "pm_seed_upi",
    kind: "upi_autopay",
    label: "rahul@okhdfc",
    bankOrIssuer: "HDFC Bank",
    maskedRef: "rahul@okhdfc",
    provider: "Razorpay",
    mandateStatus: "active",
    mandateId: "HDFC0000123456789",
    maxDebitInr: 500_000,
    validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
    isDefault: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "pm_seed_enach",
    kind: "enach",
    label: "ICICI Bank •• 4521",
    bankOrIssuer: "ICICI Bank",
    maskedRef: "XXXXXX4521",
    provider: "BillDesk",
    mandateStatus: "active",
    mandateId: "ICIC2204000098765",
    maxDebitInr: 1_000_000,
    validUntil: new Date(Date.now() + 730 * 86400000).toISOString(),
    isDefault: false,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
];

export function listPaymentMethods(): PaymentMethod[] {
  const stored = load<PaymentMethod[] | null>(STORE.methods, null);
  if (!stored) {
    save(STORE.methods, SEED_METHODS);
    return SEED_METHODS;
  }
  return stored;
}

export function defaultPaymentMethod(): PaymentMethod | undefined {
  const list = listPaymentMethods();
  return list.find((m) => m.isDefault && m.mandateStatus === "active") ?? list.find((m) => m.mandateStatus === "active");
}

export function addPaymentMethod(input: {
  kind: PaymentMethodKind;
  label: string;
  bankOrIssuer: string;
  maskedRef: string;
  provider?: GatewayProvider;
  maxDebitInr?: number;
}): PaymentMethod {
  const list = listPaymentMethods();
  const pm: PaymentMethod = {
    id: uid("pm"),
    kind: input.kind,
    label: input.label,
    bankOrIssuer: input.bankOrIssuer,
    maskedRef: input.maskedRef,
    provider: input.provider ?? "Razorpay",
    mandateStatus: "pending",
    mandateId: `MND${Date.now().toString().slice(-12)}`,
    maxDebitInr: input.maxDebitInr ?? 500_000,
    validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
    isDefault: list.length === 0,
    createdAt: new Date().toISOString(),
  };
  list.push(pm);
  save(STORE.methods, list);
  return pm;
}

export function activateMandate(id: string): PaymentMethod | undefined {
  const list = listPaymentMethods();
  const pm = list.find((m) => m.id === id);
  if (!pm) return;
  pm.mandateStatus = "active";
  save(STORE.methods, list);
  return pm;
}

export function setDefaultMethod(id: string) {
  const list = listPaymentMethods().map((m) => ({ ...m, isDefault: m.id === id }));
  save(STORE.methods, list);
}

export function setMandateStatus(id: string, status: MandateStatus) {
  const list = listPaymentMethods();
  const pm = list.find((m) => m.id === id);
  if (!pm) return;
  pm.mandateStatus = status;
  save(STORE.methods, list);
}

export function removePaymentMethod(id: string) {
  const list = listPaymentMethods().filter((m) => m.id !== id);
  if (list.length && !list.some((m) => m.isDefault)) list[0].isDefault = true;
  save(STORE.methods, list);
}

// ---------- Per-line enrollment ----------
export function isLineEnrolled(creditLineId: string): boolean {
  const map = load<Record<string, boolean>>(STORE.enrolledLines, {});
  // default to true when global autopay is on
  return map[creditLineId] ?? getAutoPayConfig().enabled;
}
export function setLineEnrolled(creditLineId: string, enrolled: boolean) {
  const map = load<Record<string, boolean>>(STORE.enrolledLines, {});
  map[creditLineId] = enrolled;
  save(STORE.enrolledLines, map);
}

// ---------- Attempts ----------
export function listAttempts(): AutoDebitAttempt[] {
  return load<AutoDebitAttempt[]>(STORE.attempts, []);
}

function saveAttempts(a: AutoDebitAttempt[]) { save(STORE.attempts, a); }

function pickFailure() {
  return FAILURE_CATALOG[Math.floor(Math.random() * FAILURE_CATALOG.length)];
}

/**
 * Build the schedule of upcoming auto-debits for active credit lines.
 * Pure function: does not mutate storage. Used for the "upcoming" view.
 */
export function projectUpcomingDebits(
  lines: CreditLine[],
  schedules: Record<string, ScheduleInstallment[]>,
): Array<{
  creditLineId: string;
  orderRef: string;
  supplierName: string;
  installmentNo: number;
  dueDate: string;
  scheduledFor: string;
  amount: number;
  enrolled: boolean;
}> {
  const cfg = getAutoPayConfig();
  const out: ReturnType<typeof projectUpcomingDebits> = [];
  for (const line of lines) {
    if (line.status !== "active") continue;
    const sch = schedules[line.id] ?? [];
    for (const inst of sch) {
      if (inst.status === "paid") continue;
      const due = new Date(inst.dueDate);
      const sched = new Date(due.getTime() - cfg.debitOffsetDays * 86400000);
      out.push({
        creditLineId: line.id,
        orderRef: line.orderRef,
        supplierName: line.supplierName,
        installmentNo: inst.installmentNo,
        dueDate: inst.dueDate,
        scheduledFor: sched.toISOString().slice(0, 10),
        amount: inst.total,
        enrolled: isLineEnrolled(line.id),
      });
    }
  }
  return out.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

/**
 * Simulate a single debit attempt against the mock gateway.
 * 88% success when a valid mandate exists.
 */
export function runDebit(params: {
  creditLineId: string;
  installmentNo: number;
  amount: number;
  scheduledFor: string;
  paymentMethodId?: string;
  retryNo?: number;
  forceOutcome?: "success" | "failure";
}): AutoDebitAttempt {
  const cfg = getAutoPayConfig();
  const pm = params.paymentMethodId
    ? listPaymentMethods().find((m) => m.id === params.paymentMethodId)
    : defaultPaymentMethod();

  const attempt: AutoDebitAttempt = {
    id: uid("att"),
    creditLineId: params.creditLineId,
    installmentNo: params.installmentNo,
    amount: params.amount,
    scheduledFor: params.scheduledFor,
    attemptedAt: new Date().toISOString(),
    status: "processing",
    paymentMethodId: pm?.id ?? "none",
    provider: pm?.provider ?? "Razorpay",
    gatewayRef: `pg_${Math.random().toString(36).slice(2, 12)}`,
    retryNo: params.retryNo ?? 0,
  };

  if (!pm || pm.mandateStatus !== "active") {
    attempt.status = "failed";
    attempt.failureCode = "NO_ACTIVE_MANDATE";
    attempt.failureReason = "No active mandate available for auto-debit";
  } else if (params.amount > pm.maxDebitInr) {
    attempt.status = "failed";
    attempt.failureCode = "LIMIT_EXCEEDED";
    attempt.failureReason = `Amount exceeds mandate cap of ₹${pm.maxDebitInr.toLocaleString("en-IN")}`;
  } else {
    const success = params.forceOutcome
      ? params.forceOutcome === "success"
      : Math.random() < 0.88;
    if (success) {
      attempt.status = "success";
    } else {
      const f = pickFailure();
      attempt.status = (attempt.retryNo + 1) < cfg.maxRetries ? "retry_scheduled" : "failed";
      attempt.failureCode = f.code;
      attempt.failureReason = f.reason;
      if (attempt.status === "retry_scheduled") {
        attempt.nextRetryAt = new Date(Date.now() + cfg.retryGapHours * 3600 * 1000).toISOString();
      }
    }
  }

  const all = listAttempts();
  all.unshift(attempt);
  saveAttempts(all.slice(0, 200));
  return attempt;
}

export function retryAttempt(attemptId: string): AutoDebitAttempt | undefined {
  const all = listAttempts();
  const prev = all.find((a) => a.id === attemptId);
  if (!prev) return;
  return runDebit({
    creditLineId: prev.creditLineId,
    installmentNo: prev.installmentNo,
    amount: prev.amount,
    scheduledFor: prev.scheduledFor,
    paymentMethodId: prev.paymentMethodId,
    retryNo: prev.retryNo + 1,
  });
}

export function cancelAttempt(attemptId: string) {
  const all = listAttempts();
  const a = all.find((x) => x.id === attemptId);
  if (!a) return;
  a.status = "cancelled";
  saveAttempts(all);
}

export function attemptsForLine(creditLineId: string): AutoDebitAttempt[] {
  return listAttempts().filter((a) => a.creditLineId === creditLineId);
}

export const PROVIDER_LABEL: Record<GatewayProvider, string> = {
  Razorpay: "Razorpay",
  Cashfree: "Cashfree Payments",
  PayU: "PayU India",
  BillDesk: "BillDesk",
};

export const KIND_LABEL: Record<PaymentMethodKind, string> = {
  upi_autopay: "UPI AutoPay",
  enach: "Bank e-NACH",
  card: "Card on File",
};

export const STATUS_TONE: Record<AutoDebitStatus, "success" | "warning" | "destructive" | "muted" | "info"> = {
  success: "success",
  scheduled: "info",
  processing: "info",
  retry_scheduled: "warning",
  failed: "destructive",
  cancelled: "muted",
};
