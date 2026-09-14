# Switching the leaderboard on

The game itself runs entirely in the browser and needs nothing. The **shared
leaderboard** is the one part that needs somewhere to put results, because a page
served from GitHub Pages cannot write to itself.

Until this is set up, the game plays perfectly and both the results screen and the
projector say plainly that the board is off, so teams read their scores out instead.

Takes about five minutes.

---

## 1. Create the table

Sign in at [supabase.com](https://supabase.com) and create a free project. Any
region near the venue. Wait for it to finish provisioning.

Open **SQL Editor**, paste this, and run it:

```sql
create table if not exists results (
  team_key text primary key,        -- lower-cased team name; one row per table
  team     text    not null,        -- as the team typed it, for the big screen
  total    numeric not null,
  outcome  text,
  paid     bigint,
  peak_vol integer,
  rounds   integer,
  trace    jsonb,
  ts       bigint
);

alter table results enable row level security;

-- The room is the audience and the facilitator can clear the board, so every
-- visitor may read and write. Nothing secret is stored here: only scores.
create policy results_open on results
  for all to anon using (true) with check (true);
```

## 2. Copy the two values

**Project Settings → API**:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / publishable key** — the long one labelled `anon`, *not* `service_role`

## 3. Put them in the page

Near the top of the app script in `index.html`, find:

```js
const BOARD = {
  url: "",   // e.g. "https://abcdefgh.supabase.co/rest/v1/results"
  key: "",   // the project's anon / publishable key
};
```

Fill both in. The URL is the Project URL **plus `/rest/v1/results`**:

```js
const BOARD = {
  url: "https://abcdefgh.supabase.co/rest/v1/results",
  key: "eyJhbGciOi…",
};
```

Commit, push, and GitHub Pages serves it within a minute.

## 4. Check it

1. Open the page, play a quick game, send the result.
2. Open the **Leaderboard** screen on a second device. The result should be there.
3. Open **Facilitator** (passcode in the page), press **Clear the whole
   leaderboard**, and confirm the board empties.

Do that check on the **venue's network**, on the kind of laptop the tables will
use. It is the one thing that cannot be verified from anywhere else.

---

## Things worth knowing before the day

**Free projects pause.** Supabase pauses a free project after about a week with no
traffic, and waking it takes a minute or two. Open the leaderboard once on the
morning of the event so it is awake when ten tables hit it at the same time.

**The key in the page is public, and that is normal.** The `anon` key is designed
to sit in browser code; row-level security is what protects the data. Here the
policy deliberately allows anyone who can open the page to write a score — which
is the same trust model the game already runs on ("do not read the page source").
The worst case is a stranger adding a silly row, and the facilitator's **Remove** /
**Clear** buttons fix it in seconds. Never put the `service_role` key in the page.

**Each table writes only its own row**, keyed by team name. Ten tables finishing in
the same minute cannot overwrite each other, and there is no read-modify-write
anywhere in this path. A team that sends twice simply updates its own row.

**The projector refreshes itself** every six seconds while the leaderboard screen
is open. Nobody has to touch it during the reveal.

**Afterwards**, delete the Supabase project. Nothing in it is needed once the
scores have been read out.

---

## If the venue blocks Supabase

Some corporate filters block domains they have not categorised. If
`*.supabase.co` is unreachable from the office, nothing else in the game breaks —
clear `BOARD.url` and the page falls back to teams reading their scores out, which
fits the five minutes the run of show already allows for collecting results.

The page talks plain REST, so any endpoint that answers the same four requests
works as a drop-in replacement (a Cloudflare Worker, for instance):

| Request | Purpose |
| --- | --- |
| `GET /…?select=*` | read every row |
| `POST /…` with `Prefer: resolution=merge-duplicates` | insert or replace one row |
| `DELETE /…?team_key=eq.<name>` | remove one team |
| `DELETE /…?team_key=not.is.null` | clear the board |
