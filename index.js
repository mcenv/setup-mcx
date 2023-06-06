// @ts-check

"use strict";

import * as core from "@actions/core";
import * as github from "@actions/github";
import { BuildTarget, PackageCache, Snapshot, submitSnapshot } from "@github/dependency-submission-toolkit";
import { PackageURL } from "packageurl-js";
import { readFile } from "fs/promises";

async function run() {
  try {
    // TODO: install mcx

    const pack = JSON.parse(await readFile("pack.json", "utf8"));
    const cache = new PackageCache();
    const target = new BuildTarget(pack.name, "pack.json");

    for (const key in pack.dependencies) {
      const triple = /^([^\/]+)\/([^@]+)@(.+)$/.exec(pack.dependencies[key]);
      if (triple === null) {
        throw new Error(`invalid dependency triple: ${pack.dependencies[key]}`);
      }
      const [_, owner, repository, tag] = triple;
      const purl = new PackageURL("github", owner, repository, tag, null, null);
      // TODO: indirect dependencies
      target.addBuildDependency(cache.package(purl));
    }

    const snapshot = new Snapshot(
      {
        name: "setup-mcx",
        url: "https://github.com/mcenv/setup-mcx",
        version: "0.1.0",
      },
      github.context,
      {
        correlator: `${github.context.job}-${pack.name}`,
        id: github.context.runId.toString(),
      }
    );
    snapshot.addManifest(target);

    submitSnapshot(snapshot, github.context);
  } catch (error) {
    core.setFailed(`${error}`);
  }
}

run();
