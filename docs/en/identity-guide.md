# Accounts and permissions

## Accounts

Keycloak authenticates, OAuth2 Proxy maintains the session, and Core authorizes workspace membership. Invite the exact email before first sign-in; otherwise a separate workspace may be created. Identity admin is not the same as workspace owner.

| Role | Typical scope |
| --- | --- |
| owner | Members, configuration, models and operations |
| manager | Approval and device management |
| warehouse | Receiving, delivery and permitted tasks |
| viewer | Read-only resources as allowed |

## Model scope

Read/create roles, all/own scope and optional scopeByRole restrict records. Owner overrides are not permitted. Test two real accounts and unauthorized actions.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/identity-guide.md).
