import chalk from "chalk"
import fs from "fs"
import path from "path"
import { Ora } from "ora"
import promiseExec from "./promise-exec.js"
import { EOL } from "os"
import runProcess from "./run-process.js"
import logMessage from "./log-message.js"

type PrepareOptions = {
  directory: string
  dbConnectionString: string
  admin?: {
    email: string
    password: string
  }
  seed?: boolean
  spinner?: Ora
}

export default async ({
  directory,
  dbConnectionString,
  admin,
  seed,
  spinner,
}: PrepareOptions) => {
  // initialize execution options
  const execOptions = {
    cwd: directory,
  }

  // add connection string to project
  fs.appendFileSync(
    path.join(directory, `.env`),
    `DATABASE_TYPE=postgres${EOL}DATABASE_URL=${dbConnectionString}`
  )

  if (spinner) {
    spinner.text = chalk.white("Installing dependencies...")
  }

  await runProcess({
    process: async () => {
      try {
        await promiseExec(`yarn`, execOptions)
      } catch (e) {
        // yarn isn't available
        // use npm
        await promiseExec(`npm install`, execOptions)
      }
    },
    ignoreERESOLVE: true,
  })

  logMessage({
    message: `\n✓ Installed Dependencies`,
    type: "success",
  })

  if (spinner) {
    spinner.text = chalk.white("Running Migrations...")
  }

  // run migrations
  await runProcess({
    process: async () => {
      await promiseExec(
        "npx -y @medusajs/medusa-cli@latest migrations run",
        execOptions
      )
    },
  })

  logMessage({
    message: `\n✓ Ran Migrations`,
    type: "success",
  })

  if (admin) {
    // create admin user
    if (spinner) {
      spinner.text = chalk.white("Creating an admin user...")
    }

    await runProcess({
      process: async () => {
        await promiseExec(
          `npx -y @medusajs/medusa-cli@latest user -e ${admin.email} -p ${admin.password}`,
          execOptions
        )
      },
    })

    logMessage({
      message: `\n✓ Created admin user`,
      type: "success",
    })
  }

  if (seed) {
    // check if a seed file exists in the project
    if (!fs.existsSync(path.join(directory, "data", "seed.json"))) {
      logMessage({
        message: "Seed file was not found in the project. Skipping seeding...",
        type: "warning",
      })
      return
    }

    if (spinner) {
      spinner.text = chalk.white("Seeding database with demo data...")
    }

    await runProcess({
      process: async () => {
        await promiseExec(
          `npx -y @medusajs/medusa-cli@latest seed --seed-file=${path.join(
            "data",
            "seed.json"
          )}`,
          execOptions
        )
      },
    })

    logMessage({
      message: `\n✓ Seeded database with demo data`,
      type: "success",
    })
  }
}
