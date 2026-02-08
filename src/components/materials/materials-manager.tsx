"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"

const ATTRIBUTE_TYPES = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "select", label: "قائمة" },
  { value: "boolean", label: "نعم/لا" },
  { value: "date", label: "تاريخ" },
] as const

type Category = {
  _id: string
  name: string
  nameAr?: string
  parentId?: string | null
  depth?: number
  isActive?: boolean
}

type CategoryNode = Category & { children?: Category[] }

type Branch = {
  _id: string
  name: string
  nameAr?: string
}

type Point = {
  _id: string
  name: string
  nameAr?: string
}

type Unit = {
  _id: string
  name: string
  nameAr?: string
  symbol?: string
  baseUnitId?: string | null
  factor?: number
  isActive?: boolean
}

type Material = {
  _id: string
  name: string
  nameAr?: string
  sku: string
  baseUnitId?: string | null
  isActive?: boolean
  categoryIds?: string[]
}

type AttributeDef = {
  _id: string
  categoryId: string
  name: string
  type: "text" | "number" | "select" | "boolean" | "date"
  required?: boolean
  options?: string[]
  unitId?: string | null
}

type AttributeValue = {
  attributeId: string
  value: any
}

const emptyCategoryForm = {
  name: "",
  nameAr: "",
  parentId: "",
  isActive: true,
}

const emptyMaterialForm = {
  name: "",
  nameAr: "",
  sku: "",
  baseUnitId: "",
  isActive: true,
  categoryIds: [] as string[],
}

const emptyUnitForm = {
  name: "",
  nameAr: "",
  symbol: "",
  baseUnitId: "",
  factor: 1,
  isActive: true,
}

export function MaterialsManager() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [attributes, setAttributes] = useState<AttributeDef[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [points, setPoints] = useState<Point[]>([])
  const [selectedPointId, setSelectedPointId] = useState("")

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryEditing, setCategoryEditing] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ ...emptyCategoryForm })

  const [attributeForm, setAttributeForm] = useState({
    name: "",
    type: "text",
    required: false,
    options: "",
    unitId: "",
  })

  const [materialOpen, setMaterialOpen] = useState(false)
  const [materialEditing, setMaterialEditing] = useState<Material | null>(null)
  const [materialForm, setMaterialForm] = useState({ ...emptyMaterialForm })
  const [materialAttributes, setMaterialAttributes] = useState<AttributeDef[]>([])
  const [materialAttributeValues, setMaterialAttributeValues] = useState<Record<string, any>>({})

  const [unitOpen, setUnitOpen] = useState(false)
  const [unitForm, setUnitForm] = useState({ ...emptyUnitForm })

  const [loading, setLoading] = useState(false)

  const role = session?.user?.role as any
  const userIsAdmin = useMemo(() => {
    if (!role) return false
    if (typeof role === "string") return role === "super_admin"
    return isAdmin(role)
  }, [role])
  const userIsOrgAdmin = useMemo(() => {
    if (!role) return false
    if (typeof role === "string") return role === "organization_admin"
    return isOrganizationAdmin(role)
  }, [role])
  const canManageOrg = userIsAdmin || userIsOrgAdmin

  const sessionBranchId = (session?.user as any)?.branchId || ""
  const [scope, setScope] = useState<"org" | "branch" | "point">("branch")
  const isOrgScope = canManageOrg && scope === "org"
  const isPointScope = scope === "point"
  const activeBranchId = !isOrgScope ? (canManageOrg ? selectedBranchId : sessionBranchId) : ""
  const activePointId = isPointScope ? selectedPointId : ""

  const loadBranches = async () => {
    try {
      const res = await apiClient.get("/branches")
      const list = res.branches || res.data?.branches || []
      setBranches(list)
      if (!selectedBranchId) {
        const fallback = sessionBranchId || list[0]?._id || ""
        setSelectedBranchId(fallback)
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const loadPoints = async (branchId: string) => {
    if (!branchId) return
    try {
      const res = await apiClient.get(`/points?branchId=${branchId}`)
      const list = res.points || res.data?.points || []
      setPoints(list)
      if (!selectedPointId) {
        setSelectedPointId(list[0]?._id || "")
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const loadCategories = async () => {
    const url = isOrgScope
      ? "/material-categories?scope=org"
      : isPointScope
        ? activeBranchId && activePointId
          ? `/material-categories?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : ""
        : activeBranchId
          ? `/material-categories?branchId=${activeBranchId}`
          : ""
    if (!url) return
    const res = await apiClient.get(url)
    const list = res.categories || res.data?.categories || []
    setCategories(list)
  }

  const loadUnits = async () => {
    const url = isOrgScope
      ? "/units?scope=org"
      : isPointScope
        ? activeBranchId && activePointId
          ? `/units?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : ""
        : activeBranchId
          ? `/units?branchId=${activeBranchId}`
          : ""
    if (!url) return
    const res = await apiClient.get(url)
    const list = res.units || res.data?.units || []
    setUnits(list)
  }

  const loadMaterials = async (categoryId?: string | null) => {
    const url = isOrgScope
      ? `/materials?scope=org${categoryId ? `&categoryId=${categoryId}` : ""}`
      : isPointScope
        ? activeBranchId && activePointId
          ? `/materials?branchId=${activeBranchId}&pointId=${activePointId}&scope=point${categoryId ? `&categoryId=${categoryId}` : ""}`
          : ""
        : activeBranchId
          ? `/materials?branchId=${activeBranchId}${categoryId ? `&categoryId=${categoryId}` : ""}`
          : ""
    if (!url) return
    const res = await apiClient.get(url)
    const list = res.materials || res.data?.materials || []
    setMaterials(list)
  }

  const loadCategoryAttributes = async (categoryId?: string | null) => {
    if (!categoryId) {
      setAttributes([])
      return
    }
    const res = await apiClient.get(`/material-attributes?categoryId=${categoryId}`)
    const list = res.attributes || res.data?.attributes || []
    setAttributes(list)
  }

  const loadMaterialAttributes = async (categoryIds: string[]) => {
    if (!categoryIds.length) {
      setMaterialAttributes([])
      return
    }
    const res = await apiClient.get(`/material-attributes?categoryIds=${categoryIds.join(",")}`)
    const list = res.attributes || res.data?.attributes || []
    const unique = new Map<string, AttributeDef>()
    list.forEach((attr: AttributeDef) => unique.set(attr._id, attr))
    setMaterialAttributes(Array.from(unique.values()))
  }

  useEffect(() => {
    if (canManageOrg) {
      loadBranches()
    } else if (sessionBranchId) {
      setSelectedBranchId(sessionBranchId)
    }
  }, [canManageOrg, sessionBranchId])

  useEffect(() => {
    if (!activeBranchId) return
    if (isPointScope) {
      loadPoints(activeBranchId)
    } else {
      setPoints([])
      setSelectedPointId("")
    }
  }, [activeBranchId, isPointScope])

  useEffect(() => {
    if (canManageOrg && !sessionBranchId && (scope === "branch" || scope === "point")) {
      setScope("org")
    }
  }, [canManageOrg, scope, sessionBranchId])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCategories(), loadUnits(), loadMaterials(null)])
      .catch((error: any) => toast.error(error.message || "حدث خطأ"))
      .finally(() => setLoading(false))
  }, [activeBranchId, activePointId, isOrgScope, isPointScope])

  useEffect(() => {
    loadMaterials(selectedCategoryId)
    loadCategoryAttributes(selectedCategoryId)
  }, [isOrgScope, isPointScope, activeBranchId, activePointId, selectedCategoryId])

  const ensureScopeReady = () => {
    if (!isOrgScope && !activeBranchId) {
      toast.error("يرجى اختيار الفرع")
      return false
    }
    if (isPointScope && !activePointId) {
      toast.error("يرجى اختيار النقطة")
      return false
    }
    return true
  }

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((item) => `${item.name} ${item.sku}`.toLowerCase().includes(q))
  }, [materials, search])

  const categoryTree = useMemo(() => {
    const map = new Map<string, Category & { children: Category[] }>()
    categories.forEach((c) => map.set(c._id, { ...c, children: [] }))
    const roots: Array<Category & { children: Category[] }> = []
    categories.forEach((c) => {
      const node = map.get(c._id)!
      if (c.parentId) {
        const parent = map.get(c.parentId)
        if (parent) {
          parent.children.push(node)
          return
        }
      }
      roots.push(node)
    })
    return roots
  }, [categories])

  const openCreateCategory = () => {
    setCategoryEditing(null)
    setCategoryForm({
      ...emptyCategoryForm,
      parentId: selectedCategoryId || "",
    })
    setCategoryOpen(true)
  }

  const openEditCategory = (category: Category) => {
    setCategoryEditing(category)
    setCategoryForm({
      name: category.name || "",
      nameAr: category.nameAr || "",
      parentId: category.parentId || "",
      isActive: category.isActive !== false,
    })
    setCategoryOpen(true)
  }

  const submitCategory = async () => {
    if (!ensureScopeReady()) return
    if (!categoryForm.name) {
      toast.error("يرجى إدخال اسم التصنيف")
      return
    }
    const payload = {
      name: categoryForm.name,
      nameAr: categoryForm.nameAr || categoryForm.name,
      parentId: categoryForm.parentId || null,
      isActive: categoryForm.isActive,
      branchId: isOrgScope ? null : activeBranchId,
      pointId: isPointScope ? activePointId : null,
      scope: isOrgScope ? "org" : isPointScope ? "point" : "branch",
    }

    try {
      if (categoryEditing) {
        await apiClient.patch(`/material-categories/${categoryEditing._id}`, payload)
        toast.success("تم تحديث التصنيف")
      } else {
        await apiClient.post("/material-categories", payload)
        toast.success("تم إضافة التصنيف")
      }
      setCategoryOpen(false)
      await loadCategories()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const removeCategory = async (category: Category) => {
    if (!ensureScopeReady()) return
    if (!confirm(`حذف التصنيف ${category.name}؟`)) return
    try {
      const url = isOrgScope
        ? `/material-categories/${category._id}?scope=org`
        : isPointScope
          ? `/material-categories/${category._id}?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : `/material-categories/${category._id}?branchId=${activeBranchId}`
      await apiClient.delete(url)
      toast.success("تم حذف التصنيف")
      setSelectedCategoryId((prev) => (prev === category._id ? null : prev))
      await loadCategories()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const submitAttribute = async () => {
    if (!selectedCategoryId) {
      toast.error("اختر تصنيفًا أولاً")
      return
    }
    if (!attributeForm.name) {
      toast.error("يرجى إدخال اسم الخاصية")
      return
    }

    try {
      await apiClient.post("/material-attributes", {
        categoryId: selectedCategoryId,
        name: attributeForm.name,
        type: attributeForm.type,
        required: attributeForm.required,
        options: attributeForm.type === "select" ? attributeForm.options.split(",").map((o) => o.trim()).filter(Boolean) : [],
        unitId: attributeForm.unitId || null,
      })
      setAttributeForm({ name: "", type: "text", required: false, options: "", unitId: "" })
      await loadCategoryAttributes(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const removeAttribute = async (attr: AttributeDef) => {
    if (!confirm(`حذف الخاصية ${attr.name}؟`)) return
    try {
      await apiClient.delete(`/material-attributes/${attr._id}`)
      await loadCategoryAttributes(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const openCreateMaterial = () => {
    setMaterialEditing(null)
    setMaterialForm({ ...emptyMaterialForm })
    setMaterialAttributeValues({})
    setMaterialAttributes([])
    setMaterialOpen(true)
  }

  const openEditMaterial = async (item: Material) => {
    if (!ensureScopeReady()) return
    try {
      const url = isOrgScope
        ? `/materials/${item._id}?scope=org`
        : isPointScope
          ? `/materials/${item._id}?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : `/materials/${item._id}?branchId=${activeBranchId}`
      const res = await apiClient.get(url)
      const material = res.material || res.data?.material || item
      const categoryIds = res.categoryIds || res.data?.categoryIds || []
      const attributesList = res.attributes || res.data?.attributes || []
      const values: Record<string, any> = {}
      attributesList.forEach((attr: any) => {
        values[String(attr.attributeId)] = attr.value
      })

      setMaterialEditing(material)
      setMaterialForm({
        name: material.name || "",
        nameAr: material.nameAr || "",
        sku: material.sku || "",
        baseUnitId: material.baseUnitId || "",
        isActive: material.isActive !== false,
        categoryIds,
      })
      setMaterialAttributeValues(values)
      await loadMaterialAttributes(categoryIds)
      setMaterialOpen(true)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const submitMaterial = async () => {
    if (!ensureScopeReady()) return
    if (!materialForm.name || !materialForm.sku) {
      toast.error("الاسم والكود مطلوبان")
      return
    }

    const attributesPayload: AttributeValue[] = materialAttributes.map((attr) => ({
      attributeId: attr._id,
      value: materialAttributeValues[attr._id] ?? null,
    }))

    const payload = {
      name: materialForm.name,
      nameAr: materialForm.nameAr || materialForm.name,
      sku: materialForm.sku,
      baseUnitId: materialForm.baseUnitId || null,
      isActive: materialForm.isActive,
      categoryIds: materialForm.categoryIds,
      attributes: attributesPayload,
      branchId: isOrgScope ? null : activeBranchId,
      pointId: isPointScope ? activePointId : null,
      scope: isOrgScope ? "org" : isPointScope ? "point" : "branch",
    }

    try {
      if (materialEditing) {
        await apiClient.patch(`/materials/${materialEditing._id}`, payload)
        toast.success("تم تحديث المادة")
      } else {
        await apiClient.post("/materials", payload)
        toast.success("تم إضافة المادة")
      }
      setMaterialOpen(false)
      await loadMaterials(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const removeMaterial = async (item: Material) => {
    if (!ensureScopeReady()) return
    if (!confirm(`حذف المادة ${item.name}؟`)) return
    try {
      const url = isOrgScope
        ? `/materials/${item._id}?scope=org`
        : isPointScope
          ? `/materials/${item._id}?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : `/materials/${item._id}?branchId=${activeBranchId}`
      await apiClient.delete(url)
      toast.success("تم حذف المادة")
      await loadMaterials(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const submitUnit = async () => {
    if (!ensureScopeReady()) return
    if (!unitForm.name) {
      toast.error("يرجى إدخال اسم الوحدة")
      return
    }
    try {
      await apiClient.post("/units", {
        name: unitForm.name,
        nameAr: unitForm.nameAr || unitForm.name,
        symbol: unitForm.symbol || null,
        baseUnitId: unitForm.baseUnitId || null,
        factor: unitForm.factor || 1,
        isActive: unitForm.isActive,
        branchId: isOrgScope ? null : activeBranchId,
        pointId: isPointScope ? activePointId : null,
        scope: isOrgScope ? "org" : isPointScope ? "point" : "branch",
      })
      setUnitForm({ ...emptyUnitForm })
      await loadUnits()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const renderCategory = (node: CategoryNode, depth = 0) => {
    const isSelected = selectedCategoryId === node._id
    return (
      <div key={node._id} className="space-y-1">
        <div
          className={cn(
            "flex items-center justify-between rounded-md border px-2 py-1 text-sm",
            isSelected ? "bg-primary/10 border-primary/40" : "hover:bg-muted"
          )}
          style={{ paddingRight: `${depth * 12 + 8}px` }}
        >
          <button className="flex-1 text-right" onClick={() => setSelectedCategoryId(node._id)}>
            {node.nameAr || node.name}
          </button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEditCategory(node)}>
              تعديل
            </Button>
            <Button variant="ghost" size="sm" onClick={() => removeCategory(node)}>
              حذف
            </Button>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="text-right">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">نطاق الإدارة</span>
            <div className="flex items-center gap-2">
              {canManageOrg && (
                <Button
                  size="sm"
                  variant={scope === "org" ? "default" : "outline"}
                  onClick={() => {
                    setScope("org")
                    setSelectedCategoryId(null)
                  }}
                >
                  المؤسسة (الشجرة الأساسية)
                </Button>
              )}
              <Button
                size="sm"
                variant={scope === "branch" ? "default" : "outline"}
                onClick={() => {
                  setScope("branch")
                  setSelectedCategoryId(null)
                }}
              >
                فرع
              </Button>
              <Button
                size="sm"
                variant={scope === "point" ? "default" : "outline"}
                onClick={() => {
                  setScope("point")
                  setSelectedPointId("")
                  setSelectedCategoryId(null)
                }}
              >
                نقطة
              </Button>
            </div>

            {(scope === "branch" || scope === "point") && canManageOrg && (
              <>
                <span className="text-sm font-semibold">اختيار الفرع</span>
                <div className="min-w-[220px]">
                  <Select
                    value={selectedBranchId}
                    onValueChange={(value) => {
                      setSelectedBranchId(value)
                      setSelectedPointId("")
                      setSelectedCategoryId(null)
                    }}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.nameAr || branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {branches.length === 0 && (
                  <span className="text-xs text-muted-foreground">لا توجد فروع متاحة.</span>
                )}
              </>
            )}

            {scope === "point" && (
              <>
                <span className="text-sm font-semibold">اختيار النقطة</span>
                <div className="min-w-[220px]">
                  <Select
                    value={selectedPointId}
                    onValueChange={(value) => {
                      setSelectedPointId(value)
                      setSelectedCategoryId(null)
                    }}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر النقطة" />
                    </SelectTrigger>
                    <SelectContent>
                      {points.map((point) => (
                        <SelectItem key={point._id} value={point._id}>
                          {point.nameAr || point.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {points.length === 0 && (
                  <span className="text-xs text-muted-foreground">لا توجد نقاط متاحة.</span>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>شجرة المواد</CardTitle>
            <Button size="sm" onClick={openCreateCategory}>إضافة تصنيف</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {categoryTree.length === 0 ? (
                <div className="text-sm text-muted-foreground">لا توجد تصنيفات بعد.</div>
              ) : (
                categoryTree.map((node) => renderCategory(node))
              )}
            </div>

            <div className="space-y-3 border-r pr-4 lg:border-r-0 lg:border-t-0 lg:border-l lg:pl-4">
              <div className="text-sm font-semibold">خصائص التصنيف</div>
              {selectedCategoryId ? (
                <>
                  <div className="space-y-2">
                    {attributes.length === 0 && (
                      <div className="text-xs text-muted-foreground">لا توجد خصائص.</div>
                    )}
                    {attributes.map((attr) => (
                      <div key={attr._id} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                        <div>
                          {attr.name} ({ATTRIBUTE_TYPES.find((t) => t.value === attr.type)?.label || attr.type})
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeAttribute(attr)}>
                          حذف
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-lg border p-2">
                    <div className="text-sm font-medium">إضافة خاصية</div>
                    <Input
                      placeholder="اسم الخاصية"
                      value={attributeForm.name}
                      onChange={(e) => setAttributeForm({ ...attributeForm, name: e.target.value })}
                    />
                    <Select
                      value={attributeForm.type}
                      onValueChange={(value) => setAttributeForm({ ...attributeForm, type: value })}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="نوع الخاصية" />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {attributeForm.type === "select" && (
                      <Input
                        placeholder="الخيارات (مفصولة بفواصل)"
                        value={attributeForm.options}
                        onChange={(e) => setAttributeForm({ ...attributeForm, options: e.target.value })}
                      />
                    )}
                    <Select
                      value={attributeForm.unitId || "__none__"}
                      onValueChange={(value) => setAttributeForm({ ...attributeForm, unitId: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="وحدة القياس (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون</SelectItem>
                        {units.map((unit) => (
                          <SelectItem key={unit._id} value={unit._id}>
                            {unit.nameAr || unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                      <span>إجباري</span>
                      <Switch
                        checked={attributeForm.required}
                        onCheckedChange={(checked) => setAttributeForm({ ...attributeForm, required: checked })}
                      />
                    </div>
                    <Button size="sm" onClick={submitAttribute}>حفظ الخاصية</Button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">اختر تصنيفًا لعرض الخصائص.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>المواد</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUnitOpen(true)}>الوحدات</Button>
              <Button size="sm" onClick={openCreateMaterial}>إضافة مادة</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="بحث بالاسم أو الكود"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="text-sm text-muted-foreground flex items-center justify-end">
              {selectedCategoryId ? "فلترة حسب التصنيف المحدد" : "كل التصنيفات"}
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="p-2">الاسم</th>
                    <th className="p-2">الكود</th>
                    <th className="p-2">الوحدة</th>
                    <th className="p-2">التصنيفات</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((item) => {
                    const unit = units.find((u) => u._id === item.baseUnitId)
                    return (
                      <tr key={item._id} className="border-b">
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">{item.sku}</td>
                        <td className="p-2">{unit?.nameAr || unit?.name || "-"}</td>
                        <td className="p-2">{item.categoryIds?.length || 0}</td>
                        <td className="p-2">{item.isActive === false ? "معطلة" : "مفعلة"}</td>
                        <td className="p-2 space-x-2 space-x-reverse">
                          <Button variant="outline" size="sm" onClick={() => openEditMaterial(item)}>تعديل</Button>
                          <Button variant="destructive" size="sm" onClick={() => removeMaterial(item)}>حذف</Button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                        لا توجد مواد لعرضها
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{categoryEditing ? "تعديل التصنيف" : "إضافة تصنيف"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </div>
            <div>
              <Label>الاسم (عربي)</Label>
              <Input value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>التصنيف الأب</Label>
              <Select value={categoryForm.parentId || "__none__"} onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value === "__none__" ? "" : value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="بدون" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.nameAr || cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
              <span>مفعظ‘ل</span>
              <Switch checked={categoryForm.isActive} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })} />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>إلغاء</Button>
            <Button onClick={submitCategory}>{categoryEditing ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="text-right max-w-2xl">
          <DialogHeader>
            <DialogTitle>{materialEditing ? "تعديل مادة" : "إضافة مادة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>الاسم</Label>
                <Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input value={materialForm.nameAr} onChange={(e) => setMaterialForm({ ...materialForm, nameAr: e.target.value })} />
              </div>
              <div>
                <Label>الكود (SKU)</Label>
                <Input value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} />
              </div>
              <div>
                <Label>الوحدة الأساسية</Label>
                <Select value={materialForm.baseUnitId || "__none__"} onValueChange={(value) => setMaterialForm({ ...materialForm, baseUnitId: value === "__none__" ? "" : value })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>{unit.nameAr || unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-2">
              <div className="text-sm font-semibold mb-2">التصنيفات</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {categories.map((cat) => (
                  <label key={cat._id} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                    <span>{cat.nameAr || cat.name}</span>
                    <input
                      type="checkbox"
                      checked={materialForm.categoryIds.includes(cat._id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...materialForm.categoryIds, cat._id]
                          : materialForm.categoryIds.filter((id) => id !== cat._id)
                        setMaterialForm({ ...materialForm, categoryIds: next })
                        loadMaterialAttributes(next)
                      }}
                    />
                  </label>
                ))}
                {categories.length === 0 && (
                  <div className="text-xs text-muted-foreground">لا توجد تصنيفات.</div>
                )}
              </div>
            </div>

            {materialAttributes.length > 0 && (
              <div className="rounded-lg border p-2 space-y-3">
                <div className="text-sm font-semibold">خصائص المادة</div>
                {materialAttributes.map((attr) => {
                  const value = materialAttributeValues[attr._id]
                  return (
                    <div key={attr._id} className="space-y-1">
                      <Label>{attr.name}</Label>
                      {attr.type === "text" && (
                        <Input
                          value={value || ""}
                          onChange={(e) => setMaterialAttributeValues({ ...materialAttributeValues, [attr._id]: e.target.value })}
                        />
                      )}
                      {attr.type === "number" && (
                        <Input
                          type="number"
                          value={value ?? ""}
                          onChange={(e) => setMaterialAttributeValues({ ...materialAttributeValues, [attr._id]: e.target.value })}
                        />
                      )}
                      {attr.type === "date" && (
                        <Input
                          type="date"
                          value={value ?? ""}
                          onChange={(e) => setMaterialAttributeValues({ ...materialAttributeValues, [attr._id]: e.target.value })}
                        />
                      )}
                      {attr.type === "select" && (
                        <Select
                          value={value ?? ""}
                          onValueChange={(val) => setMaterialAttributeValues({ ...materialAttributeValues, [attr._id]: val })}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {(attr.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {attr.type === "boolean" && (
                        <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                          <span>{value ? "نعم" : "لا"}</span>
                          <Switch
                            checked={!!value}
                            onCheckedChange={(checked) => setMaterialAttributeValues({ ...materialAttributeValues, [attr._id]: checked })}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
              <span>مفعظ‘لة</span>
              <Switch checked={materialForm.isActive} onCheckedChange={(checked) => setMaterialForm({ ...materialForm, isActive: checked })} />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setMaterialOpen(false)}>إلغاط،</Button>
            <Button onClick={submitMaterial}>{materialEditing ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>وحدات القياس</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {units.map((unit) => (
                <div key={unit._id} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                  <span>{unit.nameAr || unit.name}</span>
                  <span className="text-muted-foreground">{unit.symbol || ""}</span>
                </div>
              ))}
              {units.length === 0 && (
                <div className="text-xs text-muted-foreground">لا توجد وحدات.</div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-2">
              <div className="text-sm font-semibold">إضافة وحدة</div>
              <Input
                placeholder="اسم الوحدة"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              />
              <Input
                placeholder="اسم عربي"
                value={unitForm.nameAr}
                onChange={(e) => setUnitForm({ ...unitForm, nameAr: e.target.value })}
              />
              <Input
                placeholder="الرمز (مثال: kg)"
                value={unitForm.symbol}
                onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })}
              />
              <Select value={unitForm.baseUnitId || "__none__"} onValueChange={(value) => setUnitForm({ ...unitForm, baseUnitId: value === "__none__" ? "" : value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="الوحدة الأساسية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>{unit.nameAr || unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="معامل التحويل"
                value={unitForm.factor}
                onChange={(e) => setUnitForm({ ...unitForm, factor: Number(e.target.value) })}
              />
              <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                <span>مفعظ‘لة</span>
                <Switch checked={unitForm.isActive} onCheckedChange={(checked) => setUnitForm({ ...unitForm, isActive: checked })} />
              </div>
              <Button size="sm" onClick={submitUnit}>حفظ الوحدة</Button>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setUnitOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
