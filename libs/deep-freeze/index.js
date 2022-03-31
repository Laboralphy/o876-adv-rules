/**
 * utilitaire de freezage d'objet. Permet de rendre un objet totalement immutable
 * @param o {object} objet à freezer
 * @returns {object} objet freezé
 * @private
 */
function deepFreeze (o) {
    if (Object.isFrozen(o)) {
        return o
    }
    Object.freeze(o)
    if (o === undefined) {
        return o
    }
    Object.getOwnPropertyNames(o).forEach(function (prop) {
        if (o[prop] !== null &&
            (typeof o[prop] === 'object' || typeof o[prop] === 'function')
        ) {
            deepFreeze(o[prop])
        }
    })
    return o
}

module.exports = {
    deepFreeze
}