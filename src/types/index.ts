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
  organizationId?: string
  branchId?: string
  trackingVehicleId?: string
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
  [key: string]: any
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

// Organization Types
export interface Organization {
  _id: string
  name: string
  slug: string
  type?: string
  labels: {
    branchLabel: string
    pointLabel: string
    vehicleLabel: string
    driverLabel: string
    routeLabel: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Branch Types
export interface Branch {
  _id: string
  organizationId: string
  name: string
  nameAr?: string
  branchTypeLabel?: string
  governorate?: string
  areaName?: string
  addressText?: string
  centerLat: number
  centerLng: number
  timezone: string
  atharKey?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Driver Types
export interface Driver {
  _id: string
  branchId: string
  name: string
  phone?: string
  nationalId?: string
  assignedVehicleId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Vehicle Types
export interface Vehicle {
  _id: string
  branchId: string
  name: string
  plateNumber?: string
  imei?: string | null
  trackingProvider?: "athar" | "mobile_app" | "traccar"
  atharObjectId?: string
  driverId?: string
  routeId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Point Types
export type PointType = 'container' | 'station' | 'facility' | 'other'

export interface Point {
  _id: string
  branchId: string
  name: string
  nameAr?: string
  nameEn?: string
  type: PointType
  lat: number
  lng: number
  radiusMeters: number
  zoneId?: string
  addressText?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Route Types
export interface Route {
  _id: string
  branchId: string
  name: string
  description?: string
  color?: string
  path?: {
    type: "LineString"
    coordinates: number[][]
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Route Point Types
export interface RoutePoint {
  _id: string
  routeId: string
  pointId: string
  order: number
  createdAt: string
  updatedAt: string
}

// Zone Event Types
export type ZoneEventType = 'zone_in' | 'zone_out'

export interface ZoneEvent {
  _id: string
  branchId: string
  vehicleId?: string
  driverId?: string
  pointId?: string
  zoneId?: string
  imei?: string
  atharEventId?: string
  name?: string
  driverName?: string
  type: ZoneEventType
  eventTimestamp?: string
  receivedAt: string
  createdAt: string
  updatedAt: string
}

// Point Visit Types
export type VisitStatus = 'open' | 'closed'

export interface PointVisit {
  _id: string
  branchId: string
  vehicleId: string
  pointId: string
  zoneId?: string
  entryEventId?: string
  exitEventId?: string
  entryTime: string
  exitTime?: string
  durationSeconds?: number
  status: VisitStatus
  createdAt: string
  updatedAt: string
}

// Status Types
export type SessionStatus = 'pending' | 'active' | 'terminated'
export type MessageStatus = 'sent' | 'failed'
export type CampaignStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

