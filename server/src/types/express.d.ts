declare global {
  namespace Express {
    interface Actor {
      userId: string
      societyId: string
      role: 'resident' | 'admin' | 'technician'
      mustChangePassword: boolean
      tokenVersion: number
    }

    interface Request {
      id: string
      actor: Actor
    }
  }
}

export {}
