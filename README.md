# gentle-reminder-bot

This is a Slack app that will suggest alternatives for certain oft-misused words or phrases.
For instance, it can suggest changing "guys" to "y'all" for cases where you're addressing a mixed-gender group.

To install on a team:
--
 - navigate to https://gentle-reminder.herokuapp.com/ and click the "Add to Slack" button
 - make sure the team selected in the upper right corner matches the team you want to install.
 - authorize the bot
 - done!

To enable for the currently signed-in user:
--
 - send the message 'subscribe' to the "Gentle Reminder" bot

TODO
==
 - create a slash handler
 - support adding/removing new substitutions and replacements per team
 - add an "ignore always" button
