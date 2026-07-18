# University compatibility diagnostics

The app can collect a privacy-safe structural trace when authentication at an
untested university fails because its Neptun deployment differs from the
compiled contract. Wrong credentials, connectivity failures, `5xx` responses,
and server-provided error messages do not open Compatibility Mode.

## Privacy contract

- PostHog uses one random installation identity. A Neptun code is never passed
  to `identify` or used as `distinct_id`, and logout preserves the installation
  identity.
- Enhanced login diagnostics are buffered in memory until the user accepts the
  Hungarian consent prompt. Declining deletes the buffer. Changing the setting
  later affects future attempts and does not retract already queued events.
- A trace contains institution and compiled-strategy metadata, static operation
  names, HTTPS host/path and query-key names, response status/content type,
  duration, sanitized redirect metadata, normalized error codes, and a capped
  response schema signature. It never contains request/response values.
- A UUID is generated for each attempt and retained locally through challenges;
  PostHog receives only a SHA-256-derived correlation value, never the raw GUID.
- `before_send` fails closed for diagnostic events containing credential/token
  keys, GUID values, raw URLs, query values, fragments, headers, bodies, HTML,
  cookies, or authorization data.
- Session replay, touch capture, and automatic lifecycle capture are disabled;
  person profiles are configured as `never`.

The native compatibility probe is an incognito WebView rooted at the HTTPS
directory that contains the configured `MobileService.svc`. It allows HTTPS SSO
navigation, blocks every other scheme, injects no JavaScript, and reads no form
field or page content. Only deduplicated host/path/query-key navigation metadata,
HTTP/load errors, and callback-shape signals are recorded. The web build does not
run this probe.

## PostHog feature flag

Create a remotely evaluated feature flag with the key
`university-auth-strategies`. Use a JSON payload with this exact schema:

```json
{
  "schemaVersion": 1,
  "revision": "2026-07-17.1",
  "institutions": {
    "FI12345": {
      "strategy": "modern-credentials",
      "status": "testing"
    }
  }
}
```

Allowed strategies are `legacy-mobile-service`, `modern-credentials`, and
`compiled-external`. Allowed statuses are `untested`, `testing`, and `verified`.
The payload is strict: URLs, headers, request bodies, JavaScript, and parsers are
rejected. `modern-credentials` derives `/api` from the institution's shipped
HTTPS `MobileService.svc` URL on the same origin. `compiled-external` works only
for an institution in the app-shipped allowlist.

BME (`FI23344`) and ELTE (`FI80798`) are hardcoded as verified and take
precedence over the flag. A valid remote assignment is next; the legacy mobile
service is the final default. Cached payloads are loaded at startup, refreshed
anonymously in the background, and an already-running refresh can delay login by
at most two seconds.

## PostHog operational setup

Complete these project-side steps in the PostHog project that owns the mobile
project key:

1. Create the feature flag above and initially limit changes to internal/test
   cohorts.
2. Create a dashboard from `university_compatibility_issue`, grouped by
   `institution_id`, with breakdowns for `strategy`, `failure_stage`, `reason`,
   and `config_revision`.
3. Add an email alert for a new `university_compatibility_issue`, including the
   institution and failure reason in the alert context.
4. Set enhanced diagnostic event retention to 30 days for
   `university_login_diagnostic_step` and `university_compatibility_issue`, using
   the project's data-retention or scheduled-deletion controls.
5. Restrict dashboard and raw-event access to the maintainers who diagnose
   authentication compatibility.

These settings are external PostHog project configuration and are not carried by
the application bundle.

## Unattended incident workflow

1. Open the compatibility issue and filter both diagnostic event types by its
   `attempt_id` and `institution_id`; sort steps by `step_index`.
2. Compare the endpoint/status/content-type sequence and schema signature with a
   verified legacy or modern flow. No user message, token, or response value is
   expected or needed.
3. If an already compiled strategy matches, assign it with status `testing` and
   increment `revision`. Invalid assignments are ignored and produce
   `compatibility_config_rejected` with a reason only.
4. Confirm a later anonymous attempt succeeds, then change the status to
   `verified`. If the trace indicates a novel SSO protocol or parser, implement
   and ship it in a new app release before it can be remotely selected.

The first failing user is not guaranteed to sign in through the probe. The goal
is enough sanitized structural evidence to make the next compatible release or
strategy assignment succeed.
