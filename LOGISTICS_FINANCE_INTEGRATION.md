## 🔗 LOGISTICS ↔ FINANCE INTEGRATION

### Overview
The Logistics service now sends real-time shipment data to the Finance service, which updates farmer credit scores (Agro-Scoring) based on export performance.

---

## 📊 DATA FLOW

```
Shipment Completed (Logistics)
    ↓
analyticsService.notifyShipmentCompletedToFinance()
    ↓
financeIntegrationService.notifyShipmentCompleted()
    ↓
POST /api/v1/credit/webhooks/shipment-completed (Finance)
    ↓
logisticsIntegrationService.handleShipmentCompletedWebhook()
    ↓
calculateAgroScoreAdjustment() → scoreToGradeAndLimit()
    ↓
Farmer's Agro-Score Updated ✅
Farmer's Credit Limit Unlocked 💳
```

---

## ⚙️ SHIPMENT COMPLETION WEBHOOK

### Request (Logistics → Finance)
```http
POST /api/v1/credit/webhooks/shipment-completed
Content-Type: application/json
X-API-Key: service-key-logistics

{
  "farmerId": "farmer-001",
  "shipmentId": "SH-2026-1001",
  "trackId": "TR-2026-1001",
  "completedAt": "2026-01-15T18:30:00Z",
  "status": "COMPLETED",
  "metrics": {
    "onTimeDelivery": true,
    "etaAtDate": "2026-01-15T00:00:00Z",
    "deliveredAtDate": "2026-01-14T16:45:00Z",
    "coldChainViolations": 0,
    "avgTemperature": 3.2,
    "maxTemperatureAllowed": 4,
    "distanceKm": 1250,
    "freightCost": 350
  }
}
```

### Response (Finance → Logistics)
```json
{
  "success": true,
  "message": "✅ Farmer's Agro-Score updated to 92 (A). New credit limit: 80,000,000 soʻm",
  "scoreUpdate": {
    "farmerId": "farmer-001",
    "scoreAdjustment": 45,
    "factors": {
      "onTimeBonus": 15,
      "coldChainPenalty": 20,
      "professionalismBonus": 10
    },
    "newScore": 92,
    "rationale": "✅ On-time delivery (+15 points); ❄️ Perfect cold chain compliance (+20 points); 📄 Complete documentation (+10 points)"
  },
  "creditInfo": {
    "grade": "A",
    "creditLimitUSD": 40_000,
    "creditLimitSom": 400_000_000,
    "interestRate": 7,
    "approvalSpeed": "1 hour"
  }
}
```

---

## 🎯 AGRO-SCORE ADJUSTMENT FACTORS

| Factor | Points | Condition |
|--------|--------|-----------|
| **On-Time Delivery** | +15 | Delivery date ≤ ETA |
| **Late Delivery** | -10 | Delivery date > ETA |
| **Perfect Cold Chain** | +20 | 0 temperature violations |
| **1 Cold Chain Violation** | -15 | Exactly 1 temp violation |
| **Multiple Violations** | -35 | 2+ temperature violations |
| **Complete Documentation** | +10 | All waybill/customs docs present |
| **Long-Distance Export** | +5 | Distance > 500 km |

---

## 💳 CREDIT GRADES & LIMITS

| Grade | Score | Credit Limit (soʻm) | Interest Rate | Approval |
|-------|-------|---|---|---|
| **A+** | 95-100 | 500,000,000 | 5% | Instant |
| **A** | 90-94 | 400,000,000 | 7% | 1 hour |
| **B** | 80-89 | 250,000,000 | 10% | 2 hours |
| **C** | 70-79 | 150,000,000 | 15% | 1 day |
| **D** | 60-69 | 50,000,000 | 20% | 2 days |
| **F** | <60 | 0 | N/A | Denied |

---

## 🔐 SERVICE-TO-SERVICE AUTHENTICATION

```typescript
// financeIntegrationService.ts
const API_KEY = process.env.SERVICE_API_KEY || 'service-key-logistics';

headers: {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json',
}
```

**Setup Required:**
```bash
# .env (Logistics service)
FINANCE_SERVICE_URL=http://localhost:3002
SERVICE_API_KEY=service-key-logistics

# .env (Finance service)
SERVICE_API_KEY=service-key-logistics
```

---

## 📈 MULTI-FACTOR AGRO-SCORE CALCULATION

Final Agro-Score is weighted average of 4 factors:

```
Agro-Score = (0.4 × SensorData) + (0.3 × FinancialHistory) + (0.2 × Logistics) + (0.1 × Market)
```

### 1. **Sensor Data (40%)**
- Device uptime
- Irrigation compliance
- Soil health consistency

### 2. **Financial History (30%)**
- Transaction history
- Payment timeliness
- Budget adherence

### 3. **Logistics Performance (20%)** ← NEW
- On-time delivery rate
- Cold chain compliance
- Export volume

### 4. **Market Intelligence (10%)**
- Crop quality ratings
- Buyer reputation
- Weather resilience

---

## 🚀 API INTEGRATION ENDPOINTS

### 1. Get Logistics Metrics (Finance → Logistics)
```http
GET /api/v1/logistics/reports/analytics/{farmerId}
```

### 2. Get Farmer's Credit Metrics (Finance)
```http
GET /api/v1/credit/metrics/logistics/{farmerId}
```

### 3. Check Logistics Health for Credit Eligibility
```http
GET /api/v1/logistics/credit-eligibility/{farmerId}
```

**Logic:** If cold chain compliance < 90%, farmer cannot apply for new credits until performance improves.

---

## 📝 EXAMPLE: FARMER'S FIRST EXPORT

### Day 1: Farmer Lists Gilos (20 tons)
- Marketplace creates shipment
- Logistics provides quote: "750,000 soʻm freight"

### Day 2: Shipment Completed Successfully
- ✅ On-time delivery (+15 points)
- ✅ Perfect cold chain (+20 points)
- ✅ Complete documentation (+10 points)
- **Total adjustment: +45 points**
- **New score: 75 + 45 = 120 → capped at 100**

### Day 2 (Later): Finance Service Notified
```json
{
  "success": true,
  "creditInfo": {
    "grade": "A+",
    "creditLimitSom": 500_000_000,
    "approvalSpeed": "instant"
  }
}
```

### Day 3: Farmer Unlocks Credit
- Dashboard shows new credit limit: **500M soʻm (Grade A+)**
- Farmer can now apply for credit instantly
- Bank approves within 5 minutes (vs. traditional 3-5 days)

---

## 🛡️ ERROR HANDLING

**If Finance webhook fails:**
- Logistics shipment completion is NOT blocked
- Finance update is retried 3x with exponential backoff
- Fallback: Manual sync via `/api/v1/logistics/reports/sync-finance/{farmerId}`

**If Logistics data unavailable:**
- Finance receives partial webhook with available metrics
- Missing metrics default to conservative values (e.g., 0 compliance)

---

## 📡 WEBHOOK RETRY POLICY

```typescript
// financeIntegrationService.ts
const maxRetries = 3;
const backoffMs = 1000; // 1s initial, exponential

retry attempt 1: 1000ms
retry attempt 2: 2000ms
retry attempt 3: 4000ms
fail after max retries → log warning
```

---

## 🔍 MONITORING & LOGGING

### Key Metrics to Monitor
```
- Webhook success rate (target: >99%)
- Average score update latency (target: <500ms)
- Cold chain violation rate (target: <1%)
- On-time delivery rate (target: >95%)
```

### Logs
```
[INFO] 📤 Sending shipment completion to Finance | trackId: TR-2026-1001
[INFO] ✅ Finance service updated | response: { newScore: 92, grade: "A" }
[ERROR] ❌ Failed to notify Finance | error: Connection timeout
[WARN] Webhook retry attempt 2/3 | backoff: 2000ms
```

---

## 🔄 COMPLETE INTEGRATION CHECKLIST

- [x] Logistics sends shipment completion webhook
- [x] Finance receives and validates webhook
- [x] Agro-Score calculated with 7 factors
- [x] Credit grade and limit unlocked
- [x] Service-to-service authentication
- [x] Error handling and retries
- [x] Logging and monitoring
- [ ] Deploy to production (needs SMS + 3PL API keys)
- [ ] Frontend displays live credit limit updates
- [ ] Historical shipment data import for existing farmers
