"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function NotificationsPageView() {
  const notifications = useSatsStore((state) => state.notifications);
  const isLoading = useSatsStore((state) => state.loading.notifications);
  const error = useSatsStore((state) => state.errors.notifications);
  const loadNotifications = useSatsStore((state) => state.loadNotifications);

  useSatsResource(notifications, isLoading, loadNotifications);

  if (error) {
    return (
      <ResourceFeedback title="Notification data unavailable" detail={error} />
    );
  }

  if (!notifications) {
    return (
      <ResourceFeedback
        title="Loading alerts and chat"
        detail="The notification service is loading event alerts, acknowledgements, and conversation threads."
      />
    );
  }

  return (
    <ModulePageShell
      hero={notifications.hero}
      metrics={notifications.metrics}
      generatedAt={notifications.generatedAt}
      badges={notifications.notifications.map((item) => item.severity)}
    >
      <DataPanel
        eyebrow="Alert center"
        title="System, field, and clinical alerts requiring attention"
      >
        <DataTable
          rows={notifications.notifications}
          columns={[
            { header: "Type", render: (row) => row.type },
            { header: "Severity", render: (row) => row.severity },
            { header: "Status", render: (row) => row.status },
            { header: "Module", render: (row) => row.moduleName },
            { header: "Message", render: (row) => row.message },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Chat threads"
        title="Operational collaboration channels linked to incidents"
      >
        <DataTable
          rows={notifications.threads}
          columns={[
            { header: "Channel", render: (row) => row.channelName },
            { header: "Participants", render: (row) => row.participants },
            { header: "Unread", render: (row) => row.unreadCount },
            { header: "Last message", render: (row) => row.lastMessage },
            {
              header: "Updated",
              render: (row) => new Date(row.updatedAt).toLocaleString(),
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}