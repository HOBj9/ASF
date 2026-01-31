# Point Creation and Athar Communication Flow

## Overview

This document provides a comprehensive explanation of how bus trip points are created in the Qareeb system and how the system communicates with the Athar GPS tracking platform. The integration enables real-time geofencing and automatic notifications when buses enter or exit designated zones.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Point Creation Flow](#point-creation-flow)
3. [Athar Service Integration](#athar-service-integration)
4. [Zone Creation Process](#zone-creation-process)
5. [Zone Event Creation](#zone-event-creation)
6. [Webhook Processing](#webhook-processing)
7. [Notification System](#notification-system)
8. [Database Schema](#database-schema)
9. [Error Handling](#error-handling)
10. [API Endpoints](#api-endpoints)

---

## Architecture Overview

The system follows a multi-step process when creating a bus trip point:

```
User Request → Validation → Athar Zone Creation → Zone Event Creation → Database Storage → Webhook Setup
```

**Key Components:**
- **Frontend/API**: Receives point creation requests
- **AtharService**: Handles all communication with Athar API
- **Athar Platform**: GPS tracking service that manages zones and events
- **Webhook Handler**: Receives zone entry/exit notifications from Athar
- **Notification Service**: Sends push notifications to students/parents

---

## Point Creation Flow

### 1. Request Initiation

**Endpoint:** `POST /api/bus-trip-points`

**Request Body:**
```json
{
  "nameEn": "School Gate",
  "nameAr": "بوابة المدرسة",
  "lat": 24.7136,
  "lang": 46.6753,
  "isActive": true
}
```

**Key Points:**
- `zoneId` is **NEVER** accepted in the request body - it must always come from Athar
- All fields are validated before processing
- Request deduplication prevents duplicate submissions

### 2. Authentication & Authorization

```163:181:app/api/bus-trip-points/route.ts
// POST - Create new bus trip point
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({
        data: null,
        status: 'error',
        message: 'Authorization token required'
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({
        data: null,
        status: 'error',
        message: 'Invalid token'
      }, { status: 401 });
    }
```

- JWT token is extracted from the `Authorization` header
- Token is verified and decoded to get user/institution information
- Institution ID is required for point creation

### 3. Input Validation

```203:219:app/api/bus-trip-points/route.ts
    // Validation
    if (!trimmedNameEn || !trimmedNameAr || !lat || !lang) {
      return NextResponse.json({
        data: null,
        status: 'error',
        message: 'Missing required fields: nameEn, nameAr, lat, lang'
      }, { status: 400 });
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lang < -180 || lang > 180) {
      return NextResponse.json({
        data: null,
        status: 'error',
        message: 'Invalid coordinates'
      }, { status: 400 });
    }
```

**Validation Steps:**
1. Check for required fields (nameEn, nameAr, lat, lang)
2. Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
3. Check for duplicate point names (both English and Arabic)
4. Trim whitespace from names

### 4. Duplicate Prevention

```221:272:app/api/bus-trip-points/route.ts
    // Check for duplicate names - strict comparison
    console.log('🔍 Checking for duplicates...', { trimmedNameEn, trimmedNameAr });
    
    const existingPoint = await (prisma as any).busTripPoint.findFirst({
      where: {
        OR: [
          { nameEn: trimmedNameEn },
          { nameAr: trimmedNameAr }
        ]
      }
    });
    
    console.log('📊 Duplicate check result:', {
      checkingNameEn: trimmedNameEn,
      checkingNameAr: trimmedNameAr,
      foundExistingPoint: existingPoint ? true : false,
      existingPoint: existingPoint ? { 
        id: existingPoint.id?.toString(), 
        nameEn: existingPoint.nameEn, 
        nameAr: existingPoint.nameAr 
      } : 'none found'
    });

    if (existingPoint) {
      console.log('DUPLICATE FOUND! Existing point:', existingPoint.nameAr, existingPoint.nameEn);
      
      // Determine which field is the duplicate - compare trimmed values
      const existingNameEn = existingPoint.nameEn?.trim();
      const existingNameAr = existingPoint.nameAr?.trim();
      
      const isNameEnDuplicate = existingNameEn && existingNameEn === trimmedNameEn;
      const isNameArDuplicate = existingNameAr && existingNameAr === trimmedNameAr;
      
      let duplicateField, duplicateValue;
      if (isNameEnDuplicate) {
        duplicateField = 'nameEn';
        duplicateValue = trimmedNameEn;
      } else if (isNameArDuplicate) {
        duplicateField = 'nameAr';
        duplicateValue = trimmedNameAr;
      } else {
        // Fallback
        duplicateField = 'nameEn';
        duplicateValue = trimmedNameEn;
      }
      
      return NextResponse.json({
        data: null,
        status: 'error',
        message: `نقطة بنفس ال${duplicateField === 'nameEn' ? 'اسم الإنجليزي' : 'اسم العربي'} موجودة مسبقاً: ${duplicateValue}`
      }, { status: 409 });
    }
```

The system checks for existing points with the same English or Arabic name and rejects duplicates.

---

## Athar Service Integration

### AtharService Class

The `AtharService` class encapsulates all communication with the Athar API.

**Location:** `lib/athar-service.ts`

**Key Methods:**
- `forInstitution(institutionId)`: Creates an AtharService instance with institution's API key
- `createZone()`: Creates a circular geofenced zone in Athar
- `editZone()`: Updates an existing zone
- `deleteZone()`: Removes a zone
- `createZoneEvent()`: Creates zone entry/exit events
- `getZones()`: Retrieves all zones for the account
- `ensureZone()`: Creates zone if it doesn't exist, returns existing ID if it does

### Service Initialization

```50:66:lib/athar-service.ts
  /**
   * Create AtharService instance with institution's API key
   */
  static async forInstitution(institutionId: string): Promise<AtharService> {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { atharKey: true }
    });

    if (!institution?.atharKey) {
      throw new Error(`Institution ${institutionId} does not have Athar API key configured`);
    }

    return new AtharService({
      baseUrl: process.env.ATHAR_BASE_URL || 'https://admin.alather.net/api/api.php',
      apiKey: institution.atharKey,
      api: process.env.ATHAR_API_TYPE || 'user',
      version: process.env.ATHAR_VERSION || '1.0'
    });
  }
```

**Configuration:**
- Each institution must have its own Athar API key
- Base URL: `https://admin.alather.net/api/api.php` (configurable via env)
- API type: `user` (default)
- Version: `1.0` (default)

### API Request Method

```71:104:lib/athar-service.ts
  /**
   * Make HTTP request to Athar API
   */
  private async makeRequest(params: Record<string, any>): Promise<any> {
    const url = new URL(this.config.baseUrl);
    
    // Add all parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // Add authentication parameters
    url.searchParams.append('api', this.config.api);
    url.searchParams.append('ver', this.config.version);
    url.searchParams.append('key', this.config.apiKey);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Qareeb-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Athar API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
```

**Request Format:**
- All parameters are sent as URL query parameters
- Authentication is done via `api`, `ver`, and `key` parameters
- Uses GET method for all requests
- Returns JSON response

---

## Zone Creation Process

### Step 1: Institution Validation

```285:307:app/api/bus-trip-points/route.ts
      // Always create zone in Athar - zoneId must come from Athar
      // NO FALLBACK - institution MUST have its own Athar key
      try {
        // Institution MUST have Athar key configured - no fallback allowed
        if (!decoded.institutionId) {
          throw new Error('Institution ID is required. Cannot create point without institution context.');
        }

        const institution = await prisma.institution.findUnique({
          where: { id: decoded.institutionId },
          select: { id: true, atharKey: true, type: true }
        });

        if (!institution) {
          throw new Error(`Institution ${decoded.institutionId} not found`);
        }

        if (!institution.atharKey) {
          throw new Error(`Institution ${decoded.institutionId} (${institution.type}) does not have Athar API key configured. Cannot create point without zone. Please configure Athar key for this institution.`);
        }

        // Use institution's Athar key - NO FALLBACK
        atharService = await AtharService.forInstitution(decoded.institutionId);
        institutionIdForBuses = decoded.institutionId;
        console.log(`Using institution's Athar key for ${decoded.institutionId} (${institution.type})`);
```

**Critical Requirements:**
- Institution ID is mandatory
- Institution must have an Athar API key configured
- No fallback mechanism - point creation fails if Athar key is missing

### Step 2: Zone Creation in Athar

```309:333:app/api/bus-trip-points/route.ts
        // Create zone in Athar - zoneId MUST come from Athar
        try {
          atharZoneId = await atharService.ensureZone(
            trimmedNameAr || trimmedNameEn,
            {
              lat: parseFloat(lat),
              lng: parseFloat(lang)
            },
            500 // 500 meter radius
          );
          
          if (!atharZoneId) {
            throw new Error('Zone creation returned null - Athar API did not return a zone ID');
          }
          
          console.log(`✅ Created Athar zone with ID: ${atharZoneId} (zoneId from Athar)`);
        } catch (zoneError) {
          // Zone creation is REQUIRED - fail point creation if zone creation fails
          const errorMessage = zoneError instanceof Error ? zoneError.message : 'Unknown error';
          console.error(`❌ Failed to create Athar zone: ${errorMessage}`);
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            console.error('Athar API key appears to be invalid or expired. Please check the API key configuration.');
          }
          throw new Error(`Failed to create Athar zone: ${errorMessage}. Point creation aborted.`);
        }
```

**Zone Details:**
- **Name**: Uses Arabic name (falls back to English if Arabic not available)
- **Center**: Point coordinates (lat, lng)
- **Radius**: 500 meters (default, configurable)
- **Shape**: Circular geofence

### Zone Vertex Calculation

```408:439:lib/athar-service.ts
  /**
   * Generate zone vertices for circular geofence
   */
  private getZoneVertices(centralLatitude: number, centralLongitude: number, radiusMeters: number = 500): string {
    const earthRadiusMeters = 6378137.0;
    const distanceInRadians = radiusMeters / earthRadiusMeters;

    const coordinates: number[] = [];

    for (let i = 0; i <= 360; i += 9) {
      const radial = (i * Math.PI) / 180;
      const centralLatRad = (centralLatitude * Math.PI) / 180;
      const centralLngRad = (centralLongitude * Math.PI) / 180;

      const latitudeInRadians = Math.asin(
        Math.sin(centralLatRad) * Math.cos(distanceInRadians) +
        Math.cos(centralLatRad) * Math.sin(distanceInRadians) * Math.cos(radial)
      );

      const deltaLongitudeInRadians = Math.atan2(
        Math.sin(radial) * Math.sin(distanceInRadians) * Math.cos(centralLatRad),
        Math.cos(distanceInRadians) - Math.sin(centralLatRad) * Math.sin(latitudeInRadians)
      );

      const longitudeInRadians = ((centralLngRad + deltaLongitudeInRadians + Math.PI) % (2 * Math.PI)) - Math.PI;

      const latDeg = (latitudeInRadians * 180) / Math.PI;
      const lngDeg = (longitudeInRadians * 180) / Math.PI;

      coordinates.push(Number(latDeg.toFixed(6)));
      coordinates.push(Number(lngDeg.toFixed(6)));
    }

    return coordinates.join(',');
  }
```

**How it Works:**
- Generates 41 points (every 9 degrees) around the center point
- Uses spherical geometry to calculate accurate coordinates
- Returns comma-separated coordinate pairs (lat1,lng1,lat2,lng2,...)

### Zone Creation API Call

```207:231:lib/athar-service.ts
  /**
   * Create a circular geofenced zone
   */
  async createZone(pointName: string, centerPoint: {lat: number, lng: number}, radiusMeters: number = 500): Promise<string | null> {
    try {
      const zoneVertices = this.getZoneVertices(centerPoint.lat, centerPoint.lng, radiusMeters);

      const response = await this.makeRequest({
        cmd: 'ADD_ZONE',
        name: pointName,
        zone_vertices: zoneVertices,
        zone_id: 'false',
        group_id: '0'
      });

      if (response && response.zone_id) {
        // Extract only the numeric part of zone_id (remove any query parameters)
        const zoneIdStr = String(response.zone_id);
        const match = zoneIdStr.match(/^(\d+)/);
        return match ? match[1] : zoneIdStr;
      }

      throw new Error('Failed to create zone: Invalid response from Athar');
    } catch (error) {
      console.error('Failed to create zone:', error);
      throw new Error(`Failed to create zone for ${pointName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
```

**Athar API Parameters:**
- `cmd`: `ADD_ZONE` - Command to create a zone
- `name`: Point name (Arabic or English)
- `zone_vertices`: Comma-separated coordinate pairs
- `zone_id`: `'false'` for new zones
- `group_id`: `'0'` (default group)

**Response:**
- Returns `zone_id` as a string
- Zone ID is extracted and cleaned (removes any query parameters)

### Zone Existence Check

```385:403:lib/athar-service.ts
  /**
   * Ensure zone exists, create if it doesn't
   */
  async ensureZone(pointName: string, centerPoint: {lat: number, lng: number}, radiusMeters: number = 500): Promise<string> {
    try {
      // First check if zone already exists by name
      const existingId = await this.findZoneIdByName(pointName);
      if (existingId) {
        return existingId;
      }

      // If zone doesn't exist, create it
      const zoneId = await this.createZone(pointName, centerPoint, radiusMeters);
      if (!zoneId) {
        throw new Error('Athar zone creation failed');
      }

      return zoneId;
    } catch (error) {
      throw error;
    }
  }
```

This method prevents duplicate zones by checking if a zone with the same name already exists before creating a new one.

---

## Zone Event Creation

### Purpose

Zone events are created to monitor when buses (identified by IMEI) enter or exit a zone. Athar automatically triggers webhooks when these events occur.

### Event Types

1. **zone_in**: Bus enters the zone
2. **zone_out**: Bus exits the zone

### Event Creation Process

```339:408:app/api/bus-trip-points/route.ts
      // Create zone events - REQUIRED for point creation
      if (!atharZoneId || !atharService || !institutionIdForBuses) {
        throw new Error('Missing required data for zone event creation');
      }

              try {
                // Create zone events for active buses
                const activeBuses = await prisma.bus.findMany({
                  where: {
                    institutionId: institutionIdForBuses,
                    NOT: {
                      imei: null
                    }
                  },
                  select: { imei: true, busName: true }
                });

                if (activeBuses.length > 0) {
                  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;
          let eventsCreated = 0;
          let eventsFailed = 0;

                  for (const bus of activeBuses) {
                    if (!bus.imei) continue;

                    try {
                      // Create zone_in event
              const eventIdIn = await atharService.createZoneEvent(
                        trimmedNameAr || trimmedNameEn,
                        atharZoneId,
                        bus.imei,
                        'zone_in',
                        webhookUrl
                      );

                      // Create zone_out event
              const eventIdOut = await atharService.createZoneEvent(
                        trimmedNameAr || trimmedNameEn,
                        atharZoneId,
                        bus.imei,
                        'zone_out',
                        webhookUrl
                      );

              if (eventIdIn && eventIdOut) {
                eventsCreated += 2;
                console.log(`✅ Created zone events for bus ${bus.busName} (zone_in: ${eventIdIn}, zone_out: ${eventIdOut})`);
              } else {
                eventsFailed += 2;
                throw new Error(`Zone event creation returned null for bus ${bus.busName}`);
                }
              } catch (eventError) {
              eventsFailed += 2;
              const errorMessage = eventError instanceof Error ? eventError.message : 'Unknown error';
              console.error(`❌ Failed to create zone events for bus ${bus.busName}: ${errorMessage}`);
              throw new Error(`Failed to create zone events for bus ${bus.busName}: ${errorMessage}`);
              }
            }

          if (eventsFailed > 0) {
            throw new Error(`Failed to create ${eventsFailed} zone events. Point creation aborted.`);
          }

          console.log(`✅ Created ${eventsCreated} zone events for ${activeBuses.length} bus(es)`);
        }
      } catch (eventError) {
        const errorMessage = eventError instanceof Error ? eventError.message : 'Unknown error';
        console.error(`❌ Failed to create zone events: ${errorMessage}`);
        throw new Error(`Zone event creation failed: ${errorMessage}. Point creation aborted.`);
      }
```

**Process:**
1. Fetch all active buses for the institution that have IMEI configured
2. For each bus, create two events:
   - `zone_in` event
   - `zone_out` event
3. Each event includes the webhook URL
4. Point creation fails if any event creation fails

### Event Creation API Call

```279:316:lib/athar-service.ts
  /**
   * Create zone entry/exit event
   */
  async createZoneEvent(
    pointName: string, 
    zoneId: string, 
    imei: string, 
    zoneType: 'zone_in' | 'zone_out', 
    webhookUrl: string,
    studentName?: string
  ): Promise<string | null> {
    try {
      // Format event name
      const eventName = studentName 
        ? `${studentName} - ${pointName}_${zoneType}`
        : `${pointName}_${zoneType}`;

      // Add zone_id to webhook URL
      const webhookWithZoneId = webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + `zone_id=${zoneId}`;

      const response = await this.makeRequest({
        cmd: 'ADD_NEW_EVENT',
        name: eventName,
        zones: zoneId,
        event_id: 'false',
        type: zoneType,
        webhook_url: webhookWithZoneId,
        webhook_template_id: 0,
        imei: imei
      });

      if (response && response.event_id) {
        return String(response.event_id);
      }

      throw new Error('Failed to create zone event: Invalid response from Athar');
    } catch (error) {
      console.error('Failed to create zone event:', error);
      throw new Error(`Failed to create zone event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
```

**Athar API Parameters:**
- `cmd`: `ADD_NEW_EVENT` - Command to create an event
- `name`: Event name (e.g., "بوابة المدرسة_zone_in")
- `zones`: Zone ID to monitor
- `event_id`: `'false'` for new events
- `type`: `'zone_in'` or `'zone_out'`
- `webhook_url`: URL to call when event occurs (includes zone_id as query param)
- `webhook_template_id`: `0` (default)
- `imei`: GPS device IMEI number

**Response:**
- Returns `event_id` as a string
- This event ID is used to track and manage the event

---

## Database Storage

### Point Creation

```410:430:app/api/bus-trip-points/route.ts
      // Determine creatorId - for super admin, use null or default institution
      let creatorId = null;
      if (decoded.institutionId) {
        creatorId = decoded.institutionId;
      } else if (decoded.userId) {
        // Super admin - could set to null or default institution
        // For now, set to null to indicate super admin created it
        creatorId = null;
      }

      const busTripPoint = await (prisma as any).busTripPoint.create({
        data: {
          nameEn: trimmedNameEn,
          nameAr: trimmedNameAr,
          lat: parseFloat(lat),
          lang: parseFloat(lang),
          zoneId: atharZoneId ? atharZoneId.toString() : null,
          isActive,
          creatorId
        }
      });
```

**Database Fields:**
- `nameEn`: English name
- `nameAr`: Arabic name
- `lat`: Latitude (Decimal)
- `lang`: Longitude (Decimal)
- `zoneId`: Athar zone ID (from Athar API response)
- `isActive`: Boolean flag
- `creatorId`: Institution ID that created the point

**Important:** The `zoneId` is stored as a string and is **always** obtained from Athar - never from user input.

---

## Webhook Processing

### Webhook Endpoint

**Location:** `app/api/athar/webhook/route.ts`

**Supported Methods:** GET and POST

### Webhook Flow

When a bus enters or exits a zone, Athar automatically calls the webhook URL with event details.

### 1. Webhook Reception

```24:68:app/api/athar/webhook/route.ts
async function handleWebhook(request: NextRequest, method: string) {
  try {
    console.log(`Athar webhook ${method} received:`, {
      method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });

    // Helper function to clean zone_id - remove any query parameters that may have been appended
    const cleanZoneId = (zoneId: string | null): string | null => {
      if (!zoneId) return null;
      // Extract only the numeric part before any '?' or '&'
      const match = zoneId.match(/^(\d+)/);
      return match ? match[1] : zoneId;
    };

    // Extract parameters from both query params and body
    let eventId, zoneId, imei, type, timestamp;
    
    if (method === 'GET') {
      const { searchParams } = new URL(request.url);
      eventId = searchParams.get('event_id');
      zoneId = cleanZoneId(searchParams.get('zone_id'));
      imei = searchParams.get('imei');
      type = searchParams.get('type');
      timestamp = searchParams.get('timestamp');
    } else {
      const body = await request.json().catch(() => ({}));
      const { searchParams } = new URL(request.url);
      
      eventId = body.event_id || body.eventId || searchParams.get('event_id');
      zoneId = cleanZoneId(body.zone_id || body.zoneId || searchParams.get('zone_id'));
      imei = body.imei || searchParams.get('imei');
      type = body.type || searchParams.get('type');
      timestamp = body.timestamp || searchParams.get('timestamp');
    }

    console.log('Extracted webhook parameters:', {
      eventId,
      zoneId,
      imei,
      type,
      timestamp
    });
```

**Webhook Parameters:**
- `event_id`: Unique event identifier
- `zone_id`: Zone ID (cleaned to remove query parameters)
- `imei`: GPS device IMEI
- `type`: `zone_in` or `zone_out`
- `timestamp`: Event timestamp

### 2. Duplicate Prevention

```89:105:app/api/athar/webhook/route.ts
    // Check if this event was already processed to prevent duplicate notifications
    const existingZone = await prisma.zone.findUnique({
      where: {
        eventId_zoneId: {
          eventId: eventIdInt,
          zoneId: parseInt(zoneId || '0')
        }
      }
    });

    if (existingZone && existingZone.isNotified) {
      console.log(`Event ${eventIdInt} for zone ${zoneId} already processed. Skipping to prevent duplicate notifications.`);
      return NextResponse.json({ 
        success: true, 
        message: 'Event already processed' 
      });
    }
```

The system checks if the event has already been processed to prevent duplicate notifications.

### 3. Point Lookup

```107:158:app/api/athar/webhook/route.ts
    // Find bus trip point by zoneId
    const busTripPoint = await prisma.busTripPoint.findFirst({
      where: {
        zoneId: zoneId?.toString()
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            fcmToken: true,
            institution: {
              select: {
                type: true,
                name: true,
              }
            }
          }
        },
        tripPoints: {
          include: {
            trip: {
              include: {
                tripSchedules: {
                  where: {
                    isActive: true,
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() }
                  },
                  include: {
                    bus: true,
                    tripScheduleBuses: {
                      include: {
                    bus: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!busTripPoint) {
      console.log('Bus trip point not found for zone:', zoneId);
      return NextResponse.json({ 
        success: true, 
        message: 'No trip point found for this zone' 
      });
    }
```

The system:
1. Finds the bus trip point using the zone ID
2. Includes related data (parent, trip schedules, buses)
3. Filters for active trip schedules within date range

### 4. Active Trip Schedule Matching

```168:199:app/api/athar/webhook/route.ts
    // Find active trip schedules with the specified IMEI
    // Check both direct bus relationship and tripScheduleBuses
    const activeTripSchedules = busTripPoint.tripPoints
      .flatMap(tp => tp.trip.tripSchedules)
      .filter(schedule => {
        // Check if schedule is active and within date range
        const isDateActive = schedule.isActive &&
        new Date(schedule.startDate) <= new Date() &&
          new Date(schedule.endDate) >= new Date();
        
        if (!isDateActive) return false;
        
        // Check direct bus relationship
        if (schedule.bus?.imei === imei) {
          return true;
        }
        
        // Check tripScheduleBuses relationship
        const hasMatchingBus = schedule.tripScheduleBuses?.some(
          tsb => tsb.bus?.imei === imei
        );
        
        return hasMatchingBus || false;
      });

    if (activeTripSchedules.length === 0) {
      console.log('No active trip schedules found for IMEI:', imei);
      return NextResponse.json({ 
        success: true, 
        message: 'No active trips found' 
      });
    }
```

The system matches the IMEI from the webhook with active trip schedules, checking both:
- Direct bus relationship
- Trip schedule buses relationship

---

## Notification System

### Student Notifications

```255:350:app/api/athar/webhook/route.ts
    // Get students subscribed to these trip schedules
    const tripScheduleIds = activeTripSchedules.map(schedule => schedule.id);
    
    const subscribedStudents = await prisma.student.findMany({
      where: {
        tripSubscriptions: {
          some: {
            tripScheduleId: { in: tripScheduleIds },
            isActive: true,
            notifyOnApproach: true
          }
        },
        fcmToken: { not: null }
      },
      select: {
        id: true,
        name: true,
        fcmToken: true,
        tripSubscriptions: {
          where: {
            tripScheduleId: { in: tripScheduleIds },
            isActive: true,
            notifyOnApproach: true
          }
        }
      }
    });

    // Filter students who are subscribed to this specific point
    const studentsToNotify = subscribedStudents.filter(student => {
      return student.tripSubscriptions.some(subscription => {
        const subscribedPointsArray = Array.isArray(subscription.subscribedPoints) 
          ? subscription.subscribedPoints 
          : JSON.parse(subscription.subscribedPoints as string || '[]');
        // Convert busTripPoint.id to string for comparison since subscribedPoints are stored as strings
        const pointIdString = busTripPoint.id.toString();
        return subscribedPointsArray.includes(pointIdString);
      });
    });

    console.log(`Found ${studentsToNotify.length} students to notify out of ${subscribedStudents.length} subscribed`);
    
    // Debug logging for the filtering
    if (subscribedStudents.length > 0 && studentsToNotify.length === 0) {
      console.log('DEBUG: No students matched after filtering. Checking subscription details...');
      subscribedStudents.forEach(student => {
        console.log(`  - Student: ${student.name}`);
        student.tripSubscriptions.forEach(sub => {
          const pointsArray = Array.isArray(sub.subscribedPoints) 
            ? sub.subscribedPoints 
            : JSON.parse(sub.subscribedPoints as string || '[]');
          console.log(`    - Subscribed to ${pointsArray.length} points: ${JSON.stringify(pointsArray)}`);
          console.log(`    - Looking for point: ${busTripPoint.id.toString()}`);
          console.log(`    - Match: ${pointsArray.includes(busTripPoint.id.toString())}`);
        });
      });
    }
    
    studentsToNotify.forEach(student => {
      console.log(`  - Student: ${student.name}, Has FCM Token: ${!!student.fcmToken}`);
    });

    if (studentsToNotify.length === 0) {
      console.log('No students to notify');
      // Still mark as processed to prevent duplicate processing
      try {
        await prisma.zone.upsert({
          where: {
            eventId_zoneId: {
              eventId: eventIdInt,
              zoneId: parseInt(zoneId || '0')
            }
          },
          update: {
            isNotified: true,
            notifiedAt: new Date()
          },
          create: {
            eventId: eventIdInt,
            zoneId: parseInt(zoneId || '0'),
            imei,
            isNotified: true,
            notifiedAt: new Date(),
            creationTime: new Date(),
            isDeleted: false,
            busTripPointId: busTripPoint.id
          }
        });
      } catch (error) {
        console.error('Failed to update zone notification status:', error);
      }
      return NextResponse.json({ 
        success: true, 
        message: 'No students to notify' 
      });
    }
```

**Student Notification Criteria:**
1. Student must have an active trip subscription
2. Subscription must have `notifyOnApproach: true`
3. Student must have an FCM token
4. Student must be subscribed to the specific point

### Parent Notifications

```220:253:app/api/athar/webhook/route.ts
    if (
      type === 'zone_in' &&
      busTripPoint.parent &&
      busTripPoint.parent.fcmToken &&
      busTripPoint.parent.institution?.type === 'SCHOOL'
    ) {
      const scheduleForParent = activeTripSchedules[0];
      if (scheduleForParent) {
        const matchingBus = getMatchingBus(scheduleForParent);
        const busName = matchingBus?.busName || 'الحافلة';
        const busPlate = matchingBus?.busPlateNumber || '';
        try {
          await firebaseService.sendNotification(
            busTripPoint.parent.fcmToken,
            'الحافلة اقتربت من نقطتك',
            `الحافلة ${busName}${busPlate ? ` (${busPlate})` : ''} دخلت منطقة ${busTripPoint.nameAr || busTripPoint.nameEn}`,
            {
              type: 'parent_point_zone_in',
              tripScheduleId: scheduleForParent.id,
              pointId: busTripPoint.id.toString(),
              busName,
              busPlate,
              tripName: scheduleForParent.name ?? '',
            },
            busTripPoint.parent.id
          );
          console.log(
            `Parent zone notification sent to ${busTripPoint.parent.name} for point ${busTripPoint.id.toString()}`
          );
        } catch (error) {
          console.error('Failed to send parent zone notification:', error);
        }
      }
    }
```

**Parent Notification Criteria:**
1. Event type must be `zone_in`
2. Point must have an associated parent
3. Parent must have an FCM token
4. Parent's institution must be type `SCHOOL`

### Notification Sending

```380:411:app/api/athar/webhook/route.ts
    // Send notifications
    const notificationPromises = studentsToNotify.map(async (student) => {
      if (!student.fcmToken) return;

      try {
        const success = await sendFCMNotification(
          student.fcmToken,
          'باص المؤسسة',
          `لقد أوشك السائق على الوصول إلى ${busTripPoint.nameAr}`,
          {
            eventId: eventIdInt.toString(),
            zoneId: zoneId?.toString() || '',
            imei,
            type: type || 'zone_in',
            pointId: busTripPoint.id.toString(),
            pointName: busTripPoint.nameAr,
            studentId: student.id,
            timestamp: timestamp || new Date().toISOString()
          }
        );

        if (success) {
          console.log(`Notification sent to student: ${student.name}`);
        } else {
          console.error(`Failed to send notification to student: ${student.name}`);
        }
      } catch (error) {
        console.error(`Failed to send notification to student ${student.id}:`, error);
      }
    });

    await Promise.all(notificationPromises);
```

**Notification Details:**
- **Title**: "باص المؤسسة" (Institution Bus)
- **Body**: "لقد أوشك السائق على الوصول إلى [Point Name]" (The driver is about to arrive at [Point Name])
- **Data**: Includes event details, point information, student ID, timestamp

### Event Tracking

```352:378:app/api/athar/webhook/route.ts
    // Mark zone as processed BEFORE sending notifications to prevent duplicates
    try {
      await prisma.zone.upsert({
        where: {
          eventId_zoneId: {
            eventId: eventIdInt,
            zoneId: parseInt(zoneId || '0')
          }
        },
        update: {
          isNotified: true,
          notifiedAt: new Date()
        },
        create: {
          eventId: eventIdInt,
          zoneId: parseInt(zoneId || '0'),
          imei,
          isNotified: true,
          notifiedAt: new Date(),
          creationTime: new Date(),
          isDeleted: false,
          busTripPointId: busTripPoint.id
        }
      });
    } catch (error) {
      console.error('Failed to update zone notification status:', error);
    }
```

The system tracks processed events in the `Zone` table to prevent duplicate notifications.

---

## Database Schema

### BusTripPoint Model

```189:212:prisma/schema.prisma
model BusTripPoint {
  id            BigInt                   @id @default(autoincrement())
  nameEn        String                   @map("name_en")
  nameAr        String                   @map("name_ar")
  lat           Decimal                  @db.Decimal(10, 8)
  lang          Decimal                  @db.Decimal(11, 8)
  isActive      Boolean                  @default(true) @map("is_active")
  creatorId     String?                  @map("creator_id")
  parentId      String?                  @map("parent_id")
  zoneId        String?                  @map("zone_id") @db.VarChar(255)
  createdAt     DateTime                 @default(now()) @map("created_at")
  updatedAt     DateTime                 @updatedAt @map("updated_at")
  connectedFrom BusTripPointConnection[] @relation("PointFrom")
  connectedTo   BusTripPointConnection[] @relation("PointTo")
  tripPoints    TripPoint[]
  zones         Zone[]
  parent        Parent?                  @relation(fields: [parentId], references: [id], onDelete: SetNull)

  @@index([zoneId], map: "idx_zone_id")
  @@index([lat, lang], map: "idx_coordinates")
  @@index([creatorId], map: "idx_creator")
  @@index([parentId], map: "idx_parent")
  @@map("bus_trip_points")
}
```

**Key Fields:**
- `zoneId`: Athar zone ID (indexed for fast lookups)
- `lat`/`lang`: Coordinates (indexed for geospatial queries)
- `parentId`: Optional parent association
- `creatorId`: Institution that created the point

---

## Error Handling

### Point Creation Errors

1. **Missing Athar Key**: Point creation fails if institution doesn't have Athar API key
2. **Zone Creation Failure**: Point creation aborts if zone cannot be created
3. **Event Creation Failure**: Point creation aborts if zone events cannot be created
4. **Duplicate Names**: Returns 409 error if point name already exists

### Webhook Errors

1. **Missing Parameters**: Returns 400 if required parameters are missing
2. **Invalid Event ID**: Returns 400 if event_id format is invalid
3. **Point Not Found**: Returns success but logs warning if zone doesn't match any point
4. **No Active Trips**: Returns success if no active trip schedules match the IMEI

### Error Logging

All errors are logged with detailed context:
- Error messages
- Request parameters
- Stack traces
- User/institution context

---

## API Endpoints

### Point Creation

**POST** `/api/bus-trip-points`

**Request:**
```json
{
  "nameEn": "School Gate",
  "nameAr": "بوابة المدرسة",
  "lat": 24.7136,
  "lang": 46.6753,
  "isActive": true
}
```

**Response (Success):**
```json
{
  "data": {
    "id": "123456789",
    "nameEn": "School Gate",
    "nameAr": "بوابة المدرسة",
    "lat": 24.7136,
    "lang": 46.6753,
    "zoneId": "74294",
    "isActive": true,
    "creatorId": "inst_123"
  },
  "status": "success",
  "message": "Bus trip point created successfully with Athar zone integration"
}
```

### Webhook Endpoint

**GET/POST** `/api/athar/webhook`

**Query Parameters:**
- `event_id`: Event identifier
- `zone_id`: Zone identifier
- `imei`: GPS device IMEI
- `type`: `zone_in` or `zone_out`
- `timestamp`: Event timestamp

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent",
  "notifiedStudents": 5,
  "pointName": "بوابة المدرسة"
}
```

---

## Environment Variables

Required environment variables for Athar integration:

```env
# Athar API Configuration
ATHAR_BASE_URL=https://admin.alather.net/api/api.php
ATHAR_API_TYPE=user
ATHAR_VERSION=1.0

# Application URL (for webhook)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# or
APP_URL=https://your-domain.com
```

---

## Summary

The point creation and Athar communication flow involves:

1. **Point Creation Request** → Validates input and checks for duplicates
2. **Institution Validation** → Ensures institution has Athar API key
3. **Zone Creation** → Creates circular geofence in Athar (500m radius)
4. **Event Creation** → Creates zone_in and zone_out events for each active bus
5. **Database Storage** → Saves point with Athar zone ID
6. **Webhook Setup** → Athar configured to call webhook on zone events
7. **Event Processing** → Webhook receives events and sends notifications
8. **Notification Delivery** → Students/parents receive push notifications

**Key Principles:**
- Zone ID always comes from Athar, never from user input
- Point creation fails if Athar integration fails (no fallback)
- Each institution must have its own Athar API key
- Duplicate events are prevented through database tracking
- Notifications are sent only to subscribed students/parents

---

## Troubleshooting

### Common Issues

1. **Point creation fails with "Athar API key not configured"**
   - Solution: Configure `atharKey` for the institution in the database

2. **Zone creation returns null**
   - Check Athar API key validity
   - Verify network connectivity to Athar API
   - Check Athar API response logs

3. **Webhook not receiving events**
   - Verify webhook URL is accessible from internet
   - Check Athar event configuration
   - Verify zone_id matches in events

4. **Notifications not sent**
   - Check if students are subscribed to the point
   - Verify FCM tokens are valid
   - Check if trip schedules are active
   - Verify IMEI matches between bus and event

---

*Last Updated: 2024*
