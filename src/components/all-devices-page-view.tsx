"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  deviceCategoriesService,
  type DeviceCategory,
} from "@/lib/devices/device-categories-service";
import {
  deviceSpecificationsService,
  type DeviceSpecification,
} from "@/lib/devices/device-specifications-service";
import {
  devicesService,
  type DeviceInput,
  type DeviceRecord,
} from "@/lib/devices/devices-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";

interface DeviceFormValues extends Record<string, string> {
  category_id: string;
  spec_id: string;
  device_serial: string;
  firmware_version: string;
  status: string;
  last_seen: string;
}

interface AssignDeviceFormValues extends DeviceFormValues {
  organization_id: string;
}

interface ReallocateFormValues {
  new_organization_id: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface FilterValues {
  category_id: string;
  status: string;
  is_assigned: string;
  device_number: string;
}

const defaultDeviceValues: DeviceFormValues = {
  category_id: "",
  spec_id: "",
  device_serial: "",
  firmware_version: "",
  status: "Inactive",
  last_seen: "",
};

const defaultAssignValues: AssignDeviceFormValues = {
  organization_id: "",
  ...defaultDeviceValues,
};

const defaultCreateValues: AssignDeviceFormValues = {
  organization_id: "",
  ...defaultDeviceValues,
};

const defaultFilterValues: FilterValues = {
  category_id: "",
  status: "",
  is_assigned: "",
  device_number: "",
};

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Retired", label: "Retired" },
];

const isAssignedOptions = [
  { value: "", label: "All" },
  { value: "true", label: "Assigned to animal" },
  { value: "false", label: "Unassigned" },
];

function toDateTimeLocalValue(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Last seen must be a valid date-time value.");
  }

  return date.toISOString();
}

function toDevicePayload(values: DeviceFormValues): DeviceInput {
  const categoryId = Number(values.category_id);
  const specId = Number(values.spec_id);

  if (!Number.isInteger(categoryId) || categoryId < 0) {
    throw new Error("Category is required.");
  }

  if (!Number.isInteger(specId) || specId < 0) {
    throw new Error("Specification is required.");
  }

  if (!values.device_serial.trim()) {
    throw new Error("Device serial is required.");
  }

  if (!values.firmware_version.trim()) {
    throw new Error("Firmware version is required.");
  }

  if (!values.status.trim()) {
    throw new Error("Status is required.");
  }

  if (!values.last_seen.trim()) {
    throw new Error("Last seen is required.");
  }

  return {
    category_id: categoryId,
    spec_id: specId,
    device_serial: values.device_serial.trim(),
    firmware_version: values.firmware_version.trim(),
    status: values.status,
    last_seen: toIsoDateTime(values.last_seen),
  };
}

function fromDevice(device: DeviceRecord): DeviceFormValues {
  return {
    category_id: String(device.categoryId),
    spec_id: String(device.specId),
    device_serial: device.deviceSerial,
    firmware_version: device.firmwareVersion,
    status: device.status,
    last_seen: toDateTimeLocalValue(device.lastSeen),
  };
}

export function AllDevicesPageView() {
  const [rows, setRows] = useState<DeviceRecord[] | null>(null);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [specifications, setSpecifications] = useState<DeviceSpecification[]>(
    [],
  );
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<AssignDeviceFormValues>(defaultCreateValues);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [updateValues, setUpdateValues] =
    useState<DeviceFormValues>(defaultDeviceValues);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingDeviceId, setDeletingDeviceId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [assigningDevice, setAssigningDevice] = useState<DeviceRecord | null>(
    null,
  );
  const [assignValues, setAssignValues] =
    useState<AssignDeviceFormValues>(defaultAssignValues);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [reallocatingDevice, setReallocatingDevice] =
    useState<DeviceRecord | null>(null);
  const [reallocateValues, setReallocateValues] =
    useState<ReallocateFormValues>({ new_organization_id: "" });
  const [reallocateError, setReallocateError] = useState("");
  const [reallocateSuccess, setReallocateSuccess] = useState("");
  const [isReallocating, setIsReallocating] = useState(false);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [filterValues, setFilterValues] =
    useState<FilterValues>(defaultFilterValues);
  const [isFiltering, setIsFiltering] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: `${category.category_name} (ID: ${category.id})`,
      })),
    [categories],
  );

  const specificationOptions = useMemo(
    () =>
      specifications.map((spec) => ({
        value: String(spec.id),
        label: `#${spec.id} - ${spec.gps_model}`,
      })),
    [specifications],
  );

  const organizationOptions = useMemo(
    () =>
      organizations.map((organization) => ({
        value: organization.id,
        label: organization.name,
      })),
    [organizations],
  );

  const deviceFormFields = useMemo<EntityFormField<DeviceFormValues>[]>(
    () => [
      {
        name: "category_id",
        label: "Category",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "spec_id",
        label: "Specification",
        type: "select",
        required: true,
        options: specificationOptions,
      },
      {
        name: "device_serial",
        label: "Device serial",
        required: true,
      },
      {
        name: "firmware_version",
        label: "Firmware version",
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: statusOptions,
      },
      {
        name: "last_seen",
        label: "Last seen",
        type: "datetime-local",
        required: true,
      },
    ],
    [categoryOptions, specificationOptions],
  );

  const createDeviceFormFields = useMemo<
    EntityFormField<AssignDeviceFormValues>[]
  >(
    () => [
      {
        name: "organization_id",
        label: "Organization",
        type: "select",
        required: true,
        options: organizationOptions,
      },
      {
        name: "category_id",
        label: "Category",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "spec_id",
        label: "Specification",
        type: "select",
        required: true,
        options: specificationOptions,
      },
      {
        name: "device_serial",
        label: "Device serial",
        required: true,
      },
      {
        name: "firmware_version",
        label: "Firmware version",
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: statusOptions,
      },
      {
        name: "last_seen",
        label: "Last seen",
        type: "datetime-local",
        required: true,
      },
    ],
    [categoryOptions, organizationOptions, specificationOptions],
  );

  const reallocateFormFields = useMemo<EntityFormField<ReallocateFormValues>[]>(
    () => [
      {
        name: "new_organization_id",
        label: "New Organization",
        type: "select",
        required: true,
        options: organizationOptions,
      },
    ],
    [organizationOptions],
  );

  const assignFormFields = useMemo<EntityFormField<AssignDeviceFormValues>[]>(
    () => [
      {
        name: "organization_id",
        label: "Organization",
        type: "select",
        required: true,
        options: organizationOptions,
      },
      {
        name: "category_id",
        label: "Category",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "spec_id",
        label: "Specification",
        type: "select",
        required: true,
        options: specificationOptions,
      },
      {
        name: "device_serial",
        label: "Device serial",
        required: true,
      },
      {
        name: "firmware_version",
        label: "Firmware version",
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: statusOptions,
      },
      {
        name: "last_seen",
        label: "Last seen",
        type: "datetime-local",
        required: true,
      },
    ],
    [categoryOptions, organizationOptions, specificationOptions],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item) => {
      map.set(item.id, item.category_name);
      map.set(String(Number(item.id)), item.category_name);
    });
    return map;
  }, [categories]);

  const specificationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    specifications.forEach((item) => {
      const label = `#${item.id} - ${item.gps_model}`;
      map.set(String(item.id), label);
      map.set(String(Number(item.id)), label);
    });
    return map;
  }, [specifications]);

  const organizationNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [organizations]);

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setAssignError("");
    setAssignSuccess("");
    setReallocateError("");
    setReallocateSuccess("");
  };

  const loadDevices = useCallback(async () => {
    setError("");
    return devicesService.listDevices();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [
        deviceRowsResult,
        categoryRowsResult,
        specificationRowsResult,
        organizationRowsResult,
      ] = await Promise.allSettled([
        loadDevices(),
        deviceCategoriesService.listCategories(),
        deviceSpecificationsService.listSpecifications(),
        organizationCrudService.listOrganizations(),
      ]);

      if (!isMounted) {
        return;
      }

      const loadErrors: string[] = [];

      if (deviceRowsResult.status === "fulfilled") {
        setRows(deviceRowsResult.value);
      } else {
        setRows([]);
        loadErrors.push(
          deviceRowsResult.reason instanceof Error
            ? deviceRowsResult.reason.message
            : "Failed to load devices",
        );
      }

      if (categoryRowsResult.status === "fulfilled") {
        setCategories(categoryRowsResult.value);
      } else {
        setCategories([]);
        loadErrors.push("Failed to load device categories");
      }

      if (specificationRowsResult.status === "fulfilled") {
        setSpecifications(specificationRowsResult.value);
      } else {
        setSpecifications([]);
        loadErrors.push("Failed to load device specifications");
      }

      if (organizationRowsResult.status === "fulfilled") {
        setOrganizations(
          organizationRowsResult.value.map((organization) => ({
            id: organization.id,
            name: organization.organization_name,
          })),
        );
      } else {
        setOrganizations([]);
        loadErrors.push("Failed to load organizations");
      }

      setError(loadErrors.join(" | "));
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadDevices]);

  const handleApplyFilters = useCallback(async () => {
    if (!selectedOrganizationId) {
      return;
    }

    setIsFiltering(true);
    setError("");

    try {
      const filters: {
        category_id?: number;
        status?: string;
        is_assigned?: boolean;
        device_number?: string;
      } = {};

      const catId = Number(filterValues.category_id);
      if (filterValues.category_id && !Number.isNaN(catId)) {
        filters.category_id = catId;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.is_assigned === "true") {
        filters.is_assigned = true;
      } else if (filterValues.is_assigned === "false") {
        filters.is_assigned = false;
      }

      if (filterValues.device_number.trim()) {
        filters.device_number = filterValues.device_number.trim();
      }

      const result = await devicesService.listDevicesByOrganizationWithFilters(
        selectedOrganizationId,
        filters,
      );
      setRows(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to filter devices",
      );
      setRows([]);
    } finally {
      setIsFiltering(false);
    }
  }, [selectedOrganizationId, filterValues]);

  const handleClearFilters = useCallback(async () => {
    setFilterValues(defaultFilterValues);
    setIsFiltering(true);
    setError("");

    try {
      const result = await loadDevices();
      setRows(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load devices",
      );
      setRows([]);
    } finally {
      setIsFiltering(false);
    }
  }, [loadDevices]);

  const handleCreateDevice = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      if (!createValues.organization_id.trim()) {
        throw new Error("Organization is required.");
      }

      await devicesService.assignDeviceToOrganization(
        createValues.organization_id,
        toDevicePayload(createValues),
      );
      const refreshedRows = await loadDevices();
      setRows(refreshedRows);
      setCreateValues(defaultCreateValues);
      setCreateSuccess("Device created and assigned successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create and assign device",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (device: DeviceRecord) => {
    clearActionMessages();
    setShowCreateForm(false);
    setAssigningDevice(null);
    setEditingDevice(device);
    setUpdateValues(fromDevice(device));
  };

  const handleUpdateDevice = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingDevice) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await devicesService.updateDevice(
        editingDevice.id,
        toDevicePayload(updateValues),
      );
      const refreshedRows = await loadDevices();
      setRows(refreshedRows);
      setEditingDevice(null);
      setUpdateSuccess("Device updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update device",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDevice = async (device: DeviceRecord) => {
    const shouldDelete = window.confirm(
      `Delete device ${device.deviceSerial}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setDeletingDeviceId(device.id);

    try {
      await devicesService.deleteDevice(device.id);
      const refreshedRows = await loadDevices();
      setRows(refreshedRows);

      if (editingDevice?.id === device.id) {
        setEditingDevice(null);
      }

      if (assigningDevice?.id === device.id) {
        setAssigningDevice(null);
      }

      if (reallocatingDevice?.id === device.id) {
        setReallocatingDevice(null);
        setReallocateValues({ new_organization_id: "" });
      }

      setDeleteSuccess("Device deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete device",
      );
    } finally {
      setDeletingDeviceId("");
    }
  };

  const handleStartReallocate = (device: DeviceRecord) => {
    clearActionMessages();
    setShowCreateForm(false);
    setEditingDevice(null);
    setAssigningDevice(null);
    setReallocatingDevice(device);
    setReallocateValues({ new_organization_id: "" });
  };

  const handleReallocateDevice = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!reallocatingDevice) {
      return;
    }

    setReallocateError("");
    setReallocateSuccess("");
    setIsReallocating(true);

    try {
      if (!reallocateValues.new_organization_id.trim()) {
        throw new Error("New organization is required.");
      }

      await devicesService.reallocateDevice(
        reallocatingDevice.organizationId ?? "",
        reallocatingDevice.deviceSerial,
        reallocateValues.new_organization_id,
      );

      const refreshedRows = await loadDevices();
      setRows(refreshedRows);
      setReallocatingDevice(null);
      setReallocateValues({ new_organization_id: "" });
      setReallocateSuccess(
        "Device reallocated to new organization successfully.",
      );
    } catch (requestError) {
      setReallocateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to reallocate device",
      );
    } finally {
      setIsReallocating(false);
    }
  };

  const handleStartAssign = (device: DeviceRecord) => {
    clearActionMessages();
    setShowCreateForm(false);
    setEditingDevice(null);
    setAssigningDevice(device);
    setAssignValues({
      organization_id: device.organizationId ?? "",
      ...fromDevice(device),
    });
  };

  const handleAssignDevice = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!assigningDevice) {
      return;
    }

    setAssignError("");
    setAssignSuccess("");
    setIsAssigning(true);

    try {
      if (!assignValues.organization_id.trim()) {
        throw new Error("Organization is required.");
      }

      await devicesService.assignDeviceToOrganization(
        assignValues.organization_id,
        toDevicePayload(assignValues),
      );

      const refreshedRows = await loadDevices();
      setRows(refreshedRows);
      setAssigningDevice(null);
      setAssignValues(defaultAssignValues);
      setAssignSuccess("Device assigned to organization successfully.");
    } catch (requestError) {
      setAssignError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to assign device",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          All devices
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(true);
            setEditingDevice(null);
            setAssigningDevice(null);
            clearActionMessages();
          }}
          className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
        >
          Add device
        </button>
      </div>

      {/* Filter section */}
      <div className="rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-sand)]/5 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Organization
            </span>
            <select
              value={selectedOrganizationId}
              onChange={(e) => setSelectedOrganizationId(e.target.value)}
              className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">-- Select organization --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Category
            </span>
            <select
              value={filterValues.category_id}
              onChange={(e) =>
                setFilterValues((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Status
            </span>
            <select
              value={filterValues.status}
              onChange={(e) =>
                setFilterValues((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Assignment
            </span>
            <select
              value={filterValues.is_assigned}
              onChange={(e) =>
                setFilterValues((prev) => ({
                  ...prev,
                  is_assigned: e.target.value,
                }))
              }
              className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              {isAssignedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Device number
            </span>
            <input
              type="text"
              value={filterValues.device_number}
              onChange={(e) =>
                setFilterValues((prev) => ({
                  ...prev,
                  device_number: e.target.value,
                }))
              }
              placeholder="e.g. DEV-00001"
              className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ice)] outline-none placeholder:text-white/30"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={!selectedOrganizationId || isFiltering}
              className="flex items-center gap-2 rounded-full border border-[var(--color-ice)]/30 bg-[var(--color-ice)]/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-ice)]/20 disabled:cursor-not-allowed disabled:opacity-40"
              title="Apply filters"
            >
              {isFiltering ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
              )}
              <span>{isFiltering ? "Filtering..." : "Filter"}</span>
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isFiltering}
              className="rounded-full border border-rose-400/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        {!selectedOrganizationId ? (
          <p className="mt-3 text-xs text-amber-300">
            Select an organization before applying filters.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {showCreateForm ? (
        <EntityForm
          title="Create and assign device"
          fields={createDeviceFormFields}
          values={createValues}
          errorMessage={createError}
          submitLabel="Create device"
          submitLoadingLabel="Creating..."
          isSubmitting={isCreating}
          onSubmit={handleCreateDevice}
          onChange={(name, value) =>
            setCreateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setShowCreateForm(false);
            clearActionMessages();
          }}
        />
      ) : null}

      {editingDevice ? (
        <EntityForm
          title={`Edit device ${editingDevice.deviceSerial}`}
          fields={deviceFormFields}
          values={updateValues}
          errorMessage={updateError}
          submitLabel="Save changes"
          submitLoadingLabel="Saving..."
          isSubmitting={isUpdating}
          onSubmit={handleUpdateDevice}
          onChange={(name, value) =>
            setUpdateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setEditingDevice(null);
            clearActionMessages();
          }}
        />
      ) : null}

      {assigningDevice ? (
        <EntityForm
          title={`Assign device ${assigningDevice.deviceSerial} to organization`}
          fields={assignFormFields}
          values={assignValues}
          errorMessage={assignError}
          submitLabel="Assign device"
          submitLoadingLabel="Assigning..."
          isSubmitting={isAssigning}
          onSubmit={handleAssignDevice}
          onChange={(name, value) =>
            setAssignValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setAssigningDevice(null);
            setAssignValues(defaultAssignValues);
            clearActionMessages();
          }}
        />
      ) : null}

      {reallocatingDevice ? (
        <EntityForm
          title={`Reallocate device ${reallocatingDevice.deviceSerial} to new organization`}
          fields={reallocateFormFields}
          values={reallocateValues}
          errorMessage={reallocateError}
          submitLabel="Reallocate device"
          submitLoadingLabel="Reallocating..."
          isSubmitting={isReallocating}
          onSubmit={handleReallocateDevice}
          onChange={(name, value) =>
            setReallocateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setReallocatingDevice(null);
            setReallocateValues({ new_organization_id: "" });
            clearActionMessages();
          }}
        />
      ) : null}

      {createSuccess ? (
        <p className="text-sm text-emerald-400">{createSuccess}</p>
      ) : null}
      {updateSuccess ? (
        <p className="text-sm text-emerald-400">{updateSuccess}</p>
      ) : null}
      {deleteSuccess ? (
        <p className="text-sm text-emerald-400">{deleteSuccess}</p>
      ) : null}
      {assignSuccess ? (
        <p className="text-sm text-emerald-400">{assignSuccess}</p>
      ) : null}
      {reallocateSuccess ? (
        <p className="text-sm text-emerald-400">{reallocateSuccess}</p>
      ) : null}
      {reallocateError ? (
        <p className="text-sm text-rose-400">{reallocateError}</p>
      ) : null}
      {deleteError ? (
        <p className="text-sm text-rose-400">{deleteError}</p>
      ) : null}

      {isFiltering ? (
        <ResourceFeedback state="loading" resourceName="devices" />
      ) : rows === null ? (
        <ResourceFeedback state="loading" resourceName="devices" />
      ) : rows.length === 0 ? (
        <ResourceFeedback state="empty" resourceName="devices" />
      ) : (
        <DataTable
          rows={rows}
          horizontalScroll
          columns={[
            { header: "Serial", render: (row) => row.deviceSerial },
            {
              header: "Category",
              render: (row) =>
                categoryNameById.get(String(row.categoryId)) ??
                String(row.categoryId),
            },
            {
              header: "Specification",
              render: (row) =>
                specificationLabelById.get(String(row.specId)) ??
                String(row.specId),
            },
            { header: "Firmware", render: (row) => row.firmwareVersion },
            { header: "Status", render: (row) => row.status },
            {
              header: "Last seen",
              render: (row) =>
                row.lastSeen ? new Date(row.lastSeen).toLocaleString() : "-",
            },
            {
              header: "Organization",
              render: (row) =>
                row.organizationId
                  ? (organizationNameById.get(row.organizationId) ??
                    row.organizationId)
                  : "-",
            },
            {
              header: "Assign",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => handleStartAssign(row)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)] transition-colors hover:bg-white/10"
                >
                  Assign
                </button>
              ),
            },
            {
              header: "Reallocate",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => handleStartReallocate(row)}
                  className="rounded-full border border-amber-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-200 transition-colors hover:bg-amber-400/10"
                >
                  Reallocate
                </button>
              ),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteDevice(row);
                  }}
                  isDeleting={deletingDeviceId === row.id}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
