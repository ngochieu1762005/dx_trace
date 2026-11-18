# Responsible disclosure and self-hosting security

DX-TRACE is open-source software. Its reference configuration is intended for use
with **your own domains, IP addresses, user accounts and infrastructure**.

## Never commit
- Live `.env` files, API keys, OIDC secrets, passwords or access tokens
- Private IP addresses, public hosting IPs, SSH keys, credentials or private DNS
- Customer, pharmacy, warehouse or production database snapshots
- Host-specific Caddy files, cloud provider information or raw troubleshooting logs

Use `selfhost/setup.mjs` for first-time configuration. Keep the generated
`selfhost/.env` only on your own server and include it in protected backups.
See `selfhost/DEPLOY_SAAS_UBUNTU.md` for the portable deployment example.

## Report a vulnerability or exposure

Do not post secrets, IPs or stack traces with credentials in public GitHub
issues. Use GitHub's private security advisory reporting when enabled, or
contact the maintainers using the repository's GitHub security/contact controls.

If secrets are ever committed: **rotate/revoke the credentials first**.
Deleting files or rewriting Git commits does not invalidate an exposed secret,
erase existing forks, or guarantee GitHub caches and external copies are removed.

## Git history cleanup

Git history rewrite is destructive to clone workflows, tags, PRs and release
archives. Coordinate with contributors and ensure backups before force-updating
refs. All release artifacts and public GitHub references must be audited
independently. Do not publish a release before validating its source archive.
