# Expense Tracker Backend

A comprehensive expense tracking backend API built with Node.js, Express, and MongoDB.

## Features

- User authentication with JWT
- Account management (Cash, Bank, Credit, Investment)
- Transaction tracking with categories
- Budget management and limits
- Recurring transactions
- Bill reminders and management
- Financial goals tracking
- Real-time notifications
- Calendar integration
- Daily Rojmel (expense diary)
- Loan management
- Merchant tracking
- Reimbursement handling
- Comprehensive reports and analytics
- Savings tracking
- Security features
- Collaboration tools
- Interactive charts and visualizations

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd expense-tracker-backend
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `/api/v1/users` - User management (register, login, logout, profile)

### Core Features
- `/api/v1/accounts` - Account management
- `/api/v1/transactions` - Transaction tracking
- `/api/v1/categories` - Category management
- `/api/v1/budgets` - Budget management
- `/api/v1/goals` - Financial goals

### Advanced Features
- `/api/v1/recurring` - Recurring transactions
- `/api/v1/bills` - Bill management
- `/api/v1/notifications` - Real-time notifications
- `/api/v1/calendar` - Calendar integration
- `/api/v1/daily-rojmel` - Daily expense diary

### Financial Tools
- `/api/v1/loans` - Loan management
- `/api/v1/merchants` - Merchant tracking
- `/api/v1/reimbursements` - Reimbursement handling
- `/api/v1/savings` - Savings tracking

### Analytics & Reports
- `/api/v1/charts` - Interactive charts
- `/api/v1/reports` - Financial reports

### System
- `/api/v1/security` - Security features
- `/api/v1/collaborations` - Collaboration tools
- `/health` - Health check endpoint

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/expense-tracker
ACCESS_TOKEN_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
PORT=8000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Project Structure

```
src/
├── controllers/     # Route handlers
├── models/         # Database models
├── routes/         # API routes
├── middlewares/    # Custom middleware
├── utils/          # Utility functions
├── app.js          # Express app setup
└── index.js        # Server entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
