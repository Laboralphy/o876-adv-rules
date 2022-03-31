const EventEmitter = require('events')
const CONSTS = require('libs/o876-adv/consts')
const DATA = require('libs/o876-adv/data')
const BlueprintRegistry = require('./BlueprintRegistry')
const Reactor = require('../reactor/Reactor')

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
     * renvoie le blueprint identifié par resref
     * @param resref {string} identifiant du blueprint
     * @returns {ADVBlueprint}
     */
    getBlueprint (resref) {
        const blueprint = this._blueprints.getBlueprint(resref)
        if (!blueprint) {
            throw new Error('ERR_BLUEPRINT_NOT_FOUND')
        }
        return blueprint
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
     * Vérifie que l'entité spécifiée soit bien un item
     * @param entity {ADVEntityState}
     * @return {boolean}
     */
    isItem (entity) {
        return entity.blueprint.entityType === CONSTS.ENTITY_TYPE_ITEM
    }

    /**
     * Renvoie une erreur lorsque l'entité n'est pas un item
     * @param entity
     */
    checkItem (entity) {
        if (!this.isItem(entity)) {
            throw new Error('ERR_ENTITY_TYPE_MISMATCH')
        }
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
     * Renvoie une erreur lorsque l'entité n'est pas un item
     * @param entity
     */
    checkActor (entity) {
        if (!this.isActor(entity)) {
            throw new Error('ERR_ENTITY_TYPE_MISMATCH')
        }
    }

    getWeaponData (item) {
        this.checkItem(item)
        const sItemBaseType = item.blueprint.itemBaseType
        if (sItemBaseType === CONSTS.ITEM_BASE_TYPE_WEAPON) {
            const sItemSubType = item.blueprint.itemSubType
            const oData = DATA.WEAPON_TYPES
        }
    }

    /**
     * Verifier que l'item peut etre équippé dans le slot spécifié
     * @param entity {ADVEntityState}
     * @param item {ADVEntityState}
     * @param slot {string}
     * @return {boolean}
     */
    isItemEquipmentSlotValid (entity, item, slot) {
        this.checkItem(item)
        this.checkActor(entity)
        this.
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
}
