/** Workflow policy coverage using the pinned content toolchain's YAML parser. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(new URL("../thally-tooling/package.json", import.meta.url));
const { parse } = require("yaml");
const workflow = parse(readFileSync(".github/workflows/ci.yml", "utf8"));


test("merge groups compare against their actual base before selecting content-only CI", () => {
  const plan = workflow.jobs.verify.steps.find((step) => step.id === "plan");
  assert.equal(plan.env.BASE_SHA, "${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha || inputs.base_sha }}");
  assert.equal(workflow.on.merge_group, null);
  assert.match(workflow.jobs.verify.if, /automation\/thally-framework-/);
});

test("candidate content validation is unconditional and full validation retains provenance and artifact checks", () => {
  const steps = workflow.jobs.verify.steps;
  assert.equal(steps.find((step) => step.name === "Check authored content").if, undefined);
  for (const name of ["Verify generated runtime snapshot", "Test", "Build managed runtime and content assets", "Verify managed content artifact"]) {
    assert.equal(steps.find((step) => step.name === name).if, "steps.plan.outputs.full == 'true'", name);
  }
});
