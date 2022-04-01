const ModuleLoader = require('../module-loader')

ModuleLoader.load(process.argv[2], {
  prefix: process.argv[3],
  typography: 'SCREAMING_SNAKE_CASE',
  index: true
})
