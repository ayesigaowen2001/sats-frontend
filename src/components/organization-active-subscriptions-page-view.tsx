"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ServerIdFilter } from "@/components/common/server-id-filter";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  activeSubscriptionService,
  type ActiveSubscription,
  type AssignSubscriptionInput,
} from "@/lib/organizations/active-subscription-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import { subscriptionPlanService } from "@/lib/organizations/subscription-plan-service";
import { useAuthStore } from "@/store/useAuthStore";

interface AssignSubscriptionFormValues extends Record<string, string> {
  organization_name: string;
  plan_name: string;
  status: string;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  created_by: string;
}

const defaultAssignSubscriptionValues: AssignSubscriptionFormValues = {
  organization_name: "",
  plan_name: "",
  status: "active",
  trial_ends_at: "",
  current_period_start: "",
  current_period_end: "",
  created_by: "",
};

interface OrganizationOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
}

function formatTimestamp(value: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function OrganizationActiveSubscriptionsPageView() {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignValues, setAssignValues] =
    useState<AssignSubscriptionFormValues>(defaultAssignSubscriptionValues);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFormOptions = async () => {
      try {
        const [organizationItems, planResult] = await Promise.all([
          organizationCrudService.listOrganizations(),
          subscriptionPlanService.listPlans(1, 100),
        ]);

        if (!isMounted) {
          return;
        }

        setOrganizations(
          organizationItems.map((item) => ({
            id: item.id,
            name: item.organization_name,
          })),
        );
        setPlans(
          planResult.items.map((item) => ({
            id: item.id,
            name: item.planName,
          })),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setAssignError(
          "Failed to load organization and subscription plan options.",
        );
      }
    };

    void loadFormOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const assignSubscriptionFields = useMemo<
    EntityFormField<AssignSubscriptionFormValues>[]
  >(
    () => [
      {
        name: "organization_name",
        label: "Organization",
        type: "select",
        required: true,
        options: organizations.map((item) => ({
          value: item.name,
          label: item.name,
        })),
      },
      {
        name: "plan_name",
        label: "Subscription plan",
        type: "select",
        required: true,
        options: plans.map((item) => ({
          value: item.name,
          label: item.name,
        })),
      },
      { name: "status", label: "Status", required: true },
      {
        name: "trial_ends_at",
        label: "Trial ends at",
        type: "datetime-local",
        required: true,
      },
      {
        name: "current_period_start",
        label: "Current period start",
        type: "date",
        required: true,
      },
      {
        name: "current_period_end",
        label: "Current period end",
        type: "date",
        required: true,
      },
      {
        name: "created_by",
        label: "Created by",
        required: true,
        readOnly: true,
        colSpan: 2,
      },
    ],
    [organizations, plans],
  );

  const handleFilterSubscriptionByOrgId = async (orgId: string) => {
    setFilterError("");
    setLoadError("");

    try {
      const result =
        await activeSubscriptionService.getOrganizationSubscription(orgId);
      setSubscription(result);
      const matchingOrganization = organizations.find(
        (item) => item.id === result.organizationId,
      );
      setAssignValues((current) => ({
        ...current,
        organization_name:
          matchingOrganization?.name ?? current.organization_name,
      }));
    } catch (requestError) {
      setSubscription(null);
      setFilterError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load active subscription by organization ID",
      );
    }
  };

  const handleClearSubscriptionFilter = () => {
    setSubscription(null);
    setFilterError("");
  };

  const handleAssignSubscription = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAssignError("");
    setAssignSuccess("");
    setIsAssigning(true);

    try {
      const selectedOrganization = organizations.find(
        (item) => item.name === assignValues.organization_name,
      );
      const selectedPlan = plans.find(
        (item) => item.name === assignValues.plan_name,
      );

      const organizationId = selectedOrganization?.id ?? "";

      if (!organizationId) {
        throw new Error("Please select an organization.");
      }

      const payload: AssignSubscriptionInput = {
        organization_id: organizationId,
        plan_id: selectedPlan?.id ?? "",
        status: assignValues.status.trim(),
        trial_ends_at: assignValues.trial_ends_at.trim(),
        current_period_start: assignValues.current_period_start,
        current_period_end: assignValues.current_period_end,
        created_by: assignValues.created_by.trim(),
      };

      if (!payload.plan_id) {
        throw new Error("Please select a subscription plan.");
      }

      if (!payload.status || !payload.created_by) {
        throw new Error("Status and created by are required.");
      }

      await activeSubscriptionService.assignSubscription(
        organizationId,
        payload,
      );
      const refreshed =
        await activeSubscriptionService.getOrganizationSubscription(
          organizationId,
        );
      setSubscription(refreshed);
      setAssignSuccess("Subscription assigned successfully.");
      setShowAssignForm(false);
    } catch (requestError) {
      setAssignError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to assign subscription",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  if (loadError) {
    return (
      <ResourceFeedback
        title="Active subscription unavailable"
        detail={loadError}
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Active subscriptions
          </h2>
          <div className="w-full xl:max-w-xl xl:flex-1">
            <ServerIdFilter
              label="Organization subscription lookup"
              placeholder="Enter organization ID"
              actionLabel="Find active subscription"
              loadingLabel="Searching..."
              errorMessage={filterError}
              hasActiveResult={subscription !== null}
              onSearch={handleFilterSubscriptionByOrgId}
              onClear={handleClearSubscriptionFilter}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAssignForm((current) => !current);
              setAssignError("");
              // Auto-fill created_by with user ID when opening form
              setAssignValues((current) => ({
                ...current,
                created_by: user.id,
              }));
              setAssignSuccess("");
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            {showAssignForm ? "Close form" : "Assign subscription"}
          </button>
        </div>

        {showAssignForm ? (
          <EntityForm
            title="Assign subscription to organization"
            fields={assignSubscriptionFields}
            values={assignValues}
            errorMessage={assignError}
            submitLabel="Assign subscription"
            submitLoadingLabel="Assigning..."
            isSubmitting={isAssigning}
            onSubmit={handleAssignSubscription}
            onCancel={() => {
              setShowAssignForm(false);
              setAssignError("");
            }}
            onChange={(name, value) =>
              setAssignValues((current) => ({ ...current, [name]: value }))
            }
          />
        ) : null}

        {assignSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {assignSuccess}
          </p>
        ) : null}

        {!subscription ? (
          <ResourceFeedback
            title="Active subscription lookup ready"
            detail="Use the organization ID filter above to load a subscription record until the list endpoint is available."
          />
        ) : (
          <DataTable
            showCard={false}
            horizontalScroll
            minColumnWidthRem={11}
            rows={[subscription]}
            columns={[
              {
                header: "Subscription ID",
                render: (row) => row.id,
              },
              {
                header: "Organization ID",
                render: (row) => row.organizationId,
              },
              {
                header: "Plan ID",
                render: (row) => row.planId,
              },
              {
                header: "Status",
                render: (row) => row.status,
              },
              {
                header: "Trial ends",
                render: (row) => formatTimestamp(row.trialEndsAt),
              },
              {
                header: "Period start",
                render: (row) => row.currentPeriodStart,
              },
              {
                header: "Period end",
                render: (row) => row.currentPeriodEnd,
              },
              {
                header: "Created by",
                render: (row) => row.createdBy,
              },
            ]}
          />
        )}
      </section>
    </main>
  );
}
