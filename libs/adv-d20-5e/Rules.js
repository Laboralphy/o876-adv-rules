const EventEmitter = require('events')
const CONSTS = require('./consts')
const DATA = require('./data')
const BlueprintRegistry = require('./BlueprintRegistry')
const Reactor = require('../reactor/Reactor')
const { suggest } = require('@laboralphy/did-you-mean')

/**
 * @typedef ADVId {number}
 *
 * @typedef ADVEffectState {object}
 * @property tag {string}
 * @property type {string} [MAGICAL, PROPERTIES, SUPERNATURAL] les effets MAGICAL sont généralement temporaires et
 * produit par des sorts, les PROPERTIES imprègnent l'objet ou la créature et ne sont pas dissipables, les effets
 * SUPERNATURAL sont des benedictions ou des malédictions qui ne peuvent être retirés qu'avec un certain procédé.
 * @property amp {number}
 * @property duration {number}
 * @property source {ADVId} identifiant de l'entité ayant produit l'effet
 * @property data {object} objet de stockage libre de propriétés additionnelles
 *
 * @typedef ADVItemPropertyState {object} Ces propriétés definies dans le blueprint produiront des effets
 * de type PROPERTIES à durée infinie dont la source est l'objet lui même
 * @property tag {string}
 * @property amp {string}
 * @property data {objet}
 *
 * @typedef ADVEntityState {object}
 * @property id {ADVId} identifiant
 * @property blueprint {string}
 * @property abilities {object}
 * @property effects {ADVEffectState[]}
 * @property equipment {object}
 *
 * @typedef ADVWeaponData {objet}
 * @property cost {number} cout indicatif de l'arme
 * @property damage {string} formule de calcul des dégâts de l'arme
 * @property damageVersatile {string|null} formule de calcul des dégâts versatiles de l'arme (à deux mains)
 * @property damageType {string} type de dégats DAMAGE_TYPE_*
 * @property weight {number} poids indicatif
 * @property proficiency {string} Type de maniement requis pour cette arme PROFICIENCY_WEAPON_*
 * @property ranged {boolean} indique si l'arme est une arme à distance
 * @property attributes {string[]} ensemble d'attribut de l'arme WEAPON_ATTRIBUTE_*
 *
 */

const ITEM_BASE_TYPES = require('./data/item-base-types.json')
const WEAPON_TYPES = require('./data/weapon-types.json')

class Rules {
    constructor() {
        this._blueprints = new BlueprintRegistry()
        this._data = {
            ITEM_BASE_TYPES,
            WEAPON_TYPES
        }
        this._state = {
            entities: {}
        }
        this._id = 0
        this._events = new EventEmitter()
    }

    async init () {
        await this._blueprints.loadBlueprint('blueprints')
    }

//     _     _                       _       _                                                                 _
//    | |__ | |_   _  ___ _ __  _ __(_)_ __ | |_   _ __ ___   __ _ _ __   __ _  __ _  ___ _ __ ___   ___ _ __ | |_
//    | '_ \| | | | |/ _ \ '_ \| '__| | '_ \| __| | '_ ` _ \ / _` | '_ \ / _` |/ _` |/ _ \ '_ ` _ \ / _ \ '_ \| __|
//    | |_) | | |_| |  __/ |_) | |  | | | | | |_  | | | | | | (_| | | | | (_| | (_| |  __/ | | | | |  __/ | | | |_
//    |_.__/|_|\__,_|\___| .__/|_|  |_|_| |_|\__| |_| |_| |_|\__,_|_| |_|\__,_|\__, |\___|_| |_| |_|\___|_| |_|\__|
//                       |_|                                                   |___/

    /**
     * renvoie le blueprint identifié par resref
     * @param resref {string} identifiant du blueprint
     * @returns {ADVBlueprint}
     */
    getBlueprint (resref) {
        return this._blueprints.getBlueprint(resref)
    }

//         _        _                             _   _                __  _           _
//     ___| |_ __ _| |_ ___    ___ _ __ ___  __ _| |_(_) ___  _ __    / /_| | ___  ___| |_ _ __ ___  _   _
//    / __| __/ _` | __/ _ \  / __| '__/ _ \/ _` | __| |/ _ \| '_ \  / / _` |/ _ \/ __| __| '__/ _ \| | | |
//    \__ \ || (_| | ||  __/ | (__| | |  __/ (_| | |_| | (_) | | | |/ / (_| |  __/\__ \ |_| | | (_) | |_| |
//    |___/\__\__,_|\__\___|  \___|_|  \___|\__,_|\__|_|\___/|_| |_/_/ \__,_|\___||___/\__|_|  \___/ \__, |
//                                                                                                   |___/

    /**
     * Création d'une structure d'effet
     * @returns {ADVEffectState}
     */
    createEffect () {
        return {
            tag: '',
            type: '',
            amp: 0,
            source: '',
            duration: 0,
            data: {}
        }
    }

    /**
     * Création d'une entité et enregistrement de cette entité dans le state
     * @param resref
     * @return {ADVEntityState}
     */
    createEntity (resref) {
        const id = ++this._id
        const blueprint = this.getBlueprint(resref)
        const oEntity = {
            id,
            blueprint,
            abilities: {},
            effects: [],
            equipment: {
                [CONSTS.EQUIPMENT_SLOT_PRIMARY_HAND]: 0,
                [CONSTS.EQUIPMENT_SLOT_SECONDARY_HAND]: 0,
                [CONSTS.EQUIPMENT_SLOT_AMMO]: 0,
                [CONSTS.EQUIPMENT_SLOT_HEAD]: 0,
                [CONSTS.EQUIPMENT_SLOT_NECK]: 0,
                [CONSTS.EQUIPMENT_SLOT_BACK]: 0,
                [CONSTS.EQUIPMENT_SLOT_CHEST]: 0,
                [CONSTS.EQUIPMENT_SLOT_ARMS]: 0,
                [CONSTS.EQUIPMENT_SLOT_LEFT_FINGER]: 0,
                [CONSTS.EQUIPMENT_SLOT_RIGHT_FINGER]: 0,
                [CONSTS.EQUIPMENT_SLOT_WAIST]: 0,
                [CONSTS.EQUIPMENT_SLOT_FEET]: 0
            }
        }
        if (blueprint.entityType === CONSTS.ENTITY_TYPE_ACTOR) {
            blueprint.abilities.forEach(({ ability, value }) => {
                oEntity.abilities[ability] = value
            })
            const oInventory = {}
            // Créer d'abord tous les items à équipper
            blueprint.equipment.forEach(({ slot, item }) => {
                oInventory[slot] = this.createEntity(item)
            })
            // Equipper les items précédemment créés
            for (const [sSlot, item] in Object.entries(oInventory)) {
                this.equipItem(oEntity, item, sSlot)
            }
        }

        this._state.entities[id] = oEntity
        this._events.emit('entity.created', { entity: oEntity })
        return oEntity
    }

    /**
     * Destruction d'une entité
     * @param id {ADVId}
     */
    destroyEntity (id) {
        // Détruire la totalité de son équipement
        delete this._state.entities[id]
    }

//     _ _                                    _                            _
//    (_) |_ ___ _ __ ___     ___  __ _ _   _(_)_ __  _ __ ___   ___ _ __ | |_
//    | | __/ _ \ '_ ` _ \   / _ \/ _` | | | | | '_ \| '_ ` _ \ / _ \ '_ \| __|
//    | | ||  __/ | | | | | |  __/ (_| | |_| | | |_) | | | | | |  __/ | | | |_
//    |_|\__\___|_| |_| |_|  \___|\__, |\__,_|_| .__/|_| |_| |_|\___|_| |_|\__|
//                                   |_|       |_|

    /**
     * Renvoie l'item equippé dans le slot
     * @param entity {ADVEntityState} entité concernée
     * @param slot {string} slot d'équippement
     * @returns {ADVEntityState|null}
     */
    getEquippedItem (entity, slot) {
        const idItem = entity.equipment[slot]
        if (idItem) {
            return this._state.entities[idItem]
        } else {
            return null
        }
    }

    /**
     * Retire l'item du slot d'équippement
     * @param entity {ADVEntityState} entité à qui on retir la pièce d'équipement
     * @param slot {string} slot d'équipement concerné
     */
    unequipItem (entity, slot) {
        const oOldItem = this.getEquippedItem(entity, slot)
        if (oOldItem) {
            this._events.emit('entity.unequip', { entity, item: oOldItem, slot })
        }
        entity.equipment[slot] = 0
    }

    /**
     * Création d'un item pour le placer dans un slot d'équipement d'une entité
     * @param entity {ADVEntityState}
     * @param slot {string}
     */
    createEquipmentItem (entity, slot) {
        const ee = entity.equipment
        const be = entity.blueprint.equipment
        const sItemRef = be[slot]
        if (sItemRef) {
            ee[slot] = this.createEntity(sItemRef)
        }
    }

    /**
     * Verifier que l'item peut être équippé dans le slot spécifié.
     * @param entity {ADVEntityState}
     * @param item {ADVEntityState}
     * @param slot {string}
     * @return {boolean}
     */
    isItemEquipmentSlotValid (entity, item, slot) {
        this.checkItem(item)
        this.checkActor(entity)
        if (this.isWeapon(item)) {
            const wd = this.getWeaponData(item)
            // Les armes à distance à deux mains vont dans secondary
            if (wd.ranged && CONSTS.EQUIPMENT_SLOT_SECONDARY_HAND) {
                return true
            }
            // déterminer si c'est une arme à une main ou deux mains
            const bTwoHandedWeapon = wd.attributes.includes(CONSTS.WEAPON_ATTRIBUTE_TWO_HANDED)
            // Si c'est deux mains alors, l'arme va dans primaryHand
            if (bTwoHandedWeapon && slot === CONSTS.EQUIPMENT_SLOT_PRIMARY_HAND) {
                return true
            }
            // c'est une arme à distance ou
        }
    }

    /**
     *
     * @param entity {ADVEntityState}
     * @param item {ADVEntityState}
     * @param slot {string}
     */
    equipItem (entity, item, slot) {
        this.unequipItem(entity, slot)
        // TODO vérifier que la pièce d'équipement soit compatible avec le slot
        entity.equipment[slot] = item.id
        this._events.emit('entity.equip', { entity, item, slot })
    }

//     _ _                        _               _
//    (_) |_ ___ _ __ ___     ___| |__   ___  ___| | _____ _ __ ___
//    | | __/ _ \ '_ ` _ \   / __| '_ \ / _ \/ __| |/ / _ \ '__/ __|
//    | | ||  __/ | | | | | | (__| | | |  __/ (__|   <  __/ |  \__ \
//    |_|\__\___|_| |_| |_|  \___|_| |_|\___|\___|_|\_\___|_|  |___/

    /**
     * Vérifie que l'entité spécifiée soit bien un item
     * @param entity {ADVEntityState}
     * @return {boolean}
     */
    isItem (entity) {
        return entity.blueprint.entityType === CONSTS.ENTITY_TYPE_ITEM
    }

    /**
     * Vérifie que l'entité spécifiée soit bien un actor
     * @param entity {ADVEntityState}
     * @return {boolean}
     */
    isActor (entity) {
        return entity.blueprint.entityType === CONSTS.ENTITY_TYPE_ACTOR
    }

    /**
     * Vérifie que l'entité spécifiée est une arme
     * @param entity
     */
    isWeapon (entity) {
        return this.isItem(entity) && entity.blueprint.itemBaseType === CONSTS.ITEM_BASE_TYPE_WEAPON
    }

    /**
     * Renvoie une erreur si l'entité spécifié ne passe pas le validateur
     * @param entity {ADVEntityState}
     * @param validator {function}
     */
    checkEntity (entity, validator) {
        if (!validator(entity)) {
            throw new Error('ERR_ENTITY_TYPE_MISMATCH')
        }
    }

    /**
     * Renvoie une erreur lorsque l'entité n'est pas un item
     * @param entity
     */
    checkItem (entity) {
        this.checkEntity(entity, e => this.isItem(e))
    }

    /**
     * Renvoie une erreur lorsque l'entité n'est pas un actor
     * @param entity
     */
    checkActor (entity) {
        this.checkEntity(entity, e => this.isActor(e))
    }

    /**
     * Renvoie une erreur lors l'entité n'est pas une arme
     * @param entity
     */
    checkWeapon (entity) {
        this.checkEntity(entity, e => this.isWeapon(e))
    }

//               _                _   _ _               _       _
//      __ _  ___| |_    ___ _ __ | |_(_) |_ _   _    __| | __ _| |_ __ _
//     / _` |/ _ \ __|  / _ \ '_ \| __| | __| | | |  / _` |/ _` | __/ _` |
//    | (_| |  __/ |_  |  __/ | | | |_| | |_| |_| | | (_| | (_| | || (_| |
//     \__, |\___|\__|  \___|_| |_|\__|_|\__|\__, |  \__,_|\__,_|\__\__,_|
//     |___/                                 |___/

    /**
     * Obtient les informations d'une arme.
     * Provoque une erreur si l'item spécifié n'est pas une arme
     * @param item {ADVEntityState}
     * @return {ADVWeaponData}
     */
    getWeaponData (item) {
        this.checkWeapon(item)
        const sItemSubType = item.blueprint.itemSubType
        if (sItemSubType in DATA.WEAPON_TYPES) {
            return DATA.WEAPON_TYPES[sItemSubType]
        } else {
            throw new Error('ERR_WEAPON_DATA_NOT_FOUND')
        }
    }

}

module.exports = Rules