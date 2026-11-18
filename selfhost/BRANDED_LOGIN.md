# DX-TRACE branded Keycloak sign-in theme

DX-TRACE uses an original login theme that inherits Keycloak's stock secure forms. It is compatible with Keycloak `26.4.7`, ships no third-party scripts or fonts, and can be enabled on both the `warehouse` realm (end-user sign-in) and `master` realm (admin console).

The theme source is at `selfhost/themes/dxtrace/login/`. It uses stock Keycloak FreeMarker templates and only overrides the colors, backgrounds, labels, spacing, typography, and identity mark. All existing authentication flows remain Keycloak-managed.

## Install on an existing Ubuntu deployment

```bash
cd /path/to/dx-trace
git pull --ff-only
cd selfhost

# Confirm bind mount exists without printing .env secrets
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet

# Recreate ONLY the identity container so the new theme directory is mounted.
# Does not remove the database, identity realm, or app data.
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml up -d --no-deps --force-recreate identity

# Check that theme is visible inside Keycloak.
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml exec identity ls -l /opt/keycloak/themes/dxtrace/login/theme.properties
```

Then open `https://id.example.org/admin/` and log in with Keycloak admin credentials.

To apply the new login design to **DX-TRACE users**:

1. At the top of the Keycloak admin console, select the `warehouse` realm.
2. Navigate to **Realm settings → Themes**.
3. Set **Login theme = dxtrace** and click Save.
4. Open a private browser window and test a DX-TRACE login.

To change the **admin login from the screenshot**:

1. Switch the realm selector to **master**.
2. Go to **Realm settings → Themes**.
3. Set **Login theme = dxtrace** and Save.
4. Open `https://id.example.org/admin/` in an incognito window.

This affects the login screen for admins; it does not replace or skin the Keycloak admin console *after* login (that requires a separate `admin` theme).

### Troubleshooting

- No `dxtrace` choice: verify the mount with the command above, recreate identity and reload the admin page.
- Theme selected but unchanged: force refresh `Ctrl+Shift+R`, or open Incognito. In case of cached themes, restart `identity`; production mode caches resources by default.
- Missing CSS: inspect Network tab for `dxtrace.css` status; the path is relative to Keycloak's login resource URL.
- Emergency rollback: in realm settings, change Login theme to **keycloak**, Save. No account data is touched.
- Validate language selection: theme adds Vietnamese wording to the most common login labels; other Keycloak messages and flows remain inherited from stock Keycloak. For full Vietnamese localization enable localization in Realm settings and set supported locales.

This file is documentation for a running server. A repository commit on GitHub **does not** change live styles until `git pull`, container recreation, and realm theme selection have been performed.
