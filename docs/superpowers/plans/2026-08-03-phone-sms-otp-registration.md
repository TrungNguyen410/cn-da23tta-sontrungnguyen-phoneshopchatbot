# Phone Registration with SMS OTP Plan

**Goal:** Keep phone-only registration and password recovery, remove Zalo ZBS, and label the verification channel as SMS.

## Constraints

- Real SMS is a paid external service; this repository must not pretend a real message was sent when no provider exists.
- Development and frontend mock mode may expose a debug OTP for a free class-project demo.
- Production must fail closed until a real SMS provider is explicitly integrated.
- OTPs remain hashed, expire after ten minutes, allow at most five verification attempts, and are consumed once.

## Implementation

1. Replace new verification records using channel `zalo` with `sms`.
2. Remove ZBS credentials, HTTP client, provider tests and deployment variables.
3. Keep a development-only SMS simulation behind `otpDeliveryService`.
4. Replace Zalo authentication wording in the API documentation, UI, mocks and tests.
5. Run backend tests plus frontend tests, lint and production build; review the diff for leaked Zalo auth configuration.
