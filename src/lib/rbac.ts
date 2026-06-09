export interface PermissionGrant {
  id: number;
  moduleName: string;
  action: string;
  description: string;
}

interface RouteAccessRule {
  prefixes: string[];
  modules: string[];
  systemAdminOnly?: boolean;
}

const routeAccessRules: RouteAccessRule[] = [
  {
    prefixes: ["/users/permissions"],
    modules: ["roles", "permissions"],
  },
  {
    prefixes: ["/users/roles"],
    modules: ["roles", "permissions"],
  },
  {
    prefixes: ["/users/all", "/users/administrators"],
    modules: ["users", "roles", "permissions"],
  },
  {
    prefixes: ["/users"],
    modules: ["users", "roles", "permissions"],
  },
  {
    prefixes: ["/organization/subscriptions"],
    modules: ["subscriptions", "subscription_plans"],
  },
  {
    prefixes: ["/organization/branding"],
    modules: ["branding", "organisation", "organisations"],
  },
  {
    prefixes: ["/organization/local-nodes"],
    modules: ["organisation", "organisations"],
  },
  {
    prefixes: ["/organization"],
    modules: ["organisation", "organisations", "subscriptions"],
  },
  {
    prefixes: ["/organizations"],
    modules: ["organisations"],
  },
  {
    prefixes: ["/animals", "/animal"],
    modules: ["animals"],
  },
  {
    prefixes: ["/devices", "/device"],
    modules: [
      "devices",
      "device_categories",
      "device_specifications",
      "sensors",
    ],
  },
  {
    prefixes: ["/tracking"],
    modules: ["tracking", "geofences"],
  },
  {
    prefixes: ["/health"],
    modules: ["health"],
  },
  {
    prefixes: ["/reports"],
    modules: ["reports"],
  },
  {
    prefixes: ["/video"],
    modules: ["cameras"],
  },
  {
    prefixes: ["/filters"],
    modules: ["tracking", "animals", "devices", "health", "reports"],
  },
  {
    prefixes: ["/administrator"],
    modules: [],
    systemAdminOnly: true,
  },
  {
    prefixes: ["/system-management"],
    modules: [],
    systemAdminOnly: true,
  },
  {
    prefixes: ["/data-migration"],
    modules: [],
    systemAdminOnly: true,
  },
];

function normalizePath(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function matchesPrefix(pathname: string, prefix: string) {
  const normalizedPath = normalizePath(pathname);
  const normalizedPrefix = normalizePath(prefix);

  if (normalizedPrefix === "/") {
    return normalizedPath === "/";
  }

  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
}

export function hasPermission(
  permissions: PermissionGrant[],
  moduleName: string,
  action: string,
) {
  const normalizedModuleName = moduleName.trim().toLowerCase();
  const normalizedAction = action.trim().toLowerCase();

  return permissions.some(
    (permission) =>
      permission.moduleName.trim().toLowerCase() === normalizedModuleName &&
      permission.action.trim().toLowerCase() === normalizedAction,
  );
}

export function hasModulePermission(
  permissions: PermissionGrant[],
  moduleName: string,
) {
  const normalizedModuleName = moduleName.trim().toLowerCase();

  return permissions.some(
    (permission) =>
      permission.moduleName.trim().toLowerCase() === normalizedModuleName,
  );
}

export function canAccessPath(
  pathname: string,
  permissions: PermissionGrant[],
  isSystemAdmin: boolean,
) {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/" || normalizedPath === "/apps") {
    return true;
  }

  if (isSystemAdmin) {
    return true;
  }

  const matchingRule = [...routeAccessRules]
    .sort((left, right) => {
      const leftLength = Math.max(
        ...left.prefixes.map((prefix) => prefix.length),
      );
      const rightLength = Math.max(
        ...right.prefixes.map((prefix) => prefix.length),
      );

      return rightLength - leftLength;
    })
    .find((rule) =>
      rule.prefixes.some((prefix) => matchesPrefix(normalizedPath, prefix)),
    );

  if (!matchingRule) {
    return true;
  }

  if (matchingRule.systemAdminOnly) {
    return false;
  }

  if (!matchingRule.modules.length) {
    return true;
  }

  return matchingRule.modules.some((moduleName) =>
    hasModulePermission(permissions, moduleName),
  );
}
