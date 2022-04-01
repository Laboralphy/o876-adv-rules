const ModuleLoader = require('../module-loader')

ModuleLoader.load(process.argv[2], {
  index: true
})
