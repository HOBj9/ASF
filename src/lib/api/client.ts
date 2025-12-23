/**
 * Unified API Client
 * Centralized API client with interceptors and error handling
 */

import { ApiResponse } from "@/types"

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
  }

  /**
   * Get full URL for API endpoint
   */
  private getUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    return `${this.baseURL}/api/${cleanEndpoint}`
  }

  /**
   * Default headers
   */
  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...customHeaders,
    }
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // Check if response is valid
    if (!response || typeof response.json !== 'function') {
      const error = new Error('Invalid response object')
      ;(error as any).status = 500
      throw error
    }

    const contentType = response.headers.get('content-type')
    
    // Handle different content types
    if (contentType?.includes('application/json')) {
      try {
        // Clone response before reading to avoid consuming it
        const clonedResponse = response.clone()
        const data = await response.json()
        
        if (!response.ok) {
          // Create error object with more details
          const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`)
          ;(error as any).status = response.status
          ;(error as any).data = data
          throw error
        }
        
        return data
      } catch (error: any) {
        // If json() fails, try to get text from cloned response
        if (error instanceof TypeError && (error.message.includes('json') || error.message.includes('not a function'))) {
          try {
            const clonedResponse = response.clone()
            const text = await clonedResponse.text()
            const errorObj = new Error(text || `HTTP error! status: ${response.status}`)
            ;(errorObj as any).status = response.status
            throw errorObj
          } catch (textError) {
            const errorObj = new Error(`Failed to parse response: ${error.message}`)
            ;(errorObj as any).status = response.status
            throw errorObj
          }
        }
        throw error
      }
    } else if (contentType?.includes('image/')) {
      // For QR code images, return blob
      return response.blob() as any
    } else {
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(text || `HTTP error! status: ${response.status}`)
        ;(error as any).status = response.status
        throw error
      }
      return { data: text as any } as ApiResponse<T>
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'GET',
        headers: this.getHeaders(options?.headers),
        ...options,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      // No timeout - wait for response from server
      const response = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'PUT',
        headers: this.getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'PATCH',
        headers: this.getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'DELETE',
        headers: this.getHeaders(options?.headers),
        body: options?.body,
        ...options,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for testing
export { ApiClient }

