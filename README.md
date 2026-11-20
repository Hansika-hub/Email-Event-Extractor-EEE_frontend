# Email Event Extraction — Frontend

Turn event invitations in unread Gmail messages into Google Calendar entries. Sign in with Google, scan your inbox, review the extracted details, and choose which events to save.

- [Live app on Vercel](https://email-mu-eight.vercel.app)
- [Backend repository](https://github.com/Hansika-hub/Email_Backend)
- [Backend on Render](https://email-backend-bu9l.onrender.com)

## How it works

1. Google Identity Services signs you in and requests read-only Gmail access.
2. The frontend calls the Flask backend to extract event names, dates, times, and venues.
3. When you select **Save to Calendar**, the app requests Calendar access and creates the event on your primary calendar. Saving the same event again opens its existing Calendar entry.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` and `Proemail.css` | Page layout and styles |
| `Proemail.js` | Google sign-in, inbox scans, and event display |
| `calendar.js` | Calendar authorization and event creation |
| `vercel.json` | API proxy and Content Security Policy |
| `policy.html` | Privacy policy |

## Setup and deployment

1. Enable the Gmail API and Google Calendar API in your Google Cloud project. Create a **Web application** OAuth client and add the frontend URL to its authorized JavaScript origins. If the consent screen is in Testing, add your Google account as a test user.
2. Set the OAuth client ID in the frontend and use the same ID in the backend's Google ID token verification. Configure the consent screen for `gmail.readonly` and `calendar.events.owned`.
3. Deploy this repository to Vercel as a static site. In `vercel.json`, point the `/api/(.*)` rewrite to your Render backend and update the backend origin in the Content Security Policy if it changed. Add your Vercel origin to the backend's CORS configuration if calling it directly.
4. Open the Vercel URL, sign in, and scan with a test invitation marked unread. Review the extracted details before saving it to Calendar.

For layout changes, serve the files locally with `python3 -m http.server 8000`. To test the full sign-in and scan flow locally, authorize `http://localhost:8000` in Google Cloud and use a local proxy for `/api` or configure the frontend to call the backend directly with that origin allowed in CORS.

## License

MIT — see [LICENSE](https://github.com/Hansika-hub/Email-Event-Extractor-EEE_frontend/blob/main/LICENSE.txt)
