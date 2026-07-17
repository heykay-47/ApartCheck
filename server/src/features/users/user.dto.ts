import type { User } from './user.model.js'

export type PublicUser = {
  id: string
  name: string
  email: string
  phone: string
  role: User['role']
  societyId: string
  unitId: string | null
  mustChangePassword: boolean
}

export type SafeUser = PublicUser & {
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TemporaryCredentialResponse = {
  user: SafeUser
  temporaryPassword: string
}

type UserForSerialization = Pick<
  User,
  'name' | 'email' | 'phone' | 'role' | 'mustChangePassword'
> & {
  id?: string
  _id?: unknown
  societyId: User['societyId'] | string
  unitId: User['unitId'] | string
}

export function serializePublicUser(user: UserForSerialization): PublicUser {
  return {
    id: user.id ?? String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    societyId: String(user.societyId),
    unitId: user.unitId === null ? null : String(user.unitId),
    mustChangePassword: user.mustChangePassword,
  }
}

type SafeUserForSerialization = UserForSerialization & {
  active: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export function serializeSafeUser(user: SafeUserForSerialization): SafeUser {
  return {
    ...serializePublicUser(user),
    active: user.active,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  }
}
