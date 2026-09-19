"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { animalsService, type Animal } from "@/lib/animals/animals-service";
import {
  animalClassificationsService,
  type AnimalClassification,
} from "@/lib/animals/animal-classifications-service";
import {
  animalGroupsService,
  type AnimalGroup,
} from "@/lib/animals/animal-groups-service";
import {
  geofenceRulesService,
  type GeofenceRule,
  type GeofenceRuleInput,
  type GeofenceRestriction,
  type GeofenceRuleTarget,
} from "@/lib/tracking/geofence-rules-service";

interface Props {
  orgId: string;
  geofenceId: string;
}
interface FormValues {
  restriction: GeofenceRestriction;
  target_type: GeofenceRuleTarget;
  target_id: string;
  border_distance_m: string;
  description: string;
  is_active: string;
}

const initialForm: FormValues = {
  restriction: "keep_in",
  target_type: "animal_group",
  target_id: "",
  border_distance_m: "10",
  description: "",
  is_active: "true",
};

export function TrackingGeofenceRulesPanel({
  orgId,
  geofenceId,
}: Props): React.JSX.Element {
  const [rules, setRules] = useState<GeofenceRule[] | null>(null);
  const [selectedRule, setSelectedRule] = useState<GeofenceRule | null>(null);
  const [groups, setGroups] = useState<AnimalGroup[]>([]);
  const [classifications, setClassifications] = useState<
    AnimalClassification[]
  >([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filters, setFilters] = useState<{
    restriction: "" | GeofenceRestriction;
    target_type: "" | GeofenceRuleTarget;
    is_active: "" | "true" | "false";
  }>({ restriction: "", target_type: "", is_active: "" });
  const [form, setForm] = useState<FormValues>(initialForm);
  const [editing, setEditing] = useState<GeofenceRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");

  const loadRules = useCallback(async () => {
    setRules(null);
    const result = await geofenceRulesService.listRules(orgId, geofenceId, {
      restriction: filters.restriction,
      target_type: filters.target_type,
      is_active:
        filters.is_active === "" ? undefined : filters.is_active === "true",
      per_page: 100,
    });
    setRules(result.items);
  }, [orgId, geofenceId, filters]);

  useEffect(() => {
    void Promise.allSettled([
      animalGroupsService.listGroups(orgId, { per_page: 100 }),
      animalClassificationsService.listClassifications(),
      animalsService.listAnimals(orgId, { page: 1, per_page: 100 }),
    ]).then(([groupsResult, classificationsResult, animalsResult]) => {
      if (groupsResult.status === "fulfilled")
        setGroups(groupsResult.value.items);
      if (classificationsResult.status === "fulfilled")
        setClassifications(classificationsResult.value);
      if (animalsResult.status === "fulfilled")
        setAnimals(animalsResult.value.items);
    });
  }, [orgId]);
  useEffect(() => {
    setError("");
    void loadRules().catch((requestError: unknown) => {
      setRules([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load geofence rules.",
      );
    });
  }, [loadRules]);

  const targetOptions = useMemo(
    () =>
      form.target_type === "animal_group"
        ? groups.map((item) => ({ value: item.id, label: item.groupName }))
        : form.target_type === "classification"
          ? classifications.map((item) => ({
              value: String(item.id),
              label: `${item.commonName} (${item.species})`,
            }))
          : animals.map((item) => ({
              value: item.animalNumber,
              label: `${item.animalNumber} ${item.commonName}`,
            })),
    [animals, classifications, form.target_type, groups],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  };
  const openEdit = (rule: GeofenceRule) => {
    setEditing(rule);
    setSelectedRule(rule);
    setForm({
      restriction: rule.restriction,
      target_type:
        rule.targetType === "all_animals" ? "animal" : rule.targetType,
      target_id:
        rule.animalGroupId ??
        (rule.classificationId === null
          ? (rule.animalNumber ?? "")
          : String(rule.classificationId)),
      border_distance_m: String(rule.borderDistanceM),
      description: rule.description,
      is_active: String(rule.isActive),
    });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.target_id && !editing) return setError("Select a rule target.");
    const distance = Number(form.border_distance_m);
    if (!Number.isFinite(distance) || distance < 0)
      return setError("Border distance must be a non-negative number.");
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const updated = await geofenceRulesService.updateRule(
          orgId,
          geofenceId,
          editing.id,
          {
            restriction: form.restriction,
            border_distance_m: distance,
            description: form.description.trim() || null,
            is_active: form.is_active === "true",
          },
        );
        setSelectedRule(updated);
      } else {
        const input: GeofenceRuleInput = {
          restriction: form.restriction,
          target_type: form.target_type,
          border_distance_m: distance,
          description: form.description.trim() || null,
          is_active: form.is_active === "true",
          ...(form.target_type === "animal_group"
            ? { animal_group_id: form.target_id }
            : {}),
          ...(form.target_type === "classification"
            ? { classification_id: Number(form.target_id) }
            : {}),
          ...(form.target_type === "animal"
            ? { animal_number: form.target_id }
            : {}),
        };
        setSelectedRule(
          await geofenceRulesService.createRule(orgId, geofenceId, input),
        );
      }
      setShowForm(false);
      setSuccess(editing ? "Geofence rule updated." : "Geofence rule created.");
      await loadRules();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save geofence rule.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: GeofenceRule) => {
    if (rule.isMainRule || !window.confirm("Delete this geofence rule?"))
      return;
    setDeleting(rule.id);
    setError("");
    try {
      await geofenceRulesService.deleteRule(orgId, geofenceId, rule.id);
      await loadRules();
      setSuccess("Geofence rule deleted.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete geofence rule.",
      );
    } finally {
      setDeleting("");
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-100">
            Geofence rules
          </h3>
          <p className="text-xs text-[var(--color-fog)]">
            Apply keep-in or keep-out behavior to groups, classifications, or
            individual animals.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-100"
        >
          Add rule
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {success ? (
        <p className="mt-3 text-sm text-emerald-300">{success}</p>
      ) : null}
      {showForm ? (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2"
        >
          <label className="text-sm">
            Restriction
            <select
              value={form.restriction}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  restriction: event.target.value as GeofenceRestriction,
                }))
              }
              disabled={Boolean(editing?.isMainRule)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            >
              <option value="keep_in">Keep animals inside</option>
              <option value="keep_out">Keep animals outside</option>
            </select>
          </label>
          <label className="text-sm">
            Target type
            <select
              value={form.target_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_type: event.target.value as GeofenceRuleTarget,
                  target_id: "",
                }))
              }
              disabled={Boolean(editing)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            >
              <option value="animal_group">Animal group</option>
              <option value="classification">Classification</option>
              <option value="animal">Animal</option>
            </select>
          </label>
          <label className="text-sm">
            Target
            <select
              required={!editing}
              value={form.target_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_id: event.target.value,
                }))
              }
              disabled={Boolean(editing)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            >
              <option value="">Select target</option>
              {targetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Border distance (m)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.border_distance_m}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  border_distance_m: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Status
            <select
              value={form.is_active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_active: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <div className="flex items-end justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Add rule"}
            </button>
          </div>
        </form>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={filters.restriction}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              restriction: event.target.value as typeof current.restriction,
            }))
          }
          className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All restrictions</option>
          <option value="keep_in">Keep in</option>
          <option value="keep_out">Keep out</option>
        </select>
        <select
          value={filters.target_type}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              target_type: event.target.value as typeof current.target_type,
            }))
          }
          className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All targets</option>
          <option value="animal_group">Groups</option>
          <option value="classification">Classifications</option>
          <option value="animal">Animals</option>
        </select>
        <select
          value={filters.is_active}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              is_active: event.target.value as typeof current.is_active,
            }))
          }
          className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {rules === null ? (
        <ResourceFeedback
          title="Loading rules"
          detail="Fetching rules for this geofence."
          loading
        />
      ) : rules.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">
          No rules found for this geofence.
        </p>
      ) : (
        <div className="mt-4">
          <DataTable
            rows={rules}
            horizontalScroll
            columns={[
              { header: "Restriction", render: (row) => row.restriction },
              {
                header: "Target",
                render: (row) =>
                  row.targetType === "animal_group"
                    ? `Group: ${row.animalGroupId}`
                    : row.targetType === "classification"
                      ? `Classification: ${row.classificationId}`
                      : row.targetType === "all_animals"
                        ? "All animals"
                        : `Animal: ${row.animalNumber}`,
              },
              { header: "Border", render: (row) => `${row.borderDistanceM} m` },
              {
                header: "Status",
                render: (row) => (row.isActive ? "Active" : "Inactive"),
              },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() => openEdit(row)}
                    onDelete={() => void remove(row)}
                    isDeleting={deleting === row.id}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </section>
  );
}
