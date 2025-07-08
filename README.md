# ETSA Website

The official website for ETSA, a professional meetup organization based in Knoxville, TN.

## Features

- **Modern Design**: Built with Next.js 15, TypeScript, and Tailwind CSS
- **Blog System**: Markdown-based blog system for past speaker presentations
- **Photo Carousel**: Rotating photos from meetup events with visible captions
- **Dark/Light Mode**: Full theme support with system preference detection
- **Responsive Design**: Mobile-first design that works on all devices
- **SEO Optimized**: Proper meta tags, structured data, and performance optimization
- **Tagging System**: Categorize and filter presentations by technology topics

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Content**: Markdown with gray-matter for frontmatter
- **Deployment**: Netlify with automatic builds
- **Icons**: Heroicons and custom SVGs

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/etsa-tech/etsa.tech.git
cd etsa.tech
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── about/          # About page
│   │   ├── contact/        # Contact page
│   │   ├── speakers/       # Speaker listing and individual pages
│   │   ├── tag/            # Tag-based filtering pages
│   │   ├── layout.tsx      # Root layout with theme provider
│   │   ├── page.tsx        # Homepage
│   │   └── globals.css     # Global styles and Tailwind config
│   ├── components/         # Reusable React components
│   │   ├── Header.tsx      # Navigation header
│   │   ├── Footer.tsx      # Site footer
│   │   ├── ThemeProvider.tsx # Dark/light mode provider
│   │   ├── ThemeToggle.tsx # Theme switcher button
│   │   ├── PhotoCarousel.tsx # Image carousel component
│   │   ├── CurrentSpeaker.tsx # Latest speaker display
│   │   ├── PostCard.tsx    # Blog post preview card
│   │   └── TagList.tsx     # Tag display and filtering
│   ├── lib/                # Utility functions
│   │   └── blog.ts         # Blog/markdown processing utilities
│   └── types/              # TypeScript type definitions
│       └── post.ts         # Blog post type definitions
├── posts/                  # Markdown blog posts
├── public/                 # Static assets
├── tailwind.config.ts      # Tailwind CSS configuration
├── next.config.ts          # Next.js configuration
├── netlify.toml           # Netlify deployment configuration
└── package.json           # Dependencies and scripts
```

## Content Management

### Adding New Speaker Posts

1. Create a new markdown file in the `posts/` directory
2. Use the following frontmatter structure:

```yaml
---
title: "Presentation Title"
date: "2024-01-15"
excerpt: "Brief description of the presentation"
tags: ["Technology", "Topic", "Category"]
author: "ETSA"
speakerName: "Speaker Name"
speakerTitle: "Job Title"
speakerCompany: "Company Name"
speakerBio: "Brief speaker biography"
speakerLinkedIn: "https://linkedin.com/in/speaker"
speakerGitHub: "https://github.com/speaker"
speakerWebsite: "https://speaker.com"
presentationTitle: "Presentation Title"
presentationDescription: "Detailed description"
presentationSlides: "https://slides.example.com"
presentationVideo: "https://youtube.com/watch?v=..."
eventDate: "2024-01-15"
eventLocation: "Event Location"
featured: false
published: true
---

# Your markdown content here
```

3. The post will automatically appear on the speakers page and be available for filtering by tags.

### Managing Photos

1. Add photos to `public/images/meetup-photos/`
2. Update the photo carousel data in `src/app/page.tsx`
3. Use high-quality images (recommended: 800x400px minimum)

## Customization

### Branding

The site uses a custom color scheme defined in `tailwind.config.ts`:
- **Primary**: Blue tones for ETSA branding
- **Secondary**: Professional grays
- **Accent**: Orange highlights

### Theme System

The site supports light/dark modes with:
- System preference detection
- Manual toggle
- Persistent user preference
- Smooth transitions

## Deployment

### Netlify (Recommended)

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Deploy automatically on push to main branch

The `netlify.toml` file includes:
- Build configuration
- Security headers
- Performance optimizations
- Caching rules

### Manual Deployment

```bash
# Build the project
npm run build

# Export static files (if needed)
npm run export
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for styling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Content Contributions

- Speaker presentations are welcome
- Follow the markdown frontmatter format
- Include proper attribution
- Ensure content is relevant to systems administration/DevOps

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

- **Website**: [https://etsa.tech](https://etsa.tech)
- **Email**: info@etsa.tech
- **Meetup**: [https://www.meetup.com/etsa-tech](https://www.meetup.com/etsa-tech)
- **LinkedIn**: [https://www.linkedin.com/company/etsa-tech](https://www.linkedin.com/company/etsa-tech)
- **GitHub**: [https://github.com/etsa-tech](https://github.com/etsa-tech)

## Acknowledgments

- Built with inspiration from [wesleyk.me](https://wesleykme.netlify.app)
- Thanks to all ETSA speakers and community members
- Powered by the amazing Next.js and Tailwind CSS communities
