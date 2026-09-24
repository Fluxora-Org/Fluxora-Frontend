# Loading retry cutoff

The loading surfaces share `MAX_LOADING_RETRIES` (three attempts) and
`LoadingRetryState` from `Skeleton.tsx`. Data hooks expose `retryCount`; after
the cutoff, the page renders an assertive error state with a manual **Try
again** action. A manual retry starts a new request and keeps the same shared
counter, so a persistently unavailable service cannot leave a skeleton on
screen indefinitely.
