"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { PageNumbers } from "@/components/common/pagination";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  animalGroupsService,
  type AnimalGroup,
  type AnimalGroupFilters,
} from "@/lib/animals/animal-groups-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import { getSessionData } from "@/lib/auth-tokens";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface GroupFormValues extends Record<string, string> {
  group_name: string;
  description: string;
  animal_numbers: string;
}

const defaultValues: GroupFormValues = {
  group_name: "",
  description: "",
  animal_numbers: "",
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function splitAnimalNumbers(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function AnimalGroupsPageView(): React.JSX.Element {
  const { user } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [rows, setRows] = useState<AnimalGroup[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AnimalGroup | null>(null);
  const [filters, setFilters] = useState({ search: "", animal_number: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [formValues, setFormValues] = useState<GroupFormValues>(defaultValues);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnimalGroup | null>(null);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);

  const isSystemAdmin = useMemo(() => {
    if (!hasHydrated) return false;
    return getSessionData()?.user?.is_system_admin ?? false;
  }, [hasHydrated]);
  const activeOrgId = useMemo(
    () =>
      !isSystemAdmin && user?.organizationId
        ? user.organizationId
        : selectedOrgId,
    [isSystemAdmin, selectedOrgId, user?.organizationId],
  );

  const loadGroups = useCallback(async () => {
    if (!activeOrgId) {
      setRows([]);
      return;
    }
    const appliedFilters: AnimalGroupFilters = {
      ...filters,
      page,
      per_page: 20,
    };
    const result = await animalGroupsService.listGroups(
      activeOrgId,
      appliedFilters,
    );
    setRows(result.items);
    setPagination({
      total: result.pagination.total,
      pages: result.pagination.pages || 1,
      page: result.pagination.page,
    });
  }, [activeOrgId, filters, page]);

  useEffect(() => setHasHydrated(true), []);
  useEffect(() => {
    let mounted = true;
    void organizationCrudService
      .listOrganizations()
      .then((items) => {
        if (!mounted) return;
        setOrganizations(
          items.map((item) => ({
            id: item.id,
            name: item.organization_name ?? item.id,
          })),
        );
        if (!isSystemAdmin && user?.organizationId)
          setSelectedOrgId(user.organizationId);
      })
      .catch(() => setOrganizations([]));
    return () => {
      mounted = false;
    };
  }, [isSystemAdmin, user?.organizationId]);
  useEffect(() => {
    setRows(null);
    setActionError("");
    void loadGroups().catch((error: unknown) =>
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to load animal groups.",
      ),
    );
  }, [loadGroups]);

  const formFields = useMemo<EntityFormField<GroupFormValues>[]>(
    () => [
      { name: "group_name", label: "Group name", required: true },
      { name: "description", label: "Description" },
      {
        name: "animal_numbers",
        label: editing
          ? "Animal numbers are managed below"
          : "Animal numbers (optional, comma or line separated)",
        readOnly: Boolean(editing),
        colSpan: 2,
      },
    ],
    [editing],
  );

  const openCreate = () => {
    setEditing(null);
    setFormValues(defaultValues);
    setFormError("");
    setShowForm(true);
  };

  const openGroup = async (group: AnimalGroup) => {
    if (!activeOrgId) return;
    setActionError("");
    try {
      setSelectedGroup(
        await animalGroupsService.getGroup(activeOrgId, group.id),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to load group details.",
      );
    }
  };

  const openEdit = (group: AnimalGroup) => {
    setSelectedGroup(group);
    setEditing(group);
    setFormValues({
      group_name: group.groupName,
      description: group.description,
      animal_numbers: "",
    });
    setFormError("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrgId) return setFormError("Select an organization first.");
    if (!formValues.group_name.trim())
      return setFormError("Group name is required.");
    setFormError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      if (editing) {
        const updated = await animalGroupsService.updateGroup(
          activeOrgId,
          editing.id,
          {
            group_name: formValues.group_name.trim(),
            description: formValues.description.trim() || null,
          },
        );
        setSelectedGroup(updated);
        setSuccess("Animal group updated.");
      } else {
        const created = await animalGroupsService.createGroup(activeOrgId, {
          group_name: formValues.group_name.trim(),
          description: formValues.description.trim() || null,
          animal_numbers: splitAnimalNumbers(formValues.animal_numbers),
        });
        setSelectedGroup(created);
        setSuccess("Animal group created.");
      }
      setShowForm(false);
      await loadGroups();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to save animal group.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeGroup = async (group: AnimalGroup) => {
    if (!activeOrgId || !window.confirm(`Delete ${group.groupName}?`)) return;
    setDeletingId(group.id);
    setActionError("");
    try {
      await animalGroupsService.deleteGroup(activeOrgId, group.id);
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      await loadGroups();
      setSuccess("Animal group deleted.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to delete animal group.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const addMembers = async () => {
    if (!activeOrgId || !selectedGroup) return;
    const animalNumbers = splitAnimalNumbers(memberInput);
    if (!animalNumbers.length)
      return setActionError("Enter at least one animal number.");
    setIsUpdatingMembers(true);
    setActionError("");
    try {
      await animalGroupsService.addMembers(
        activeOrgId,
        selectedGroup.id,
        animalNumbers,
      );
      setMemberInput("");
      setSelectedGroup(
        await animalGroupsService.getGroup(activeOrgId, selectedGroup.id),
      );
      await loadGroups();
      setSuccess("Animals added to the group.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to add animals.",
      );
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const removeMember = async (animalNumber: string) => {
    if (!activeOrgId || !selectedGroup) return;
    setIsUpdatingMembers(true);
    setActionError("");
    try {
      await animalGroupsService.removeMember(
        activeOrgId,
        selectedGroup.id,
        animalNumber,
      );
      setSelectedGroup(
        await animalGroupsService.getGroup(activeOrgId, selectedGroup.id),
      );
      await loadGroups();
      setSuccess("Animal removed from the group.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to remove animal.",
      );
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Animal groups
          </h2>
          <p className="text-sm text-[var(--color-mist)]">
            Organize herds, prides, and conservation cohorts.
          </p>
        </div>
        {activeOrgId ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
          >
            Create group
          </button>
        ) : null}
      </div>

      {!hasHydrated || !isSystemAdmin ? null : (
        <label className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-mist)]">
          Organization
          <select
            value={selectedOrgId}
            onChange={(event) => {
              setSelectedOrgId(event.target.value);
              setSelectedGroup(null);
              setPage(1);
            }}
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="">-- Select organization --</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {actionError ? (
        <p className="text-sm text-rose-300">{actionError}</p>
      ) : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      {showForm ? (
        <EntityForm
          title={
            editing ? `Edit group: ${editing.groupName}` : "Create animal group"
          }
          fields={formFields}
          values={formValues}
          errorMessage={formError}
          submitLabel={editing ? "Save changes" : "Create group"}
          submitLoadingLabel="Saving..."
          isSubmitting={isSubmitting}
          onSubmit={submit}
          onChange={(name, value) =>
            setFormValues((current) => ({ ...current, [name]: value }))
          }
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {activeOrgId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-shell-border)] bg-white/5 p-4"
        >
          <label className="flex min-w-56 flex-col gap-1 text-xs text-[var(--color-mist)]">
            Search group
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--color-ice)]"
              placeholder="Herd, pride, cohort..."
            />
          </label>
          <label className="flex min-w-56 flex-col gap-1 text-xs text-[var(--color-mist)]">
            Animal number
            <input
              value={filters.animal_number}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  animal_number: event.target.value,
                }))
              }
              className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--color-ice)]"
              placeholder="ANM-00001"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ search: "", animal_number: "" });
              setPage(1);
            }}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            Reset
          </button>
        </form>
      ) : null}

      {!activeOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view animal groups.
        </p>
      ) : rows === null ? (
        <ResourceFeedback
          title="Loading animal groups"
          detail="Fetching groups for the selected organization."
          loading
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback
          title="No animal groups found"
          detail="Create a group to organize animals into a herd, pride, or cohort."
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            horizontalScroll
            columns={[
              {
                header: "Group",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => void openGroup(row)}
                    className="text-left"
                  >
                    <p className="font-semibold text-[var(--color-ice)]">
                      {row.groupName}
                    </p>
                    <p className="text-xs text-[var(--color-fog)]">
                      {row.description || "No description"}
                    </p>
                  </button>
                ),
              },
              { header: "Members", render: (row) => row.memberCount },
              { header: "Created", render: (row) => formatDate(row.createdAt) },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() => openEdit(row)}
                    onDelete={() => void removeGroup(row)}
                    isDeleting={deletingId === row.id}
                  />
                ),
              },
            ]}
          />
          <div className="flex items-center justify-between text-xs text-[var(--color-mist)]">
            <span>{pagination.total} groups</span>
            <div className="flex items-center gap-2">
              <PageNumbers
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={setPage}
                size="sm"
              />
            </div>
          </div>
        </>
      )}

      {selectedGroup ? (
        <section className="rounded-2xl border border-[var(--color-shell-border)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ice)]">
                {selectedGroup.groupName}
              </h3>
              <p className="text-sm text-[var(--color-mist)]">
                {selectedGroup.description || "No description"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className="text-xs text-[var(--color-fog)]"
            >
              Close details
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={memberInput}
              onChange={(event) => setMemberInput(event.target.value)}
              placeholder="ANM-00001, ANM-00002"
              className="min-w-64 flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={isUpdatingMembers}
              onClick={() => void addMembers()}
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Add animals
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                <tr>
                  <th className="pb-2">Animal</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Added</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {selectedGroup.members.map((member) => (
                  <tr key={member.animalNumber}>
                    <td className="py-2">{member.animalNumber}</td>
                    <td className="py-2">{member.commonName || "-"}</td>
                    <td className="py-2">{formatDate(member.addedAt)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={isUpdatingMembers}
                        onClick={() => void removeMember(member.animalNumber)}
                        className="text-xs text-rose-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedGroup.members.length === 0 ? (
              <p className="py-4 text-sm text-[var(--color-mist)]">
                No animals in this group yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
