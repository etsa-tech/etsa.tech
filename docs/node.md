# Node Instructions

## Manual Deployment

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

### Local Development

1. `brew install node visual-studio-code` Install these via the exes if you're on Windows.
1. Create your `.env.local` file with all of the appropriate values
1. git clone and run `npm run dev` and it will load on `http://localhost:3000`
   1. Running on 3000 and not 3001 for example will have the Google Maps embed API load correctly for you.
