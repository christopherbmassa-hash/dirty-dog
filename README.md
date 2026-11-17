# Dirty Dog

Score keeper for Dirty Dog, the exact-bidding trick-taking card game (an Oh Hell cousin) that deals 8 cards, down to 1, and back up to 8.

## Run it locally

One-time setup: `npm install`

- **In VS Code:** press **F5** (or Run ▸ Start Debugging). It starts a local server and opens Chrome at http://localhost:5173.
- **In a terminal:** `npm start`, then open http://localhost:5173.

Edit anything in `src/` and refresh the browser.

## Layout

```
src/                 ← everything that gets published
  index.html         ← title screen, player setup, score sheet
  css/styles.css     ← green felt look
  js/app.js          ← game logic and scoring
  favicon.svg
  staticwebapp.config.json   ← Azure Static Web Apps settings
.vscode/             ← F5 launch config and recommended extensions
```

## Publish: GitHub → Azure Static Web Apps

Azure Static Web Apps (Free tier) hosts the `src/` folder and redeploys automatically every time you push to GitHub.

1. **Put the code on GitHub.** In VS Code, open the Source Control panel and choose **Publish Branch** / **Publish to GitHub** (pick *private* or *public*). This creates the repo and pushes the first commit.
2. **Create the Static Web App.** In the Azure portal: *Create a resource* ▸ **Static Web App**.
   - Plan: **Free**
   - Source: **GitHub**. Sign in, then pick this repo and the `main` branch.
   - Build preset: **Custom**
   - App location: `/src` · Api location: *(leave blank)* · Output location: *(leave blank)*
3. Azure adds a workflow file to the repo (`.github/workflows/azure-static-web-apps-*.yml`). Run `git pull` (or **Sync** in VS Code) to bring it down locally.
4. The site URL is on the resource's Overview page. From now on, every push to `main` redeploys the site.

## Scoring

| Result | Points |
|---|---|
| Took exactly what you bid | 10 + tricks |
| Missed, over or under | tricks − 10 |

The game is saved in the browser (localStorage key `dirtydog:game`), so a refresh or a closed tab doesn't lose the score sheet.
