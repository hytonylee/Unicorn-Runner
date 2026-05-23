# Firebase Security Specification & TDD Payloads

## 1. Data Invariants
1. **Authentication Alignment**: A leaderboard entry can only be submitted (`create` operation) by a signed-in user, and the `userId` field inside the document must strictly match the writer's authenticated `request.auth.uid`.
2. **Immutability Constraint**: Leaderboard entries are *write-once*. Once written, they cannot be updated or modified by any user (`update` is disallowed).
3. **Type and Boundary Integrity**:
   - `score` must be a positive integer greater than or equal to 0, and not exceed practical maximums (e.g., 10,000,000).
   - `name` must be a string between 1 and 30 characters.
   - `level` must be an integer between 1 and 20.
   - `killedByAcronym` and `killedByName` must be matching, non-empty strings.
   - `date` must be a valid timestamp matched against the server's execution request time (`request.time`).
4. **ID Poisoning Guard**: Document ID must be a valid ID conforming to standard alphanumeric identifiers (`isValidId`).

---

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)

### 1. Unauthenticated Create
- **Payload**: `{"name": "Guest", "score": 250, "date": "request.time", "level": 1, "killedByAcronym": "HIPPO", "killedByName": "Hippo", "userId": "some-uid"}`
- **Context**: No authorization token supplied in the request.

### 2. Identity Spoofing (UID Mismatch)
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Hacker", "score": 9999, "date": "request.time", "level": 1, "killedByAcronym": "RHINO", "killedByName": "Rhino", "userId": "victim-uid"}`

### 3. State Poisoning: Massive Score Injection
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Hacker", "score": 999999999, "date": "request.time", "level": 1, "killedByAcronym": "RHINO", "killedByName": "Rhino", "userId": "actual-user"}`

### 4. Malformed Score: Score as String
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Hacker", "score": "nine thousand", "date": "request.time", "level": 1, "killedByAcronym": "RHINO", "killedByName": "Rhino", "userId": "actual-user"}`

### 5. Name Poisoning: Empty Name
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "", "score": 450, "date": "request.time", "level": 1, "killedByAcronym": "WOLF", "killedByName": "Wolf", "userId": "actual-user"}`

### 6. Name Poisoning: Name Too Large (1MB Buffer)
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "A...[10,000 characters]...", "score": 450, "date": "request.time", "level": 1, "killedByAcronym": "WOLF", "killedByName": "Wolf", "userId": "actual-user"}`

### 7. Temporal Spoofing: Arbitrary Historical Date
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Cheater", "score": 500, "date": "2020-01-01T00:00:00Z", "level": 1, "killedByAcronym": "RHINO", "killedByName": "Rhino", "userId": "actual-user"}`

### 8. State Shortcutting: Invalid Deep Level
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Legit", "score": 100, "date": "request.time", "level": 999, "killedByAcronym": "ZEBRA", "killedByName": "Zebra", "userId": "actual-user"}`

### 9. Write-Once Bypass: Any Score Update
- **Auth**: `{uid: "actual-user"}`
- **Original Document**: `{"name": "Vince", "score": 1500, "date": "request.time", "level": 3, "killedByAcronym": "HIPPO", "killedByName": "Hippo", "userId": "actual-user"}`
- **Attempted Update Payload**: `{"score": 99999}` (Or any change field)

### 10. Malicious Score Deletion
- **Auth**: `{uid: "random-user"}` (or even the entry owner)
- **Action**: Delete document on `/scores/{scoreId}`.

### 11. Junk characters ID Poisoning
- **Auth**: `{uid: "actual-user"}`
- **Target Document ID**: `some_wild_path!@#$%^&*()_+{}|:"<>?`-=[]\;',./`

### 12. Missing Schema Field (Missing Level)
- **Auth**: `{uid: "actual-user"}`
- **Payload**: `{"name": "Forgot Level", "score": 300, "date": "request.time", "killedByAcronym": "SEAGULL", "killedByName": "Seagull", "userId": "actual-user"}`
