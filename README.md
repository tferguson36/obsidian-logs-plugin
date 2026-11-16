# Tag Logs

An Obsidian plugin that turns a note into a dated log entry when you type a configured tag.

When you type a configured tag (for example `#test`) in a note, the plugin:

1. Renames the note to `<tag without #> <date>` using the rule's moment date format, and moves it to the rule's folder.
2. Appends the rule's template note to it, merging the template's frontmatter without overwriting existing keys.
3. Adds a row of previous and next links at the top. The previous link points to the most recently created log with the same tag, and that log gets a next link back.

The tag stays in the note, so entries can be queried from a base. Processed notes get `log-processed: true` in their frontmatter so they are never processed twice. Notes are only processed when the tag is typed, not when they are opened.

## Settings

Add one rule per tag with the tag, date format, template note, and folder.

## Development

```
npm install
npm run dev
npm run build
npm run lint
npm test
```
