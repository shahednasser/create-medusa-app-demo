import chalk from "chalk"
import { program } from "commander"
import fs from "fs"
import path from "path"
import { Ora } from "ora";
import promiseExec from "./promise-exec.js";

type PrepareOptions = {
  directory: string
  dbConnectionString: string
  admin?: {
    email: string
    password: string
  }
  spinner?: Ora
}

export default async ({
  directory,
  dbConnectionString,
  admin,
  spinner
}: PrepareOptions) => {
  try {
    // initialize execution options
    const execOptions = {
      cwd: directory
    }
  
    // add connection string to project
    fs.appendFileSync(path.join(directory, `.env`), `DATABASE_TYPE=postgres\nDATABASE_URL=${dbConnectionString}`)

    if (spinner) {
      spinner.text = chalk.white('Installing dependencies...')
    }
  
    // install dependencies
    // use yarn if available since it's faster
    try {
      await promiseExec(`yarn`, execOptions)
    } catch (e) {
      // yarn isn't available
      // use npm
      await promiseExec(`npm install`, execOptions)
    }

    console.log(
      chalk.green(`\n✓ Installed Dependencies`)
    )

    if (spinner) {
      spinner.text = chalk.white('Running Migrations...')
    }

    // run migrations
    await promiseExec('npx @medusajs/medusa-cli migrations run -y', execOptions)

    console.log(
      chalk.green(`\n✓ Ran Migrations`)
    )

    if (admin) {
      // create admin user
      if (spinner) {
        spinner.text = chalk.white('Creating an admin user...')
      }

      await promiseExec(`npx @medusajs/medusa-cli user -e ${admin.email} -p ${admin.password} -y`, execOptions)

      console.log(
        chalk.green(`\n✓ Created admin user`)
      )
    }
  } catch (e) {
    program.error(
      chalk.bold.red(`An error occurred while preparing project: ${e}`)
    )
  }
}