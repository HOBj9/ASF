"use client"

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { ApiResponse } from "@/types"

/**
 * Custom hook for API queries with React Query
 */
export function useApiQuery<T = any>(
  key: string[],
  fetchFn: () => Promise<Response> | string,
  options?: Omit<UseQueryOptions<ApiResponse<T>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = fetchFn()
      
      // If it's a string, use apiClient.get
      if (typeof result === 'string') {
        return await apiClient.get<T>(result)
      }
      
      // Otherwise, use the provided fetch function
      const response = await result
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "حدث خطأ")
      }
      return response.json() as Promise<ApiResponse<T>>
    },
    ...options,
  })
}

/**
 * Custom hook for API mutations with React Query
 */
export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<Response | ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: ApiResponse<TData>, variables?: TVariables) => void
    onError?: (error: Error) => void
    successMessage?: string
    errorMessage?: string
    invalidateQueries?: string[][]
  } & Omit<UseMutationOptions<ApiResponse<TData>, Error, TVariables>, "mutationFn">
) {
  const queryClient = useQueryClient()
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    invalidateQueries = [],
    ...mutationOptions
  } = options || {}

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const result = await mutationFn(variables)
      
      // Check if result is already an ApiResponse (from apiClient)
      if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
        // It's already an ApiResponse
        if (!result.success) {
          throw new Error(result.error || errorMessage || "حدث خطأ")
        }
        return result as ApiResponse<TData>
      }
      
      // Otherwise, it's a Response object
      const response = result as Response
      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || errorMessage || "حدث خطأ")
        } catch (err) {
          throw new Error(errorMessage || "حدث خطأ")
        }
      }
      
      try {
        return await response.json() as Promise<ApiResponse<TData>>
      } catch (err) {
        throw new Error(errorMessage || "فشل في تحليل الاستجابة")
      }
    },
    onSuccess: (data, variables) => {
      if (successMessage) {
        toast.success(successMessage)
      } else if (data.message) {
        toast.success(data.message)
      }

      // Invalidate related queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey })
      })

      if (onSuccess) {
        onSuccess(data, variables)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || errorMessage || "حدث خطأ")
      if (onError) {
        onError(error)
      }
    },
    ...mutationOptions,
  })
}

