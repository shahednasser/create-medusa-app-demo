
import chalk from 'chalk'
import { program } from 'commander'
import pg from 'pg'

type CreateDbOptions = {
  client: pg.Client
  db: string
}

export default async ({
  client,
  db
}: CreateDbOptions) => {
  try {
    await client.query(`CREATE DATABASE "${db}"`)
  } catch (e) {
    program.error(
      chalk.bold.red(`An error occurred while trying to create your database: ${e}`)
    )
  }
}