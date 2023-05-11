import inquirer from 'inquirer';
import slugifyType from 'slugify';
import chalk from 'chalk';
import pg from 'pg'
import createDb from '../utils/create-db.js';
import postgresClient from '../utils/postgres-client.js';
import cloneRepo from '../utils/clone-repo.js';
import prepareProject from '../utils/prepare-project.js';
import startMedusa from '../utils/start-medusa.js';
import open from 'open';
import waitOn from 'wait-on'
import formatConnectionString from '../utils/format-connection-string.js';
import ora from 'ora';
import { program } from 'commander';
import fs from "fs"
import { nanoid } from 'nanoid'

const slugify = slugifyType.default

export default async () => {
  const { projectName, postgresType } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: "What's the name of your project?",
      default: 'my-medusa-store',
      filter: (input) => {
        return slugify(input)
      },
      validate: (input) => {
        return fs.existsSync(input) ? "A directory already exists with the same name. Please enter a different project name." : true
      }
    },
    {
      type: 'list',
      name: 'postgresType',
      message: "Do you want to use a local or remote database?",
      choices: [
        {
          name: 'Local (Requires Postgres to be installed)',
          value: 'local'
        },
        {
          name: 'Setup Vercel Postgres',
          value: 'remote'
        }
      ]
    }
  ])

  let client: pg.Client | undefined
  let dbConnectionString = ""
  let postgresUsername = "postgres"
  let postgresPassword = ""

  if (postgresType === 'local') {
    //try to log in with default db username and password
    try {
      client = await postgresClient({
        user: postgresUsername,
        password: postgresPassword
      })
    } catch (e) {
      // ask for the user's credentials
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'postgresUsername',
          message: "Enter your Postgres Username",
          default: 'postgres'
        },
        {
          type: 'password',
          name: 'postgresPassword',
          message: 'Enter your Postgres Password'
        }
      ])
  
      postgresUsername = answers.postgresUsername
      postgresPassword = answers.postgresPassword
  
      try {
        client = await postgresClient({
          user: postgresUsername,
          password: postgresPassword
        })
      } catch (e) {
        //gracefully shut down
        program.error(
          chalk.bold.red(
            "Couldn't connect to PostgreSQL. Make sure you have PostgreSQL installed and the credentials you provided are correct.\n\n" + 
            "You can learn how to install PostgreSQL here: https://docs.medusajs.com/development/backend/prepare-environment#postgresql"
          )
        )
      }
    }
  }

  console.log(
    chalk.white('Create an admin user to access the admin dashboard after setup is complete.')
  )

  const { adminEmail, adminPass } = await inquirer.prompt([
    {
      type: 'input',
      name: 'adminEmail',
      message: "Enter your admin email",
      validate: (input) => {
        // TODO add email validation
        return typeof input === 'string' && input.length > 0
      }
    },
    {
      type: 'password',
      name: 'adminPass',
      message: 'Enter your admin Password',
      validate: (input) => {
        return typeof input === 'string' && input.length > 0
      }
    }
  ])

  const spinner = ora(chalk.white('Setting up project')).start()

  process.on("SIGTERM", () => spinner.stop())
  process.on("SIGINT", () => spinner.stop())

  // clone repository
  await cloneRepo({
    directoryName: projectName
  })

  if (client) {
    spinner.text = chalk.white('Creating database...')
    const dbName = `medusa-${nanoid(4)}`
    // create postgres database
    await createDb({
      client,
      db: dbName
    })
    // format connection string
    dbConnectionString = formatConnectionString({
      user: postgresUsername,
      password: postgresPassword,
      host: client.host,
      db: dbName
    })

    console.log(
      chalk.green(`\n✓ Database ${dbName} created`)
    )
  }

  spinner.text = chalk.white('Preparing project...')

  // prepare project
  await prepareProject({
    directory: projectName,
    dbConnectionString,
    admin: {
      email: adminEmail,
      password: adminPass
    },
    spinner,
  })

  console.log(
    chalk.green('✓ Project Prepared')
  )

  // close db connection
  await client?.end()
  spinner.stop()

  // start backend
  console.log(
    chalk.white('Starting Medusa...')
  )

  startMedusa({
    directory: projectName
  })

  waitOn({
    resources: [
      'http://localhost:9000/app'
    ]
  })
  .then(() => open('http://localhost:9000/app'))
}