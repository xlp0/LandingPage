# ZITADEL Metrics Report

**Report Date:** 2026-01-15  
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
    title "Registered Users Over Time"
    x-axis [0h, 4h, 8h, 12h, 16h, 20h, 24h]
    y-axis "Users"
    line [1063, 1063, 1063, 1063, 1063, 1063, 1063]
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
    bar [0, 0, 0, 0, 0, 0, 0]
```

### Event Details

| Event Type | Count | Description |
|------------|-------|-------------|
| **oidc_session.access_token.added** | 0 | OAuth access tokens issued |
| **oidc_session.added** | 0 | New sessions created |
| **user.human.externallogin.check.succeeded** | 0 | External IDP login success |
| **user.human.mfa.init.skipped** | 0 | MFA initialization skipped |
| **user.human.mfa.otp.added** | 0 | MFA OTP configured |
| **user.human.password.check.succeeded** | 0 | Password authentication success |
| **user.token.v2.added** | 0 | API tokens created |

### Event Breakdown

```mermaid
%%{init: {'theme':'dark'}}%%
pie title "Event Type Distribution"
    "Access Token" : 0
    "Session" : 0
    "External Login" : 0
    "MFA Skip" : 0
    "MFA OTP" : 0
    "Password Check" : 0
    "Token V2" : 0
```

---

## Summary

### Key Metrics

| Metric | Value |
|--------|-------|
| **Total Users** | 1.06k |
| **Total Events (24h)** | 0 |
| **Most Common Event** | No events recorded |
| **Data Points Collected** | 1441 |

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

- **Collection Period:** 2026-01-14 10:53 to 2026-01-15 10:53
- **Data Source:** Prometheus via Grafana API
- **Storage:** MinIO bucket `pkc/grafana-metrics/2026-01-15/`