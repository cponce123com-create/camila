import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useAdminGetStore,
  useAdminUpdateStore,
  useAdminUpdateLicense,
  useAdminGetStoreUsers,
  useAdminUpdateStoreUser,
  useAdminGetLicenseHistory,
  useAdminGetAuditLogs,
  UpdateLicenseRequestStatus,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Store as StoreIcon, Loader2, Users, FileText, Key,
  Shield, ClipboardList, CheckCircle, Clock, ShieldAlert, Ban, History,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TAB_IDS = ["info", "licencia", "usuarios", "auditoria"] as const;
type TabId = typeof TAB_IDS[number];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  trial: "bg-amber-500/10 text-amber-700",
  expired: "bg-red-500/10 text-red-700",
  suspended: "bg-gray-500/10 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trial: "Trial",
  expired: "Vencida",
  suspended: "Suspendida",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  monthly: "Mensual",
  quarterly: "Trimestral",
  semi_annual: "Semestral",
  annual: "Anual",
  free: "Gratis",
};

const ROLE_LABELS: Record<string, string> = {
  store_admin: "Admin",
  store_staff: "Empleado",
  cashier: "Cajero",
};

export default function AdminStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("info");

  // Store data
  const { data: store, isLoading } = useAdminGetStore(id || "");
  const { data: users } = useAdminGetStoreUsers(id || "");
  const { data: licHistory } = useAdminGetLicenseHistory(id || "");
  const { data: auditLogs } = useAdminGetAuditLogs({ targetId: id || "", limit: 50 });

  const updateStoreMutation = useAdminUpdateStore();
  const updateLicenseMutation = useAdminUpdateLicense();
  const updateUserMutation = useAdminUpdateStoreUser();

  // Store info form
  const [infoForm, setInfoForm] = useState({ businessName: "", ownerName: "", phone: "", email: "", address: "", district: "" });
  const [storeActive, setStoreActive] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);

  // License form
  const [licStatus, setLicStatus] = useState<UpdateLicenseRequestStatus>("trial");
  const [licPlan, setLicPlan] = useState("trial");
  const [licExpiresAt, setLicExpiresAt] = useState("");
  const [licNotes, setLicNotes] = useState("");

  // User reset password dialog
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (store) {
      setInfoForm({
        businessName: store.businessName ?? "",
        ownerName: (store as any).ownerName ?? "",
        phone: store.phone ?? "",
        email: store.email ?? "",
        address: (store as any).address ?? "",
        district: store.district ?? "",
      });
      setStoreActive((store as any).isActive ?? true);
    }
    if ((store as any)?.license) {
      setLicStatus((store as any).license.status);
      setLicPlan((store as any).license.plan ?? "trial");
      setLicExpiresAt((store as any).license.expiresAt?.slice(0, 16) ?? "");
      setLicNotes((store as any).license.notes ?? "");
    }
  }, [store]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }
  if (!store) {
    return <AdminLayout><div className="p-8 text-muted-foreground">Tienda no encontrada.</div></AdminLayout>;
  }

  const handleSaveInfo = async () => {
    try {
      await updateStoreMutation.mutateAsync({ storeId: store.id, data: { ...infoForm, isActive: storeActive } });
      qc.invalidateQueries({ queryKey: [`/api/admin/stores/${store.id}`] });
      toast({ title: "Datos actualizados" });
      setEditingInfo(false);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSaveLicense = async () => {
    try {
      await updateLicenseMutation.mutateAsync({
        storeId: store.id,
        data: {
          status: licStatus,
          plan: licPlan as any,
          expiresAt: licExpiresAt ? new Date(licExpiresAt).toISOString() : undefined,
          notes: licNotes || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: [`/api/admin/stores/${store.id}`] });
      qc.invalidateQueries({ queryKey: [`/api/admin/stores/${store.id}/license-history`] });
      toast({ title: "Licencia actualizada" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleToggleUser = async (user: any) => {
    try {
      await updateUserMutation.mutateAsync({
        storeId: store.id,
        userId: user.id,
        data: { isActive: !user.isActive },
      });
      qc.invalidateQueries({ queryKey: [`/api/admin/stores/${store.id}/users`] });
      toast({ title: user.isActive ? "Usuario bloqueado" : "Usuario reactivado" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || newPassword.length < 8) return;
    try {
      await updateUserMutation.mutateAsync({
        storeId: store.id,
        userId: resetUser.id,
        data: { resetPassword: newPassword },
      });
      toast({ title: "Contraseña actualizada" });
      setResetUser(null);
      setNewPassword("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const lic = (store as any).license;

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="mb-5">
        <Link href="/admin/stores" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Tiendas
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <StoreIcon className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold">{store.businessName}</h1>
            {lic && (
              <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${STATUS_STYLES[lic.status] ?? "bg-muted text-muted-foreground"}`}>
                {STATUS_LABELS[lic.status] ?? lic.status}
              </span>
            )}
            {!(store as any).isActive && (
              <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-destructive/10 text-destructive">INACTIVA</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{store.district} · {store.email}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-6 w-fit">
        {([
          { id: "info", label: "Información", icon: StoreIcon },
          { id: "licencia", label: "Licencia", icon: Shield },
          { id: "usuarios", label: "Usuarios", icon: Users },
          { id: "auditoria", label: "Auditoría", icon: FileText },
        ] as { id: TabId; label: string; icon: React.ElementType }[]).map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === tabId ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Info */}
      {tab === "info" && (
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base">Datos del Negocio</CardTitle>
            {!editingInfo ? (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditingInfo(true)}>Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setEditingInfo(false)}>Cancelar</Button>
                <Button size="sm" className="rounded-xl" onClick={handleSaveInfo} disabled={updateStoreMutation.isPending}>Guardar</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {editingInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "businessName", label: "Nombre del negocio" },
                  { key: "ownerName", label: "Titular" },
                  { key: "phone", label: "Teléfono" },
                  { key: "email", label: "Correo" },
                  { key: "address", label: "Dirección" },
                  { key: "district", label: "Distrito" },
                ] as { key: keyof typeof infoForm; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{label}</label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={infoForm[key]}
                      onChange={(e) => setInfoForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3 sm:col-span-2 p-4 bg-secondary/50 rounded-xl">
                  <Switch checked={storeActive} onCheckedChange={setStoreActive} />
                  <div>
                    <p className="text-sm font-medium">Tienda activa</p>
                    <p className="text-xs text-muted-foreground">Deshabilitar bloqueará el acceso a todos sus usuarios.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ["Nombre del negocio", store.businessName],
                  ["Titular", (store as any).ownerName],
                  ["Teléfono", store.phone],
                  ["Correo", store.email],
                  ["Dirección", (store as any).address],
                  ["Distrito", store.district],
                  ["Documento", `${store.documentType || ""} ${store.documentNumber || ""}`.trim()],
                  ["Creada el", store.createdAt ? format(new Date(store.createdAt), "dd MMM yyyy", { locale: es }) : "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold mt-0.5">{value || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: License */}
      {tab === "licencia" && (
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm rounded-2xl border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="font-display text-base">Gestión de Licencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={licStatus} onValueChange={(v: UpdateLicenseRequestStatus) => setLicStatus(v)}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial (Prueba)</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="expired">Vencida</SelectItem>
                      <SelectItem value="suspended">Suspendida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={licPlan} onValueChange={setLicPlan}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="semi_annual">Semestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="free">Gratis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha de vencimiento</label>
                  <Input
                    type="datetime-local"
                    className="mt-1.5 rounded-xl text-sm"
                    value={licExpiresAt}
                    onChange={(e) => setLicExpiresAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notas internas</label>
                  <Input
                    placeholder="Opcional..."
                    className="mt-1.5 rounded-xl"
                    value={licNotes}
                    onChange={(e) => setLicNotes(e.target.value)}
                  />
                </div>
              </div>
              <Button className="rounded-xl" onClick={handleSaveLicense} disabled={updateLicenseMutation.isPending}>
                {updateLicenseMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Actualizar licencia
              </Button>
            </CardContent>
          </Card>

          {/* License History */}
          <Card className="border-border/50 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de cambios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(licHistory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin historial de cambios.</p>
              ) : (
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Estado anterior</TableHead>
                      <TableHead>Nuevo estado</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(licHistory ?? []).map((h) => (
                      <TableRow key={h.id} className="text-sm">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {h.createdAt ? format(new Date(h.createdAt), "dd MMM yy HH:mm", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{(h as any).actorEmail ?? "—"}</TableCell>
                        <TableCell>
                          {h.prevStatus ? (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${STATUS_STYLES[h.prevStatus] ?? "bg-muted text-muted-foreground"}`}>
                              {STATUS_LABELS[h.prevStatus] ?? h.prevStatus}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {h.newStatus ? (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${STATUS_STYLES[h.newStatus] ?? "bg-muted text-muted-foreground"}`}>
                              {STATUS_LABELS[h.newStatus] ?? h.newStatus}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.newPlan ? PLAN_LABELS[h.newPlan] ?? h.newPlan : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{(h as any).notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: Users */}
      {tab === "usuarios" && (
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display text-base">Usuarios de la tienda</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(users ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No hay usuarios en esta tienda.</p>
            ) : (
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users ?? []).map((u) => (
                    <TableRow key={u.id} className="text-sm">
                      <TableCell className="font-semibold">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-semibold">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${u.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>
                          {u.isActive ? "Activo" : "Bloqueado"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs gap-1.5"
                            onClick={() => { setResetUser(u); setNewPassword(""); }}
                          >
                            <Key className="h-3.5 w-3.5" /> Contraseña
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`rounded-lg text-xs gap-1.5 ${u.isActive ? "text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" : ""}`}
                            onClick={() => handleToggleUser(u)}
                            disabled={updateUserMutation.isPending}
                          >
                            {u.isActive ? <><Ban className="h-3.5 w-3.5" />Bloquear</> : <><CheckCircle className="h-3.5 w-3.5" />Activar</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: Audit */}
      {tab === "auditoria" && (
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Actividad de esta tienda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(auditLogs?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin actividad registrada para esta tienda.</p>
            ) : (
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLogs?.data ?? []).map((log) => (
                    <TableRow key={log.id} className="text-sm">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), "dd MMM yy HH:mm", { locale: es }) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{log.actorEmail ?? "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">{log.action}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Restablecer contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cambia la contraseña de <span className="font-semibold text-foreground">{resetUser?.name}</span>.
            </p>
            <div>
              <label className="text-sm font-medium">Nueva contraseña</label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="mt-1.5 rounded-xl"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setResetUser(null)}>Cancelar</Button>
            <Button
              className="rounded-xl"
              onClick={handleResetPassword}
              disabled={newPassword.length < 8 || updateUserMutation.isPending}
            >
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
