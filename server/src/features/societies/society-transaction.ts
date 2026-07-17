import mongoose from 'mongoose'
import { SocietyModel } from './society.model.js'

export async function guardSocietyMutation(
  societyId: string,
  session: mongoose.ClientSession,
): Promise<void> {
  const society = await SocietyModel.findOneAndUpdate(
    { _id: societyId },
    { $inc: { mutationVersion: 1 } },
    { session },
  )
  if (!society) throw new Error('Society not found.')
}
