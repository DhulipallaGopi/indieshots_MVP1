export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const faqCategories = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'file-upload', label: 'File Upload' },
  { id: 'ai-features', label: 'AI Features' },
  { id: 'storyboards', label: 'Storyboards' },
  { id: 'export', label: 'Export' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'security', label: 'Security' },
  { id: 'technical', label: 'Technical' },
  { id: 'support', label: 'Support' },
  { id: 'account', label: 'Account' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'billing', label: 'Billing' },
  { id: 'languages', label: 'Languages' },
  { id: 'shot-lists', label: 'Shot Lists' }
];

export const faqs: FAQ[] = [
  {
    id: 'what-is-indieshots',
    question: 'What is IndieShots?',
    answer: 'IndieShots is an AI-powered platform that transforms screenplay scripts into professional filmmaking resources. Upload your script and get structured shot lists, visual storyboards, and production planning tools to streamline your pre-production workflow.',
    category: 'general'
  },
  {
    id: 'supported-file-formats',
    question: 'What file formats does IndieShots support?',
    answer: 'IndieShots supports PDF, DOCX (Microsoft Word), and TXT file formats. You can upload scripts up to 10MB in size. Our AI can process both standard screenplay format and narrative text.',
    category: 'file-upload'
  },
  {
    id: 'ai-script-analysis',
    question: 'How does the AI script analysis work?',
    answer: 'Our AI uses advanced language models to analyze your script and identify scenes, characters, locations, time of day, camera movements, and other production elements. It breaks down your story into actionable shots with detailed production notes.',
    category: 'ai-features'
  },
  {
    id: 'free-vs-pro-plans',
    question: "What's the difference between Free and Pro plans?",
    answer: 'Free users can process up to 10 pages per month and generate 5 shots with CSV export. Pro users get unlimited pages, unlimited shots, storyboard generation with AI images, Excel export, and priority support.',
    category: 'pricing'
  },
  {
    id: 'storyboard-generation',
    question: 'How does storyboard generation work?',
    answer: 'Pro users can generate AI-powered visual storyboards from their shot lists. Our system creates cinematic images based on shot descriptions, camera angles, lighting, and mood specifications. Each storyboard frame is tailored to your specific scene requirements.',
    category: 'storyboards'
  },
  {
    id: 'export-formats',
    question: 'What export formats are available?',
    answer: 'All users can export shot lists as CSV files. Pro users can also export as Excel (.xlsx) files with professional formatting. Storyboards can be downloaded as ZIP archives containing individual image files.',
    category: 'export'
  },
  {
    id: 'data-security',
    question: 'Is my script data secure and private?',
    answer: 'Yes, your scripts and data are completely secure. We use industry-standard encryption, secure cloud storage, and never share your content with third parties. You maintain full ownership of your creative work.',
    category: 'security'
  },
  {
    id: 'scene-selection',
    question: 'How do I select scenes for shot generation?',
    answer: 'After uploading your script, our AI automatically divides it into scenes. You can then select specific scenes to generate detailed shot lists for, allowing you to work on your project scene by scene.',
    category: 'workflow'
  },
  {
    id: 'customize-shot-fields',
    question: 'Can I customize the shot list fields?',
    answer: 'Our system generates comprehensive shot lists with 19 production fields including shot type, camera movement, lighting, props, characters, and more. The fields are professionally curated for filmmaking workflows.',
    category: 'shot-lists'
  },
  {
    id: 'team-collaboration',
    question: 'Can I share my projects with team members?',
    answer: 'Currently, projects are private to individual accounts. Team collaboration features are planned for future releases. You can export and share your shot lists and storyboards with your production team.',
    category: 'collaboration'
  },
  {
    id: 'mobile-support',
    question: 'Does IndieShots work on mobile devices?',
    answer: 'Yes, IndieShots is fully responsive and works on mobile devices, tablets, and desktops. The interface adapts to your screen size for optimal viewing and interaction.',
    category: 'technical'
  },
  {
    id: 'pro-billing',
    question: 'How does Pro plan billing work?',
    answer: 'Pro plans are billed monthly or annually through secure payment processing. You can upgrade or cancel anytime from your account settings. Pro features are immediately available upon successful payment.',
    category: 'billing'
  },
  {
    id: 'script-languages',
    question: 'Does IndieShots support scripts in different languages?',
    answer: 'IndieShots works best with English scripts. Support for additional languages is planned for future updates. Our AI can process scripts with standard screenplay formatting regardless of some language variations.',
    category: 'languages'
  },
  {
    id: 'get-help',
    question: 'How do I get help if I encounter issues?',
    answer: 'You can contact our support team at indieshots@theindierise.com. Pro users receive priority support with faster response times. You can also check this FAQ section for common questions.',
    category: 'support'
  },
  {
    id: 'export-before-delete',
    question: 'Can I export my data before deleting my account?',
    answer: 'Yes, you can export all your data from the Settings page before deleting your account. This includes your scripts, shot lists, storyboards, and project metadata as a downloadable ZIP file.',
    category: 'account'
  }
];