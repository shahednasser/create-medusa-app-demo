import inquirer from "inquirer"
import slugifyType from "slugify"
import chalk from "chalk"
import pg from "pg"
import createDb from "../utils/create-db.js"
import postgresClient from "../utils/postgres-client.js"
import cloneRepo from "../utils/clone-repo.js"
import prepareProject from "../utils/prepare-project.js"
import startMedusa from "../utils/start-medusa.js"
import open from "open"
import waitOn from "wait-on"
import formatConnectionString from "../utils/format-connection-string.js"
import ora from "ora"
import fs from "fs"
import { nanoid } from "nanoid"
import isEmailImported from "validator/lib/isEmail.js"
import logMessage from "../utils/log-message.js"

const slugify = slugifyType.default
const isEmail = isEmailImported.default

type CreateOptions = {
  repoUrl?: string
  seed?: boolean
}

export default async ({ repoUrl = "", seed }: CreateOptions) => {
  const { projectName, postgresType } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What's the name of your project?",
      default: "my-medusa-store",
      filter: (input) => {
        return slugify(input)
      },
      validate: (input) => {
        if (!input.length) {
          return "Please enter a project name"
        }
        return fs.existsSync(input) && fs.lstatSync(input).isDirectory()
          ? "A directory already exists with the same name. Please enter a different project name."
          : true
      },
    },
    {
      type: "list",
      name: "postgresType",
      message: "Do you want to use a local or remote database?",
      choices: [
        {
          name: "Local (Requires Postgres to be installed)",
          value: "local",
        },
        {
          name: "Setup Remote Postgres (Soon)",
          disabled: true,
        },
      ],
    },
  ])

  let client: pg.Client | undefined
  let dbConnectionString = ""
  let postgresUsername = "postgres"
  let postgresPassword = ""

  if (postgresType === "local") {
    // try to log in with default db username and password
    try {
      client = await postgresClient({
        user: postgresUsername,
        password: postgresPassword,
      })
    } catch (e) {
      // ask for the user's credentials
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "postgresUsername",
          message: "Enter your Postgres username",
          default: "postgres",
          validate: (input) => {
            return typeof input === "string" && input.length > 0
          },
        },
        {
          type: "password",
          name: "postgresPassword",
          message: "Enter your Postgres password",
        },
      ])

      postgresUsername = answers.postgresUsername
      postgresPassword = answers.postgresPassword

      try {
        client = await postgresClient({
          user: postgresUsername,
          password: postgresPassword,
        })
      } catch (e) {
        logMessage({
          message:
            "Couldn't connect to PostgreSQL. Make sure you have PostgreSQL installed and the credentials you provided are correct.\n\n" +
            "You can learn how to install PostgreSQL here: https://docs.medusajs.com/development/backend/prepare-environment#postgresql",
          type: "error",
        })
      }
    }
  }

  logMessage({
    message:
      "Create an admin user to access the admin dashboard after the setup is complete.",
  })

  const { adminEmail, adminPass } = await inquirer.prompt([
    {
      type: "input",
      name: "adminEmail",
      message: "Enter your admin email",
      default: !seed ? "admin@medusa-test.com" : undefined,
      validate: (input) => {
        return typeof input === "string" && input.length > 0 && isEmail(input)
          ? true
          : "Please enter a valid email"
      },
    },
    {
      type: "password",
      name: "adminPass",
      message: "Enter your admin password",
      validate: (input) => {
        return typeof input === "string" && input.length > 0
      },
    },
  ])

  const spinner = ora(chalk.white("Setting up project")).start()

  process.on("SIGTERM", () => spinner.stop())
  process.on("SIGINT", () => spinner.stop())

  // clone repository
  try {
    await cloneRepo({
      directoryName: projectName,
      repoUrl,
    })
  } catch (e) {
    logMessage({
      message: `An error occurred while setting up your project: ${e}`,
      type: "error",
    })
  }

  logMessage({
    message: `\n✓ Created project directory`,
    type: "success",
  })

  if (client) {
    spinner.text = chalk.white("Creating database...")
    const dbName = `medusa-${nanoid(4)}`
    // create postgres database
    try {
      await createDb({
        client,
        db: dbName,
      })
    } catch (e) {
      logMessage({
        message: `An error occurred while trying to create your database: ${e}`,
        type: "error",
      })
    }

    // format connection string
    dbConnectionString = formatConnectionString({
      user: postgresUsername,
      password: postgresPassword,
      host: client.host,
      db: dbName,
    })

    logMessage({
      message: `\n✓ Database ${dbName} created`,
      type: "success",
    })
  }

  spinner.text = chalk.white("Preparing project...")

  // prepare project
  try {
    await prepareProject({
      directory: projectName,
      dbConnectionString,
      admin: {
        email: adminEmail,
        password: adminPass,
      },
      seed,
      spinner,
    })
  } catch (e) {
    logMessage({
      message: `An error occurred while preparing project: ${e}`,
      type: "error",
    })
  }

  logMessage({
    message: "✓ Project Prepared",
    type: "success",
  })

  // close db connection
  await client?.end()
  spinner.stop()

  // start backend
  logMessage({
    message: "Starting Medusa...",
  })

  try {
    startMedusa({
      directory: projectName,
    })
  } catch (e) {
    logMessage({
      message: `An error occurred while starting Medusa`,
      type: "error",
    })
  }

  waitOn({
    resources: ["http://localhost:9000/health"],
  }).then(() => open("http://localhost:9000/app"))
}
