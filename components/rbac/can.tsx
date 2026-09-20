"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Role, Permission } from "@/lib/rbac/permissions";
import { UserWithRole, hasPermission } from "@/lib/rbac/check";

interface RBACContextType {
  user: UserWithRole | null;
  role: Role;
  loading: boolean;
  hasPermission: (perm: Permission) => boolean;
  refreshRole: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType>({
  user: null,
  role: "CLIENT",
  loading: true,
  hasPermission: () => false,
  refreshRole: async () => {},
});

export function RBACProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: UserWithRole | null;
}) {
  const [user, setUser] = useState<UserWithRole | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/rbac/test-permission");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialUser) {
      fetchUserRole();
    }
  }, [initialUser]);

  const checkPermission = (perm: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, perm);
  };

  return (
    <RBACContext.Provider
      value={{
        user,
        role: user?.role || "CLIENT",
        loading,
        hasPermission: checkPermission,
        refreshRole: fetchUserRole,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function usePermission(permission?: Permission) {
  const context = useContext(RBACContext);
  const granted = permission ? context.hasPermission(permission) : true;

  return {
    ...context,
    isGranted: granted,
  };
}

/**
 * Declarative component for conditional UI visibility based on permissions or roles.
 * Note: Server remains the ultimate security boundary.
 */
export function Can({
  permission,
  role,
  fallback = null,
  children,
}: {
  permission?: Permission;
  role?: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, hasPermission } = useContext(RBACContext);

  if (!user) {
    return <>{fallback}</>;
  }

  if (user.role === "OWNER") {
    return <>{children}</>;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
    if (!allowed) return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
