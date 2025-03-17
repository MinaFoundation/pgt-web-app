import { z } from 'zod'

export const uintSchema = z.number().int().nonnegative()

export * from './consideration'
export * from './deliberation'
