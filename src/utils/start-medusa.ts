import { exec } from "child_process"

type StartOptions = {
  directory: string
}

export default ({
  directory
}: StartOptions) => {
  const childProcess = exec('npx -y @medusajs/medusa-cli develop', {
    cwd: directory
  })

  childProcess.stdout?.pipe(process.stdout)
}