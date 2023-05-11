import promiseExec from "./promise-exec.js"

type CloneRepoOptions = {
  directoryName?: string
}

export default async ({
  directoryName = ''
}: CloneRepoOptions) => {
  await promiseExec(`git clone https://github.com/shahednasser/medusa-starter-default.git ${directoryName}`)
}