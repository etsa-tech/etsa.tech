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
# Required Fields
title: "Presentation Title" # Main title of the presentation
date: "2024-01-15" # Publication date (YYYY-MM-DD format)
excerpt: "Brief description of the presentation" # Short summary for cards and previews
tags: ["Technology", "Topic", "Category"] # Array of tags for categorization
author: "ETSA" # Content author (usually "ETSA")

# Speaker Information (Optional)
speakerName: "Speaker Name" # Full name of the presenter
speakerTitle: "Job Title" # Professional title/role
speakerCompany: "Company Name" # Current employer/organization
speakerBio: "Brief speaker biography" # Professional background and expertise
speakerImage: "/images/speakers/speaker.jpg" # Profile photo path (optional)
speakerLinkedIn: "https://linkedin.com/in/speaker" # LinkedIn profile URL
speakerTwitter: "https://twitter.com/speaker" # Twitter/X profile URL
speakerGitHub: "https://github.com/speaker" # GitHub profile URL
speakerWebsite: "https://speaker.com" # Personal/professional website

# Presentation Details (Optional)
presentationTitle: "Presentation Title" # Specific presentation title (if different from main title)
presentationDescription: "Detailed description" # Extended description of the content
presentationSlides: "https://slides.example.com" # Link to slides (Google Slides, SlideShare, etc.)

# Event Information (Optional)
eventDate: "2024-01-15" # Date when presentation was given
eventLocation: "Event Location" # Physical location where event occurred
meetingDate: "First Tuesday of each month at 7:00 PM" # Next meeting date/schedule
meetingLocation: # Custom meeting location object
  name: "Knoxville Entrepreneur Center" # Venue name
  address: "17 Market Square SUITE 101, Knoxville, TN 37902" # Full address
  coordinates: # GPS coordinates (optional)
    lat: 35.965179
    lng: -83.919846
  description: "Our regular meeting location" # Venue description
  parking: "Free street parking available" # Parking information
  accessibility: "Wheelchair accessible" # Accessibility details
  contact: "Located in downtown Market Square" # Additional contact/location info

# Content Management (Optional)
featured: false # Whether to feature this post prominently
published: true # Whether the post is published (false = draft)
---
# Your markdown content here
```

3. The post will automatically appear on the speakers page and be available for filtering by tags.

### Metadata Field Descriptions

#### Required Fields

- **title**: The main title displayed on cards and the post page
- **date**: Publication date in YYYY-MM-DD format, used for sorting posts
- **excerpt**: Short description shown on post cards and in search results
- **tags**: Array of technology/topic tags for categorization and filtering
- **author**: Content author, typically "ETSA" for consistency

#### Speaker Information

All speaker fields are optional but recommended for speaker presentations. You can use either the legacy single speaker format or the new multiple speakers format:

**Legacy Single Speaker Format (for backward compatibility):**

- **speakerName**: Full name of the presenter
- **speakerTitle**: Professional title or role
- **speakerCompany**: Current employer or organization
- **speakerBio**: Professional background, expertise, and relevant experience
- **speakerImage**: Path to speaker's profile photo (store in `/public/images/speakers/`)
- **speakerLinkedIn**: LinkedIn profile URL for professional networking
- **speakerTwitter**: Twitter/X profile URL for social media presence
- **speakerGitHub**: GitHub profile URL for code repositories
- **speakerWebsite**: Personal or professional website URL

**New Multiple Speakers Format (recommended):**

- **speakers**: Array of speaker objects, each containing:
  - **name**: Full name of the presenter (required)
  - **title**: Professional title or role (optional)
  - **company**: Current employer or organization (optional)
  - **bio**: Professional background and expertise (optional)
  - **image**: Path to speaker's profile photo (optional)
  - **linkedIn**: LinkedIn profile URL (optional)
  - **twitter**: Twitter/X profile URL (optional)
  - **github**: GitHub profile URL (optional)
  - **website**: Personal or professional website URL (optional)

#### Presentation Resources

- **presentationTitle**: Specific presentation title if different from main title
- **presentationDescription**: Extended description of the presentation content
- **presentationSlides**: Direct link to slides (Google Slides, SlideShare, PDF, etc.)
- **recordingUrl**: Link to the official meeting recording (automatically displayed with friendly "Watch Recording" button)

#### Event Details

- **eventDate**: Date when the presentation was actually given
- **eventLocation**: Physical location where the event took place
- **meetingDate**: Custom meeting date/schedule (overrides default "First Tuesday")
- **meetingLocation**: Custom venue object with detailed location information

#### Meeting Location Object

When specifying a custom meeting location, use this structure:

```yaml
meetingLocation:
  name: "Venue Name" # Official venue name
  address: "Full Street Address" # Complete address for GPS/directions
  coordinates: # Optional GPS coordinates
    lat: 35.965179 # Latitude
    lng: -83.919846 # Longitude
  description: "Venue description" # Brief description of the location
  parking: "Parking instructions" # Detailed parking information
  accessibility: "Accessibility info" # Wheelchair access, elevators, etc.
  contact: "Additional contact info" # Extra location details or contact info
```

#### Content Management

- **featured**: Set to `true` to highlight this post prominently on the site
- **published**: Set to `false` to save as draft (won't appear on public pages)

### Usage Examples

#### Basic Speaker Post

```yaml
---
title: "Introduction to Kubernetes"
date: "2024-03-15"
excerpt: "Learn the fundamentals of container orchestration with Kubernetes"
tags: ["Kubernetes", "Containers", "DevOps"]
author: "ETSA"
speakerName: "Jane Smith"
speakerTitle: "DevOps Engineer"
speakerCompany: "TechCorp"
published: true
---
```

#### Full Featured Post (New Multiple Speakers Format)

```yaml
---
title: "Advanced Docker Networking"
date: "2024-03-15"
excerpt: "Deep dive into Docker networking concepts and best practices"
tags: ["Docker", "Networking", "Containers"]
author: "ETSA"
speakers:
  - name: "John Doe"
    title: "Senior Platform Engineer"
    company: "CloudTech Solutions"
    bio: "John has 8+ years of experience in containerization and cloud infrastructure"
    image: "/images/speakers/john-doe.jpg"
    linkedIn: "https://linkedin.com/in/johndoe"
    github: "https://github.com/johndoe"
presentationSlides: "https://slides.google.com/docker-networking"
recordingUrl: "https://youtube.com/watch?v=docker-recording-2024"
eventDate: "2024-03-15"
eventLocation: "Knoxville Entrepreneur Center"
featured: true
published: true
---
```

#### Custom Meeting Location

```yaml
---
title: "Special Workshop: Infrastructure as Code"
date: "2024-04-20"
excerpt: "Hands-on workshop covering Terraform and infrastructure automation"
tags: ["Terraform", "IaC", "Workshop"]
author: "ETSA"
meetingDate: "Saturday, April 20th at 10:00 AM"
meetingLocation:
  name: "University of Tennessee - Engineering Building"
  address: "1512 Middle Dr, Knoxville, TN 37996"
  coordinates:
    lat: 35.9544
    lng: -83.9295
  description: "Special workshop location at UT campus"
  parking: "Visitor parking available in Lot 62 ($5/day)"
  accessibility: "Building is fully wheelchair accessible with elevator access"
  contact: "Enter through main entrance, workshop in Room 202"
published: true
---
```

#### Multiple Speakers Example

```yaml
---
title: "DevOps Panel: Best Practices and Real-World Experiences"
date: "2024-05-15"
excerpt: "Panel discussion with industry experts sharing DevOps insights and experiences"
tags: ["DevOps", "Panel", "Best Practices", "CI/CD"]
author: "ETSA"
speakers:
  - name: "Sarah Johnson"
    title: "Senior DevOps Engineer"
    company: "TechCorp"
    bio: "Sarah has 8+ years of experience in DevOps and cloud infrastructure, specializing in Kubernetes and CI/CD pipelines."
    image: "/images/speakers/sarah-johnson.jpg"
    linkedIn: "https://linkedin.com/in/sarahjohnson"
    github: "https://github.com/sarahjohnson"
  - name: "Mike Chen"
    title: "Platform Engineering Lead"
    company: "CloudTech Solutions"
    bio: "Mike leads platform engineering initiatives and has extensive experience with AWS, Terraform, and monitoring systems."
    linkedIn: "https://linkedin.com/in/mikechen"
    website: "https://mikechen.dev"
  - name: "Alex Rodriguez"
    title: "Site Reliability Engineer"
    company: "DataFlow Inc"
    bio: "Alex focuses on system reliability, observability, and incident response with 6+ years in SRE roles."
    twitter: "https://twitter.com/alexsre"
    github: "https://github.com/alexrodriguez"
presentationSlides: "https://slides.google.com/devops-panel-2024"
recordingUrl: "https://youtube.com/watch?v=devops-panel-recording-2024"
eventDate: "2024-05-15"
eventLocation: "Knoxville Entrepreneur Center"
featured: true
published: true
---
```

### Tag System and Best Practices

#### Recommended Tags

Use consistent, descriptive tags for better categorization and discoverability:

**Technology Categories:**

- `Docker`, `Kubernetes`, `Containers`
- `AWS`, `Azure`, `GCP`, `Cloud Computing`
- `Terraform`, `Ansible`, `Infrastructure as Code`
- `Prometheus`, `Grafana`, `Monitoring`
- `Linux`, `Windows`, `macOS`
- `Python`, `Go`, `Bash`, `PowerShell`
- `Git`, `CI/CD`, `GitHub Actions`

**Topic Areas:**

- `DevOps`, `SRE`, `Platform Engineering`
- `Security`, `Networking`, `Storage`
- `Automation`, `Orchestration`
- `Microservices`, `Architecture`
- `Performance`, `Scalability`
- `Backup`, `Disaster Recovery`

**Event Types:**

- `Workshop`, `Tutorial`, `Demo`
- `Case Study`, `Best Practices`
- `Beginner`, `Intermediate`, `Advanced`

#### Tag Guidelines

- Use title case for consistency (`Docker` not `docker`)
- Keep tags specific but not overly granular
- Limit to 3-7 tags per post for optimal categorization
- Use existing tags when possible to maintain consistency
- Add new tags only when existing ones don't fit

### Managing Photos

1. Add photos to `public/images/meetup-photos/`
2. Update the photo carousel data in `public/carousel-metadata.yaml`, if not generic metadata will be used
3. Use high-quality images (recommended: 800x400px minimum)

### Content Guidelines

#### Writing Style

- Use clear, professional language
- Include practical examples and code snippets
- Structure content with proper headings (H2, H3, etc.)
- Add links to relevant resources and documentation

#### SEO Optimization

- Write descriptive titles and excerpts
- Use relevant tags for better discoverability
- Include alt text for images
- Structure content with proper heading hierarchy

## Customization

### Branding

The site uses a custom color scheme defined in `tailwind.config.ts` according to our branding specifications:

- **Primary**: Blue tones for ETSA branding pulled from our logo
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
- **Email**: Utilize the contact form on our website
- **Meetup**: [https://www.meetup.com/etsa-tech](https://www.meetup.com/etsa-tech)
- **LinkedIn**: [https://www.linkedin.com/company/etsa-tech](https://www.linkedin.com/company/etsa-tech)
- **GitHub**: [https://github.com/etsa-tech](https://github.com/etsa-tech)

## Acknowledgments

- Thanks to all ETSA speakers and community members
- Powered by the amazing Next.js, Tailwind CSS communities, Next.JS, and Netlify
