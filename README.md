# IndieShots - Screenplay to Shot List Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

A sophisticated full-stack application that converts screenplay scripts into structured shot lists using AI-powered analysis. Designed for independent filmmakers and content creators to streamline their pre-production workflow.

## 🎬 Features

- **📄 Multi-Format Script Upload**: Support for PDF, DOCX, and TXT screenplay formats
- **🤖 AI-Powered Scene Analysis**: Intelligent extraction of scenes, characters, locations, and actions using OpenAI GPT-4
- **🎯 Scene-by-Scene Workflow**: Upload → Scene Selection → Shot Generation → Storyboard Creation
- **🎨 AI Storyboard Generation**: Create visual storyboards with customizable prompts
- **📊 Customizable Export**: Select specific data fields and export as XLSX or CSV
- **👥 User Management**: Tier-based subscription system (Free/Pro)
- **⚡ Real-time Processing**: Background job processing with live status updates
- **🔐 Multiple Authentication**: Firebase Auth with Google OAuth and email/password

## 🚀 Live Demo

- **Production**: [www.indieshots.replit.app](https://www.indieshots.replit.app)
- **Development**: [workspace.shruti37.replit.app](https://workspace.shruti37.replit.app)

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **Vite** for fast development builds
- **Firebase Authentication**

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **PostgreSQL** with Drizzle ORM
- **OpenAI GPT-4** integration
- **Multer** for file processing
- **JWT** and session-based authentication

## 📋 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Firebase project (optional, for Google OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/indishots/IndieShots.git
   cd IndieShots
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure these required variables:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/indieshots
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret
   
   # Optional: Firebase Auth (for Google OAuth)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🎯 Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Upload Script**: Upload your screenplay (PDF, DOCX, or TXT)
3. **Select Scenes**: Choose which scenes to process
4. **Generate Shots**: AI analyzes and creates detailed shot lists
5. **Create Storyboards**: Generate visual storyboards for your shots
6. **Export**: Download your shot lists as CSV or XLSX files

## 🏗 Project Structure

```
IndieShots/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Express.js backend
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   └── utils/              # Server utilities
├── shared/                 # Shared types and schemas
├── docs/                   # Documentation
└── screenshots/            # Application screenshots
```

## 🚀 Deployment

### Replit Deployment (Recommended)

1. **Fork/Import** this repository to Replit
2. **Configure environment variables** in Replit Secrets
3. **Click Deploy** in the Replit sidebar
4. **Set domain**: `your-app.replit.app`

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/firebase-login` - Firebase authentication
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - Logout

### Script Processing
- `POST /api/scripts` - Upload screenplay
- `GET /api/scripts` - Get user scripts
- `POST /api/parse-jobs` - Create parsing job
- `GET /api/shots/:parseJobId` - Get generated shots

### Storyboards
- `POST /api/storyboards/generate` - Generate storyboard images
- `POST /api/storyboards/regenerate` - Regenerate specific image

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Firebase for authentication services
- shadcn/ui for beautiful UI components
- The independent filmmaking community for inspiration

## 📞 Support

- **Email**: indieshots@theindierise.com
- **Issues**: [GitHub Issues](https://github.com/indishots/IndieShots/issues)
- **Documentation**: [Project Wiki](https://github.com/indishots/IndieShots/wiki)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Database
   DATABASE_URL=your_postgresql_url
   
   # OpenAI
   OPENAI_API_KEY=your_openai_key
   
   # Firebase (optional)
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Run the application**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:5000` with both frontend and backend running.

## Demo Mode

The application includes a comprehensive demo environment with:
- Sample screenplay data (action thriller, urban drama, sci-fi)
- Mock user with 100 page limit (25 pages used)
- Completed parse jobs with downloadable results
- Full functionality without authentication barriers

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared types and schemas
├── assets/          # Static assets
├── docs/            # Documentation
├── scripts/         # Utility scripts
└── screenshots/     # Application screenshots
```

## API Endpoints

- `GET /api/scripts` - List user scripts
- `POST /api/scripts` - Upload new script
- `GET /api/jobs` - List parse jobs
- `POST /api/jobs` - Create parse job
- `GET /api/jobs/:id/download` - Download results

## Development

The application uses modern development practices:
- TypeScript for type safety
- ESLint and Prettier for code quality
- Hot module replacement for fast development
- Centralized error handling
- Comprehensive logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

# Trigger Cloud Build
Just testing trigger for deployment 🚀

## License

This project is licensed under the MIT License.