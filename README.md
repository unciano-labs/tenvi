# Tenvi 💰

**Tenvi** is an all-in-one personal finance and property management platform designed to make tracking money effortless. Instead of juggling complicated spreadsheets, separate banking apps, and loose receipts, Tenvi brings your cash flow, credit cards, loans, savings goals, properties, and even an AI financial assistant into one clear, easy-to-use dashboard.

---

## 🌟 What Can You Do With Tenvi? (Features Explained in Plain English)

### 📊 1. See Your Entire Financial Picture at a Glance (Dashboard)
- **No more guesswork**: Instantly see how much money entered your pocket (**Money In**), how much left (**Money Out**), and what is left over.
- **Visual summaries**: Clean charts and summary cards show your net worth, upcoming bills, and recent activity so you always know where you stand.

### 📄 2. Drop Your Bank Statements & Let It Do the Typing (Smart Statements & OCR)
- **No manual data entry**: Simply upload your PDF bank statements or snap a photo of a receipt.
- **Smart scanner**: Tenvi automatically reads the document, extracts the dates, amounts, and merchant names, and categorizes each expense for you.

### 💳 3. Master Your Credit Cards & Avoid Late Fees
- **Never miss a due date**: Track statement cutoff dates, payment deadlines, and minimum amounts due for all your credit cards in one place.
- **Utilization awareness**: See how much credit you've used so you can keep your credit score healthy.

### 🏦 4. Track Loans & Installments
- **Know what you owe and when it ends**: Keep tabs on car loans, personal loans, or gadget installment plans.
- **Amortization & payments**: Record payments and watch your principal balance drop month by month until you're debt-free.

### 🤝 5. Track Who Owes You Money (Receivables & Bill Splits)
- **Remember every loan**: When a friend, colleague, or family member borrows money, record it with notes and expected return dates.
- **Easy bill splitting**: Shared a dinner or a vacation house? Split the bill with friends, track who has already paid you back, and see who still owes a balance.

### 🎯 6. Grow Your Savings & Hit Your Goals
- **Save with purpose**: Create dedicated buckets for your Emergency Fund, Next Vacation, or Dream House down payment.
- **Visual progress**: Watch your progress bars fill up every time you add savings, giving you the motivation to reach your target.

### 🏠 7. Manage Properties & Real Estate in One Place
- **Your property portfolio**: Track the market value of your house, condo, or land alongside any linked home loans or mortgages.
- **Safe document storage**: Upload and organize important deeds, contracts, tax declarations, and insurance policies so you never lose them.
- **Rental cash flow**: Record incoming tenant rent and outgoing repair or maintenance costs to see your net rental profit.

### 🤖 8. Your Personal AI Financial Assistant (Powered by Google Gemini)
- **Ask questions in plain English**: Chat with Tenvi AI just like talking to a personal accountant.
  - *"How much did I spend on dining out this month?"*
  - *"Which credit card is due next week?"*
  - *"If I pay an extra ₱5,000 toward my loan, when will I finish paying it off?"*
- **Built-in safety**: The assistant is grounded directly in your recorded financial data with strict guardrails to give accurate, safe, and helpful insights.

### ⏰ 9. Automated Alerts (Email & SMS)
- **Timely heads-up**: Get notified before bills, card deadlines, or loan installments are due so you never incur annoying late penalties.

---

## 🛠️ Built With Modern Technology

- **Front-End & Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Design & UI**: [TailwindCSS 4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Database & Authentication**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Auth, and Storage)
- **AI Intelligence**: [Google Gen AI SDK](https://github.com/google-gemini/generative-ai-js) (`@google/genai`)
- **Document Processing**: `pdf-parse` & `tesseract.js` (for OCR on receipts and statements)
- **Form Handling & Validation**: React Hook Form & Zod

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v20 or higher recommended) and `npm` installed.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/fredunciano/tenvi.git
cd tenvi
npm install
```

### 3. Environment Variables
Copy the example environment file:
```bash
cp .env.example .env.local
```
Open `.env.local` and add your keys:
- Supabase URL and Anon/Service Role Keys
- Google Gemini API Key
- PayMongo Keys (if payment processing is enabled)

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 5. Production Build
To check types and test the optimized production build:
```bash
npm run build
npm run start
```

---

## 📄 License
Private & Proprietary. All rights reserved.
