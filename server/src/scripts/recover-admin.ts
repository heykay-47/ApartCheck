import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { env } from '../config/env.js'
import { recoverAdmin } from '../features/users/recover-admin.js'
import { z } from 'zod'

export async function main(args = process.argv.slice(2)): Promise<number> {
  if (
    args.length !== 1 ||
    !args[0] ||
    !z.string().email().safeParse(args[0].trim()).success
  ) {
    process.stderr.write('Usage: npm run recover:admin -- <admin-email>\n')
    return 1
  }
  try {
    await connectDatabase(env.MONGODB_URI)
    const result = await recoverAdmin(args[0])
    process.stdout.write(
      `Email: ${result.user.email}\nTemporary password: ${result.temporaryPassword}\n`,
    )
    return 0
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Admin recovery failed.'}\n`,
    )
    return 1
  } finally {
    await disconnectDatabase()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().then((code) => {
    process.exitCode = code
  })
}
