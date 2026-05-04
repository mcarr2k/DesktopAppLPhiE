import { DirectoryTable } from "@/components/directory/DirectoryTable";
import { useAuth } from "@/hooks/useAuth";
import { canEditDirectory } from "@/lib/permissions";

export default function DirectoryPage() {
  const { role } = useAuth();
  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Brother Directory</h1>
          <p className="text-sm text-lphie-ink/60">
            {canEditDirectory(role)
              ? "As President or Treasurer you can update roles and statuses."
              : "Roles and statuses are managed by the President and Treasurer."}
          </p>
        </div>
      </header>
      <DirectoryTable />
    </div>
  );
}
