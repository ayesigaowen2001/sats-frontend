import {
  chatThreads,
  notificationCenter,
} from "@/lib/server/data/sats-seed";
import type { NotificationsPageResponse } from "@/types/sats-api";

export async function getNotificationsPageData(): Promise<NotificationsPageResponse> {
  const unreadAlerts = notificationCenter.filter(
    (item) => item.status === "Unread",
  ).length;

  return {
    hero: {
      eyebrow: "Notifications and chat",
      title: "Operational alerting, acknowledgement, escalation, and team collaboration.",
      description:
        "This module handles the internal communication surface for incidents, follow-up, and cross-role coordination.",
    },
    metrics: [
      {
        label: "Alerts in queue",
        value: String(notificationCenter.length),
        change: `${unreadAlerts} unread`,
        tone: "warning",
      },
      {
        label: "Active channels",
        value: String(chatThreads.length),
        change: "Operational collaboration live",
        tone: "positive",
      },
      {
        label: "Escalation coverage",
        value: "24/7",
        change: "Health, tracking, and device alerts",
        tone: "stable",
      },
    ],
    notifications: notificationCenter,
    threads: chatThreads,
    generatedAt: new Date().toISOString(),
  };
}