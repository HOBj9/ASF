/**
 * Helper functions to use apiClient with useApi hook
 */

import { apiClient } from "./client"
import { ApiResponse } from "@/types"

/**
 * Convert apiClient call to fetch-like response for useApi hook
 */
export function createApiCall<T = any>(
  apiCall: () => Promise<ApiResponse<T>>
): () => Promise<Response> {
  return async () => {
    try {
      const data = await apiCall()
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'حدث خطأ' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

/**
 * Helper to create GET request
 */
export function getRequest<T = any>(endpoint: string) {
  return createApiCall<T>(() => apiClient.get<T>(endpoint))
}

/**
 * Helper to create POST request
 */
export function postRequest<T = any>(endpoint: string, data?: any) {
  return createApiCall<T>(() => apiClient.post<T>(endpoint, data))
}

/**
 * Helper to create PUT request
 */
export function putRequest<T = any>(endpoint: string, data?: any) {
  return createApiCall<T>(() => apiClient.put<T>(endpoint, data))
}

/**
 * Helper to create PATCH request
 */
export function patchRequest<T = any>(endpoint: string, data?: any) {
  return createApiCall<T>(() => apiClient.patch<T>(endpoint, data))
}

/**
 * Helper to create DELETE request
 */
export function deleteRequest<T = any>(endpoint: string, data?: any) {
  return createApiCall<T>(() => apiClient.delete<T>(endpoint, data ? { body: JSON.stringify(data) } : undefined))
}

