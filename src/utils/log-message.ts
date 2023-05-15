import chalk from "chalk"
import { program } from "commander"

type LogOptions = {
  message: string
  type?: "error" | "success" | "info"
}

export default ({ message, type = "info" }: LogOptions) => {
  switch (type) {
    case "info":
      console.log(chalk.white(message))
      break
    case "success":
      console.log(chalk.green(message))
      break
    case "error":
      program.error(chalk.bold.red(message))
  }
}
