# Project Lyra Backend

Backend API for the Project Lyra cybersecurity education platform.

## Features

- User authentication and authorization
- Module management and progress tracking
- Interactive challenges and assessments
- Dashboard analytics
- Role-based access control (Student, Instructor, Admin)
- RESTful API design
- MongoDB database integration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create a `.env` file based on `.env.example`
4. Start MongoDB service
5. Seed the database (optional):
   \`\`\`bash
   node utils/seedData.js
   \`\`\`

6. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `GET /api/users` - Get all users (admin only)

### Modules
- `GET /api/modules` - Get all published modules
- `GET /api/modules/:slug` - Get single module
- `POST /api/modules` - Create module (instructor/admin)
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module
- `POST /api/modules/:id/enroll` - Enroll in module

### Progress
- `GET /api/progress` - Get user's progress
- `GET /api/progress/module/:moduleId` - Get module progress
- `POST /api/progress/section` - Update section progress
- `POST /api/progress/quiz` - Submit quiz attempt
- `POST /api/progress/bookmark` - Add bookmark

### Challenges
- `GET /api/challenges` - Get all challenges
- `GET /api/challenges/:id` - Get single challenge
- `POST /api/challenges` - Create challenge (instructor/admin)
- `POST /api/challenges/:id/attempt` - Submit challenge attempt
- `GET /api/challenges/attempts/me` - Get user's attempts

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/analytics` - Get learning analytics

## Database Models

### User
- Authentication and profile information
- Role-based permissions
- Learning statistics and preferences

### Module
- Educational content and structure
- Quiz questions and assessments
- Publishing and metadata

### Progress
- User progress tracking
- Section completion status
- Quiz attempts and scores
- Bookmarks and notes

### Challenge
- Interactive security challenges
- Scoring and validation logic
- Performance statistics

### ChallengeAttempt
- User challenge submissions
- Scoring and feedback
- Time tracking

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet security headers

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Environment Variables
See `.env.example` for required environment variables.

### Database Seeding
Run `node utils/seedData.js` to populate the database with sample data including:
- Admin user (admin@projectlyra.com / admin123)
- Instructor user (instructor@projectlyra.com / instructor123)
- Sample modules and challenges

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
