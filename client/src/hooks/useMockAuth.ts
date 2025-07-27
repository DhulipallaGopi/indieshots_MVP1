// Mock user data for testing the application without authentication
export const mockUser = {
  id: 1,
  email: "demo@indieshots.com",
  firstName: "Demo",
  lastName: "User",
  tier: "free" as const,
  totalPages: 20,
  usedPages: 0,
  emailVerified: true,
  profileImageUrl: null,
  provider: "local" as const,
  providerId: null,
  password: null,
  verificationToken: null,
  resetToken: null,
  resetTokenExpiry: null,
  magicLinkToken: null,
  magicLinkExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock scripts data for testing
export const mockScripts = [
  {
    id: 1,
    userId: 1,
    title: "Sample Action Script",
    filename: "action_script.pdf",
    fileSize: 2048576,
    filePath: "/uploads/sample1.pdf",
    pageCount: 45,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    userId: 1,
    title: "Drama Screenplay",
    filename: "drama_script.docx",
    fileSize: 1536000,
    filePath: "/uploads/sample2.docx", 
    pageCount: 62,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  }
];

// Mock parse jobs data
export const mockParseJobs = [
  {
    id: 1,
    scriptId: 1,
    userId: 1,
    status: "completed" as const,
    selectedColumns: ["Scene", "Shot", "Location", "Characters"],
    results: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  }
];