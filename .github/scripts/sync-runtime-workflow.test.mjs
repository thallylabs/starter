/** Structural release-safety tests for the generated starter synchronization. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse } from 'yaml'

const workflow = parse(
  readFileSync('.github/workflows/sync-runtime.yml', 'utf8'),
)

test('rejects customer copies before requesting the release environment or tokens', () => {
  assert.equal(workflow.jobs.sync.if, "github.repository == 'thallylabs/starter'")
})

test('uses a narrowed destination App token for repository writes', () => {
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assert.equal(workflow.jobs.sync.environment, 'release-control')
  assert.doesNotMatch(JSON.stringify(workflow), /THALLY_AGENT_TOKEN/)
  assert.doesNotMatch(JSON.stringify(workflow), /STARTER_SYNC_PR_TOKEN/)
  const tokenStep = workflow.jobs.sync.steps.find(
    (step) => step.name === 'Mint the destination PR token',
  )
  assert.match(tokenStep.uses, /actions\/create-github-app-token@[0-9a-f]{40}/)
  assert.equal(tokenStep.with['permission-actions'], 'read')
  assert.equal(tokenStep.with['permission-contents'], 'write')
  assert.equal(tokenStep.with['permission-pull-requests'], 'write')
})

const mergeStep = workflow.jobs.sync.steps.find(
  (step) => step.name === 'Merge after CI succeeds',
)
/** Position of a required fragment in the merge script; fails when absent. */
function mergeOffset(pattern) {
  const match = pattern.exec(mergeStep.run)
  assert.ok(match, `merge step is missing ${pattern}`)
  return match.index
}

test('auto-merges only after CI verifies the exact pull-request head', () => {
  assert.equal(
    mergeStep.if,
    "inputs.auto_merge && github.actor == vars.RELEASE_COORDINATOR_ACTOR && steps.pull-request.outputs.changed == 'true'",
  )
  assert.match(mergeStep.run, /--workflow ci\.yml/)
  assert.match(mergeStep.run, /select\(\.headSha == \\"\$head_sha\\"\)/)
  assert.match(mergeStep.run, /gh run watch "\$run_id" --exit-status/)
  assert.match(mergeStep.run, /base_sha.*EXPECTED_BASE_SHA/)
  assert.match(mergeStep.run, /current_base.*commits\/main/)
  assert.match(mergeStep.run, /current_base.*EXPECTED_BASE_SHA/)
  assert.match(mergeStep.run, /final_base.*EXPECTED_BASE_SHA/)
  assert.match(mergeStep.run, /"\$final_head" != "\$head_sha"/)
})

test('advances main only by fast-forward to the commit CI verified', () => {
  // A squash merge would publish a commit that no check ran on and whose SHA
  // the release controller could not know in advance.
  assert.doesNotMatch(mergeStep.run, /gh pr merge|--squash|--rebase|--merge\b/)
  assert.doesNotMatch(mergeStep.run, /force=true|--force|push/)

  // The pull request must be the single commit this run generated on the
  // checked base, so base -> head is the only fast-forward GitHub can accept.
  assert.match(mergeStep.run, /generated_sha="\$\(git rev-parse HEAD\)"/)
  assert.match(mergeStep.run, /git rev-list --parents -n 1 HEAD/)
  assert.match(
    mergeStep.run,
    /"\$head_sha" != "\$generated_sha" \|\| "\$generated_parents" != "\$EXPECTED_BASE_SHA"/,
  )

  const update = mergeOffset(
    /gh api --method PATCH "repos\/\$GITHUB_REPOSITORY\/git\/refs\/heads\/main" \\\n\s+-f sha="\$head_sha" \\\n\s+-F force=false/,
  )
  // Every verification precedes the one write to main.
  for (const check of [
    /gh run watch "\$run_id" --exit-status/,
    /"\$current_base" != "\$EXPECTED_BASE_SHA" \|\| "\$final_base" != "\$EXPECTED_BASE_SHA"/,
    /"\$final_head" != "\$head_sha"/,
    /"\$head_sha" != "\$generated_sha"/,
  ]) {
    assert.ok(mergeOffset(check) < update, `${check} must run before main moves`)
  }
  // The result is confirmed rather than assumed.
  assert.ok(mergeOffset(/"\$merged_main" != "\$head_sha"/) > update)
  assert.equal(
    mergeStep.run.match(/--method (?:PATCH|PUT|POST)/g).length,
    1,
    'the fast-forward is the only ref update',
  )
})

test('deletes the synchronization branch only after main holds the verified commit', () => {
  const update = mergeOffset(/git\/refs\/heads\/main/)
  const merged = mergeOffset(/\[\[ "\$pr_state" == "MERGED" \]\] && break/)
  const removal = mergeOffset(
    /gh api --method DELETE "repos\/\$GITHUB_REPOSITORY\/git\/refs\/heads\/\$head_branch"/,
  )
  assert.ok(update < merged && merged < removal)
  // Only a generated synchronization branch can ever be deleted.
  assert.match(mergeStep.run, /"\$head_branch" =~ \^automation\/runtime-\[0-9a-f\]\{12\}\$/)
  // Cleanup after the irreversible step warns instead of failing the release.
  assert.match(mergeStep.run, /if ! gh api --method DELETE[^\n]*; then\n\s+echo "::warning::/)
})

test('keeps the pull-request step the release controller waits on', () => {
  const steps = workflow.jobs.sync.steps
  const open = steps.findIndex((step) => step.name === 'Open synchronization pull request')
  const merge = steps.findIndex((step) => step.name === 'Merge after CI succeeds')
  assert.ok(open >= 0 && merge === open + 1)
  assert.equal(steps[open].id, 'pull-request')
  assert.match(steps[open].run, /branch="automation\/runtime-\$\{SHORT_SHA\}"/)
  assert.match(steps[open].run, /changed=false/)
  assert.match(steps[open].run, /changed=true/)
})

test('reuses only an open pull request for the synchronization branch', () => {
  const open = workflow.jobs.sync.steps.find(
    (step) => step.name === 'Open synchronization pull request',
  )
  // The branch name is fixed per runtime commit. Looking the pull request up
  // by branch alone would return one that an earlier attempt left closed,
  // and that pull request can never merge.
  assert.doesNotMatch(open.run, /gh pr view/)
  assert.match(open.run, /--state open \\\n\s+--json number,url,isCrossRepository/)
  assert.match(open.run, /map\(select\(\.isCrossRepository == false\)\) \| \.\[0\] \/\/ empty/)
  const lookup = open.run.search(
    /pr_json="\$\(open_pull_request\)"\nif \[\[ -z "\$pr_json" \]\]; then\n\s+gh pr create/,
  )
  const guard = open.run.search(
    /if \[\[ ! "\$pr_number" =~ \^\[0-9\]\+\$ \]\]; then\n[^\n]*::error::[^\n]*\n\s+exit 1/,
  )
  const output = open.run.search(/number=\$pr_number" >> "\$GITHUB_OUTPUT"/)
  assert.ok(lookup >= 0 && lookup < guard && guard < output)
})

test('keeps manual dispatch safe and opt-in', () => {
  assert.equal(workflow.on.workflow_dispatch.inputs.auto_merge.default, false)
  assert.equal(workflow.on.workflow_dispatch.inputs.auto_merge.required, false)
  assert.match(workflow['run-name'], /inputs\.request_id/)
})
