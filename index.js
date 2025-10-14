const fs = require('fs-extra')
const path = require('node:path')
const Handlebars = require('handlebars')
const { parseISO, format } = require('date-fns')

/**
 * Renders resume.bhs with Handlebars as a JSON Resume theme
 */

Handlebars.registerHelper('friendlyDate', (datestamp) => {
  if (datestamp) {
    const date = parseISO(datestamp)
    return format(date, 'do MMM yyyy')
  }
  return 'present'
})

async function render(resume) {
  const tpl = await fs.readFile(path.join(__dirname, 'src', 'resume.hbs'), 'utf-8')
  const compile = Handlebars.compile(tpl)
  return compile({ resume })
}

module.exports = {
  render,
}
