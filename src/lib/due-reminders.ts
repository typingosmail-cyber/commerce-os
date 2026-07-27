// Mock due-date reminder engine for BNPL installments.
// Frontend-only: persists config, log, and acknowledgements in localStorage.
// Fires mock email + SMS + in-app notifications on upcoming and overdue installments.

import type { CreditLine, ScheduleInstallment } from "./bnpl";
import { generateSchedule } from "./bnpl";

export type ReminderChannel = "email" | "sms" | "inapp";
export type ReminderKind = "upcoming" | "due_today" | "overdue";

export interface ReminderConfig {
  enabled: boolean;
  upcomingDaysBefore: number[]; // e.g. [7, 3, 1]
  overdueRepeatHours: number;   // re-alert every N hours while overdue
  channels: Record<ReminderChannel, boolean>;
  contactEmail: string;
  contactSms: string;
  quietStartHour: number; // 0-23
  quietEndHour: number;   // 0-23
}

export interface ReminderRecord {
  id: string;
  creditLineId: string;
  orderRef: string;
  supplierName: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  kind: ReminderKind;
  channels: ReminderChannel[];
  sentAt: string;
  daysUntilDue: number;
  acknowledged: boolean;
  message: string;
}

const STORE = {
  config: "vyapar_due_reminder_config_v1",
  log: "vyapar_due_reminder_log_v1",
};

const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  upcomingDaysBefore: [7, 3, 1],
  overdueRepeatHours: 24,
  channels: { email: true, sms: true, inapp: true },
  contactEmail: "buyer@example.in",
  contactSms: "+91 98••• ••210",
  quietStartHour: 22,
  quietEndHour: 7,
};

function load<T>(k: string, f: T): T {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : f; } catch { return f; }
}
function save<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } }
function uid(p: string) { return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function getReminderConfig(): ReminderConfig {
  return { ...DEFAULT_CONFIG, ...load<Partial<ReminderConfig>>(STORE.config, {}) };
}
export function setReminderConfig(patch: Partial<ReminderConfig>): ReminderConfig {
  const next = { ...getReminderConfig(), ...patch };
  save(STORE.config, next);
  return next;
}

export function listReminders(): ReminderRecord[] { return load<ReminderRecord[]>(STORE.log, []); }
export function clearReminders() { save(STORE.log, []); }
export function acknowledgeReminder(id: string) {
  const list = listReminders();
  const r = list.find((x) => x.id === id);
  if (r) { r.acknowledged = true; save(STORE.log, list); }
}
export function acknowledgeAll() {
  save(STORE.log, listReminders().map((r) => ({ ...r, acknowledged: true })));
}

function isQuiet(cfg: ReminderConfig, d: Date): boolean {
  const h = d.getHours();
  const s = cfg.quietStartHour, e = cfg.quietEndHour;
  return s <= e ? (h >= s && h < e) : (h >= s || h < e);
}

function activeChannels(cfg: ReminderConfig, kind: ReminderKind, now: Date): ReminderChannel[] {
  const enabled = (Object.keys(cfg.channels) as ReminderChannel[]).filter((c) => cfg.channels[c]);
  // In-app always fires; email/SMS suppressed during quiet hours unless overdue.
  if (isQuiet(cfg, now) && kind !== "overdue") {
    return enabled.filter((c) => c === "inapp");
  }
  return enabled;
}

function messageFor(kind: ReminderKind, orderRef: string, amount: number, dueDate: string, daysUntilDue: number): string {
  if (kind === "due_today") return `EMI of ${fmt(amount)} for ${orderRef} is due today (${dueDate}).`;
  if (kind === "overdue") return `EMI of ${fmt(amount)} for ${orderRef} is ${Math.abs(daysUntilDue)} day(s) overdue. Please repay to avoid late fees.`;
  return `Reminder: EMI of ${fmt(amount)} for ${orderRef} is due in ${daysUntilDue} day(s) on ${dueDate}.`;
}

/** Deterministic key so we don't repeatedly re-send the same reminder within a window. */
function keyFor(lineId: string, instNo: number, kind: ReminderKind, bucket: string) {
  return `${lineId}#${instNo}#${kind}#${bucket}`;
}
function hourBucket(d: Date, hours: number) {
  return `${d.toISOString().slice(0, 10)}#${Math.floor(d.getHours() / Math.max(1, hours))}`;
}
function dayBucket(d: Date) { return d.toISOString().slice(0, 10); }

/**
 * Scan all active credit lines, generate reminders that haven't already
 * been sent for the current bucket, persist them, and return the new records.
 */
export function scanReminders(
  lines: CreditLine[],
  now: Date = new Date(),
): ReminderRecord[] {
  const cfg = getReminderConfig();
  if (!cfg.enabled) return [];
  const existing = listReminders();
  const seen = new Set(existing.map((r) => `${r.creditLineId}#${r.installmentNo}#${r.kind}#${r.dueDate}#${r.sentAt.slice(0, 13)}`));
  const emitted: ReminderRecord[] = [];

  for (const line of lines) {
    if (line.status !== "active") continue;
    const schedule = generateSchedule(line, now);
    for (const inst of schedule) {
      if (inst.status === "paid") continue;

      let kind: ReminderKind | null = null;
      let bucket: string = dayBucket(now);
      if (inst.daysUntilDue < 0) {
        kind = "overdue";
        bucket = hourBucket(now, cfg.overdueRepeatHours);
      } else if (inst.daysUntilDue === 0) {
        kind = "due_today";
      } else if (cfg.upcomingDaysBefore.includes(inst.daysUntilDue)) {
        kind = "upcoming";
      }
      if (!kind) continue;

      const dedupe = keyFor(line.id, inst.installmentNo, kind, bucket);
      if (existing.some((r) => keyFor(r.creditLineId, r.installmentNo, r.kind, kind === "overdue" ? hourBucket(new Date(r.sentAt), cfg.overdueRepeatHours) : dayBucket(new Date(r.sentAt))) === dedupe)) continue;

      const channels = activeChannels(cfg, kind, now);
      if (channels.length === 0) continue;

      const rec: ReminderRecord = {
        id: uid("rem"),
        creditLineId: line.id,
        orderRef: line.orderRef,
        supplierName: line.supplierName,
        installmentNo: inst.installmentNo,
        dueDate: inst.dueDate,
        amount: inst.remainingAmount || inst.total,
        kind,
        channels,
        sentAt: now.toISOString(),
        daysUntilDue: inst.daysUntilDue,
        acknowledged: false,
        message: messageFor(kind, line.orderRef, inst.remainingAmount || inst.total, inst.dueDate, inst.daysUntilDue),
      };
      emitted.push(rec);
      void seen.add(dedupe);
    }
  }

  if (emitted.length) save(STORE.log, [...emitted, ...existing].slice(0, 300));
  return emitted;
}

export const KIND_LABEL: Record<ReminderKind, string> = {
  upcoming: "Upcoming",
  due_today: "Due today",
  overdue: "Overdue",
};

export const KIND_TONE: Record<ReminderKind, "info" | "warning" | "destructive"> = {
  upcoming: "info",
  due_today: "warning",
  overdue: "destructive",
};

export const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  email: "Email",
  sms: "SMS",
  inapp: "In-app",
};

/** Convenience for a status summary card. */
export function reminderStats(list: ReminderRecord[] = listReminders()) {
  return {
    total: list.length,
    overdue: list.filter((r) => r.kind === "overdue").length,
    dueToday: list.filter((r) => r.kind === "due_today").length,
    upcoming: list.filter((r) => r.kind === "upcoming").length,
    unacked: list.filter((r) => !r.acknowledged).length,
  };
}
