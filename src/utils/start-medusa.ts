import { exec } from "child_process"

type StartOptions = {
  directory: string
}

export default ({
  directory
}: StartOptions) => {
  const childProcess = exec('npx @medusajs/medusa-cli develop -y', {
    cwd: directory
  })

  childProcess.stdout?.pipe(process.stdout)
}