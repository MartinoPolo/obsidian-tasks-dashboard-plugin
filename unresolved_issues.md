# Issue Progress Refresh

- The refresh button on the dashboard is not working as expected.
  Either fix it to properly refresh the progress data or remove it if it's redundant.
- When I modify an issue's tasks from open to finished (unchecked to checked) in an issue note and go back to dashboard, the progress is correctly refreshed.
- When I complete a task from the dashboard (in the live preview I'm able to check tasks as completed), the progress isn't automatically updated.
- When I have dashboard and the issue note open side by side and update a task in an issue from that dashboard, after a while (0.5 to 3 seconds) the tasks are updated (in the query in dashboard). The progress isn't. The progress is never auto updated so it shows old data until user manually leaves and returns to dashboard. Then it's correct.
- The refresh button was suppose to handle this with a manual click but it also does nothing and the progress is not updated with the refresh button.
- Figure out how to either automatically update the progres (similar to the tasks plugin) and then remove the manual refresh button or fix the manual refresh button (and add that it refreshes progress)
