# Valorant Masters Santiago Schedule App

This application provides a real-time schedule for Valorant and League of Legends matches, with a focus on major international and regional events.

## Environment Variables

To run this application, you need to set the following environment variables:

- `PANDASCORE_ACCESS_TOKEN`: Your PandaScore API access token.
- `GEMINI_API_KEY`: (Optional) Required if using Gemini AI features.

### Local Development

1. Create a `.env` file in the root directory (copy from `.env.example`).
2. Add your `PANDASCORE_ACCESS_TOKEN` to the `.env` file.
3. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment (AI Studio / Cloud Run)

1. Go to the **Settings** menu in AI Studio.
2. Navigate to the **Secrets** or **Environment Variables** section.
3. Add a new secret named `PANDASCORE_ACCESS_TOKEN` and paste your token as the value.
4. The application will automatically pick up the token from the environment.

## Features

- **Real-time Schedule**: Fetches the latest matches from PandaScore.
- **Intelligent Categorization**: Automatically identifies Primary Leagues, International Events, and Regional Extensions.
- **Valorant Focus**: Specialized logic for identifying Valorant Masters and Champions events.
- **Deep History**: Fetches up to 5000 past matches to ensure comprehensive coverage of the current year.
