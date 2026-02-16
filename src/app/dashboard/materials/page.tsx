import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MaterialsManager } from "@/components/materials/materials-manager"
import { PointMaterialsManager } from "@/components/materials/point-materials-manager"
import { MaterialTransfersManager } from "@/components/materials/material-transfers-manager"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const canRead = isAdmin(role) || hasPermission(role, permissionResources.MATERIALS, permissionActions.READ)
  if (!canRead) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">المواد والمخزون</h1>
        <p className="text-muted-foreground mt-2">إدارة تصنيفات المواد والرصيد والنقل بين النقاط.</p>
      </div>
      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">الكتالوج والتصنيفات</TabsTrigger>
          <TabsTrigger value="stock">المخزون</TabsTrigger>
          <TabsTrigger value="transfers">التحويلات</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <MaterialsManager />
        </TabsContent>
        <TabsContent value="stock">
          <PointMaterialsManager />
        </TabsContent>
        <TabsContent value="transfers">
          <MaterialTransfersManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
