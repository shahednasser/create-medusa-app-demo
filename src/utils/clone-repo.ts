import promiseExec from "./promise-exec.js"

type CloneRepoOptions = {
  directoryName?: string
  repoUrl?: string
  abortController?: AbortController
}

const DEFAULT_REPO =
  "https://github.com/medusajs/medusa-starter-default -b feat/onboarding"

export default async ({
  directoryName = "",
  repoUrl,
  abortController,
}: CloneRepoOptions) => {
  await promiseExec(`git clone ${repoUrl || DEFAULT_REPO} ${directoryName}`, {
    signal: abortController?.signal,
  })
}
