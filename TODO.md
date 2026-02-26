# TODO

## Dash
- [x] add admin control panel
- [x] allow changing music from dashboard
- [x] add discord oauth login to dashboard and allow user access
- [x] add landing page website to promote bot with add to server button and login
- [x] add page where user's can see their guilds, which guilds have the bot added, and which ones the user could add the bot to with a bit add bot button on them
- [x] each guild's page is then the current player detail view without node stats.
- [x] add a cool neon green themed playbar below the player with seek/volume/play/pause/skip/prev/loop controls
- [x] add shuffle and drag and drop reordering to queue
- [x] port to nextjs?
- [x] fix logs show more refresh bug, add api endpoint to fetch logs only after a certain timestamp or logId.

## Bot
- [x] fix status messages
- [x] auto-detect missing :spacer: emoji and dont use it in player message
- [x] auto-disconnect when zero listeners in channel for more than two minutes, and auto-pause as soon as zero listeners are detected
  - listen to the voice state update for this, do not use a polling approach.

## port fixes
- [x] fix queue style to be like admin dash
- [x] allow viewing more than 100 songs in queue
- [x] fix progress hanging sometimes
- [x] fix player ui
- [x] add song controls
- [x] add drag and drop controls for reordering
- [x] for search, add options to add as next or at the end of the queue
- [x] fix server icon in user dash
- [x] fix sidebar height in user dash
- [x] add sidebar buttons for top servers with active players
- [x] allow configuring admins
- [x] make action popup dangerous actions bg style reddish and keep text color red on hover
- [x] separate indicator in sidebar for bot info with different style than user info
- [x] better admin panel button
- [x] share components for player card and server icon and so on
- [x] clean shared yaml syntax for env vars in compose.yml
- [x] readme docs about setting up oauth and configuring env vars for web dashboard
- [x] fix wrong reddish background color in player destroy modal holy shit is that ugly
- [x] instead make sure the buttons in all popups have this style change: when they are danger buttons, they
- [x] /guilds/<id> page takes too long to load and somehow sends two requests to /api/players/<id>?ql=20&hl=10 that fail in 404's.
- [x] make sure all buttons in the sidebar have the same height. the server buttons get larger when a song is displayed in them as well, while the add to server button is always smaller. make the song text smaller so it fits and make the add to server button match the height.
- [ ] make user list have individual cards for each user not one around all
- [ ] fix bot info in admin sidebar, remove bot and signed in labels
- [ ] fix extra spacing between servers and add to server button in user dash
- [ ] player cards overflow when showing long songs on mobile
- [ ] unify admin dash and user dash links
- [ ] move bass logo text over sidebar on desktop (maybe show bot icon in top left of sidebar plus name)
- [ ] add divider between commands and guilds in user dash
- [ ] animate command opening
- [ ] add longer descriptions to all commands that can show on expanding
- [ ] clean up param styles and min conditions text to be more readable