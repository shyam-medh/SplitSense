# SplitSense

SplitSense is a robust, production-ready shared expense tracker designed to process messy real-world CSV data, handle complex splits, and manage temporal group memberships. It features a built-in AI Data Analyst (**Audit AI**) to help you analyze your spending, detect anomalies, and settle up fairly.

## ✨ Key Features

- **Automated CSV Imports**: Effortlessly upload messy, unstructured CSV datasets of your transactions. SplitSense automatically parses the data, identifying payers, payees, and amounts.
- **Advanced Splitting Algorithms**: Supports complex bill splitting scenarios (equal splits, percentage splits, custom amounts) and calculates "Who owes Whom" seamlessly.
- **Temporal Group Memberships**: Correctly accounts for members joining and leaving a group over time. If a member wasn't part of the group when an expense was incurred, they won't be charged!
- **Intelligent Anomaly Detection**: Automatically flags duplicate transactions, suspiciously high expenses, and unusual spending patterns so you never accidentally overpay.
- **Audit AI (Chatbot)**: A smart, conversational AI assistant that can answer questions about your data. Ask it things like:
  - *"How much did I spend on groceries last month?"*
  - *"Are there any duplicated electricity bills?"*
  - *"Who owes me the most money?"*
- **Real-time Balances & Settlements**: Get instant snapshots of group balances and automatically compute the optimal settlement path to minimize the number of transactions needed to settle all debts.
- **Beautiful, Responsive UI**: A premium user interface crafted with TailwindCSS, Framer Motion for smooth animations, and Recharts for interactive financial visualizations.

## 🛠 Tech Stack

- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Database**: PostgreSQL hosted on [Supabase](https://supabase.com/)
- **ORM / Driver**: [Postgres.js](https://github.com/porsager/postgres)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Data Visualization**: [Recharts](https://recharts.org/)

## 🚀 Getting Started

Follow these instructions to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/shyam-medh/SplitSense.git
cd SplitSense
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
# Your Supabase PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Initialize the Database

SplitSense comes with a built-in script to automatically create the necessary database tables.

```bash
npx tsx init-db.ts
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can now create an account, create a group, and start importing your expenses!

## 🧪 Testing the Importer

If you have a CSV file of expenses, you can upload it directly via the UI on the **Import Expenses** page. The system will process it, run anomaly checks, and calculate your optimal settlements automatically.

## 📄 License

This project is open-source and available under the MIT License.
