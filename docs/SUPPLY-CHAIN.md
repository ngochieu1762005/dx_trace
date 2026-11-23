# DX-TRACE software supply chain and verifiable releases

Status: **proposed for the next release after v0.0.6**. Previous release assets do not retroactively acquire an SBOM or attestation.

## Source of truth

The repository uses a pnpm lockfile, GitHub Actions, an MIT project license and separate third-party notices. The new CI job uses **Syft through Anchore SBOM Action**, pinned to a commit SHA, to inventory packages from the exact checked-out source and installed dependencies. The generated inventory is SPDX JSON, saved as the workflow artifact DX-TRACE.spdx.json.

The validator at tools/validate-sbom.mjs checks SPDX version, namespace and nonempty packages with identifiers, names and versions. A passing validator means the output has basic expected structure; it does **not** independently prove that every transitive dependency, native binary or Docker base layer is included.

## Future tagged releases

After code review and passing CI, the standard .github/workflows/release.yml will:

1. Checkout and verify the requested existing Git tag.
2. Build/test the exact tagged source and create its tar.gz.
3. Generate an SPDX SBOM using the same tagged checkout and validate it.
4. Append the SBOM SHA-256 to SHA256SUMS and publish both archive and SBOM.
5. Ask GitHub Attestations (Sigstore-backed) to record provenance of the source archive and a separate SBOM attestation.

The source archive is created with git archive; it is a tagged source snapshot, **not** a binary or independently audited production image.

## Verify a published release

Install the GitHub CLI (gh) and the platform's sha256sum utility. Download the source archive, DX-TRACE.spdx.json and SHA256SUMS from the **same** GitHub release, then run:

~~~bash
sha256sum -c SHA256SUMS
gh attestation verify DX-TRACE-vX.Y.Z.tar.gz -R ngochieu1762005/dx_trace
~~~

Replace vX.Y.Z with the exact newly published release tag. An attestation verification failure must be investigated, not ignored. On platforms without sha256sum use an equivalent SHA-256 verification tool.

## Important limits

- This is an inventory and integrity/provenance pipeline, **not** a guarantee that a package is free of vulnerabilities or license incompatibilities.
- The SBOM currently inventories the source checkout and installed npm dependencies; it is not a per-platform inventory of every running Docker image, Keycloak, Caddy or PostgreSQL.
- Base images still need digest pinning, CVE scanning, upgrade policy and runtime configuration review.
- Never call a release signed or verified until the corresponding GitHub workflow has actually passed and attestations can be independently retrieved.

See [DEPENDENCIES](../DEPENDENCIES.md), [third-party notices](../THIRD_PARTY_NOTICES.md), [security policy](../SECURITY.md) and [release workflow](../.github/workflows/release.yml).