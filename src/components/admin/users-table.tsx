"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { ActionButton } from "@/components/ui/action-button"
import { DateDisplay } from "@/components/ui/date-display"
import toast from "react-hot-toast"
import { Trash2, Edit, UserCheck, UserX, LogIn, AlertTriangle, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loading } from "@/components/ui/loading"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import { patchRequest, postRequest, deleteRequest } from "@/lib/api/helpers"
import { apiClient } from "@/lib/api/client"
import { UserForm } from "./user-form"
import { DataTable } from "@/components/ui/data-table"

interface User {
  _id: string
  name: string
  email: string
  role: {
    _id: string
    name: string
    nameAr: string
  }
  isActive: boolean
  createdAt: string
}

export function UsersTable({ users: initialUsers }: { users: User[] }) {
  const [userList, setUserList] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false)
  const [toggleActiveDialogOpen, setToggleActiveDialogOpen] = useState(false)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const router = useRouter()
  const { data: session, update } = useSession()
  const currentUserId = session?.user?.id

  // Update userList when users prop changes (only on mount or when structure changes)
  useEffect(() => {
    // Only sync if lengths differ or if this is the initial mount
    if (userList.length === 0 || userList.length !== initialUsers.length) {
      setUserList(initialUsers)
    }
  }, [initialUsers.length])

  const handleToggleActiveClick = useCallback((user: User) => {
    // Prevent admin from disabling themselves
    if (currentUserId && String(user._id) === String(currentUserId)) {
      const isUserAdmin = user.role?.name === 'admin' || user.role?.nameAr === 'مدير'
      if (isUserAdmin) {
        toast.error('لا يمكنك تعطيل حسابك الخاص كمدير')
        return
      }
    }
    setSelectedUser(user)
    setToggleActiveDialogOpen(true)
  }, [currentUserId])

  const handleToggleActive = useCallback(async () => {
    if (!selectedUser) return

    const newStatus = !selectedUser.isActive
    const userId = selectedUser._id
    setLoading(userId)
    setToggleActiveDialogOpen(false)
    
    try {
      const response = await apiClient.patch(`/admin/users/${userId}`, { isActive: newStatus })

      // Check if response has data
      if (!response || !response.data) {
        throw new Error(response?.error || 'حدث خطأ في الاستجابة')
      }

      // Handle different response structures
      const updatedUser = response.data.user || response.data
      
      if (!updatedUser) {
        throw new Error('لم يتم العثور على بيانات المستخدم المحدث')
      }

      // Ensure we get the correct status from server response
      const finalStatus = updatedUser.isActive !== undefined 
        ? Boolean(updatedUser.isActive) 
        : newStatus
      
      // Update the user list with the new status immediately
      setUserList((prev) => {
        return prev.map((user) => {
          // Compare IDs as strings to handle both string and ObjectId formats
          const userIdStr = String(user._id)
          const selectedUserIdStr = String(userId)
          
          if (userIdStr === selectedUserIdStr) {
            // Return completely new object to force React re-render
            return { 
              ...user, 
              isActive: finalStatus 
            }
          }
          return user
        })
      })
      
      toast.success(finalStatus ? 'تم تفعيل المستخدم بنجاح' : 'تم تعطيل المستخدم بنجاح')
      setSelectedUser(null)
    } catch (error: any) {
      console.error('Toggle Active Error:', error)
      toast.error(error.message || 'حدث خطأ أثناء تحديث حالة المستخدم')
    } finally {
      setLoading(null)
    }
  }, [selectedUser])

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!selectedUser) return

    setLoading(selectedUser._id)
    setDeleteDialogOpen(false)
    try {
      const data = await apiClient.delete(`/admin/users/${selectedUser._id}`)

      if (!data.data) {
        throw new Error(data.error || 'حدث خطأ')
      }

      setUserList((prev) => prev.filter((user) => user._id !== selectedUser._id))
      toast.success('تم حذف المستخدم بنجاح')
      setSelectedUser(null)
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ')
    } finally {
      setLoading(null)
    }
  }, [selectedUser])

  const handleImpersonateClick = useCallback((user: User) => {
    setSelectedUser(user)
    setImpersonateDialogOpen(true)
  }, [])

  const handleImpersonate = useCallback(async () => {
    if (!selectedUser) return

    setLoading(selectedUser._id)
    setImpersonateDialogOpen(false)
    setImpersonating(true)
    try {
      const data = await apiClient.post('/admin/impersonate', { userId: selectedUser._id })

      if (!data.data) {
        throw new Error(data.error || 'حدث خطأ')
      }

      // Update session using next-auth's update method
      // Pass the user data directly - it will be available in JWT callback as session parameter
      await update({
        ...data.data.user
      } as any)

      toast.success(`تم الدخول كـ ${data.data.user.name}`)
      
      // Wait for session to update, then force full page reload to ensure fresh data
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 300)
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ')
      setImpersonating(false)
    } finally {
      setLoading(null)
    }
  }, [router, update, selectedUser])

  const handleUserCreated = useCallback(() => {
    // Refresh the page to get updated user list
    router.refresh()
  }, [router])


  return (
    <>
      {impersonating && (
        <Loading 
          fullScreen 
          text="جاري الدخول كمستخدم... يرجى الانتظار" 
        />
      )}
      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between flex-row-reverse">
            <CardTitle className="text-right">قائمة المستخدمين ({userList.length})</CardTitle>
            <ActionButton
              action="create"
              onClick={() => setUserFormOpen(true)}
              icon={UserPlus}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={userList}
            columns={useMemo(() => [
              // Define table columns (reversed order - will be reversed again by DataTable for RTL)
              // RTL order: name (rightmost), email, role, status, createdAt, actions (leftmost)
              {
                id: "actions",
                header: "الإجراءات",
                accessor: (user: User) => (
                  <div className="flex gap-1 sm:gap-2 flex-row-reverse justify-end w-full">
                    <IconButton
                      icon={LogIn}
                      label="الدخول كـ هذا المستخدم - سيتم تسجيل الدخول بحساب هذا المستخدم وستتمكن من رؤية جميع بياناته"
                      onClick={() => handleImpersonateClick(user)}
                      disabled={loading === user._id}
                      className="h-8 w-8"
                      showTooltip={true}
                      tooltipSide="top"
                    />
                    {/* Hide disable button for admin's own account */}
                    {!(currentUserId && String(user._id) === String(currentUserId) && (user.role?.name === 'admin' || user.role?.nameAr === 'مدير') && user.isActive) && (
                      <IconButton
                        icon={user.isActive ? UserX : UserCheck}
                        label={user.isActive ? "تعطيل المستخدم - لن يتمكن المستخدم من تسجيل الدخول" : "تفعيل المستخدم - سيتمكن المستخدم من تسجيل الدخول"}
                        onClick={() => handleToggleActiveClick(user)}
                        disabled={loading === user._id}
                        className="h-8 w-8"
                        showTooltip={true}
                        tooltipSide="top"
                      />
                    )}
                    <IconButton
                      icon={Trash2}
                      label="حذف المستخدم - سيتم حذف المستخدم نهائياً ولا يمكن التراجع عن هذه العملية"
                      onClick={() => handleDeleteClick(user)}
                      disabled={loading === user._id}
                      className="h-8 w-8 text-destructive"
                      showTooltip={true}
                      tooltipSide="top"
                    />
                  </div>
                ),
                className: "p-2 sm:p-4",
              },
              {
                id: "createdAt",
                header: "تاريخ الإنشاء",
                accessor: (user: User) => (
                  <div className="text-right">
                    <DateDisplay date={user.createdAt} />
                  </div>
                ),
                className: "p-2 sm:p-4 hidden md:table-cell text-xs sm:text-sm",
              },
              {
                id: "status",
                header: "الحالة",
                accessor: (user: User) => (
                  <StatusBadge 
                    status={user.isActive ? "active" : "inactive"} 
                    type="user"
                    className="rounded-full"
                  />
                ),
                className: "p-2 sm:p-4",
              },
              {
                id: "role",
                header: "الدور",
                accessor: (user: User) => (
                  <span className="text-xs sm:text-sm text-right">{user.role?.nameAr || user.role?.name || "غير محدد"}</span>
                ),
                className: "p-2 sm:p-4 text-xs sm:text-sm",
              },
              {
                id: "email",
                header: "البريد الإلكتروني",
                accessor: (user: User) => <span className="text-right">{user.email}</span>,
                className: "p-2 sm:p-4 hidden sm:table-cell",
              },
              {
                id: "name",
                header: "الاسم",
                accessor: (user: User) => (
                  <div className="flex flex-col text-right">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">{user.email}</span>
                  </div>
                ),
                className: "p-2 sm:p-4",
              },
            ], [currentUserId, loading, handleImpersonateClick, handleToggleActiveClick, handleDeleteClick])}
            wrapper="none"
            className="border-0"
          />
      </CardContent>
    </Card>

    <ConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="تأكيد حذف المستخدم"
      description={
        <>
          هل أنت متأكد من حذف المستخدم <strong>{selectedUser?.name}</strong>؟
          <br />
          <span className="text-sm text-muted-foreground">
            هذه العملية لا يمكن التراجع عنها.
          </span>
        </>
      }
      confirmLabel="حذف"
      cancelLabel="إلغاء"
      onConfirm={handleDelete}
      variant="destructive"
      icon={AlertTriangle}
      loading={loading === selectedUser?._id}
    />

    <ConfirmationDialog
      open={impersonateDialogOpen}
      onOpenChange={setImpersonateDialogOpen}
      title="الدخول كمستخدم"
      description={
        <>
          هل تريد الدخول إلى حساب المستخدم <strong>{selectedUser?.name}</strong>؟
          <br />
          <span className="text-sm text-muted-foreground">
            سيتم تسجيل الدخول كـ هذا المستخدم وستتمكن من رؤية جميع بياناته.
          </span>
        </>
      }
      confirmLabel="الدخول"
      cancelLabel="إلغاء"
      onConfirm={handleImpersonate}
      icon={LogIn}
      loading={loading === selectedUser?._id}
    />

    <ConfirmationDialog
      open={toggleActiveDialogOpen}
      onOpenChange={setToggleActiveDialogOpen}
      title={selectedUser?.isActive ? "تعطيل المستخدم" : "تفعيل المستخدم"}
      description={
        <>
          {selectedUser?.isActive ? (
            <>
              هل أنت متأكد من تعطيل المستخدم <strong>{selectedUser?.name}</strong>؟
              <br />
              <span className="text-sm text-muted-foreground">
                لن يتمكن المستخدم من تسجيل الدخول بعد التعطيل. يمكنك تفعيله مرة أخرى في أي وقت.
              </span>
            </>
          ) : (
            <>
              هل تريد تفعيل المستخدم <strong>{selectedUser?.name}</strong>؟
              <br />
              <span className="text-sm text-muted-foreground">
                سيتمكن المستخدم من تسجيل الدخول بعد التفعيل.
              </span>
            </>
          )}
        </>
      }
      confirmLabel={selectedUser?.isActive ? "تعطيل" : "تفعيل"}
      cancelLabel="إلغاء"
      onConfirm={handleToggleActive}
      icon={selectedUser?.isActive ? UserX : UserCheck}
      variant={selectedUser?.isActive ? "destructive" : "default"}
      loading={loading === selectedUser?._id}
    />

    <UserForm
      open={userFormOpen}
      onOpenChange={setUserFormOpen}
      onSuccess={handleUserCreated}
    />
    </>
  )
}

