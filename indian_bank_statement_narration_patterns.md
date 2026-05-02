# Indian Bank Statement Narration Patterns & Classification Guide

> Research compiled for the GSTSaathi algorithmic classifier.  
> Last updated: May 2026

---

## 1. Common Abbreviations in Indian Bank Statements

| Abbreviation | Full Form | Category |
|---|---|---|
| **NEFT** | National Electronic Funds Transfer | Fund Transfer |
| **RTGS** | Real Time Gross Settlement | Fund Transfer |
| **UPI** | Unified Payments Interface | Digital Payment |
| **IMPS** | Immediate Payment Service | Fund Transfer |
| **POS** | Point of Sale | Card Payment |
| **ATM** | Automated Teller Machine | Cash |
| **CDM** | Cash Deposit Machine | Cash |
| **CHQ/CHQ DEP** | Cheque Deposit | Cheque |
| **CHQ PAID/CLG** | Cheque Paid / Clearing | Cheque |
| **ECS** | Electronic Clearing Service | Auto-Debit |
| **NACH** | National Automated Clearing House | Auto-Debit |
| **SI** | Standing Instruction | Recurring |
| **EMI** | Equated Monthly Installment | Loan |
| **FD** | Fixed Deposit | Investment |
| **RD** | Recurring Deposit | Investment |
| **OD/CC** | Overdraft / Cash Credit | Credit |
| **BIL/BPAY** | Bill Payment | Bill |
| **INS/INSUR** | Insurance | Insurance |
| **MF** | Mutual Fund | Investment |
| **CMS** | Cash Management Services | Corporate |
| **INT/INT CR** | Interest Credit | Interest |
| **INT DR/DR INT** | Interest Debit | Interest Charge |
| **CHGS/CHARGES** | Bank Charges | Fees |
| **SMS CHG** | SMS Alert Charges | Fees |
| **TDS** | Tax Deducted at Source | Tax |
| **GST** | Goods and Services Tax | Tax |
| **IT** | Income Tax | Tax |
| **ADV TAX** | Advance Tax | Tax |
| **PF** | Provident Fund | Payroll |
| **ESI** | Employee State Insurance | Payroll |
| **STAMP** | Stamp Duty | Tax |
| **RTN** | Return / Reversal | Reversal |
| **RVSL/REV** | Reversal | Reversal |
| **NFS** | National Financial Switch (ATM network) | ATM |
| **INW** | Inward | Incoming Transfer |
| **OUTW** | Outward | Outgoing Transfer |
| **WDL/CASH WDL** | Cash Withdrawal | Cash |
| **CASH DEP** | Cash Deposit | Cash |
| **FUND TRF** | Funds Transfer | Transfer |
| **SWEEP IN** | Auto-sweep from FD | Sweep |
| **SWEEP OUT** | Auto-sweep to FD | Sweep |

---

## 2. Date Formats Used by Indian Banks

Indian banks predominantly use **DD/MM/YYYY** or **DD-MM-YYYY** in statement exports, though some allow DD-Mon-YYYY:

| Format | Example | Banks Using |
|---|---|---|
| `DD/MM/YYYY` | `15/03/2026` | HDFC, ICICI, Axis, Kotak, most banks |
| `DD-MM-YYYY` | `15-03-2026` | SBI, PNB, some public sector banks |
| `DD-Mon-YYYY` | `15-Mar-2026` | ICICI, HDFC (alternate formats) |
| `MM/DD/YYYY` | `03/15/2026` | Rare; some foreign banks (HSBC India, Citi) |
| `YYYY-MM-DD` | `2026-03-15` | Yes Bank, some API exports |
| Unix epoch | `1741996800` | Some fintech/PFMS exports |

**Month abbreviations in Indian statements:**
`JAN`, `FEB`, `MAR`, `APR`, `MAY`, `JUN`, `JUL`, `AUG`, `SEP`, `OCT`, `NOV`, `DEC`

---

## 3. Amount Formats (Indian Numbering System)

Indian bank statements use the Indian numbering system:

| Term | Value | Scale |
|---|---|---|
| Thousand | 1,000 | 10³ |
| **Lakh** | 100,000 | 10⁵ |
| **Crore** | 10,000,000 | 10⁷ |
| Arab | 1,000,000,000 | 10⁹ |

Amount display patterns:
- `1,23,456.78` — comma after hundreds, then every 2 digits
- `₹ 1,23,456.78` — with rupee symbol
- `INR 1,23,456.78` — currency code
- Short forms: `1.23L` (1.23 lakhs), `5.50Cr` (5.50 crores)
- Debits often prefixed with `Dr` or `-`; Credits with `Cr` or `+`

---

## 4. NEFT Narration Patterns

NEFT narrations follow a semi-structured format. RBI mandates inclusion of sender name but banks vary in presentation.

### Generic Format
```
NEFT-<BRANCHCODE>-<SENDER_NAME>-<REFERENCE>-<TXN_ID>
```

### Bank-wise NEFT Narration Examples

#### SBI
```
NEFT/CITI240122345678/M/S VENDOR NAME PVT LTD/TN24012234567890123
NEFT-HDFC-HDFC0001234-JOHN DOE-RENT PAYMENT JAN26
NEFT/INW/240122345678/RAJESH KUMAR/GST PAYMENT
```

**Pattern:** `NEFT[/<bank_code>]/<UTR_number>/<sender_name>[/<remark>]`

#### HDFC Bank
```
NEFT-INW-HDFC240122345678-SENDER NAME PVT LTD-TRANSFER-UTR: HDFC240122345678
NEFT/INFT240122345678/SALARY FOR JANUARY 2026/ABC CORPORATION
NEFT Dr-240122345678-BY ORDER OF RAHUL SHARMA-TRANSFER
```

**Pattern:** `NEFT[-INW-]<UTR>/<sender_name>-<remarks>`

#### ICICI Bank
```
NEFT-TXN-240122345678-SENDER NAME-HDFC0012345-PAYMENT FOR INVOICE 123
NEFT/240122345678/RAJ ENTERPRISES/MAT SUPPLY
NEFT/CR/240122345678/SALARY CREDIT/JAN 2026
```

**Pattern:** `NEFT[/TXN]-<UTR>-<sender_name>-<bank_code>-<remarks>`

#### Axis Bank
```
NEFT-SBIN00123456789-SENDER NAME PVT LTD-000123456789-PMT TOWARDS CONSULTANCY
NEFT/INW001234567890/SENDER NAME
NEFT/240122345678/PAYMENT FROM CUSTOMER
```

**Pattern:** `NEFT-<IFSC>-<sender_name>-<ref_no>-<remarks>`

#### Kotak Mahindra Bank
```
NEFT/INWARD/240122345678/NAME OF REMITTER/REF12345
NEFT Dr 240122345678 SENDER NAME
```

### NEFT Parsing Strategy
1. Strip prefix: Extract `NEFT` keyword
2. Extract UTR: Usually 16-22 alphanumeric characters; pattern `[A-Z]{4}\d{7,12}` or `\d{12,22}`
3. Extract sender name: Between UTR and remarks, usually delimited by `/` or `-`
4. Extract remarks: After the sender name segment
5. **Category determination:** Most NEFTs are business payments; check if sender/recipient contains personal names for personal classification

### NEFT Keywords for ITC Classification
- `PAYMENT`, `PMT`, `INVOICE`, `SUPPLY`, `MATERIAL`, `GOODS`, `SERVICE`, `BILL` → B2B Purchase
- `SALARY`, `PAY-SAL`, `SAL` → Payroll (Non-ITC)
- `RENT`, `LEASE` → Rent Expense (ITC on commercial rent)
- `GST`, `TAX`, `CGST`, `SGST`, `IGST` → Tax Payment (Non-ITC)
- `LOAN`, `EMI`, `REPAY` → Loan Repayment (Non-ITC)
- `ADVANCE`, `ADV` → Advance Payment (Conditional ITC)
- `FEE`, `COMMISSION`, `CONSULT` → Professional fees (ITC eligible)
- `FREIGHT`, `TRANSPORT`, `LOGISTIC` → GTA Services (RCM applicable)

---

## 5. RTGS Narration Patterns

RTGS is used for high-value (usually > ₹2 lakhs) transactions. Narrations are typically shorter and more formal.

### Generic Format
```
RTGS-<UTR>[/<sender_name>][/<remarks>]
```

### Bank-wise RTGS Narration Examples

#### SBI
```
RTGS/24012234567890123/M/S MAHINDRA AND MAHINDRA LTD
RTGS-INW24012234567890123-ABC EXPORTS PVT LTD
```

#### HDFC Bank
```
RTGS-INW-240122345678901-SUPPLIER NAME-PYMNT FOR MACHINERY
RTGS/OUT/24012234567/CAPITAL GOODS PURCHASE
```

#### ICICI Bank
```
RTGS/24012234567890/SENDER CORPORATE NAME/INV NO 12345
RTGS/TXN/24012234567890/PAYMENT AGAINST INVOICE
```

#### Yes Bank
```
RTGS-240123456789-M/S SUPPLIER CO-FINAL SETTLEMENT
```

### RTGS Parsing Strategy
1. Strip prefix: `RTGS`
2. Extract UTR: 16-22 alphanumeric characters
3. Extract sender/vendor name
4. Extract purpose/remarks
5. **Business indicator:** RTGS is inherently business-oriented (minimum ₹2L); high-value indications of B2B trade
6. Categorize as **ELIGIBLE** if supplier/equipment/service keywords; **BLOCKED** if personal or capital nature

### RTGS Keywords for ITC Classification
- `MACHINERY`, `EQUIPMENT`, `PLANT`, `CAPITAL GOODS` → ITC Eligible (capital goods)
- `RAW MATERIAL`, `STOCK`, `INVENTORY`, `GOODS` → ITC Eligible (inputs)
- `SERVICE`, `CONSULTANCY`, `PROFESSIONAL`, `TECH` → ITC Eligible (input services)
- `SETTLEMENT`, `FULL AND FINAL`, `FNF` → Possible capital nature or final settlement
- `IMPORT`, `CUSTOMS`, `DUTY` → Customs duty (Non-ITC, but IGST on imports is eligible)

---

## 6. UPI Transaction Description Patterns

UPI narrations vary significantly by the UPI app used and the merchant.

### Standard UPI Format
```
UPI/<txn_ref_no>/<VPA_of_sender>@<bank>/<VPA_of_recipient>@<bank>/<bank_ref_no>/<amount>
```

### Common UPI Narration Examples

#### Standard Bank UPI
```
UPI/240123456789/PAYMENT FROM ABC/RAJESH@OKHDFCBANK/AMAZONPAY/REF240123456789/1500.00
UPI/DR/240123456789/mobikwik@icici/PAYTM01234567890
```

#### PhonePe
```
PHONEPE/240123456789/SenderName/Recipient
UPI/phonepe240123456789/sender@okhdfc/merchant@paytm
```

#### Google Pay (GPay)
```
UPI-GPAY-240123456789-SENDER NAME-MERCHANT NAME
UPI/240123456789/sender@oksbi/GooglePay/Amount
GPay/240123456789/PAYMENT TO VENDOR
```

#### Paytm
```
PAYTM/240123456789/FUND TRANSFER TO RAJESH
Paytm/240123456789/P2M/Payment to Zomato
UPI/paytm240123456789/user@paytm/merchant@paytm
```

#### BHIM
```
BHIM/240123456789/U123456789012345678901234/sender@upi
```

#### Amazon Pay
```
UPI/amazonpay240123456789/user@okaxis/Amazon Pay
Amazon/240123456789/ORDER 123-4567890-1234567
```

#### WhatsApp Pay
```
UPI/240123456789/WhatsApp/U123456789012345678901234
```

### UPI Parsing Strategy
1. **Detect UPI app** from narration prefix or VPA domain:
   - `phonepe...` → PhonePe
   - `gpay...`, `GooglePay` → Google Pay
   - `paytm...` → Paytm
   - `amazonpay...` → Amazon Pay
   - `bhim...`, `UPI` with `U` prefix ref → BHIM
2. **Extract VPA:** Pattern `[a-z0-9._-]+@[a-z]+` — the `@<bank>` suffix identifies bank
3. **Extract merchant:** Look for known merchant patterns (`@paytm`, `@amazon`, `@zomato`) or merchant name in remarks
4. **Personal vs Business:**
   - VPA contains personal name → likely personal
   - VPA contains merchant/business name → business expense
   - Merchant patterns: `@<company>pay`, `@<brand>`

### UPI Keywords for ITC Classification
- Merchant/App names in narration → cross-reference with vendor database
- `ORDER`, `PURCHASE`, `BUY` → Business expense
- `BILL`, `UTILITY`, `RECHARGE`, `MOBILE` → Utility (blocked unless business use)
- `FOOD`, `DINING`, `RESTAURANT`, `ZOMATO`, `SWIGGY` → Food (5% GST, ITC blocked)
- `CAB`, `UBER`, `OLA`, `TRANSPORT`, `TRAVEL` → Travel (ITC eligible for business travel)
- `INSURANCE`, `LIC`, `POLICY` → Insurance (health/life = personal; business insurance = ITC)
- `SUBSCRIPTION`, `SUBS`, `RENEWAL` → SaaS subscription (ITC eligible if business SaaS)

---

## 7. IMPS Narration Patterns

IMPS uses MMID (Mobile Money Identifier) and is popular for instant transfers.

### Generic Format
```
IMPS/<txn_ref_no>/<sender_account>/<recipient_account>/<amount>
```

### IMPS Narration Examples

#### SBI
```
IMPS/240123456789/SBIN0012345/SBIN0067890/TRANSFER TO RAJESH
IMPS/240123456789012/From: SenderName
```

#### HDFC Bank
```
IMPS-INW-HDFC240123456789-SENDER NAME
IMPS/240123456789012/MOB/RECHARGE/PMT
IMPS-P2A-240123456789012-SenderName-RecipientName
```

#### ICICI Bank
```
IMPS/240123456789/FRM SENDER NAME/TO RECIPIENT
IMPS/CR/240123456789/RAJ KUMAR/SALARY
```

#### General Patterns
```
IMPS/240123456789012/Money sent to Mobile No XXXXXX6789
IMPS-P2A (Person to Account)
IMPS-P2P (Person to Person)
IMPS-MMT (Merchant)
```

### IMPS Parsing Strategy
1. Strip prefix: `IMPS[-<variant>]`
2. Extract reference: 12-16 digit number
3. Extract sender/receiver: After reference, before amount
4. **IMPS variants:**
   - `P2A`: Person to Account — likely business
   - `P2P`: Person to Person — likely personal
   - `P2M`/`MMT`: Merchant payment — business

---

## 8. Card Payment Narrations (POS/E-commerce)

### Debit/Credit Card Swipe Narration Patterns

#### Generic POS Format
```
POS/<txn_date>/<merchant_name>/<city>/<terminal_id>
POS/<card_type> <card_last_4>/<merchant_name>/<location>/<date>
```

### Bank-wise POS Examples

#### HDFC Bank
```
POS/240101234567/HDFC123456789012345/M/S BIG BAZAAR/MUMBAI/IN
POS/00123456789012345678/UBER INDIA/MUM/50401234XXXX1234
POS-VISA-1234/AMAZON RETAIL INDIA/MUMBAI
```

#### SBI
```
POS/24011234567890123456789/McDonald's India/NDLI/IN
POS/MC/1234/2401/FreshMenu BLR
```

#### ICICI Bank
```
POS Txn: AMAZON MARKETING P. L. MUMBAI On 24011234567890123456789
PURCHASE AT FLIPKART INTERNET PVT LTD BANGALORE, CARD: 1234
POS/24011234567890123456789/ZOMATO MEDIA/GURGAON/IN
```

#### Axis Bank
```
POS/24010123456789/SWIGGY/BANGALORE/IN/Card1234
POS-Purchase-AMAZON/IN-REF24011234567890123456789
```

### E-commerce/Online Payment Specific Patterns

```
PURCHASE/AMAZON IN/ORDER 123-4567890-1234567
PAY*FLIPKART INTERNET/REF 240123456789
AMAZON.IN/REF24011234567890123456789
WWW.FLIPKART.COM/24011234567890123456789
PAYTM MALL/ORDER1234567890
MYNTRA DESIGNS PVT LTD/ORDER 1234567890
NETFLIX.COM/MUMBAI/IN
```

### POS Parsing Strategy
1. Count `/` or `-` delimiters to find merchant name position
2. Extract merchant: Usually the 3rd or 4th segment; trim `M/S`, `PVT LTD`, `LTD`, `LLP`
3. Extract location: Usually after merchant name; 2-4 character city code
4. Extract card last 4 digits: `XXXX1234`, `Card:1234`, or `/1234`
5. Extract e-commerce order reference: `ORDER <number>`, `REF <number>`

### POS/E-commerce Keywords for ITC Classification
- **B2B Eligible (ITC):** `AMAZON BUSINESS`, `FLIPKART WHOLESALE`, `INDIA MART`, `TRADE INDIA`, `ALIBABA`, `B2B`
- **B2C (Blocked/mixed):** `AMAZON RETAIL`, `FLIPKART INTERNET`, `MYNTRA`, `AJIO`, `BIG BASKET`, `GROFERS`
- **Food/Restaurant (Blocked ITC under 17(5)):** `ZOMATO`, `SWIGGY`, `DOMINOS`, `PIZZA HUT`, `MCDONALD`, `EATFIT`
- **Travel (Eligible for business travel):** `MAKEMYTRIP`, `GOIBIBO`, `IRCTC`, `YATRA`, `OYO`, `INDIGO`, `AIR INDIA`, `SPICEJET`
- **SaaS/Software (Eligible ITC):** `AWS`, `GOOGLE`, `MICROSOFT`, `GITHUB`, `SLACK`, `ZOOM`, `NOTION`, `DIGITALOCEAN`, `HOSTINGER`, `GODADDY`, `NAME.COM`
- **Advertising (Eligible ITC):** `FACEBOOK ADS`, `GOOGLE ADS`, `META`, `LINKEDIN`, `TWITTER ADS`
- **Utilities (ITC if business premises):** `BSES`, `TATA POWER`, `AIRTEL`, `JIO`, `VODAFONE`

---

## 9. Cash Withdrawal Narrations

### Common Patterns

#### ATM Withdrawals
```
ATM/WDL/240123456789012/SBIN0012345/MUMBAI
ATM-CASH-24011234567890123456789-DELHI
ATM/WDL/State Bank ATM/GURGAON/15-03-2026
NON-HOME ATM/1234/2401/CASH WITHDRAWAL
ATM CASH WITHDRAWAL 24011234567890123456789
```

#### Bank Branch/Teller Withdrawals
```
CASH WITHDRAWAL AT BRANCH/SBIN0012345
BY CLEARING/SELF CHEQUE/WITHDRAWAL
SELF WITHDRAWAL/SB ACCT
BRANCH CASH WDL/24011234567890123456789
```

#### CDM (Cash Deposit Machine) / Cash Deposit
```
CDM/CASH DEPOSIT/240123456789012/SBIN0012345
CASH DEP/MUMBAI/24011234567890123456789
BY CASH/SELF
```

### Classification
- **All cash withdrawals and deposits → BLOCKED ITC** (cash payments above ₹10,000 are blocked under Section 17(5); cash deposits are not purchases)
- **Category:** `PERSONAL` or `NON-BUSINESS`
- Cash deposits might be business revenue (Module B) but do not qualify for ITC

---

## 10. Cheque Deposit & Clearing Narrations

### Cheque Deposit
```
CHQ DEP/240123456789/SBIN0012345
CHQ DEPOSIT/CHQ NO 123456/SBIN0012345
BY CLG/CHQ 123456/SBIN0012345
CHQ/24011234567890123456789/SBIN0012345
CLG/CHQ NO 123456/ICICI BANK/DELHI
```

### Cheque Issued / Paid
```
CHQ PAID/123456/Self
CHQ NO 123456 PAID
CHQ/DEBIT/240123456789/PAYMENT TO VENDOR
CLG CHEQUE 123456/PAID
```

### Outward Clearing
```
OUTWARD CLG/24011234567890123456789/CHQ 123456
CLG-OUT/240123456789
```

### Cheque Return / Dishonour
```
CHQ RTN/123456/TECHNICAL REASON
CHQ RETURNED/INSUFFICIENT FUNDS
CLG RTN/240123456789/CHQ 123456
```

### Parsing Strategy
1. **Cheque deposit (CREDIT):** `CHQ DEP`, `BY CLG`, `CLG`
2. **Cheque issued (DEBIT):** `CHQ PAID`, `CHQ NO <X> PAID`
3. Extract cheque number: 6-9 digits after `CHQ`, `CHEQUE`, `CHQ NO`
4. **Purpose:** Cheque deposits are incoming funds (business revenue or refunds); cheques issued may be vendor payments (ITC eligible if for business purchases)
5. **Cross-reference cheque amount with GST invoice number** (often mentioned in remarks)

---

## 11. Bank Charges & Fees Narrations

### Common Patterns
```
CHGS/SMS ALERT/QUARTER/Q4FY26
CHGS/ATM CARD ANNUAL FEES
CHGS/NACH RETURN/SBIN0012345
CHARGES/ECS RETURN/240123456789/MANDATE ID 12345
MIN BAL CHARGES/JAN2026
SMS CHARGES/24011234567890123456789
ANNUAL MAINTENANCE CHARGES (AMC)
DEBIT CARD ANNUAL FEE
CHEQUE BOOK CHARGES
CASH HANDLING CHARGES
IMPS/NEFT/RTGS CHARGES
GST ON BANK CHARGES
```

### Classification
- **ITC Status:** Bank charges are **ITC eligible** if related to business banking (e.g., current account charges)
- **GST on bank charges:** Extract the GST component (usually 18% on financial services)
- **Common charge types:**
  - `SMS CHARGES` / `SMS ALERT` → Quarterly ~₹15-25 + GST
  - `ATM CARD FEE` → Annual ~₹200-500 + GST
  - `CHEQUE BOOK` → Per leaf ~₹3-5 + GST
  - `CASH HANDLING` → Per transaction ~₹2.5-5 per ₹1000
  - `MIN BAL` / `NON-MAINTENANCE` → Monthly ~₹300-600 + GST
  - `AMC` → Quarterly ~₹250-500 + GST
  - `NACH RETURN` → ~₹250-500 + GST per return
  - `ECS RETURN` → ~₹250-500 + GST per return

---

## 12. Interest Credit & Debit Narrations

### Interest Credit (Savings/FD)
```
INT CR/SAVINGS/Q4 JAN-MAR 2026
INT PD/SAVINGS ACCOUNT
FD INTEREST/ACC 12345678901
INT ON FD/MATURITY OF FD 123456
SAVINGS INTEREST/Q4FY26
INT.CR/24011234567890123456789
```

### Interest Debit (Loan/OD)
```
INT DR/LOAN ACCOUNT 12345
DR INT/CASH CREDIT ACCOUNT
OD INTEREST/PERIOD JAN-FEB 2026
INT ON LOAN/CC A/C 123456
```

### Classification
- **Interest credit:** Income (not ITC), report as financial income, taxable under GST if > ₹20L turnover
- **Interest debit (business loan/OD):** ITC on interest is **BLOCKED** under Section 17(5)(b) — interest on loans is not eligible for ITC

---

## 13. EMI Payment Narrations

### Common Patterns
```
EMI/LOAN A/C 12345/INSTALLMENT 12 OF 36
LOAN EMI/240123456789012/REF 123456
SI/EMI/HDFC LTD/240123456789
ECS/EMI/BAJAJ FINANCE/LOAN 12345
NACH/EMI/HDFC BANK/REF 123456
STANDING INSTRUCTION/EMI/ICICI BANK/LOAN 123456
AUTO DEBIT/EMI/24011234567890123456789
```

### Classification
- **ITC Status:** BLOCKED — EMI principal + interest are not eligible for ITC
- **Category:** `LOAN_REPAYMENT` or `PERSONAL`
- **Parse:** Extract lender name from narration (e.g., HDFC, BAJAJ, TATA CAPITAL) to distinguish business from personal loans

---

## 14. ECS / NACH / Standing Instruction Narrations

### ECS Patterns
```
ECS/240123456789/MANDATE 123456/SENDER NAME/PURPOSE
ECS RETURN/240123456789
ECS DEBIT/AIRTEL POSTPAID/MONTHLY BILL
ECS CR/SALARY/240123456789
```

### NACH Patterns
```
NACH/240123456789/MANDATE ID UM12345678/TATA AIG/PREMIUM
NACH DEBIT/240123456789012/MF SIP/HDFC MUTUAL FUND
NACH RETURN/240123456789/INSUFFICIENT FUNDS
```

### Standing Instruction (SI)
```
SI/240123456789/UTILITY BILL/TATA POWER
SI/SYSTEMATIC INVESTMENT/KOTAK MF/SIP
SI/EMI/HDFC BANK/INSTALLMENT
```

### Classification
- **ECS/NACH/SI debits to vendors:** ITC eligible (e.g., utility, insurance, software subscriptions)
- **ECS/NACH for salary:** Credit transaction, not ITC
- **ECS/NACH for loan/EMI:** BLOCKED
- **ECS/NACH for insurance:** Eligible only if business insurance (fire, burglary, marine, etc.) — NOT health/life
- **ECS/NACH for MF/SIP:** Personal investment (non-ITC)
- **NACH RETURN:** Charge by bank, check if ITC eligible (bank charges)

---

## 15. GST & Tax Payment Narrations

### GST Payment
```
GST PAYMENT/240123456789012/GSTN 27AABCT1234A1Z5
GST PMT/GSTR-3B/JAN 2026/REF 240123456789
TAX PYMT/CGST + SGST/JAN2026
GST/CHALLAN/24011234567890123456789
```

### TDS / Income Tax
```
TDS PMT/240123456789012/ASSESSMENT YEAR 2026-27
INCOME TAX/ADVANCE TAX/Q4 FY25-26
IT/24011234567890123456789/CHALLAN 12345
ADVANCE TAX/AY 2026-27/PAN ABCPT1234A
```

### Customs / Import Duty
```
CUSTOMS DUTY/240123456789/BE NO 1234567
IGST ON IMPORT/BE 1234567/CHENNAI CUSTOMS
```

### Classification
- **GST Payment:** Not an ITC transaction; it's a tax remittance (Module B GSTR-3B)
- **TDS / Income Tax:** Not ITC
- **Customs Duty:** Customs duty itself is NOT eligible for ITC, but IGST paid on imports IS eligible
- Parse GST portal reference: `PMT-06-CHALLAN-<ID>`

---

## 16. Salary & Payroll Narrations

### Salary Credit (Incoming — for employee's personal account)
```
NEFT/SALARY JANUARY 2026/ABC CORPORATE
SALARY/JAN2026/ABC PVT LTD
NEFT/SAL CR/240123456789/EMPLOYER CO
```

### Salary/Payroll Debit (Outgoing — for business bank account)
```
NEFT/SALARY DISBURSEMENT/JAN 2026/EMPLOYEE NAME
SALARY PMT/JAN 2026/STAFF
NEFT/PAYROLL/JAN 2026/240123456789
WAGES PAYMENT/LABOUR/24011234567890123456789
```

### PF / ESI Payments
```
PF PMT/240123456789012/EST CODE 12345
ESI PAYMENT/240123456789012/ESI CODE 12345
PF+ESI CHALLAN/JAN 2026
```

### Classification
- **Salary/Wages → NOT eligible for ITC** (employee costs, no GST on salary)
- **PF/ESI → NOT eligible for ITC** (statutory contributions)
- Category: `PAYROLL`

---

## 17. Insurance Premium Narrations

```
ECS/INSURANCE/LIC OF INDIA/POLICY 123456789
NACH/TATA AIG GENERAL INS/PREMIUM/Policy 12345
HDFC ERGO/HEALTH INSURANCE/RENEWAL
ICICI LOMBARD/MOTOR INSURANCE/BH01AB1234
NEW INDIA ASSURANCE/FIRE INSURANCE/PREM
LIC/ANNUAL PREMIUM/POLICY 987654321
STAR HEALTH/INSURANCE PREMIUM
```

### Classification
- **Health Insurance → BLOCKED ITC** (Section 17(5)(b) — personal consumption)
- **Life Insurance → BLOCKED ITC**
- **Motor Insurance → ITC ELIGIBLE** if vehicle used for business and > 13 seater OR goods carriage
- **Fire Insurance (business premises) → ITC ELIGIBLE**
- **Marine Insurance (goods in transit) → ITC ELIGIBLE**
- **Burglary Insurance (business) → ITC ELIGIBLE**
- **Workmen's Compensation → ITC ELIGIBLE**
- **Key Person Insurance → NOT eligible**

---

## 18. Software/SaaS Subscription Narrations

```
PAYPAL *AWS AMAZON WEB SERV
AWS EMEA/SARL/GB/AMAZON WEB SERVICES
GOOGLE *Google Workspace g.co/helppay
GOOGLE *CLOUD/g.co/helppay#
MICROSOFT*OFFICE 365
MICROSOFT*AZURE
GitHub, Inc./GITHUB TEAM PLAN
SLACK TECHNOLOGIES
ZOOM.US/VIDEO COMMUNICATIONS
NOTION LABS INC
DIGITALOCEAN.COM
NAME.COM/DOMAIN RENEWAL
GODADDY.COM/HOSTING
ATLASSIAN/JIRA SOFTWARE
SALESFORCE.COM
HUBSPOT INC
ZOHO CORPORATION
FRESHWORKS TECHNOLOGIES
ADOBE SYSTEMS/CREATIVE CLOUD
CANVA PTY LTD
FIGMA INC
SEMRUSH
AHREFS
```

### Classification
- **All SaaS/software subscriptions for business use → ITC ELIGIBLE**
- **OIDAR (Online Information Database Access and Retrieval) services from foreign vendors → RCM applicable**
- **Key OIDAR indicators:**
  - Foreign billing address (non-INR, non-IND), GSTIN absent
  - Common OIDAR: AWS, Google, Microsoft, GitHub, Slack, Zoom, Adobe, Figma, Canva, Notion, Atlassian
- **ITC treatment:** Full ITC if used for business; blocked if mixed personal/business
- **RCM:** If foreign vendor doesn't charge GST, pay under RCM @ 18%

---

## 19. Utility Bill Narrations

```
Bharti Airtel/AIRTEL POSTPAID/REF 123456789
Tata Teleservices/TATA DOCOMO/REF 123456789
Reliance Jio/JIO POSTPAID/REF 123456789
Vodafone Idea/VODAFONE POSTPAID/REF 123456789
BSES RAJDHANI POWER/ELECTRICITY BILL
TATA POWER/ELECTRICITY/CA NO 123456
BEST Undertaking/ELECTRICITY BILL/MUMBAI
Mahanagar Gas/MGL/PNG BILL/REF 123456
Indraprastha Gas/IGL/PNG BILL
Municipal Corporation/WATER BILL
BROADBAND/AIRTEL XSTREAM FIBER
ACT Fibernet/INTERNET BILL
Tata Play/DTH RECHARGE/JioFiber
```

### Classification
- **Telecom/Internet (business connection) → ITC ELIGIBLE**
- **Electricity (business premises) → ITC ELIGIBLE**
- **Gas/Water (business premises) → ITC ELIGIBLE**
- **DTH (business use, e.g., hotel/TV) → ITC ELIGIBLE; personal DTH → BLOCKED**
- **Mobile postpaid (business number) → ITC ELIGIBLE; personal → BLOCKED**

---

## 20. Bank-wise Narration Format Summary

### HDFC Bank
```
NEFT-INW-<UTR>-<SenderName>-<Remarks>
RTGS-INW-<UTR>-<SenderName>-<Remarks>
UPI/DR/<TxnRef>/<VPA>/<Merchant>/<RefNo>/<Amount>
IMPS-INW-<TxnRef>-<SenderName>
POS/<DateCode>/<TxnRef>/<MerchantName>/<City>/IN
```

### ICICI Bank
```
NEFT-Txn-<UTR>-<SenderName>
NEFT/<UTR>/<SenderName>
RTGS/<UTR>/<SenderName>/<Remarks>
IMPS/<TxnRef>/FRM <SenderName>/TO <Recipient>
POS Txn: <MerchantName> <City> On <TxnRef>
```

### SBI (State Bank of India)
```
NEFT/<BankCode><UTR>/M/S <SenderName>/<RefNo>
NEFT/INW/<UTR>/<SenderName>/<Remarks>
RTGS/<UTR>/M/S <SenderName>
IMPS/<TxnRef>/<FromAccount>/<ToAccount>/<Remarks>
POS/<TxnRef>/<MerchantName>/<City>/IN
ATM/WDL/<TxnRef>/<BranchCode>/<City>
```

### Axis Bank
```
NEFT-<IFSC>-<SenderName>-<TxnRef>-<Remarks>
RTGS-<UTR>-<SenderName>-<Remarks>
UPI/<TxnRef>/<VPA>/<Merchant>
IMPS-P2A-<TxnRef>-<SenderName>-<RecipientName>
POS-Purchase-<Merchant>/<CountryCode>-<TxnRef>
```

### Kotak Mahindra Bank
```
NEFT/INWARD/<UTR>/<SenderName>/<RefNo>
RTGS/INWARD/<UTR>/<SenderName>/<Remarks>
IMPS/<TxnRef>/<SenderName>/<Recipient>/<Remarks>
UPI/<TxnRef>/<VPA>/<Amount>
```

### Yes Bank
```
NEFT-<UTR>-<SenderName>-<RefNo>
RTGS-<UTR>-<SenderName>-<Remarks>
IMPS-<TxnRef>-<SenderName>-<Recipient>
```

---

## 21. Classification Decision Tree for ITC Determination

```
1. TRANSACTION TYPE DETECTION
   ├─ Contains "NEFT" → NEFT transfer
   ├─ Contains "RTGS" → RTGS transfer  
   ├─ Contains "UPI" or UPI app name → UPI payment
   ├─ Contains "IMPS" → IMPS transfer
   ├─ Contains "POS" or "PURCHASE" → Card/debit card payment
   ├─ Contains "ATM/WDL" or "CASH WDL" → Cash withdrawal
   ├─ Contains "ATM/DEP" or "CASH DEP" or "CDM" → Cash deposit
   ├─ Contains "CHQ DEP" or "BY CLG" → Cheque deposit (incoming)
   ├─ Contains "CHQ PAID" or "CLG PAID" → Cheque payment (outgoing)
   ├─ Contains "ECS" or "NACH" → Auto-debit
   ├─ Contains "SI" → Standing instruction
   ├─ Contains "INT" → Interest
   ├─ Contains "CHGS" or "CHARGES" → Bank charges
   ├─ Contains "EMI" → EMI payment
   ├─ Contains "GST PMT" or "TAX" → Tax payment
   ├─ Contains "SALARY" or "SAL" or "PAYROLL" → Salary
   └─ None of above → Unknown (requires AI classification)

2. ITC ELIGIBILITY RULES (Section 16 & 17 CGST Act)
   ├─ IS_DEBIT? → Yes → Continue
   │   ├─ IS_CASH? → BLOCKED (17(5))
   │   ├─ IS_LOAN_EMI? → BLOCKED (17(5)(b))
   │   ├─ IS_INSURANCE? → Check type
   │   │   ├─ Health/Life → BLOCKED (17(5)(b))
   │   │   ├─ Motor/Vehicle → Conditional (>13 seater/goods)
   │   │   └─ Fire/Marine/Burglary → ELIGIBLE
   │   ├─ IS_FOOD_RESTAURANT? → BLOCKED (17(5)(b))
   │   ├─ IS_VEHICLE_PURCHASE? → Conditional (17(5)(a))
   │   ├─ IS_CONSTRUCTION? → BLOCKED (17(5)(c) & (d))
   │   ├─ IS_MEMBERSHIP_CLUB? → BLOCKED (17(5)(g))
   │   ├─ IS_TRAVEL_HOSPITALITY? → ELIGIBLE (if business)
   │   ├─ IS_SOFTWARE_SAAS? → Check vendor
   │   │   ├─ Foreign OIDAR → RCM ELIGIBLE
   │   │   └─ Indian GST registered → ELIGIBLE
   │   ├─ IS_UTILITY? → ELIGIBLE (if business premises)
   │   ├─ IS_TELECOM? → ELIGIBLE (if business number)
   │   ├─ IS_RENT? → ELIGIBLE (commercial property)
   │   ├─ IS_PROFESSIONAL_FEE? → ELIGIBLE (business service)
   │   ├─ IS_ADVERTISING? → ELIGIBLE
   │   ├─ IS_RAW_MATERIAL? → ELIGIBLE
   │   ├─ IS_CAPITAL_GOODS? → ELIGIBLE (subject to 17(5) exclusions)
   │   ├─ IS_SALARY_PF? → BLOCKED (no GST on salary)
   │   ├─ IS_TAX_PAYMENT? → NON-ITC (tax outflow, not purchase)
   │   └─ IS_UNKNOWN? → AT_RISK / NEEDS_INVOICE
   └─ IS_CREDIT? → Yes (incoming funds)
       ├─ IS_REVENUE? → Sales (Module B: check GST applicability)
       ├─ IS_REFUND? → Reduction of expense ITC
       ├─ IS_SALARY? → Non-GST income
       └─ IS_OTHER? → NEEDS_INVOICE

3. PERSONAL vs BUSINESS DETERMINATION
   ├─ TRANSACTION_AMOUNT > ₹50,000? → Likely business
   ├─ VENDOR_NAME contains business keywords (LTD, PVT, CORP, ENTERPRISE)? → Business
   ├─ VENDOR_NAME matches known personal services? → Personal (if no corresponding business context)
   │   ├─ Zomato, Swiggy, Dominos → Food delivery (personal)
   │   ├─ Myntra, Ajio, Nykaa → Personal shopping
   │   ├─ BookMyShow, PVR, INOX → Entertainment (personal)
   │   ├─ Ola, Uber (without business context) → Personal travel
   │   └─ LIC, Star Health → Personal insurance
   └─ IFSC/VPA sender name matches business name pattern? → Business

4. RCM DETECTION
   ├─ VENDOR_COUNTRY is non-IND? → Potential RCM
   ├─ VENDOR is OIDAR? (AWS, Google, etc.) → RCM @ 18%
   ├─ SERVICE is GTA (Goods Transport Agency)? → RCM if GTA not charging GST
   ├─ SERVICE is Legal (Advocate)? → RCM
   ├─ SERVICE is Director Sitting Fees? → RCM
   └─ NO_GST_INVOICE + AMOUNT > ₹5,000 to unregistered dealer? → Check RCM under 9(4)
```

---

## 22. Regex Patterns for Key Extraction

```python
# UPI Tranaction Reference
UPI_REF = r'UPI[/-]\s*(\d{12,16})'

# NEFT/RTGS UTR (Unique Transaction Reference)
UTR = r'(?:NEFT|RTGS)[/-]?(?:INW[/-])?(\d{12,22})'

# IFSC Code (bank branch)
IFSC = r'[A-Z]{4}0\d{6}'

# VPA (Virtual Payment Address)
VPA = r'[\w.+-]+@[\w]+'

# Amount in Indian format (e.g., 1,23,456.78)
INDIAN_AMOUNT = r'(?:INR|₹|Rs\.?)?\s*(\d{1,3}(?:,\d{2})*(?:,\d{3})?\.\d{2})'

# GSTIN
GSTIN = r'\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}'

# PAN
PAN = r'[A-Z]{5}\d{4}[A-Z]{1}'

# Date in DD/MM/YYYY
DATE_DDMMYYYY = r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})'

# Cheque number
CHEQUE_NO = r'(?:CHQ|CHEQUE)\s*(?:NO\.?|NUMBER)?\s*(\d{6,9})'

# Card last 4 digits
CARD_LAST4 = r'(?:CARD|XXXX)[:\s]*(\d{4})'

# ATM/POS reference
POS_REF = r'(?:POS|ATM)[/\-](\d{12,22})'

# ECS/NACH mandate ID
MANDATE_ID = r'MANDATE\s*(?:ID|NO)?\s*([A-Z0-9]{8,20})'

# Loan/EMI reference
LOAN_REF = r'(?:LOAN|EMI)[:\s]*[A-Z]*(\d{5,15})'

# Policy number (insurance)
POLICY_NO = r'(?:POLICY|POL)[:\s]*(\d{6,12})'

# GSTR Challan reference
GSTR_CHALLAN = r'PMT-06-CHALLAN-(\d+)'

# Order reference (e-commerce)
ORDER_REF = r'ORDER[:\s]*([\d\-]+)'
```

---

## 23. Vendor Name Extraction Algorithm

```python
def extract_vendor_name(narration: str) -> str | None:
    """
    Multi-step vendor name extraction from narration text.
    """
    # Step 1: Remove transaction type prefixes
    prefixes = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'POS', 'ECS', 'NACH', 'SI']
    clean = narration
    for prefix in prefixes:
        clean = re.sub(rf'{prefix}[/\-]\w*[/\-]?', '', clean, flags=re.I)
    
    # Step 2: Remove known structured elements
    clean = re.sub(r'\d{12,22}', '', clean)           # UTR/Ref numbers
    clean = re.sub(r'[A-Z]{4}0\d{6}', '', clean)     # IFSC codes
    clean = re.sub(r'[\w.+-]+@[\w]+', '', clean)     # VPA
    clean = re.sub(r'(?:INR|₹|Rs\.?)\s*[\d,]+\.?\d*', '', clean)  # Amounts
    clean = re.sub(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', '', clean)  # Dates
    
    # Step 3: Extract candidate vendor name
    # Look for patterns like M/S COMPANY PVT LTD, COMPANY NAME
    vendor_patterns = [
        r'M/S\s+([A-Z][A-Z\s&.,()\-]+?)(?:\s*(?:LTD|LLP|PVT|PRIVATE|LIMITED|CORP|INC|ENTERPRISES?|ASSOCIATES?))?',
        r'(?:FRM|FROM|BY|TO)\s+([A-Z][A-Z\s&.,()\-]{3,})',
        r'([A-Z][A-Z\s&.,()\-]{3,}?)(?:\s*(?:LTD|LLP|PVT|PRIVATE|LIMITED|INDIA|CORP|INC))',
    ]
    
    for pattern in vendor_patterns:
        match = re.search(pattern, clean, re.I)
        if match:
            return match.group(1).strip()
    
    # Step 4: Known merchant list (e-commerce, services)
    known_merchants = [
        'AMAZON', 'FLIPKART', 'MYNTRA', 'SWIGGY', 'ZOMATO', 'UBER', 'OLA',
        'NETFLIX', 'HOTSTAR', 'SPOTIFY', 'YOUTUBE', 'GOOGLE', 'MICROSOFT',
        'AWS', 'DIGITALOCEAN', 'GODADDY', 'MAKEMYTRIP', 'GOIBIBO', 'IRCTC',
        'PAYTM', 'PHONEPE', 'MOBIKWIK', 'LIC', 'HDFC', 'ICICI', 'SBI', 'AXIS',
        'AIRTEL', 'JIO', 'TATA', 'RELIANCE', 'ZOHO', 'FRESHWORKS', 'ADOBE',
        'ATLASSIAN', 'SALESFORCE', 'GITHUB', 'SLACK', 'ZOOM', 'NOTION'
    ]
    
    for merchant in known_merchants:
        if merchant.upper() in clean.upper():
            return merchant.title()
    
    return None
```

---

## 24. Personal vs Business Classification Rules

| Indicator | Personal | Business |
|---|---|---|
| **Transaction amount** | <₹5,000 (typical) | >₹50,000 (typical) |
| **Transaction frequency** | Low frequency, random | Regular, recurring |
| **Vendor name pattern** | Generic brands (Zomato, PVR) | M/S, PVT LTD, LTD, CORP |
| **Bank account type** | Savings account (SA) | Current account (CA), OD, CC |
| **IFSC branch** | Residential area branch | Commercial area branch |
| **Time of transaction** | Evenings, weekends | Business hours (9AM-6PM weekdays) |
| **Narration content** | Personal references (name, mobile) | Invoice refs, GSTIN, business terms |
| **UPI app used** | Personal VPA | Merchant VPA, business VPA |
| **GSTIN present in narration** | No | Yes (strong business indicator) |

---

## 25. Category Taxonomy for the Classifier

```python
TRANSACTION_CATEGORIES = {
    # Business Purchases (ITC Eligible)
    "B2B_PURCHASE": "Raw materials, goods, inventory purchases",
    "B2B_SERVICE": "Professional, consulting, tech services",
    "B2B_SOFTWARE": "SaaS, cloud, software subscriptions",
    "B2B_RENT": "Commercial property rent",
    "B2B_UTILITY": "Electricity, gas, water (business premises)",
    "B2B_TELECOM": "Business phone, internet, broadband",
    "B2B_ADVERTISING": "Marketing, ads, promotion",
    "B2B_CAPITAL_GOODS": "Machinery, equipment, plant",
    "B2B_GTA": "Goods transport, freight, logistics (RCM)",
    "B2B_OIDAR": "Foreign digital services (RCM)",
    
    # Business Payments (Non-ITC)
    "PAYROLL": "Salary, wages, PF, ESI",
    "LOAN_REPAYMENT": "EMI, principal, interest on loans",
    "TAX_PAYMENT": "GST, TDS, income tax, advance tax",
    "CUSTOMS_DUTY": "Customs duty (IGST on import is eligible)",
    
    # Financial Transactions
    "INTEREST_CREDIT": "Interest earned on deposits",
    "INTEREST_DEBIT": "Interest charged on loans/OD",
    "BANK_CHARGES": "Bank fees, SMS, AMC, cheque book",
    "DIVIDEND": "Dividend from investments",
    
    # Cash Transactions
    "CASH_WITHDRAWAL": "ATM/branch cash withdrawal",
    "CASH_DEPOSIT": "Cash deposit in account",
    "CASH_PAYMENT": "Payment made in cash (blocked ITC > ₹10K)",
    
    # Personal
    "PERSONAL_FOOD": "Restaurant, food delivery",
    "PERSONAL_SHOPPING": "Retail shopping, e-commerce B2C",
    "PERSONAL_ENTERTAINMENT": "Movies, streaming, events",
    "PERSONAL_TRAVEL": "Personal travel, cabs, flights",
    "PERSONAL_INSURANCE": "Health, life, personal motor insurance",
    
    # Unclassified
    "UNKNOWN": "Unable to classify — needs AI review",
    "NEEDS_INVOICE": "Potential business expense but invoice needed",
}
```

---

## Appendix: Sample Real-World Narration Strings

The following are realistic narration strings for testing the classifier:

```
"NEFT/CITI240122345678/M/S RAJ ENTERPRISES PVT LTD/INV-12345/JAN26"
"RTGS/HDFC240122345678901/BHARAT HEAVY ELECTRICALS LTD/MACHINERY PURCHASE"
"UPI/240123456789/rajeshenterprise@oksbi/amazonpay/REF240123456789/15000.00"
"IMPS-P2A-240123456789012-SUPPLIER CO-RAW MATERIAL PAYMENT"
"POS/240101234567/HDFC123456789012345/AMAZON RETAIL INDIA/MUMBAI/IN/50401234XXXX1234"
"ATM/WDL/240123456789012/SBIN0012345/MUMBAI"
"CHQ DEP/240123456789/SBIN0012345"
"CHGS/SMS ALERT/QUARTER/Q4FY26"
"INT PD/SAVINGS/Q4 JAN-MAR 2026"
"ECS/EMI/BAJAJ FINANCE/LOAN 12345/INSTALLMENT 8 OF 36"
"NACH/TATA AIG GENERAL INS/PREMIUM/Policy 123456789"
"SI/240123456789/AIRTEL POSTPAID/MONTHLY BILL"
"GST PMT/GSTR-3B/JAN 2026/REF 240123456789"
"NEFT/SALARY DISBURSEMENT/JAN 2026/RAHUL SHARMA"
"PAYPAL *AWS AMAZON WEB SERV/GB/REF 240123456789"
"GOOGLE *Google Workspace g.co/helppay/REF240123456789"
"MICROSOFT*OFFICE 365/ANNUAL SUBSCRIPTION"
"DIGITALOCEAN.COM/DROPLET BILLING/JAN 2026"
"ZOMATO MEDIA PVT LTD/FOOD ORDER/REF240123456789"
"PHONEPE/240123456789/PAYMENT TO ELECTRICIAN/UPI12345678901234567890"
```
