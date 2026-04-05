# ChainEstate — Blockchain Property Loan DApp

A decentralized application (DApp) that enables users to tokenize real estate into **ERC-1155 fractional shares** and use them as collateral to secure loans — eliminating the need for traditional banks and intermediaries.

**Project Status:** Work In Progress (actively being developed)

---

## Features

-  Property tokenization using ERC-1155 standard
-  Collateral-based decentralized lending system
-  Smart contract-driven loan lifecycle
-  Backend tracking for loans, properties, and transactions
-  Secure wallet integration (MetaMask)
-  Real-time loan status updates

---

##  Tech Stack

**Frontend**

- React.js

**Backend**

- Node.js, Express.js

**Blockchain**

- Solidity (Hardhat)
- Ethers.js

**Database**

- MongoDB

**Standards**

- ERC-1155 (Fractional Ownership)

---

## ⚙️ How It Works

1. User tokenizes a property into fractional shares (ERC-1155)
2. Shares are locked as collateral in a smart contract
3. A lender funds the loan
4. Borrower repays the loan through EMIs
5. If borrower defaults → lender can seize collateral

---

## ⚙️ Local Setup & Installation
Make sure you have Node.js, MetaMask, and Hardhat installed

### 1. Smart Contracts

````bash
cd your-hardhat-project
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost


## Setup

### 1. Contracts
```bash
cd your-hardhat-project
npx hardhat node              # start local blockchain
npx hardhat run scripts/deploy.js --network localhost
# Note down: PropertyShares address + LoanContract address
````

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, PRIVATE_KEY, LOAN_CONTRACT_ADDRESS, PROPERTY_CONTRACT_ADDRESS
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in REACT_APP_LOAN_CONTRACT_ADDRESS, REACT_APP_PROPERTY_CONTRACT_ADDRESS
npm install
npm start
```

### 4. Run both at once (from root)

```bash
npm install
npm run install:all
npm run dev
```

## API Endpoints

| Method | Endpoint                 | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | /api/loans               | All loans (filter by status/borrower/lender) |
| GET    | /api/loans/stats         | Dashboard stats                              |
| GET    | /api/loans/:id           | Single loan                                  |
| POST   | /api/loans               | Record new loan request                      |
| PATCH  | /api/loans/:id/fund      | Record lender funding                        |
| PATCH  | /api/loans/:id/emi       | Record EMI payment                           |
| PATCH  | /api/loans/:id/seize     | Record share seizure                         |
| GET    | /api/properties          | All properties                               |
| POST   | /api/properties          | Record new property mint                     |
| PATCH  | /api/properties/:id/lock | Update locked shares                         |
| GET    | /api/transactions        | On-chain event log                           |

## Loan Status Flow

```
REQUESTED → FUNDED/ACTIVE → CLOSED (all EMIs paid)
                          ↘ DEFAULTED (missed EMI → seize)
```
