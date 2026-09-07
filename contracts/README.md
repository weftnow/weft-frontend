# Shared contract fixtures

OpenSpec `improve-matching-reliability`, task 1.3.

These files are the matching contract written down once, as payloads rather
than as prose. **An identical copy lives in `weft-web` at `contracts/`, and the
two must stay byte-for-byte the same.** Each repository parses them with its
own models — Pydantic here, Zod there — and asserts the same accept/reject
verdict on every case. A change that one side accepts and the other rejects
fails a test in whichever repository is behind, which is the whole point: the
two schemas are written twice and can drift, so something has to hold them
together.

To check they match:

```sh
diff -r contracts ../web-frontend/contracts
```

## Layout

One file per contract. `contract` names it, and each repository maps that name
to its own model:

| file              | this repo                                    | `weft-web`             |
| ----------------- | -------------------------------------------- | ---------------------- |
| `status.json`     | `MatchingRunOut`                             | `matchingRunSchema`    |
| `lock.json`       | `LockAcceptedOut`                            | `lockAcceptedSchema`   |
| `groups.json`     | `list[DashboardGroupOut]`                    | `groupListSchema`      |
| `failure.json`    | `MatchingFailureOut`                         | `matchingFailureSchema`|
| `public_error.json` | `PublicErrorOut`                           | `publicErrorSchema`    |

Every case carries a `why`, so a failure names the scenario rather than
printing a payload and leaving the reader to work out what was being asserted.

## Writing a case

`valid` cases must be payloads the backend can actually emit. `invalid` cases
must be rejected for the reason `why` states, not incidentally — if you add an
invalid case, check it fails for the field you meant, because a case that is
malformed in two ways still passes while the rule you care about is broken.

## One known asymmetry

Pydantic coerces where Zod refuses: `"true"` becomes a boolean, a Unix
timestamp integer becomes a datetime, `"3"` becomes an integer. So a payload
that is wrongly *typed* may pass here and fail in `weft-web`, and no fixture
below asserts on one.

That gap is deliberate and it is not worth closing. These are response models:
the backend is the only thing that ever writes them, and it writes real
booleans, real integers and ISO strings with an offset. Tightening the Python
side into strict mode to win a test would change how every endpoint in tasks
2.x serializes, which is a real cost paid for a case that cannot occur.

What the fixtures do assert on is everything that *can* differ in practice —
missing fields, unknown enum variants, out-of-range numbers, malformed
references, and the cross-field rules that make each lifecycle state mean one
thing.
