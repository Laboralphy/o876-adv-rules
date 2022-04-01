const fs = require('fs')
const path = require('path')

/**
 * Converti une chaine de caractère du format kebab case au format snake case
 * @param sSource {string} chaine au format kebab case 'avec des séparateur -)
 * @returns {string} chaine au format snake case 'avec des séparateur _)
 */
function kebabToSnake (sSource) {
  return sSource
    .split('-')
    .join('_')
}

/**
 * Change la typography d'une chaine de caractère.
 * Les format de sortie autorisée sont SNAKE_CASE et SCREAMING_SNAKE_CASE
 * Tout autre format renvoie en sortie la chaine source non modifiée
 * @param sSource {string} chaine source
 * @param sType {string} type de destination
 * @returns {string|*} chaine résultat
 */
function typoChange (sSource, sType) {
  switch (sType) {
    case 'SNAKE_CASE':
      return kebabToSnake(sSource)

    case 'SCREAMING_SNAKE_CASE':
      return kebabToSnake(sSource).toUpperCase()

    default:
      return sSource
  }
}

/**
 * Fabrique un assets de chargement statique composé d'un certain nombre de require
 * @param sPath {string} chemin d'acces aux modules
 * @param options {{ typography: string, prefix: string, suffix: string, index: string }}
 * @returns {{}}
 */
function load (sPath, options = {}) {
  const {
    typography = '',
    prefix = '',
    suffix = '',
    index = false
  } = options
  const data = {}
  const aIndex = []
  const aFiles = fs
    .readdirSync(sPath)
    .filter(sFile => path.extname(sFile).match(/^\.(js|json)$/))
  aFiles
    .map(sFile => ({ file: path.basename(sFile, path.extname(sFile)), ext: path.extname(sFile) }))
    .forEach(({ file, ext }) => {
      const sKey = prefix + typoChange(file, typography) + suffix
      const bNeedQuotes = !sKey.match(/^[_a-z]+$/i)
      if (index) {
        const s = bNeedQuotes
          ? `  '${sKey}': require('${sPath}/${file}${ext}')`
          : `  ${sKey}: require('${sPath}/${file}${ext}')`
        aIndex.push(s)
      } else {
        data[sKey] = require(path.join(sPath, file))
      }
    })
  if (index) {
    console.log(`// ${sPath} (generated)`)
    console.log('module.exports = {')
    console.log(aIndex.join(',\n'))
    console.log('}')
  }
  return data
}

module.exports = {
  load
}
