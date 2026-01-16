# ZITADEL Metrics Report

**Report Date:** 2026-01-16  
**Time Range:** 24h  
**Data Source:** ZITADEL Prometheus Metrics

---

## Total Users

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A[Total Registered Users<br/><b>1.06k</b>]
    
    style A fill:#2d5016,stroke:#4ade80,stroke-width:3px,color:#fff,font-size:18px
```

### User Trend (Last 24 Hours)

```mermaid
%%{init: {'theme':'dark'}}%%
xychart-beta
    title "Registered Users Over Time (Hourly)"
    x-axis [0h, 1h, 2h, 3h, 4h, 5h, 6h, 7h, 8h, 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h, 18h, 19h, 20h, 21h, 22h, 23h]
    y-axis "Users"
    line [1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063, 1063]
```

---

## Authentication Events

### Event Distribution

```mermaid
%%{init: {'theme':'dark'}}%%
xychart-beta
    title "Authentication Event Types (Last 24 Hours)"
    x-axis [Access Token, Session, External Login, MFA Skip, MFA OTP, Password Check, Token V2]
    y-axis "Event Count"
    bar [4, 4, 1, 1, 1, 1, 4]
```

### Event Details

| Event Type | Count | Description |
|------------|-------|-------------|
| **oidc_session.access_token.added** | 4 | OAuth access tokens issued |
| **oidc_session.added** | 4 | New sessions created |
| **user.human.externallogin.check.succeeded** | 1 | External IDP login success |
| **user.human.mfa.init.skipped** | 1 | MFA initialization skipped |
| **user.human.mfa.otp.added** | 1 | MFA OTP configured |
| **user.human.password.check.succeeded** | 1 | Password authentication success |
| **user.token.v2.added** | 4 | API tokens created |

### Event Breakdown

```mermaid
%%{init: {'theme':'dark'}}%%
pie title "Event Type Distribution"
    "Access Token" : 4
    "Session" : 4
    "External Login" : 1
    "MFA Skip" : 1
    "MFA OTP" : 1
    "Password Check" : 1
    "Token V2" : 4
```

---

## Summary

### Key Metrics

| Metric | Value |
|--------|-------|
| **Total Users** | 1.06k |
| **Total Events (24h)** | 16 |
| **Most Common Event** | Access Token |
| **Data Points Collected** | 25 |

### Timeline

```mermaid
%%{init: {'theme':'dark'}}%%
gantt
    title Event Activity Timeline (Last 24 Hours)
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Authentication
    Access Token Events    :done, t1, 00:00, 24h
    Session Events         :done, t2, 00:00, 24h
    External Login Events  :active, t3, 00:00, 24h
    MFA Events            :active, t4, 00:00, 24h
    Password Events       :crit, t5, 00:00, 24h
    Token Events          :done, t6, 00:00, 24h
```

---

## Notes

- **Collection Period:** 2026-01-15 11:32 to 2026-01-16 11:32
- **Data Source:** Prometheus via Grafana API
- **Storage:** MinIO bucket `pkc/grafana-metrics/2026-01-16/`