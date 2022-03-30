const EventEmitter = require('events')

/**
 * @typedef EquipmentState {object}
 * @property primaryHand {number} item équipé en main directrice (arme)
 * @property secondaryHand {number} item équipé en main non-directrice (bouclier, arme à distance)
 * @property ammo {number} item équipé dans le slot des munitions (flêche, carreau...)
 * @property head {number} item équipé à la tête (casque, couronne...)
 * @property neck {number} item équipé au cou (amulette, collier)
 * @property back {number} item équipé sur le dos (cape)
 * @property chest {number} item équipé sur le torse (armure)
 * @property arms {number} item équipé sur les bras (brassards)
 * @property leftFinger {number} bague, anneaux main gauche
 * @property rightFinger {number} bague, anneaux main droite
 * @property waist {number} item équipé à la taillé (ceinturon)
 * @property feet {number} item équipé aux pied (bottes)
 *
 * @typedef AbilityState {object}
 * @property str {number} score de base de force
 * @property con {number} constitution
 * @property acc {number} précision
 * @property esq {number} esquive
 * @property int {number} intelligence
 * @property wil {number} volonté
 *
 * @typedef EffectState {object}
 * @property tag {string}
 * @property type {string} [MAGICAL, PROPERTIES, SUPERNATURAL] les effets MAGICAL sont généralement temporaires et
 * produit par des sorts, les PROPERTIES imprègnent l'objet ou la créature et ne sont pas dissipables, les effets
 * SUPERNATURAL sont des benedictions ou des malédictions qui ne peuvent être retirés qu'avec un certain procédé.
 * @property amp {number}
 * @property duration {number}
 * @property source {number} identifiant de l'entité ayant produit l'effet
 * @property data {object} objet de stockage libre de propriétés additionnelles
 *
 * @typedef EntityState {object}
 * @property id {number} identifiant
 * @property blueprint {string}
 * @property abilities {AbilityState}
 * @property effects {EffectState[]}
 * @property equipment {EquipmentState}
 *
 * @typedef Blueprint {object}
 * @property entityType {string} "ENTITY_TYPE_ITEM",
 *   "itemBaseType": "ITEM_BASE_TYPE_WEAPON",
 *   "itemSubType": "WEAPON_TYPE_CLUB",
 *   "magical": false,
 *   "properties": []
 */

const ITEM_BASE_TYPES = require('./data/item-base-types.json')
const WEAPON_TYPES = require('./data/weapon-types.json')

class Rules {
    constructor() {
        this._blueprints = {}
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
     * @returns {EffectState}
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

    getBlueprint (resref) {
        const blueprint = this._blueprints[resref]
        if (!blueprint) {
            throw new Error('ERR_BLUEPRINT_NOT_FOUND')
        }
        return blueprint
    }

    /**
     * Création d'un item pour le placer dans un slot d'équipement d'une entité
     * @param entity
     * @param slot
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
     * @return {EntityState}
     */
    createEntity (resref) {
        const id = ++this._id
        const blueprint = this.getBlueprint(resref)
        const abilities = blueprint.abilities
        const oEntity = {
            id,
            blueprint,
            abilities: {
                str: 0,
                con: 0,
                acc: 0,
                esq: 0,
                int: 0,
                wil: 0
            },
            effects: [],
            equipment: {
                primaryHand: 0,
                secondaryHand: 0,
                ammo: 0,
                head: 0,
                neck: 0,
                back: 0,
                chest: 0,
                arms: 0,
                leftFinger: 0,
                rightFinger: 0,
                waist: 0,
                feet: 0
            }
        }
        // Les configuration d'armements suivants sont possibles
        // primaryHand : arme 1M
        // primaryHand : arme 2M
        // primaryHand : arme 1M - secondaryHand : bouclier
        // primaryHand : arme 1M - secondaryHand : arme dist
        // primaryHand : arme 1M - secondaryHand : arme 1M
        if (blueprint.type === 'ENTITY_TYPE_ACTOR') {
            const ea = oEntity.abilities
            const ba = blueprint.abilities
            ea.str = ba.str
            ea.con = ba.con
            ea.acc = ba.acc
            ea.esq = ba.esq
            ea.int = ba.int
            ea.wil = ba.wil
            const be = blueprint.equipment
            const oInventory = {}
            // Créer les items équippés
            for (const [sSlot, resref] in Object.entries(be)) {
                oInventory[sSlot] = this.createEntity(resref)
            }
            // Equipper les items précédemment créés
            for (const [sSlot, item] in Object.entries(oInventory)) {
                this.equipItem(oEntity, item, sSlot)
            }
        }

        this._state.entities[id] = oEntity
        this._events.emit('entity.created', { entity: oEntity })
        return oEntity
    }

    destroyEntity (id) {
        delete this._state.entities[id]
    }

    /**
     * Renvoie l'item equippé dans le slot
     * @param entity {EntityState} entité concernée
     * @param slot {string} slot d'équippement
     * @returns {EntityState|null}
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
     * @param entity {EntityState} entité à qui on retir la pièce d'équipement
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
     * Déterminer le slot d'équipement disponible pour l'item, et pour l'entité
     * Si un item est accepté sur plusieurs slot, on prendra un slot libre, si aucun n'est libre on renvoie un slot
     * occupé.
     * @param entity {EntityState}
     * @param item {EntityState}
     * @returns {string}
     */
    getItemEquipmentSlot (entity, item) {
        // déterminer les slots possibles

    }

    /**
     *
     * @param entity {EntityState}
     * @param item {EntityState}
     * @param slot {string}
     */
    equipItem (entity, item, slot) {
        this.unequipItem(entity, slot)
        // TODO vérifier que la pièce d'équipement soit compatible avec le slot
        entity.equipment[slot] = item.id
        this._events.emit('entity.equip', { entity, item, slot })
    }
}
