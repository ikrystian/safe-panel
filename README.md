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
  wp_fetch_status: text (default null) -- 'success', 'error', 'no_users', 'not_wordpress'
  wp_fetch_error: text (default null) -- detailed error message
  wp_fetch_attempted_at: datetime (default null) -- when fetch was attempted
}

search_pagination {
  id: integer (primary key, autoincrement)
  search_query: text (not null)
  user_id: text (not null)
  last_start_position: integer (default 0)
  total_requests_made: integer (default 0)
  last_updated: datetime (default current_timestamp)
  UNIQUE(search_query, user_id)
}

wordpress_users {
  id: integer (primary key, autoincrement)
  search_result_id: integer (not null, foreign key)
  wp_user_id: integer (not null)
  name: text (not null)
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

## Search Functionality

The application provides comprehensive search capabilities:

- **SerpAPI Integration**: Uses Google Search Results API for web scraping
- **Bulk Processing**: Executes 50 API requests per search query
- **Smart Pagination**: Remembers where you left off and continues from the last position
- **Domain Extraction**: Automatically extracts and stores main domains from URLs
- **Duplicate Prevention**: Checks for existing domains before saving
- **Category Assignment**: Automatically assigns category value 2 to all results
- **Processing Status**: Marks all results as processed (value 1) upon saving
- **Search History**: Maintains history of all search queries with result counts
- **User Isolation**: Each user sees only their own search results
- **Detailed Views**: Click on any result row to view detailed information
- **Interactive Tables**: Clickable rows with hover effects for better UX

### Pagination System

The application includes an intelligent pagination system:

- **State Persistence**: Remembers the last search position for each query
- **Continue Search**: Button to continue from where you left off
- **Reset Option**: Ability to start fresh from the beginning
- **Progress Tracking**: Shows total API requests made and next start position
- **Automatic Management**: Pagination state is automatically saved and restored
- **Query-Specific**: Each search query has its own independent pagination state

#### Example Usage:

1. **Search "wordpress plugins"** → Gets results 0-499 (50 requests), saves position 500
2. **Search "react components"** → Gets results 0-499 (50 requests), saves position 500
3. **Continue "wordpress plugins"** → Gets results 500-999 (next 50 requests), saves position 1000
4. **Continue "react components"** → Gets results 500-999 (next 50 requests), saves position 1000
5. **Each query maintains its own pagination state independently**

### Result Details

Each search result can be viewed in detail:

- **Clickable Rows**: Click any row in the results table to view detailed information
- **Detailed View Page**: Dedicated page showing all result metadata
- **Website Processing**: Process website status with `processWebsite` function
- **WordPress Users**: Automatically fetches and displays WordPress users from the website
- **User Information**: Shows name, login (slug), description, and avatar for each user
- **External Links**: Quick access to the original webpage and user profiles
- **Metadata Display**: Shows ID, position, category, dates, and more
- **Navigation**: Easy return to the main results table

### WordPress Integration

The application fetches and stores WordPress user data when processing websites:

- **On-Demand Fetching**: Users are fetched only when clicking "Przetwórz stronę" button
- **Database Storage**: WordPress users are stored in the database for fast access
- **REST API**: Uses `/wp-json/wp/v2/users` endpoint to fetch user data
- **User Data**: Stores WordPress user ID and name only (simplified structure)
- **Advanced Error Handling**: Detailed error tracking and reporting with specific error messages
- **Error Status Tracking**: Records fetch status ('success', 'error', 'no_users', 'not_wordpress')
- **Error Details**: Stores specific error messages for different failure scenarios:
  - DNS resolution errors
  - Connection timeouts (10s limit)
  - SSL certificate issues
  - HTTP status errors
  - Non-WordPress sites detection
- **Visual Error Display**: Color-coded error messages in the interface:
  - 🟡 Yellow: No users found but WordPress detected
  - 🔵 Blue: Not a WordPress site
  - 🔴 Red: Connection or technical errors
- **Timestamp Tracking**: Records when fetch attempts were made
- **Persistent Storage**: Users and error information saved to database
- **Minimal Data**: Only essential information is stored for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
