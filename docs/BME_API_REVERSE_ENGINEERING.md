# BME Neptun read API reverse engineering

Reverse engineered on 2026-07-11 from:

- `GreGamingHUN/Neptun-API` at commit `f961f53`
- the JavaScript bundles served by BME's current Neptun web client

No credentials, access tokens, cookies, or personal response data are stored here.

## Executive summary

The upstream repository documents a legacy mobile RPC service. Although its
operations are named `Get...`, every request is an HTTP `POST` with credentials
in the JSON body. The BME URL in `Institutes.json` is no longer a working WCF
mobile service:

```text
https://neptun.bme.hu/hallgatoi/MobileService.svc/GetPeriodTerms
```

On BME it returns HTTP 404. The path now falls through to the current Neptun web
application.

The current application exposes a conventional JSON API:

```text
https://neptun.bme.hu/hallgatoi/api/
```

Its read operations really are HTTP `GET` requests. Authentication is a `POST`
that returns a bearer access token and also uses cookies. This is the useful API
surface for a new read-only client, but it is private and undocumented, so every
contract must be treated as unstable.

## Authentication

### Login request

```http
POST /hallgatoi/api/Account/Authenticate
Content-Type: application/json
```

```json
{
  "userName": "ABC123",
  "password": "...",
  "subtituteGUID": "",
  "captcha": "",
  "captchaIdentifier": "",
  "token": "",
  "LCID": 1038
}
```

`subtituteGUID` is misspelled in the official client and must remain so. The
response may require a CAPTCHA (`isCaptchaRequired`) or a second factor
(`isTwoFactorRequired`). A successful response contains at least an
`accessToken` and `refreshTokenExpiration`.

### Authenticated requests

The official client sends both:

```http
Authorization: Bearer <access token>
Cookie: <cookies set by the server>
```

It refreshes tokens with:

```http
POST /hallgatoi/api/Account/GetNewTokens
```

and logs out with:

```http
POST /hallgatoi/api/account/logout
```

The access token is refreshed roughly 30 seconds before JWT expiry. An Expo
client should keep passwords and tokens in `expo-secure-store`, never
AsyncStorage, source code, logs, analytics, or crash reports.

## Public discovery call

This call works without authentication and confirms the deployed API/version:

```http
GET /hallgatoi/api/General/EnvironmentData
```

The envelope is generally shaped as:

```ts
type ApiEnvelope<T> = {
  data: T;
  notification?: unknown;
};
```

## Multi-institution unauthenticated verification

The following production student APIs were probed without credentials on
2026-07-11. `General/EnvironmentData` returned HTTP 200 and supplied the
institution code and deployed version shown below. The other three routes were
checked only for route presence: an empty `POST Account/Authenticate` reached
the API and returned HTTP 400, while unauthenticated `GET UserInfo` and `GET
MyTrainings` reached an authentication boundary. This does **not** validate
login, request or response contracts, authorization behavior after login, or
compatibility of any authenticated feature.

| Institution | Current API base | Institution code | Deployed version | Verification level |
| --- | --- | --- | --- | --- |
| ELTE | `https://hallgato2.neptun.elte.hu/api/` | `ELTE` | `2026.1.19` | Public metadata and route presence; protected reads redirect |
| BGE | `https://neptun16.uni-bge.hu/hallgato/api/` | `BGE` | `2026.1.13` | Public metadata and route presence |
| Corvinus | `https://neptun3r.web.uni-corvinus.hu/Hallgatoi/api/` | `CORVINUS` | `2026.1.19` | Public metadata and route presence |
| Semmelweis | `https://neptunweb.semmelweis.hu/hallgato/api/` | `SE` | `2026.1.19` | Public metadata and route presence |
| SZTE | `https://neptun.szte.hu/hallgato/api/` | `SZTE` | `2026.1.16` | Public metadata and route presence |
| PTE | `https://neptun-web3.tr.pte.hu/hallgato/api/` | `PTE` | `2026.1.19` | Public metadata and route presence |
| Miskolc | `https://neptunweb1.uni-miskolc.hu/hallgato_ng/api/` | `ME` | `2026.1.13` | Public metadata and route presence |
| SZE | `https://neptun-hweb.sze.hu/hallgato_ng/api/` | `SZE` | `2025.3.28` | Public metadata and route presence; 2FA required for login |
| Debrecen | `https://www-h-ng.neptun.unideb.hu/hallgato_ng/api/` | `DE` | `2026.1.19` | Public metadata and route presence; 2FA required for login |

For each base, the verified route names are
`General/EnvironmentData`, `Account/Authenticate`, `UserInfo`, and
`MyTrainings`. Only `General/EnvironmentData` was exercised successfully as a
public data endpoint. The other responses establish that the routes exist, not
that their authenticated behavior matches BME.

ELTE differs from the other probes: its environment response advertises
`https://neptun.elte.hu` as `loginUrl`, and unauthenticated protected reads were
redirected there (HTTP 302) instead of returning HTTP 401. A client must follow
ELTE's redirect-based authentication flow rather than assuming the BME login
contract. SZE and Debrecen are known to require two-factor authentication;
neither 2FA flow was exercised by these unauthenticated probes.

The Miskolc, SZE, and Debrecen entries intentionally use the current
`hallgato_ng/api/` deployments. Their legacy hosts or `hallgato/api/` paths are
not interchangeable with these verified bases.

## High-value read-only endpoints

These were extracted from BME's deployed web client. Parameters shown as
`request` or `filter` are serialized into query parameters by the Angular
client; nested values should be verified against captured browser traffic.

| Area | Method and path | Known input/notes |
| --- | --- | --- |
| Trainings | `GET MyTrainings` | Returns training name, level, code, faculty and `studentTrainingId` |
| User | `GET UserInfo` | Loaded after authentication |
| Terms | `GET Advancement/GetStudentTrainingTerms` | Student's terms |
| Taken subjects | `GET TakenSubjects/GetTakenSubjects` | `request.termId` |
| Taken subjects/history | `GET Advancement/GetStudentTakenSubjectsByTerm` | Grid filter plus paging/sort |
| Subject registration terms | `GET SubjectApplication/Terms` | Terms available to subject-registration UI |
| Subject types | `GET SubjectApplication/SubjectTypes` | No known input |
| Subject search | `GET SubjectApplication/GetSubjectsCourses` | Filter/paging object; includes subjects and courses |
| Scheduled courses | `GET SubjectApplication/GetScheduledCourses` | `request.termId` |
| Curricula | `GET Curriculum/GetStudentCurriculumTemplates` | Contract needs authenticated capture |
| Curriculum subjects | `GET Curriculum/GetCurriculumSubjectsByTermData` | Contract needs authenticated capture |
| Calendar | `GET Calendar/GetCalendarEvents` | Date/type/filter object |
| Calendar trainings | `GET Calendar/GetStudentTrainings` | No known input |
| Messages | `GET Message/GetReceivedMessages` | Filter plus `firstRow`, `lastRow`, sort property |
| Sent messages | `GET Message/GetSentMessages` | Filter/paging object |
| Unread count | `GET Message/GetUnreadedMessagesCount` | Response data contains `count` |
| Message posts | `GET Messages/{messageId}/Posts` | Path parameter `messageId` |
| Mandatory messages | `GET Messages/Mandatories` | No known input |
| Exam dashboard | `GET ExamOverview/GetDashboardExamEntries` | No known input |
| Actual-term exams | `GET ExamOverview/GetDashboardActualTermExamEntries` | No known input |
| Available exam count | `GET ExamOverview/GetAvailableExamsCount` | No known input |
| Exam list | `GET ExamRegistration/GetExamsList` | Filter plus paging/sort |
| Results | `GET Tasks/GetMidTermTaskResults` | Contract needs authenticated capture |
| Finances | `GET FinancialItem/GetStudentImpositions` | `request` plus `sortAndPage` |
| Finance detail | `GET FinancialData/GetStudentPayInImpositionDetails` | `impositionId` |

## Live validation results

Validated against a BME student account on 2026-07-11. Only HTTP status,
collection sizes, and schema keys were inspected; personal field values were
not retained.

| Endpoint | Status | Observed `data` contract |
| --- | --- | --- |
| `Account/Authenticate` | 200 | `accessToken`, `neptunCode`, `refreshTokenExpiration`, CAPTCHA/2FA flags |
| `UserInfo` | 200 | `name`, `neptunCode`, `studentTrainingId`, `userStatus`, token-registration/avatar fields |
| `MyTrainings` | 200 | Array; `studentTrainingId`, `trainingName`, `trainingLevel`, `code`, `faculty`, `actualTermId`, status/date/language fields |
| `Advancement/GetStudentTrainingTerms` | 200 | Array of `{ text, value }` |
| `SubjectApplication/Terms` | 200 | Array of `{ text, value, creditSum, isActualTerm }` |
| `Calendar/GetStudentTrainings` | 200 | Array of training ID/name/current-training records |
| `Calendar/GetCalendarEvents` | 200 | Event array; IDs, name, start/end, event type, term and related subject/course fields |
| `Message/GetUnreadedMessagesCount` | 200 | `{ count }` |
| `Message/GetReceivedMessages` | 200 | `{ isCommunicationEnabled, messagePrintFormType, receivedMessages }` |
| `Message/GetSentMessages` | 200 | `{ isCommunicationEnabled, messagePrintFormType, messages }` |
| `ExamOverview/GetAvailableExamsCount` | 200 | Exam count, exam-period flags and upcoming start |
| `ExamOverview/GetDashboardExamEntries` | 200 | Array of `{ entryCount, term, termId }` |
| `ExamOverview/GetDashboardActualTermExamEntries` | 200 | `{ allExamsCount, examResultsCount }` |
| `ExamOverview/GetDashboardExamEntriesInActualTerm` | 200 | Upcoming exam count and block-data list |
| `Advancement/GetTermAveragesByTraining` | 200 | Labels, default term, terms and averages by training |
| `TakenSubjects/GetTakenSubjects` | 400 | `request.termId` alone is insufficient; additional request fields are required |

`Message/GetReceivedMessages?firstRow=0&lastRow=10` returned 11 records, which
indicates that `lastRow` is an inclusive index rather than a page size.

The curated, app-relevant static GET inventory is in
[`BME_GET_ENDPOINTS.txt`](./BME_GET_ENDPOINTS.txt). It includes administrative
and write-adjacent screens and is not an endorsement to call everything.

## Legacy-to-current migration map

| Legacy RPC | Current candidates |
| --- | --- |
| `GetTrainings` | `GET MyTrainings` |
| `GetPeriodTerms` | `GET Advancement/GetStudentTrainingTerms`, `GET SubjectApplication/Terms` |
| `GetAddedSubjects` | `GET TakenSubjects/GetTakenSubjects`, `GET Advancement/GetStudentTakenSubjectsByTerm` |
| `GetSubjects` + `GetCourses` | `GET SubjectApplication/GetSubjectsCourses` |
| `GetCalendarData` | `GET Calendar/GetCalendarEvents` |
| `GetMessages` | `GET Message/GetReceivedMessages` |
| `GetSentMessages` | `GET Message/GetSentMessages` |
| `GetExams` | `GET ExamRegistration/GetExamsList` and `ExamOverview/*` |
| `GetCurriculums` | `GET Curriculum/GetStudentCurriculumTemplates*` |

## Expo architecture recommendation

Do not call Neptun from normal React components. Put the private API behind a
small typed adapter so endpoint churn and Neptun-specific serialization remain
isolated:

```text
screens/hooks -> domain repositories -> BmeNeptunClient -> fetch
                                      -> SecureStore token repository
```

Enforce read-only behavior structurally: expose only `get` methods from the
application-facing client. Keep authentication, token refresh, CAPTCHA/2FA and
logout in a separate session service. Do not expose arbitrary paths or a generic
`post()` method to feature code.

## Verification status and next capture

- Confirmed live: authentication and the endpoints listed in **Live validation
  results** above.
- Confirmed from deployed code: login body, bearer-token interceptor, cookie
  use, refresh endpoint, and the endpoint inventory.
- Confirmed obsolete on BME: legacy `MobileService.svc/GetPeriodTerms` RPC.
- Partially verified: authenticated response schemas. Exact nested query-string
  serialization still needs capture for filter-heavy subject and exam lists.
- No credentials, tokens, cookies, or personal response values were written to
  the repository.

With valid credentials, capture one request per high-value screen in browser
developer tools, redact tokens and personal values, then turn the observed
request/response bodies into TypeScript fixtures and contract tests.
