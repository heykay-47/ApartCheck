import { AppError } from '../../http/app-error.js'
import { SocietyModel } from './society.model.js'
import type { SocietyUpdate } from './society.schema.js'

export const SocietyService = {
  async getCurrent(societyId: string) {
    const society = await SocietyModel.findById(societyId)
    if (!society) {
      throw new AppError(404, 'SOCIETY_NOT_FOUND', 'Society not found.')
    }
    return society
  },

  async updateCurrent(societyId: string, input: SocietyUpdate) {
    const society = await SocietyModel.findByIdAndUpdate(
      societyId,
      { $set: input },
      { returnDocument: 'after', runValidators: true },
    )
    if (!society) {
      throw new AppError(404, 'SOCIETY_NOT_FOUND', 'Society not found.')
    }
    return society
  },
}
