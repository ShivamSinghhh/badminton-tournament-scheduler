# Badminton Tournament Scheduler

*Start strong. Finish stronger.*

**Use it online:** https://shivamsinghhh.github.io/badminton-tournament-scheduler/ (nothing to install)

A browser tool for running a doubles badminton tournament in rounds. You give it a player list, the number of courts and how many matches each player should get. It produces:

- a round-by-round match schedule
- a referee rotation
- printable score cards
- a schedule for each player
- a live standings table
- a fairness report

It runs entirely in the browser, with no packages to install, no build step and no backend. No data leaves your machine.

## Quick start

### 1. Get the files

- **Clone with git:**
  ```bash
  git clone https://github.com/ShivamSinghhh/badminton-tournament-scheduler.git
  cd badminton-tournament-scheduler
  ```
- **Or download:** on this repository's GitHub page, click the green **Code** button → **Download ZIP**, then unzip it.

### 2. Run it

**Option A: `npm run dev` (recommended).** This needs [Node.js](https://nodejs.org) 18 or later. There are no packages to install, so you don't need `npm install`.

```bash
npm run dev
```

This starts a small local server and opens http://localhost:3000 in your browser. The page reloads whenever you save a file. Press `Ctrl+C` in the terminal to stop the server.

- If port 3000 is busy, the server uses the next free port and prints the address.
- To choose a port yourself:

  | Shell | Command |
  |---|---|
  | macOS / Linux | `PORT=8080 npm run dev` |
  | Windows PowerShell | `$env:PORT=8080; npm run dev` |
  | Windows Command Prompt | `set PORT=8080 && npm run dev` |

**Option B: open the file directly.** Double-click `index.html` and it opens in your default browser (Chrome, Edge, Safari or Firefox). Keep `index.html`, `styles.css` and `app.js` in the same folder, because the page loads the other two from there.

> **The page shows up without styling?** On macOS, the browser may not be allowed to read files in Documents, Desktop or Downloads. Use Option A, or allow access under System Settings → Privacy & Security → Files & Folders. On Windows, make sure you unzipped the folder rather than opening `index.html` from inside the ZIP.

### 3. Use it

Enter the players and settings in the left panel, then click **Generate Schedule**.

## Settings

| Field | What it does |
|---|---|
| **Number of Players** | Adds or removes placeholder rows in the name list. Names you've already typed are kept. Minimum 4. |
| **Player Names** | One name per line. You can type them, or paste a whole list over what's there. The counter updates as you type. If two players share a name, the second one gets a number added to make it unique. |
| **Reset to placeholder names** | Fills the list with `Player 1`, `Player 2` and so on, up to the player count. |
| **Courts Available** | The most matches that can run at once in a round. |
| **Matches / Player** | How many matches each player should play. |
| **Points to Win / Time Cap** | Printed on the score cards, for example "First to 15 · 8 min cap". These two settings don't change the schedule. |

## The tabs

After you generate a schedule, the right side shows six tabs:

- **Match Schedule**: every round, with the court, both teams and the two referees. Players without a role in a round are listed as sitting out. Team 1 takes the wall side and serves first.
- **Referee Sheet**: a table of round, court, referees and match, useful for briefing the referees.
- **Score Cards**: one card per match. It has numbered boxes for each point, a line for the final score, checkboxes for the winner and the referees' names. Print this tab and hand the cards to the referees.
- **Player Sheets**: pick a player to see their round-by-round schedule (playing, refereeing or bye). **Show All Players** lists everyone at once, ready to print.
- **Standings & Results**: click the winning team for each match as results come in. Clicking the same team again clears it. The leaderboard ranks players by wins, then by wins minus losses, and shows each player's results game by game.
- **Fairness Check**: how many matches each player got against the target, and how many times they refereed.

The toolbar has two buttons:

- **Download CSV** saves the full schedule, including byes, as `tournament_schedule.csv`.
- **Print Current Tab** prints only the tab you're viewing.

## How the schedule is built

Each round works like this:

1. The players who have played the fewest matches get the court slots first. Each court takes 4 players.
2. The players on court are shuffled into groups about 70 times. For each group, the tool tries all three ways of splitting four players into two pairs. It keeps the arrangement that repeats partners and opponents the least.
3. Two referees per court are taken from the players sitting out, starting with those who have refereed least. Anyone left over gets a bye.

This continues until no more full matches can be made.

If the numbers don't divide evenly, a few players may end up one match short. A note at the top tells you when this happens. Adjusting the number of courts or the matches per player usually fixes it.

## Things to know

- **Your tournament is saved automatically.** The schedule, settings and every result you record are stored in your browser. If you refresh the page or close and reopen it, everything comes back as you left it.
- **The save belongs to one browser on one computer.** Opening the page in a different browser, on another machine or in a private window starts empty. Clearing your browser data also removes the save. Download the CSV or print the tabs you need as a backup.
- **Generating again replaces the saved tournament.** If you've already recorded results, the tool asks you to confirm before it overwrites them.
- **Every generation is different.** The shuffling is random, so clicking Generate again gives a new schedule.
- **Saved results are tied to how you open the app.** A tournament saved at `http://localhost:3000` doesn't appear when you open `index.html` directly, and the reverse is also true.
- The fonts load from Google Fonts. Without internet access the page still works, but it uses fallback fonts.

## Project files

```
index.html             page structure and layout
styles.css             all styling, including print styles
app.js                 scheduling logic, tab rendering, results, CSV export
package.json           defines npm run dev
scripts/server.js  local dev server with auto-reload (Node only, no dependencies)
```

The app itself is plain HTML, CSS and JavaScript, with no build step and no dependencies. To change something, run `npm run dev` and edit the files; the browser reloads on save.

## Author

Designed by Samrat Shivam Singh.
