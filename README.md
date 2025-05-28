# SAFE - internal safe software

## Features

- 🔐 **Authentication**: Secure user authentication with Clerk
- 📊 **Dashboard**: Comprehensive dashboard with training statistics
- 📈 **Analytics**: Advanced analytics page with charts and statistics based on database data
- 🔍 **Pages Database**: Advanced web search with SerpAPI integration (50 requests per search)
- ➕ **Manual Page Addition**: Add pages manually without using search API
- 🤖 **Automatic Processing**: Domain extraction, duplicate removal, and categorization during search
- 🧠 **AI Test**: Interactive AI testing with internet connectivity via OpenRouter API
- 💾 **SQLite Database**: Local data storage with search history and results
- 🎨 **Modern UI**: Built with chadcn/ui components and Tailwind CSS
- 📱 **Responsive**: Mobile-first responsive design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk
- **Database**: SQLite with better-sqlite3
- **Search API**: SerpAPI (Google Search Results)
- **UI Components**: chadcn/ui (shadcn/ui)
- **Charts**: Recharts for data visualization
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
  search_date: datetime (default current_timestamp)
  user_id: text
  processed: integer (default 0) -- 0=unprocessed, 1=processing, 2=completed, 3=error
  category: integer (default 0)
  created_at: datetime (default current_timestamp)
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
  slug: text (default null) -- WordPress username/login
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

Add your Clerk keys, SerpAPI key, and OpenRouter API key to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
SERPAPI_KEY=your_serpapi_key
OPENROUTER_API_KEY=your_openrouter_api_key
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
- **Serialized Error Storage**: Stores detailed error information in JSON format in `errors` field
- **Error Details**: Stores specific error messages for different failure scenarios:
  - DNS resolution errors
  - Connection timeouts (10s limit)
  - SSL certificate issues
  - HTTP status errors
  - Non-WordPress sites detection
- **Visual Error Display**:
  - Color-coded error messages in detail view:
    - 🟡 Yellow: No users found but WordPress detected
    - 🔵 Blue: Not a WordPress site
    - 🔴 Red: Connection or technical errors
  - Red user icon (👤) in results table with tooltip showing error details
- **Error Tooltips**: Hover over red user icon to see detailed error information with timestamps
- **Timestamp Tracking**: Records when fetch attempts were made and when errors occurred
- **Persistent Storage**: Users and error information saved to database
- **Minimal Data**: Only essential information is stored for better performance

## Analytics Dashboard (Implemented)

The analytics page provides comprehensive insights into search activity and database statistics:

### 📊 Overview Statistics

- **Total Results**: Count of all search results in database
- **WordPress Users**: Number of discovered WordPress users
- **Search Queries**: Count of unique search phrases
- **API Requests**: Total SerpAPI requests made

### 📈 Interactive Charts

- **Processing Status**: Pie chart showing processed vs unprocessed results
- **WordPress Fetch Status**: Distribution of WordPress API fetch results
- **Search Activity**: Line chart of search activity over last 30 days
- **Top Queries**: Bar chart of most popular search terms

### 🔍 Recent Activity

- **Last 7 Days**: Recent search activity with status indicators
- **Status Badges**: Visual indicators for processing and WordPress status
- **Quick Overview**: Title, link, and timestamp for each activity

### 📋 Data Sources

- **Real-time Data**: All statistics pulled directly from SQLite database
- **User-specific**: Analytics filtered by authenticated user
- **Comprehensive**: Covers all aspects of search and processing activity

### 🎨 Visual Features

- **Responsive Charts**: Built with Recharts library
- **Color-coded Status**: Different colors for various states
- **Interactive Tooltips**: Detailed information on hover
- **Loading States**: Skeleton loaders during data fetch

## Manual Page Addition (Implemented)

Users can manually add pages to the database without using the search API:

### ➕ Add Page Dialog

- **Modal Form**: Clean dialog interface for adding pages
- **Required Fields**: URL and search query are mandatory
- **Optional Fields**: Title and description can be added
- **URL Validation**: Real-time validation of URL format
- **Duplicate Prevention**: Checks if page already exists in database

### 📝 Form Fields

- **Link**: Full URL to the webpage (required, validated)
- **Search Query**: The search term this page relates to (required)
- **Title**: Page title (optional)
- **Description**: Brief description or snippet (optional)
- **Category**: Automatically set to 2 for manual entries

### 🔧 Technical Features

- **API Endpoint**: `/api/pages` for handling manual additions
- **Database Integration**: Uses `insertManualSearchResult()` method
- **User Authentication**: Only authenticated users can add pages
- **Error Handling**: Comprehensive error messages and validation
- **Success Feedback**: Visual confirmation when page is added

### 🎯 Use Cases

- **Known Websites**: Add specific sites you want to track
- **Competitor Analysis**: Manually add competitor pages
- **Reference Sites**: Add important industry websites
- **Custom Lists**: Build curated lists of relevant pages

### 🛡️ Validation & Security

- **URL Format**: Validates proper URL structure
- **Duplicate Check**: Prevents adding existing pages
- **User Isolation**: Each user can only see their own pages
- **Input Sanitization**: Trims whitespace and validates input

### 🎨 User Experience

- **Intuitive Interface**: Simple form with clear labels
- **Real-time Validation**: Immediate feedback on input errors
- **Loading States**: Shows progress during submission
- **Success Animation**: Visual confirmation of successful addition
- **Auto-refresh**: Updates page list after adding new page

## Public API Endpoints

The application provides public API endpoints that don't require authentication:

### 🔗 Get Unprocessed Result

**Endpoint**: `GET /api/public/unprocessed`

Returns one unprocessed or error result with a link from the database.

#### Response Format

**Success (200)**:

```json
{
  "success": true,
  "result": {
    "id": 1007,
    "search_query": "trener personalny chełm",
    "title": "kurs trenera personalnego",
    "link": "https://alms.wsei.lublin.pl",
    "search_date": "2025-05-26 12:16:22",
    "processed": 0,
    "category": 0,
    "created_at": "2025-05-26 12:16:22"
  }
}
```

**No Results (404)**:

```json
{
  "success": false,
  "message": "No unprocessed results found"
}
```

#### Features

- **No Authentication Required**: Public endpoint accessible without login
- **Filtered Results**: Only returns records where `processed = 0` (unprocessed) or `processed = 3` (error)
- **Link Required**: Only returns records that have a valid link field
- **Oldest First**: Returns the oldest unprocessed record (ordered by `created_at ASC`)
- **Single Result**: Always returns maximum 1 result
- **Complete Data**: Returns all available fields for the result

#### Use Cases

- **External Processing**: Allow external systems to fetch unprocessed pages
- **Queue Processing**: Implement external queue processors
- **Integration**: Connect with other tools and services
- **Monitoring**: Check if there are unprocessed items in the system

#### Example Usage

```bash
# Get one unprocessed result
curl -X GET http://localhost:3001/api/public/unprocessed

# With jq for formatted output
curl -X GET http://localhost:3001/api/public/unprocessed | jq
```

### 📝 Update Processed Status

**Endpoint**: `POST /api/public/unprocessed`

Updates the processed status of a specific record to 2 (completed).

#### Request Format

```json
{
  "id": 1007
}
```

#### Response Format

**Success (200)**:

```json
{
  "success": true,
  "message": "Record processed status updated to completed",
  "record": {
    "id": 1007,
    "link": "https://alms.wsei.lublin.pl",
    "title": "kurs trenera personalnego",
    "previous_processed": 0,
    "new_processed": 2
  }
}
```

**Validation Error (400)**:

```json
{
  "success": false,
  "error": "ID is required and must be a number"
}
```

**Record Not Found (404)**:

```json
{
  "success": false,
  "error": "Record not found"
}
```

#### Features

- **No Authentication Required**: Public endpoint accessible without login
- **Status Update**: Changes `processed` field from any value to 2 (completed)
- **Validation**: Validates that ID is provided and is a number
- **Record Verification**: Checks if record exists before updating
- **Response Details**: Returns previous and new processed status for confirmation
- **Error Handling**: Comprehensive error messages for different failure scenarios

#### Use Cases

- **Mark as Processed**: External systems can mark records as completed after processing
- **Workflow Integration**: Connect with external processing pipelines
- **Status Tracking**: Update processing status from external tools
- **Queue Management**: Mark items as completed in processing queues

#### Example Usage

```bash
# Update record ID 1007 to processed status 2
curl -X POST http://localhost:3001/api/public/unprocessed \
  -H "Content-Type: application/json" \
  -d '{"id": 1007}'

# With jq for formatted output
curl -X POST http://localhost:3001/api/public/unprocessed \
  -H "Content-Type: application/json" \
  -d '{"id": 1007}' | jq
```

## AI Test with Internet Connectivity (Implemented)

The AI Test page provides a comprehensive interface for testing various AI models with optional internet connectivity through OpenRouter API:

### 🧠 Model Selection

- **Multiple AI Models**: Support for 15+ different AI models including:
  - OpenAI GPT-4o, GPT-4o Mini, GPT-4.1
  - Google Gemini 2.5 Pro, Gemini Flash 1.5
  - Anthropic Claude Sonnet 4
  - DeepSeek Chat V3, DeepSeek R1
  - Perplexity Sonar models with built-in online capabilities
  - Microsoft MAI, Mistral, Qwen models
- **Free Models**: Many free-tier models available for testing
- **Premium Models**: Access to advanced models with enhanced capabilities

### 🌐 Internet Connectivity Features

#### Web Search Integration

- **Toggle Control**: Easy on/off switch for internet access
- **Multiple Approaches**:
  - `:online` suffix for supported models (OpenAI, Anthropic, Google)
  - Web plugin for other models
  - Native online models (Perplexity Sonar)
- **Search Context Size**: Configurable context levels:
  - **Low**: Minimal search context, suitable for basic queries
  - **Medium**: Moderate search context, good for general queries
  - **High**: Extensive search context, ideal for detailed research
- **Max Results**: Control number of search results (1-10)

#### Pricing Transparency

- **Cost Display**: Shows token usage and estimated costs
- **Context-based Pricing**: Different costs based on search context size
- **Plugin Pricing**: $4 per 1000 results for web plugin usage

### 📊 Response Features

#### Rich Response Display

- **Markdown Rendering**: Properly formatted responses with syntax highlighting
- **Copy to Clipboard**: One-click copying of AI responses
- **Real-time Streaming**: Live response generation display
- **Error Handling**: Comprehensive error messages and validation

#### Web Citations

- **Source Links**: Clickable links to web sources used by AI
- **Citation Metadata**: Title, URL, and content snippets
- **Visual Indicators**: Globe icons and external link indicators
- **Organized Display**: Clean, card-based layout for citations

### 🔧 Technical Implementation

#### API Integration

- **OpenRouter API**: Unified interface for multiple AI providers
- **Request Customization**: Dynamic request body based on model and settings
- **Error Handling**: Robust error handling with detailed messages
- **Response Processing**: Standardized response format with annotations

#### Model-Specific Handling

- **Online Models**: Automatic detection of models with built-in web capabilities
- **Suffix Addition**: Automatic `:online` suffix for compatible models
- **Plugin Fallback**: Web plugin for models without native online support
- **Context Options**: Search context size for supported models

### 🎯 Use Cases

#### Research & Analysis

- **Current Information**: Access to real-time web data
- **Fact Checking**: Verify information with web sources
- **Market Research**: Get latest market trends and data
- **News Analysis**: Access current news and events

#### Development & Testing

- **API Testing**: Test different AI models and capabilities
- **Prompt Engineering**: Experiment with prompts and web search
- **Cost Analysis**: Compare costs across different models and settings
- **Performance Testing**: Evaluate response quality and speed

#### Content Creation

- **Research-backed Content**: Create content with web-sourced information
- **Current Events**: Write about latest developments
- **Data-driven Insights**: Generate insights based on current data
- **Competitive Analysis**: Research competitors and market trends

### 🛡️ Security & Privacy

#### API Key Management

- **Environment Variables**: Secure storage of OpenRouter API key
- **Server-side Processing**: API calls made from secure backend
- **No Client Exposure**: API keys never exposed to client-side code

#### User Authentication

- **Protected Routes**: AI Test page requires authentication
- **User Isolation**: Each user's usage is tracked separately
- **Session Management**: Secure session handling via Clerk

### 🎨 User Experience

#### Intuitive Interface

- **Clean Design**: Modern, responsive interface using chadcn/ui
- **Visual Feedback**: Loading states, success indicators, error messages
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Proper labels, keyboard navigation, screen reader support

#### Advanced Controls

- **Collapsible Settings**: Web search controls expand when enabled
- **Smart Defaults**: Sensible default values for all settings
- **Real-time Validation**: Immediate feedback on form inputs
- **Persistent State**: Form state maintained during session

### 📈 Monitoring & Analytics

#### Usage Tracking

- **Token Counting**: Display input, output, and total tokens
- **Cost Calculation**: Show estimated costs for API usage
- **Model Information**: Display which model was actually used
- **Web Search Status**: Indicate when web search was enabled

#### Performance Metrics

- **Response Time**: Track how long requests take
- **Success Rate**: Monitor API call success/failure rates
- **Error Logging**: Detailed error logging for debugging
- **Usage Statistics**: Track usage patterns and popular models

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
