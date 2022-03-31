const { Validator } = require('jsonschema')
const ITEM_BLUEPRINT_SCHEMA = require('./schemas/item-blueprint.json')
const CREATURE_BLUEPRINT_SCHEMA = require('./schemas/creature-blueprint.json')
const CONSTS = require('./consts')
const { deepFreeze } = require('../deep-freeze');

/**
 * @typedef ADVBlueprint {object}
 * @property entityType {string} "ENTITY_TYPE_*"
 * @property itemBaseType {string} (item) "ITEM_BASE_TYPE_*"
 * @property itemSubType {string} (item) sous type d'item, précise exactement la nature de l'objet
 * @property magical {boolean} (item & weapon) indique si l'objet est magique
 * @property properties {ADVItemPropertyState[]} (item | actor) liste des item properties
 * @property specie {string} (actor) groupe racial de l'actor "SPECIE_*"
 * @property gender {string} (actor) genre "GENDER_"
 * @property size {string} (actor) taille "SIZE_*"
 * @property ac {number} (actor) classe d'armure de base
 * @property speed {number} (actor) vitesse de déplacement
 * @property classes {[]} (actor) liste des classes
 * @property abilities {{ability: string, value: number}[]} caractéristiques
 * @property proficiencies {string[]} liste des proficiencies
 * @property skills {{skill: string, value: number}[]} compétences
 * @property feats {string[]} liste des talents
 * @property alignment {string} "ALIGNMENT_*"
 * @property equipment {{slot: string, item: string}[]}
 * @property actions {{id: string, count: number}[]} liste des action possible par la créature
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

class BlueprintRegistry {
    constructor () {
        /**
         * @type {{}}
         * @private
         */
        this._blueprints = {}
        this._validator = new Validator()
    }

    /**
     * Valide un blueprint selon les schémas définis
     * @param blueprint {ADVBlueprint}
     * @return {boolean}
     */
    validateBlueprint (blueprint) {
        let res
        switch (blueprint.entityType) {
            case CONSTS.ENTITY_TYPE_ACTOR: {
                res = this._validator.validate(blueprint, CREATURE_BLUEPRINT_SCHEMA)
                break
            }

            case CONSTS.ENTITY_TYPE_ITEM: {
                res = this._validator.validate(blueprint, ITEM_BLUEPRINT_SCHEMA)
                break
            }

            default: {
                res = { valid: true }
            }
        }
        if (res.valid) {
            return true
        } else {
            res.errors.forEach(err => console.error(err.stack))
            return false
        }
    }

    /**
     * Défini un nouveau blueprint validé
     * @param resref {string} référence du blueprint
     * @param blueprint {ADVBlueprint} contenu du blueprint
     * @throw ERR_BLUEPRINT_INVALID
     */
    defineBlueprint (resref, blueprint) {
        const bValid = this.validateBlueprint(blueprint)
        if (!bValid) {
            throw new Error('ERR_BLUEPRINT_INVALID')
        }
        this._blueprints[resref] = deepFreeze(blueprint)
    }

    /**
     * @returns {{}}
     */
    get blueprints () {
        return this._blueprints
    }

    /**
     * Renvoie le blueprint identifié par resref
     * @param resref {string} identifiant du blueprint recherché
     * @returns {ADVBlueprint}
     */
    getBlueprint (resref) {
        return this._blueprints[resref]
    }
}

module.exports = BlueprintRegistry
