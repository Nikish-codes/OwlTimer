export type SharePermission = 'view' | 'edit'

export interface SharedCalendar {
  id: string
  ownerId: string
  sharedWith: {
    userId: string
    permission: SharePermission
  }[]
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ShareInvite {
  id: string
  calendarId: string
  fromUserId: string
  toEmail: string
  permission: SharePermission
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  expiresAt: string
} 