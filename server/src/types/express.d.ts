declare global {
  namespace Express {
    interface Actor {
      userId: string
      societyId: string
      tokenVersion: number
      role: 'resident' | 'admin' | 'technician'
      mustChangePassword: boolean
      name: string
      email: string
      phone: string
      unitId: string | null
    }

    interface Request {
      id: string
      actor: Actor
    }
  }
}

export {}
