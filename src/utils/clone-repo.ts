import promiseExec from "./promise-exec.js"

type CloneRepoOptions = {
  directoryName?: string
  repoUrl?: string
  abortController?: AbortController
}

const DEFAULT_REPO =
  "https://github.com/shahednasser/medusa-starter-default.git"

export default async ({
  directoryName = "",
  repoUrl,
  abortController,
}: CloneRepoOptions) => {
  await promiseExec(`git clone ${repoUrl || DEFAULT_REPO} ${directoryName}`, {
    signal: abortController?.signal,
  })
}
