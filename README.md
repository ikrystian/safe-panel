# SAFE - internal safe software

## Features

- 🔐 **Authentication**: Secure user authentication with Clerk
- 📊 **Dashboard**: Comprehensive dashboard with training statistics
- 🔍 **Pages Database**: Advanced web search with SerpAPI integration (50 requests per search)
- 🤖 **Automatic Processing**: Domain extraction, duplicate removal, and categorization during search
- 💾 **SQLite Database**: Local data storage with search history and results
- 🎨 **Modern UI**: Built with chadcn/ui components and Tailwind CSS
- 📱 **Responsive**: Mobile-first responsive design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk
- **Database**: SQLite with better-sqlite3
- **Search API**: SerpAPI (Google Search Results)
- **UI Components**: chadcn/ui (shadcn/ui)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Language**: TypeScript

## Database Structure

Currently, the application uses Clerk for user management and authentication. The planned database structure includes:

### Users

- Managed by Clerk authentication
- User profiles with first name, last name, email
- Role-based access

### Search Results (Implemented)

```sql
-- Current structure
history_scrapped {
  id: integer (primary key, autoincrement)
  search_query: text (not null)
  title: text
  link: text
  snippet: text
  position: integer
  search_date: datetime (default current_timestamp)
  user_id: text
  serpapi_position: integer
  processed: integer (default 0)
  category: integer (default 0)
  created_at: datetime (default current_timestamp)
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Clerk account for authentication

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd safe-panel
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Add your Clerk keys and SerpAPI key to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
SERPAPI_KEY=your_serpapi_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages and layout
│   ├── sign-in/          # Authentication pages
│   ├── sign-up/
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   └── ui/               # chadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── middleware.ts         # Clerk middleware for route protection
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Authentication & Security

- Protected routes using Clerk middleware
- Dashboard routes require authentication
- User session management handled by Clerk
- Secure sign-in/sign-up flows

## UI Components

The application uses chadcn/ui components including:

- Sidebar navigation with collapsible functionality
- Cards for displaying statistics and information
- Buttons with various variants
- Responsive layout components
- Theme switcher with dark/light/system mode support

## Theme System

The application includes a comprehensive theme system:

- **Default System Theme**: Automatically detects and applies user's OS preference
- **Theme Switcher**: Located next to the Bell button in the dashboard header
- **Available Themes**:
  - Light: Forces light theme
  - Dark: Forces dark theme
  - System: Follows OS preference and updates automatically
- **Persistence**: Theme preference is saved in localStorage
- **Real-time Updates**: Responds to system theme changes without page refresh
- **Powered by**: next-themes library for reliable theme management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
