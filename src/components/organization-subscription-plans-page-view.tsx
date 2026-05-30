"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { ServerIdFilter } from "@/components/common/server-id-filter";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  subscriptionPlanService,
  type CreateSubscriptionPlanInput,
  type SubscriptionPlan,
} from "@/lib/organizations/subscription-plan-service";

interface PlanPageMeta {
  total: number;
  page: number;
  perPage: number;
  message: string;
}

interface CreatePlanFormValues {
  plan_name: string;
  max_animals: string;
  max_devices: string;
  max_users: string;
  max_nodes: string;
  data_retention_months: string;
  video_enabled: string;
  ai_level: string;
}

const defaultCreatePlanFormValues: CreatePlanFormValues = {
  plan_name: "",
  max_animals: "1",
  max_devices: "1",
  max_users: "1",
  max_nodes: "1",
  data_retention_months: "1",
  video_enabled: "false",
  ai_level: "basic",
};

const subscriptionPlanFormFields: EntityFormField<CreatePlanFormValues>[] = [
  { name: "plan_name", label: "Plan name", required: true },
  { name: "max_animals", label: "Max animals", required: true },
  { name: "max_devices", label: "Max devices", required: true },
  { name: "max_users", label: "Max users", required: true },
  { name: "max_nodes", label: "Max nodes", required: true },
  {
    name: "data_retention_months",
    label: "Data retention months",
    required: true,
  },
  {
    name: "video_enabled",
    label: "Video enabled",
    type: "select",
    required: true,
    options: [
      { value: "true", label: "Enabled" },
      { value: "false", label: "Disabled" },
    ],
  },
  {
    name: "ai_level",
    label: "AI level",
    type: "select",
    required: true,
    options: [
      { value: "basic", label: "Basic" },
      { value: "advanced", label: "Advanced" },
      { value: "enterprise", label: "Enterprise" },
    ],
  },
];

function toPositiveInteger(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    throw new Error("Numeric fields must be whole numbers greater than 0.");
  }

  return parsed;
}

export function OrganizationSubscriptionPlansPageView() {
  const [rows, setRows] = useState<SubscriptionPlan[] | null>(null);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<PlanPageMeta | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreatePlanFormValues>(
    defaultCreatePlanFormValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [updateValues, setUpdateValues] = useState<CreatePlanFormValues>(
    defaultCreatePlanFormValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState("");
  const [filteredPlan, setFilteredPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [filterError, setFilterError] = useState("");

  const loadSubscriptionPlans = useCallback(async () => {
    setError("");
    const response = await subscriptionPlanService.listPlans(1, 20);
    setMeta({
      total: response.total,
      page: response.page,
      perPage: response.perPage,
      message: response.message,
    });
    return response.items;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadSubscriptionPlans();

        if (isMounted) {
          setRows(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load subscription plans",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadSubscriptionPlans]);

  const handleCreatePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsCreating(true);

    try {
      const payload: CreateSubscriptionPlanInput = {
        plan_name: createValues.plan_name.trim(),
        max_animals: toPositiveInteger(createValues.max_animals),
        max_devices: toPositiveInteger(createValues.max_devices),
        max_users: toPositiveInteger(createValues.max_users),
        max_nodes: toPositiveInteger(createValues.max_nodes),
        data_retention_months: toPositiveInteger(
          createValues.data_retention_months,
        ),
        video_enabled: createValues.video_enabled === "true",
        ai_level: createValues.ai_level,
      };

      if (!payload.plan_name) {
        throw new Error("Plan name is required.");
      }

      await subscriptionPlanService.createPlan(payload);
      const refreshed = await loadSubscriptionPlans();
      setRows(refreshed);
      setCreateValues(defaultCreatePlanFormValues);
      setShowCreateForm(false);
      setCreateSuccess("Subscription plan created successfully.");
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create subscription plan",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEditPlan = (plan: SubscriptionPlan) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setEditingPlan(plan);
    setUpdateValues({
      plan_name: plan.planName,
      max_animals: String(plan.maxAnimals),
      max_devices: String(plan.maxDevices),
      max_users: String(plan.maxUsers),
      max_nodes: String(plan.maxNodes),
      data_retention_months: String(plan.dataRetentionMonths),
      video_enabled: plan.videoEnabled ? "true" : "false",
      ai_level: plan.aiLevel,
    });
  };

  const handleUpdatePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingPlan) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      const payload: CreateSubscriptionPlanInput = {
        plan_name: updateValues.plan_name.trim(),
        max_animals: toPositiveInteger(updateValues.max_animals),
        max_devices: toPositiveInteger(updateValues.max_devices),
        max_users: toPositiveInteger(updateValues.max_users),
        max_nodes: toPositiveInteger(updateValues.max_nodes),
        data_retention_months: toPositiveInteger(
          updateValues.data_retention_months,
        ),
        video_enabled: updateValues.video_enabled === "true",
        ai_level: updateValues.ai_level,
      };

      if (!payload.plan_name) {
        throw new Error("Plan name is required.");
      }

      await subscriptionPlanService.updatePlan(editingPlan.id, payload);
      const refreshed = await loadSubscriptionPlans();
      setRows(refreshed);
      setEditingPlan(null);
      setUpdateSuccess("Subscription plan updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update subscription plan",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    const shouldDelete = window.confirm(
      `Delete subscription plan ${plan.planName}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setCreateSuccess("");
    setUpdateSuccess("");
    setDeletingPlanId(plan.id);

    try {
      await subscriptionPlanService.deletePlan(plan.id);
      const refreshed = await loadSubscriptionPlans();
      setRows(refreshed);

      if (editingPlan?.id === plan.id) {
        setEditingPlan(null);
      }

      setDeleteSuccess("Subscription plan deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete subscription plan",
      );
    } finally {
      setDeletingPlanId("");
    }
  };

  const handleFilterPlanById = async (planId: string) => {
    setFilterError("");

    try {
      const plan = await subscriptionPlanService.getPlanById(planId);
      setFilteredPlan(plan);
    } catch (requestError) {
      setFilteredPlan(null);
      setFilterError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load subscription plan by ID",
      );
    }
  };

  const handleClearPlanFilter = () => {
    setFilteredPlan(null);
    setFilterError("");
  };

  if (error) {
    return (
      <ResourceFeedback
        title="Subscription plan data unavailable"
        detail={error}
      />
    );
  }

  if (!rows || !meta) {
    return (
      <ResourceFeedback
        title="Loading subscription plans"
        detail="Fetching all plan definitions from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Subscription plans
          </h2>
          <div className="w-full lg:max-w-xl lg:flex-1">
            <ServerIdFilter
              label="Subscription plan lookup"
              placeholder="Enter subscription plan ID"
              actionLabel="Find plan"
              loadingLabel="Searching..."
              errorMessage={filterError}
              hasActiveResult={filteredPlan !== null}
              onSearch={handleFilterPlanById}
              onClear={handleClearPlanFilter}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingPlan(null);
              setCreateError("");
              setCreateSuccess("");
              setUpdateError("");
              setUpdateSuccess("");
              setDeleteError("");
              setDeleteSuccess("");
            }}
            className="self-start rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 lg:self-auto"
          >
            {showCreateForm ? "Close form" : "Create subscription plan"}
          </button>
        </div>

        {showCreateForm ? (
          <EntityForm
            title="Create subscription plan"
            fields={subscriptionPlanFormFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create subscription plan"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreatePlan}
            onCancel={() => {
              setShowCreateForm(false);
              setCreateError("");
            }}
            onChange={(name, value) =>
              setCreateValues((current) => ({ ...current, [name]: value }))
            }
          />
        ) : null}

        {createSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {createSuccess}
          </p>
        ) : null}

        {editingPlan ? (
          <EntityForm
            title={`Update subscription plan: ${editingPlan.planName}`}
            fields={subscriptionPlanFormFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update subscription plan"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdatePlan}
            onCancel={() => {
              setEditingPlan(null);
              setUpdateError("");
            }}
            onChange={(name, value) =>
              setUpdateValues((current) => ({ ...current, [name]: value }))
            }
          />
        ) : null}

        {updateSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {updateSuccess}
          </p>
        ) : null}

        {deleteError ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {deleteError}
          </p>
        ) : null}

        {deleteSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {deleteSuccess}
          </p>
        ) : null}

        <p className="text-sm text-[var(--color-mist)]">
          {meta.message} Showing page {meta.page} of plans with {meta.perPage}{" "}
          records per page ({meta.total} total).
        </p>

        <DataTable
          showCard={false}
          horizontalScroll
          minColumnWidthRem={10}
          rows={filteredPlan ? [filteredPlan] : rows}
          columns={[
            {
              header: "Plan",
              render: (row) => row.planName,
            },
            {
              header: "AI level",
              render: (row) => row.aiLevel,
            },
            {
              header: "Max animals",
              render: (row) => row.maxAnimals,
            },
            {
              header: "Max devices",
              render: (row) => row.maxDevices,
            },
            {
              header: "Max users",
              render: (row) => row.maxUsers,
            },
            {
              header: "Max nodes",
              render: (row) => row.maxNodes,
            },
            {
              header: "Retention",
              render: (row) => `${row.dataRetentionMonths} months`,
            },
            {
              header: "Video",
              render: (row) => (row.videoEnabled ? "Enabled" : "Disabled"),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEditPlan(row)}
                  onDelete={() => {
                    void handleDeletePlan(row);
                  }}
                  isDeleting={deletingPlanId === row.id}
                />
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}
