"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Loading } from "@/components/ui/loading"

const ATTRIBUTE_TYPES = [
  { value: "text", label: "\u0646\u0635" },
  { value: "number", label: "\u0631\u0642\u0645" },
  { value: "select", label: "\u0642\u0627\u0626\u0645\u0629" },
  { value: "boolean", label: "\u0646\u0639\u0645/\u0644\u0627" },
  { value: "date", label: "\u062a\u0627\u0631\u064a\u062e" },
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
  const [attributesOpen, setAttributesOpen] = useState(false)

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

  const loadBranches = useCallback(async () => {
    try {
      const res = await apiClient.get("/branches")
      const list = res.branches || res.data?.branches || []
      setBranches(list)
      if (!selectedBranchId) {
        const fallback = sessionBranchId || list[0]?._id || ""
        setSelectedBranchId(fallback)
      }
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }, [selectedBranchId, sessionBranchId])

  const loadPoints = useCallback(async (branchId: string) => {
    if (!branchId) return
    try {
      const res = await apiClient.get(`/points?branchId=${branchId}`)
      const list = res.points || res.data?.points || []
      setPoints(list)
      if (!selectedPointId) {
        setSelectedPointId(list[0]?._id || "")
      }
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }, [selectedPointId])

  const loadCategories = useCallback(async () => {
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
  }, [activeBranchId, activePointId, isOrgScope, isPointScope])

  const loadUnits = useCallback(async () => {
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
  }, [activeBranchId, activePointId, isOrgScope, isPointScope])

  const loadMaterials = useCallback(async (categoryId?: string | null) => {
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
  }, [activeBranchId, activePointId, isOrgScope, isPointScope])

  const loadCategoryAttributes = useCallback(async (categoryId?: string | null) => {
    if (!categoryId) {
      setAttributes([])
      return
    }
    const res = await apiClient.get(`/material-attributes?categoryId=${categoryId}`)
    const list = res.attributes || res.data?.attributes || []
    setAttributes(list)
  }, [])

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
      void loadBranches()
    } else if (sessionBranchId) {
      setSelectedBranchId(sessionBranchId)
    }
  }, [canManageOrg, loadBranches, sessionBranchId])

  useEffect(() => {
    if (!activeBranchId) return
    if (isPointScope) {
      void loadPoints(activeBranchId)
    } else {
      setPoints([])
      setSelectedPointId("")
    }
  }, [activeBranchId, isPointScope, loadPoints])

  useEffect(() => {
    if (canManageOrg && !sessionBranchId && (scope === "branch" || scope === "point")) {
      setScope("org")
    }
  }, [canManageOrg, scope, sessionBranchId])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCategories(), loadUnits(), loadMaterials(null)])
      .catch((error: any) => toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623"))
      .finally(() => setLoading(false))
  }, [loadCategories, loadMaterials, loadUnits])

  useEffect(() => {
    void loadMaterials(selectedCategoryId)
    void loadCategoryAttributes(selectedCategoryId)
  }, [loadCategoryAttributes, loadMaterials, selectedCategoryId])

  const ensureScopeReady = () => {
    if (!isOrgScope && !activeBranchId) {
      toast.error("\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0641\u0631\u0639")
      return false
    }
    if (isPointScope && !activePointId) {
      toast.error("\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0646\u0642\u0637\u0629")
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

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat._id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  )

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
      toast.error("\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u062a\u0635\u0646\u064a\u0641")
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
        toast.success("\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0635\u0646\u064a\u0641")
      } else {
        await apiClient.post("/material-categories", payload)
        toast.success("\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062a\u0635\u0646\u064a\u0641")
      }
      setCategoryOpen(false)
      await loadCategories()
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const removeCategory = async (category: Category) => {
    if (!ensureScopeReady()) return
    if (!confirm(`\u062d\u0630\u0641 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 ${category.name}\u061f`)) return
    try {
      const url = isOrgScope
        ? `/material-categories/${category._id}?scope=org`
        : isPointScope
          ? `/material-categories/${category._id}?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : `/material-categories/${category._id}?branchId=${activeBranchId}`
      await apiClient.delete(url)
      toast.success("\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u062a\u0635\u0646\u064a\u0641")
      setSelectedCategoryId((prev) => (prev === category._id ? null : prev))
      await loadCategories()
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const submitAttribute = async () => {
    if (!selectedCategoryId) {
      toast.error("\u0627\u062e\u062a\u0631 \u062a\u0635\u0646\u064a\u0641\u064b\u0627 \u0623\u0648\u0644\u0627\u064b")
      return
    }
    if (!attributeForm.name) {
      toast.error("\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u062e\u0627\u0635\u064a\u0629")
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
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const removeAttribute = async (attr: AttributeDef) => {
    if (!confirm(`\u062d\u0630\u0641 \u0627\u0644\u062e\u0627\u0635\u064a\u0629 ${attr.name}\u061f`)) return
    try {
      await apiClient.delete(`/material-attributes/${attr._id}`)
      await loadCategoryAttributes(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
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
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const submitMaterial = async () => {
    if (!ensureScopeReady()) return
    if (!materialForm.name || !materialForm.sku) {
      toast.error("\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0643\u0648\u062f \u0645\u0637\u0644\u0648\u0628\u0627\u0646")
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
        toast.success("\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0627\u062f\u0629")
      } else {
        await apiClient.post("/materials", payload)
        toast.success("\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0627\u062f\u0629")
      }
      setMaterialOpen(false)
      await loadMaterials(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const removeMaterial = async (item: Material) => {
    if (!ensureScopeReady()) return
    if (!confirm(`\u062d\u0630\u0641 \u0627\u0644\u0645\u0627\u062f\u0629 ${item.name}\u061f`)) return
    try {
      const url = isOrgScope
        ? `/materials/${item._id}?scope=org`
        : isPointScope
          ? `/materials/${item._id}?branchId=${activeBranchId}&pointId=${activePointId}&scope=point`
          : `/materials/${item._id}?branchId=${activeBranchId}`
      await apiClient.delete(url)
      toast.success("\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0627\u062f\u0629")
      await loadMaterials(selectedCategoryId)
    } catch (error: any) {
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const submitUnit = async () => {
    if (!ensureScopeReady()) return
    if (!unitForm.name) {
      toast.error("\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0648\u062d\u062f\u0629")
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
      toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
    }
  }

  const flatCategoryRows = useMemo(() => {
    const rows: Array<{ node: CategoryNode; depth: number; childrenCount: number }> = []
    const walk = (nodes: CategoryNode[], depth = 0) => {
      nodes.forEach((node) => {
        rows.push({ node, depth, childrenCount: node.children?.length || 0 })
        if (node.children && node.children.length > 0) {
          walk(node.children, depth + 1)
        }
      })
    }
    walk(categoryTree)
    return rows
  }, [categoryTree])

  return (
    <div className="space-y-4">
      <Card className="text-right">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">{"\u0646\u0637\u0627\u0642 \u0627\u0644\u0625\u062f\u0627\u0631\u0629"}</span>
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
                  {"\u0627\u0644\u0645\u0624\u0633\u0633\u0629 (\u0627\u0644\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629)"}
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
                {"\u0641\u0631\u0639"}
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
                {"\u0646\u0642\u0637\u0629"}
              </Button>
            </div>

            {(scope === "branch" || scope === "point") && canManageOrg && (
              <>
                <span className="text-sm font-semibold">{"\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0641\u0631\u0639"}</span>
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
                      <SelectValue placeholder={"\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u0639"} />
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
                  <span className="text-xs text-muted-foreground">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0631\u0648\u0639 \u0645\u062a\u0627\u062d\u0629."}</span>
                )}
              </>
            )}

            {scope === "point" && (
              <>
                <span className="text-sm font-semibold">{"\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0646\u0642\u0637\u0629"}</span>
                <div className="min-w-[220px]">
                  <Select
                    value={selectedPointId}
                    onValueChange={(value) => {
                      setSelectedPointId(value)
                      setSelectedCategoryId(null)
                    }}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder={"\u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0642\u0637\u0629"} />
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
                  <span className="text-xs text-muted-foreground">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u0642\u0627\u0637 \u0645\u062a\u0627\u062d\u0629."}</span>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{"\u0634\u062c\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u062f"}</CardTitle>
            <Button size="sm" onClick={openCreateCategory}>{"\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641"}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">عدد التصنيفات: {categories.length}</div>
            <div className="text-xs text-muted-foreground">
              {selectedCategory ? `التصنيف المحدد: ${selectedCategory.nameAr || selectedCategory.name}` : "الكل"}
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <div className="rounded-lg border bg-card/40 overflow-hidden">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
                    <tr className="text-right">
                      <th className="p-2">التصنيف</th>
                      <th className="p-2 w-[80px] text-center">المستوى</th>
                      <th className="p-2 w-[80px] text-center">الفروع</th>
                      <th className="p-2 w-[100px] text-center">الحالة</th>
                      <th className="p-2 w-[220px] text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatCategoryRows.map(({ node, depth, childrenCount }, index) => {
                      const isSelected = selectedCategoryId === node._id
                      return (
                        <tr
                          key={node._id}
                          className={cn(
                            "border-b transition-colors",
                            index % 2 === 0 && "bg-muted/20",
                            isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          <td className="p-2">
                            <button
                              className="flex w-full items-center justify-between gap-2 text-right"
                              onClick={() => setSelectedCategoryId(node._id)}
                            >
                              <span
                                className="flex-1 truncate"
                                style={{ paddingRight: `${depth * 14 + 8}px` }}
                              >
                                {node.nameAr || node.name}
                              </span>
{node.parentId && <span className="text-[10px] text-muted-foreground">فرعي</span>}
                            </button>
                          </td>
                          <td className="p-2 text-center">{depth}</td>
                          <td className="p-2 text-center">{childrenCount}</td>
                          <td className="p-2 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                                node.isActive === false
                                  ? "border-destructive/40 text-destructive"
                                  : "border-emerald-500/30 text-emerald-300"
                              )}
                            >
                              {node.isActive === false ? "غير نشط" : "نشط"}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedCategoryId(node._id)
setAttributesOpen(true)
}}
                              >
                                الخصائص
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditCategory(node)}>
                                تعديل
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => removeCategory(node)}>
                                حذف
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {flatCategoryRows.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                          لا توجد تصنيفات بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{"\u0627\u0644\u0645\u0648\u0627\u062f"}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUnitOpen(true)}>{"\u0627\u0644\u0648\u062d\u062f\u0627\u062a"}</Button>
              <Button size="sm" onClick={openCreateMaterial}>{"\u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062f\u0629"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Input
                placeholder={"ابحث بالاسم أو الرمز"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {selectedCategoryId ? "تصفية حسب التصنيف" : "الكل"}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              عدد المواد: {filteredMaterials.length}
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <div className="rounded-lg border bg-card/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
                    <tr className="text-right">
                      <th className="p-2">{"الاسم"}</th>
                      <th className="p-2 w-[140px]">{"الرمز"}</th>
                      <th className="p-2 w-[160px]">{"الوحدة"}</th>
                      <th className="p-2 w-[120px] text-center">{"التصنيفات"}</th>
                      <th className="p-2 w-[110px] text-center">{"الحالة"}</th>
                      <th className="p-2 w-[160px] text-center">{"الإجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((item, index) => {
                      const unit = units.find((u) => u._id === item.baseUnitId)
                      return (
                        <tr key={item._id} className={cn("border-b", index % 2 === 0 && "bg-muted/20")}>
                          <td className="p-2">{item.nameAr || item.name}</td>
                          <td className="p-2">{item.sku}</td>
                          <td className="p-2">{unit?.nameAr || unit?.name || "-"}</td>
                          <td className="p-2 text-center">{item.categoryIds?.length || 0}</td>
                          <td className="p-2 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                                item.isActive === false
                                  ? "border-destructive/40 text-destructive"
                                  : "border-emerald-500/30 text-emerald-300"
                              )}
                            >
                              {item.isActive === false ? "غير نشط" : "نشط"}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditMaterial(item)}>
                                {"تعديل"}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => removeMaterial(item)}>
                                {"حذف"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredMaterials.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                          {"لا توجد مواد بعد."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{categoryEditing ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0635\u0646\u064a\u0641" : "\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{"\u0627\u0644\u0627\u0633\u0645"}</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{"\u0627\u0644\u0627\u0633\u0645 (\u0639\u0631\u0628\u064a)"}</Label>
              <Input value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>{"\u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0623\u0628"}</Label>
              <Select value={categoryForm.parentId || "__none__"} onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value === "__none__" ? "" : value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={"\u0628\u062f\u0648\u0646"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{"\u0628\u062f\u0648\u0646"}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.nameAr || cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
              <span>{"\u0645\u0641\u0639\u0651\u0644"}</span>
              <Switch checked={categoryForm.isActive} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })} />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>{"\u0625\u0644\u063a\u0627\u0621"}</Button>
            <Button onClick={submitCategory}>{categoryEditing ? "\u062a\u062d\u062f\u064a\u062b" : "\u0625\u0636\u0627\u0641\u0629"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attributesOpen} onOpenChange={setAttributesOpen}>
        <DialogContent className="text-right max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory
                ? `خصائص التصنيف: ${selectedCategory.nameAr || selectedCategory.name}`
                : "خصائص التصنيف"}
            </DialogTitle>
          </DialogHeader>
          {selectedCategoryId ? (
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-2">
                {attributes.length === 0 && (
                  <div className="text-xs text-muted-foreground">لا توجد خصائص بعد.</div>
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

              <div className="space-y-2 rounded-lg border p-3">
                <div className="text-sm font-medium">خاصية جديدة</div>
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
                    placeholder="خيارات (مفصولة بفاصلة)"
                    value={attributeForm.options}
                    onChange={(e) => setAttributeForm({ ...attributeForm, options: e.target.value })}
                  />
                )}
                <Select
                  value={attributeForm.unitId || "__none__"}
                  onValueChange={(value) => setAttributeForm({ ...attributeForm, unitId: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="الوحدة (اختياري)" />
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
                  <span>مطلوب</span>
                  <Switch
                    checked={attributeForm.required}
                    onCheckedChange={(checked) => setAttributeForm({ ...attributeForm, required: checked })}
                  />
                </div>
                <Button size="sm" onClick={submitAttribute}>إضافة الخاصية</Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">اختر تصنيفاً أولاً لإدارة الخصائص.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="text-right max-w-2xl">
          <DialogHeader>
            <DialogTitle>{materialEditing ? "\u062a\u0639\u062f\u064a\u0644 \u0645\u0627\u062f\u0629" : "\u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062f\u0629"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>{"\u0627\u0644\u0627\u0633\u0645"}</Label>
                <Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{"\u0627\u0644\u0627\u0633\u0645 (\u0639\u0631\u0628\u064a)"}</Label>
                <Input value={materialForm.nameAr} onChange={(e) => setMaterialForm({ ...materialForm, nameAr: e.target.value })} />
              </div>
              <div>
                <Label>{"\u0627\u0644\u0643\u0648\u062f (SKU)"}</Label>
                <Input value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} />
              </div>
              <div>
                <Label>{"\u0627\u0644\u0648\u062d\u062f\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629"}</Label>
                <Select value={materialForm.baseUnitId || "__none__"} onValueChange={(value) => setMaterialForm({ ...materialForm, baseUnitId: value === "__none__" ? "" : value })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder={"\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u062d\u062f\u0629"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{"\u0628\u062f\u0648\u0646"}</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>{unit.nameAr || unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-2">
              <div className="text-sm font-semibold mb-2">{"\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a"}</div>
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
                  <div className="text-xs text-muted-foreground">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0635\u0646\u064a\u0641\u0627\u062a."}</div>
                )}
              </div>
            </div>

            {materialAttributes.length > 0 && (
              <div className="rounded-lg border p-2 space-y-3">
                <div className="text-sm font-semibold">{"\u062e\u0635\u0627\u0626\u0635 \u0627\u0644\u0645\u0627\u062f\u0629"}</div>
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
                            <SelectValue placeholder={"\u0627\u062e\u062a\u0631"} />
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
                          <span>{value ? "\u0646\u0639\u0645" : "\u0644\u0627"}</span>
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
              <span>{"\u0645\u0641\u0639\u0651\u0644\u0629"}</span>
              <Switch checked={materialForm.isActive} onCheckedChange={(checked) => setMaterialForm({ ...materialForm, isActive: checked })} />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setMaterialOpen(false)}>{"\u0625\u0644\u063a\u0627\u0621"}</Button>
            <Button onClick={submitMaterial}>{materialEditing ? "\u062a\u062d\u062f\u064a\u062b" : "\u0625\u0636\u0627\u0641\u0629"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{"\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0642\u064a\u0627\u0633"}</DialogTitle>
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
                <div className="text-xs text-muted-foreground">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a."}</div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-2">
              <div className="text-sm font-semibold">{"\u0625\u0636\u0627\u0641\u0629 \u0648\u062d\u062f\u0629"}</div>
              <Input
                placeholder={"\u0627\u0633\u0645 \u0627\u0644\u0648\u062d\u062f\u0629"}
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              />
              <Input
                placeholder={"\u0627\u0633\u0645 \u0639\u0631\u0628\u064a"}
                value={unitForm.nameAr}
                onChange={(e) => setUnitForm({ ...unitForm, nameAr: e.target.value })}
              />
              <Input
                placeholder={"\u0627\u0644\u0631\u0645\u0632 (\u0645\u062b\u0627\u0644: kg)"}
                value={unitForm.symbol}
                onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })}
              />
              <Select value={unitForm.baseUnitId || "__none__"} onValueChange={(value) => setUnitForm({ ...unitForm, baseUnitId: value === "__none__" ? "" : value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={"\u0627\u0644\u0648\u062d\u062f\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{"\u0628\u062f\u0648\u0646"}</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>{unit.nameAr || unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={"\u0645\u0639\u0627\u0645\u0644 \u0627\u0644\u062a\u062d\u0648\u064a\u0644"}
                value={unitForm.factor}
                onChange={(e) => setUnitForm({ ...unitForm, factor: Number(e.target.value) })}
              />
              <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                <span>{"\u0645\u0641\u0639\u0651\u0644\u0629"}</span>
                <Switch checked={unitForm.isActive} onCheckedChange={(checked) => setUnitForm({ ...unitForm, isActive: checked })} />
              </div>
              <Button size="sm" onClick={submitUnit}>{"\u062d\u0641\u0638 \u0627\u0644\u0648\u062d\u062f\u0629"}</Button>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setUnitOpen(false)}>{"\u0625\u063a\u0644\u0627\u0642"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
