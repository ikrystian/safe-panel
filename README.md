# SAFE - internal safe software

## Features

- 🔐 **Authentication**: Secure user authentication with NextAuth.js
- 📊 **Dashboard**: Comprehensive dashboard with training statistics
- 📈 **Analytics**: Advanced analytics page with charts and statistics based on database data
- 🔍 **Pages Database**: Advanced web search with SerpAPI integration (50 requests per search)
- ➕ **Manual Page Addition**: Add pages manually without using search API
- 🤖 **Automatic Processing**: Domain extraction, duplicate removal, and categorization during search
- 🧠 **AI Test**: Interactive AI testing with AI Agent for opening web pages and analyzing content
- 💾 **SQLite Database**: Local data storage with search history and results
- 🎨 **Modern UI**: Built with chadcn/ui components and Tailwind CSS
- 📱 **Responsive**: Mobile-first responsive design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **Search API**: SerpAPI (Google Search Results)
- **UI Components**: chadcn/ui (shadcn/ui)
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Language**: TypeScript

## Database Structure

The application uses NextAuth.js for user management and authentication with MongoDB. The database structure includes:

### Users

- Managed by NextAuth.js authentication
- User profiles with name, email, and hashed passwords
- MongoDB storage for user data

### Search Results (Implemented)

```javascript
// MongoDB Collections using Mongoose schemas

// Users Collection
{
  _id: ObjectId,
  email: String (required, unique, lowercase, trim),
  password: String (required),
  name: String (trim),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

// SearchResults Collection (history_scrapped equivalent)
{
  _id: ObjectId,
  search_query: String (required, indexed),
  title: String,
  link: String,
  search_date: Date (default: now, indexed),
  user_id: ObjectId (ref: User, required, indexed),
  processed: Number (default: 0), // 0=unprocessed, 1=processing, 2=completed, 3=error
  category: Number (default: 0),
  contact_url: String, // URL to contact page
  is_wordpress: Boolean (default: false), // Whether site uses WordPress
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

// SearchPagination Collection
{
  _id: ObjectId,
  search_query: String (required),
  user_id: ObjectId (ref: User, required),
  last_start_position: Number (default: 0),
  total_requests_made: Number (default: 0),
  last_updated: Date (default: now),
  createdAt: Date (auto),
  updatedAt: Date (auto)
  // Compound unique index on (search_query, user_id)
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

Add your NextAuth secret, SerpAPI key, and OpenRouter API key to `.env.local`:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
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
└── middleware.ts         # NextAuth.js middleware for route protection
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Authentication & Security

- Protected routes using NextAuth.js middleware
- Dashboard routes require authentication
- User session management handled by NextAuth.js
- Secure sign-in/sign-up flows with bcrypt password hashing
- Local SQLite database for user management

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

### 📝 Update Records Metadata

**Endpoint**: `POST /api/update-metadata`

Updates multiple records with contact URL, category, and WordPress detection information. This endpoint does not require authentication.

#### Request Format

```json
[
  {
    "id": 1,
    "contact_url": "https://dev.gal-bud.pl/kontakt",
    "category": "Budownictwo",
    "is_wordpress": false
  },
  {
    "id": 2,
    "contact_url": "https://example.com/contact",
    "category": "Technology",
    "is_wordpress": true
  }
]
```

#### Response Format

**Success (200)**:

```json
{
  "success": true,
  "message": "Successfully updated 2 records",
  "updated": 2,
  "total_requested": 2
}
```

**Partial Success (200)** - Some records updated, some failed:

```json
{
  "success": true,
  "message": "Successfully updated 1 records",
  "updated": 1,
  "total_requested": 2,
  "errors": [
    {
      "id": 999,
      "error": "Record not found"
    }
  ]
}
```

**Validation Error (400)**:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Item at index 0: id must be a number",
    "Item at index 1: contact_url must be a string"
  ]
}
```

#### Field Descriptions

- **id** (number, required): The ID of the record in history_scrapped table
- **contact_url** (string, required): URL to the contact page
- **category** (string, required): Business category (e.g., "Budownictwo", "Technology")
- **is_wordpress** (boolean, required): Whether the site is built with WordPress

#### Use Cases

- **Metadata Enhancement**: Add contact information and categorization to scraped results
- **WordPress Detection**: Mark sites that use WordPress CMS
- **Bulk Updates**: Update multiple records in a single request
- **External Processing**: Allow external systems to enrich data without authentication

#### Example Usage

```bash
# Update multiple records with metadata
curl -X POST http://localhost:3001/api/update-metadata \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": 1,
      "contact_url": "https://dev.gal-bud.pl/kontakt",
      "category": "Budownictwo",
      "is_wordpress": false
    },
    {
      "id": 2,
      "contact_url": "https://example.com/contact",
      "category": "Technology",
      "is_wordpress": true
    }
  ]'

# With jq for formatted output
curl -X POST http://localhost:3001/api/update-metadata \
  -H "Content-Type: application/json" \
  -d '[{"id": 1, "contact_url": "https://dev.gal-bud.pl/kontakt", "category": "Budownictwo", "is_wordpress": false}]' | jq
```

## AI Test with AI Agent for Web Page Analysis (Implemented)

The AI Test page provides a comprehensive interface for testing various AI models with optional AI Agent that can open web pages and analyze their content:

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

### 🌐 AI Agent Features

#### Web Page Analysis Integration

- **Toggle Control**: Easy on/off switch for AI Agent functionality
- **URL Detection**: Automatically extracts URLs from user prompts
- **Web Page Fetching**: Downloads and processes content from specified URLs
- **Content Analysis**: AI analyzes web page content based on user prompts
- **Analysis Depth**: Configurable analysis levels:
  - **Podstawowa**: Basic analysis, focuses on main information
  - **Średnia**: Moderate analysis, includes details and context
  - **Szczegółowa**: Detailed analysis, comprehensive information and relationships
- **Max Pages**: Control number of pages to process (1-5)

#### Error Handling

- **URL Validation**: Validates and processes URLs from prompts
- **Connection Errors**: Handles timeouts, DNS errors, and HTTP errors
- **Content Processing**: Extracts text content from HTML pages
- **Graceful Degradation**: Continues processing even if some pages fail

### 📊 Response Features

#### Rich Response Display

- **Markdown Rendering**: Properly formatted responses with syntax highlighting
- **Copy to Clipboard**: One-click copying of AI responses
- **Real-time Streaming**: Live response generation display
- **Error Handling**: Comprehensive error messages and validation

#### Web Page Citations

- **Source Links**: Clickable links to analyzed web pages
- **Page Metadata**: Title, URL, and content snippets from processed pages
- **Visual Indicators**: Globe icons and external link indicators
- **Organized Display**: Clean, card-based layout for page citations
- **Error Display**: Shows errors for pages that couldn't be processed

### 🔧 Technical Implementation

#### AI Agent Integration

- **Custom AI Agent**: Built-in AI Agent for web page processing
- **URL Extraction**: Automatic URL detection from user prompts using regex patterns
- **Web Fetching**: HTTP requests with proper headers and timeout handling
- **Content Processing**: HTML parsing and text extraction
- **AI Analysis**: Content analysis using selected AI model

#### Technical Features

- **Timeout Handling**: 10-second timeout for web requests
- **Error Recovery**: Graceful handling of failed page loads
- **Content Limits**: Automatic content truncation to avoid token limits
- **Multiple URLs**: Support for processing multiple URLs in single prompt

### 🎯 Use Cases

#### Research & Analysis

- **Web Page Analysis**: Analyze specific web pages and their content
- **Content Comparison**: Compare multiple web pages side by side
- **Information Extraction**: Extract specific information from web pages
- **Website Evaluation**: Evaluate website content, structure, and purpose

#### Development & Testing

- **AI Model Testing**: Test different AI models with web content analysis
- **Prompt Engineering**: Experiment with prompts for web page analysis
- **Web Scraping Testing**: Test web content extraction capabilities
- **Performance Testing**: Evaluate AI analysis quality and speed

#### Content Creation

- **Content Analysis**: Analyze existing web content for insights
- **Competitive Research**: Research competitor websites and content
- **Website Reviews**: Generate detailed reviews of websites
- **Content Summarization**: Summarize long web pages and articles

### 🛡️ Security & Privacy

#### API Key Management

- **Environment Variables**: Secure storage of OpenRouter API key
- **Server-side Processing**: API calls made from secure backend
- **No Client Exposure**: API keys never exposed to client-side code

#### User Authentication

- **Protected Routes**: AI Test page requires authentication
- **User Isolation**: Each user's usage is tracked separately
- **Session Management**: Secure session handling via NextAuth.js

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
