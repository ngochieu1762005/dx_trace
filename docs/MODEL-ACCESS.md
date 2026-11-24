# Model-specific record access

Existing models retain their legacy all/own scopes. A model may optionally declare permissions.scopeByRole, for example {"manager":"own","warehouse":"all"}. This mapping is limited to existing read-authorized roles; the workspace owner retains full access to models they can read. Unknown roles, owner overrides and invalid scopes are rejected.

Explicit own means only records created by the authenticated actor, including for managers. Explicit all means all records within that workspace/model. The policy is enforced by record listing before pagination/counts, data quality aggregates, mutation authorization, task projection and the quality escalation bridge. It does not create new roles or map Keycloak groups. Existing workflow role checks, different-actor guards and tenant isolation remain in force.

A manager restricted to own records cannot approve another person's record even if a transition lists manager; design approval responsibilities accordingly. The owner may review or change the schema using the existing audited model plan/apply flow. This is not department-based access or an arbitrary policy language.
