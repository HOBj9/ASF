/**
 * Centralized TypeScript Types
 * Single source of truth for all type definitions
 */

// Session Types
export interface Session {
  _id: string
  sessionName: string
  status: 'pending' | 'active' | 'terminated'
  userId?: string
  createdAt: string
  updatedAt: string
}

// Message Types
export interface Message {
  _id: string
  sessionName: string
  phoneNumber: string
  messageContent: string
  status: 'sent' | 'failed'
  source: 'api' | 'campaign' | 'test' | 'auto_reply' | 'bulk_send'
  messageId?: string
  timestamp?: number
  isRegistered?: boolean
  attempts?: number
  sessionState?: string
  deliveryVerified?: boolean
  alternativeMethodUsed?: boolean
  campaignId?: string
  campaignTitle?: string
  error?: string
  errorDetails?: {
    lastError?: string
    attempts?: number
    sessionState?: string
    reconnectionAttempted?: boolean
    finalSessionState?: string
  }
  createdAt: string
  updatedAt: string
}

// Contact Types
export interface Contact {
  _id: string
  name: string
  phoneNumber: string
  notes?: string
  userId?: string
  groups?: string[] // Array of group names (for display only)
  createdAt: string
  updatedAt: string
}

// Contact Group Types
export interface ContactGroup {
  _id: string
  userId: string
  name: string
  description?: string
  contactCount?: number
  createdAt: string
  updatedAt: string
}

// Contact Group Member Types
export interface ContactGroupMember {
  _id: string
  groupId: string
  contactId: string
  userId: string
  createdAt: string
}

// Campaign Types
export interface Campaign {
  _id: string
  title: string
  sessionName: string
  messages: string[]
  phoneNumbers: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  statistics: {
    total: number
    sent: number
    failed: number
    delivered: number
    pending: number
  }
  startedAt?: string
  completedAt?: string
  estimatedCompletionTime?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

// User Types
export interface User {
  _id: string
  name: string
  email: string
  phone?: string
  role: {
    _id: string
    name: string
    nameAr: string
  }
  isActive: boolean
  avatar?: string
  createdAt: string
  updatedAt?: string
}

// Role Types
export interface Role {
  _id: string
  name: string
  nameAr: string
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

// Permission Types
export interface Permission {
  _id: string
  resource: string
  action: string
  createdAt: string
  updatedAt: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  message?: string
  error?: string
}

// Bulk Send Job Types
export interface BulkSendJob {
  _id: string
  jobId: string
  sessionName: string
  phoneNumbers: string[]
  message: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: {
    total: number
    sent: number
    failed: number
    delivered: number
    pending: number
  }
  timeRemaining?: number
  startedAt?: string
  completedAt?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

// User API Key Types
export interface UserApiKey {
  _id: string
  userId: string
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

// Status Types
export type SessionStatus = 'pending' | 'active' | 'terminated'
export type MessageStatus = 'sent' | 'failed'
export type CampaignStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

