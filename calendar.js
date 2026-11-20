const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const dialog = document.querySelector("#calendar-review");
const review = dialog.querySelector("form");
let selectedEvent;
let mailbox;
let calendarGrant;

async function mailboxFor(token) {
  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) throw new Error("Reconnect Gmail and try again.");
  return (await res.json()).emailAddress;
}

async function openCalendarReview(event) {
  try {
    const token = accessToken;
    mailbox = await mailboxFor(token);
    if (token !== accessToken) return;
    selectedEvent = event;
    const f = review.elements;
    f.title.value = event.event_name || "";
    f.location.value = event.venue || "";
    f.date.value = event.date || "";
    f.time.value = event.time || "";
    f.allDay.checked = Boolean(event.all_day);
    f.time.disabled = f.allDay.checked;
    f.zone.value = event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    review.querySelector("[type=submit]").disabled = false;
    dialog.querySelector("output").textContent = "";
    dialog.showModal();
  } catch (e) { showError(e.message); }
}

function requestCalendarToken() {
  if (calendarGrant?.mailbox === mailbox && Date.now() < calendarGrant.expires) {
    return Promise.resolve(calendarGrant.token);
  }
  return new Promise((resolve, reject) => {
    google.accounts.oauth2.initTokenClient({
      client_id: "721040422695-9m0ge0d19gqaha28rse2le19ghran03u.apps.googleusercontent.com",
      scope: GMAIL_SCOPE + " " + CALENDAR_SCOPE,
      hint: mailbox,
      error_callback: () => reject(new Error("Calendar authorization was closed.")),
      callback: async r => {
        try {
          if (!r.access_token || !google.accounts.oauth2.hasGrantedAllScopes(r, CALENDAR_SCOPE, GMAIL_SCOPE))
            throw new Error("Grant Calendar access to save this event.");
          if (await mailboxFor(r.access_token) !== mailbox)
            throw new Error("Select the same account you used for Gmail.");
          calendarGrant = {token:r.access_token, mailbox, expires:Date.now() + (r.expires_in - 30)*1000};
          resolve(r.access_token);
        } catch (e) { reject(e); }
      }
    }).requestAccessToken();
  });
}

function shiftLocal(date, time, minutes) {
  const value = new Date(date + "T" + time + ":00Z");
  value.setUTCMinutes(value.getUTCMinutes() + minutes);
  return value.toISOString().slice(0,19);
}

review.elements.allDay.onchange = () => { review.elements.time.disabled = review.elements.allDay.checked; };
dialog.querySelector("[data-close]").onclick = () => dialog.close();
review.onsubmit = async e => {
  e.preventDefault();
  const button = review.querySelector("[type=submit]");
  const output = dialog.querySelector("output");
  button.disabled = true;
  const close = dialog.querySelector("[data-close]");
  close.disabled = true;
  dialog.oncancel = ev => ev.preventDefault();
  let confirmed = false;
  try {
    const f = review.elements;
    const date = f.date.value;
    const token = await requestCalendarToken();
    const bytes = new TextEncoder().encode("EEE/" + mailbox + "/" + selectedEvent.message_id);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const id = Array.from(hash, b => b.toString(16).padStart(2,"0")).join("");
    const allDay = f.allDay.checked;
    const time = f.time.value;
    const timeZone = f.zone.value.trim();
    if (!allDay) new Intl.DateTimeFormat("en", {timeZone});
    const body = {
      id, summary:f.title.value.trim(), location:f.location.value.trim(),
      start: allDay ? {date} : {dateTime:date + "T" + time + ":00", timeZone},
      end: allDay ? {date:shiftLocal(date,"00:00",1440).slice(0,10)} :
        {dateTime:shiftLocal(date,time,Number(f.duration.value)), timeZone},
      reminders:{useDefault:false, overrides:[{method:"popup", minutes:Number(f.reminder.value)}]}
    };
    const headers = {Authorization:"Bearer " + token, "Content-Type":"application/json"};
    let res = await fetch(EVENTS_URL, {method:"POST", headers, body:JSON.stringify(body)});
    if (res.status === 409) res = await fetch(EVENTS_URL + "/" + id, {headers});
    if (res.status === 401) calendarGrant = null;
    const saved = await res.json();
    if (!res.ok || saved.status === "cancelled") throw new Error(saved.error?.message || "Calendar could not confirm the event.");
    const link = document.createElement("a");
    link.href = saved.htmlLink;
    link.textContent = "Open saved event in Google Calendar";
    link.target = "_blank";
    link.rel = "noopener";
    output.replaceChildren(link);
    confirmed = true;
  } catch (err) { output.textContent = err.message || "Calendar save failed. Try again."; }
  finally {
    button.disabled = confirmed;
    close.disabled = false;
    dialog.oncancel = null;
  }
};
