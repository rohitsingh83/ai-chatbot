"use client";

import { RequireAuth } from "@/components/shell/RequireAuth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <RequireAuth admin>
      <AdminDashboard />
    </RequireAuth>
  );
}
