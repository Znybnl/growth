import { getSupabaseAdmin } from "@/lib/supabase";
import { readAllRows } from "@/lib/paginated-read";

type Site = { id: string; workspace_id: string; company_name: string };
type User = { id: string; merchant_id: string; first_name: string; last_name: string; email: string; created_at: string };
type Membership = { workspace_id: string; merchant_user_id: string; role: string; status: string };
type Workspace = { id: string; name: string; created_at: string };

/** One row per registered merchant account, independent of its selected establishment. */
export function buildAffiliateAccountDirectory(sites: Site[], users: User[], memberships: Membership[], workspaces: Workspace[]) {
  const siteById = new Map(sites.map(site => [site.id, site]));
  return workspaces.flatMap(workspace => {
    const workspaceSites = sites.filter(site => site.workspace_id === workspace.id).sort((a, b) => a.id.localeCompare(b.id));
    const owners = new Set(memberships.filter(m => m.workspace_id === workspace.id && m.role === "owner" && m.status === "active").map(m => m.merchant_user_id));
    const owner = users.filter(user => owners.has(user.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))[0];
    if (!owner || !workspaceSites.length) return [];
    const merchantId = siteById.get(owner.merchant_id)?.workspace_id === workspace.id ? owner.merchant_id : workspaceSites[0].id;
    return [{ workspaceId: workspace.id, merchantId,
      merchantName: [owner.first_name, owner.last_name].filter(Boolean).join(" ") || workspace.name,
      merchantEmail: owner.email, workspaceName: workspace.name || "Informations à compléter",
      locationCount: workspaceSites.length,
      createdAt: owner.created_at }];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.workspaceId.localeCompare(b.workspaceId));
}

export async function getAffiliateAccountDirectory() {
  const db = getSupabaseAdmin();
  async function read<T>(table: string, columns: string) {
    const result = await readAllRows((start, end) => db.from(table).select(columns, { count: "exact" }).order("id").range(start, end));
    if (result.error) throw new Error("Lecture des comptes marchands impossible.");
    return (result.data ?? []) as T[];
  }
  const [sites, users, memberships, workspaces] = await Promise.all([
    read<Site>("merchants", "id, workspace_id, company_name"),
    read<User>("merchant_users", "id, merchant_id, first_name, last_name, email, created_at"),
    read<Membership>("merchant_workspace_memberships", "id, workspace_id, merchant_user_id, role, status"),
    read<Workspace>("merchant_workspaces", "id, name, created_at"),
  ]);
  return buildAffiliateAccountDirectory(sites, users, memberships, workspaces);
}

export async function getAffiliateWorkspaceId(merchantId: string) {
  const { data, error } = await getSupabaseAdmin().from("merchants").select("workspace_id").eq("id", merchantId).maybeSingle<{ workspace_id: string }>();
  if (error || !data?.workspace_id) throw new Error("Compte marchand d’affiliation introuvable.");
  return data.workspace_id;
}
