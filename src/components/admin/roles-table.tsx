"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Permission {
  _id: string
  name: string
  nameAr: string
  resource: string
  action: string
}

interface Role {
  _id: string
  name: string
  nameAr: string
  permissions: Permission[]
  createdAt: string
}

export function RolesTable({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">قائمة الأدوار ({roles.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 sm:space-y-6">
          {roles.map((role) => (
            <div key={role._id} className="border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">{role.nameAr}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{role.name}</p>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {role.permissions?.length || 0} صلاحية
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions?.map((permission) => (
                  <span
                    key={permission._id}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 sm:px-3 py-1 text-xs font-medium text-primary"
                  >
                    {permission.nameAr} ({permission.resource}.{permission.action})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

