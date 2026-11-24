# AI Usage Declaration --- TriageSync

## 1. AI Tool Used

-   OpenAI ChatGPT: coding assistance, debugging, testing guidance, deployment support and documentation drafting.

## 2. Scope of Assistance

ChatGPT was used to:

-   Understand project requirements and plan implementation tasks.
-   Generate and revise React pages for resource management, bookings and administrative analytics.
-   Generate and correct frontend routing and navigation.
-   Assist with backend development and troubleshooting.
-   Explain concurrency tests and interpret their results.
-   Provide Git commands and deployment configuration for Vercel, Render and Neon PostgreSQL.
-   Diagnose environment variable, filename casing and CORS errors.

AI-generated code and recommendations were integrated and tested during development. Functional testing, concurrency testing and deployment verification were performed to evaluate the application's behaviour.

## 3. Verification and Correction of AI Suggestions

### Analytics rendering

An initial AI-generated analytics component converted nested statistics objects into strings, causing `[object Object]` to appear in the dashboard. Browser testing exposed the issue. The component was revised to iterate over nested statistics and display their individual counts. The revised page was tested locally.

### Case-sensitive filename error

The frontend built locally on Windows but failed on Vercel because `TIcketDetailPage.jsx` did not match the import `TicketDetailPage.jsx`. The filename tracked by Git was checked using `git ls-files`. A two-step Git rename corrected the capitalization, and the frontend was subsequently deployed.

### CORS configuration

The deployed frontend initially could not reach the backend. Browser console output showed that the allowed origin included a trailing slash. The Render `CORS_ORIGIN` value was corrected to `https://traigesync-web.vercel.app`, without the trailing slash. Successful live operation was subsequently reported.

## 4. Testing Evidence

The following concurrency test results were recorded during local testing:

``` text
Test 1 - same slot x10 : { '201': 1, '409': 9 }
Test 2 - 3-booking limit : { '201': 3, '409': 7 }
PASS
```

Booking creation, approval, rejection, cancellation and frontend role protection were also exercised during development. Deployment was tested through the live frontend. These observations do not establish that every possible edge case has been independently verified.

## 5. Declaration and Limitations

AI-generated code and recommendations were incorporated into the project and tested during development. AI assistance does not replace the need to understand the implementation, verify security and correctness, and review the final documentation.

This declaration records ChatGPT assistance evidenced by the development conversation. Any additional AI tools used must be added by the project owner before treating this declaration as complete. No unprovided benchmark measurements or unsupported claims of independent authorship are made.
