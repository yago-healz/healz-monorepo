import * as bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'
import { SEED_CONFIG } from './config'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SEED_CONFIG.PASSWORD_HASH_ROUNDS)
}

export function randomDate(from: Date, to: Date): Date {
  return faker.date.between({ from, to })
}

export function randomPhone(): string {
  const ddd = faker.helpers.arrayElement(['11', '21', '31', '41', '51', '61', '71', '81', '85', '62'])
  const number = faker.string.numeric(9)
  return `+55${ddd}${number}`
}

export function pickRandom<T>(array: T[]): T {
  return faker.helpers.arrayElement(array)
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}
