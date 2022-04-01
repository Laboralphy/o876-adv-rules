const Rules = require('../libs/adv-d20-5e/Rules')
const CONSTS = require('../libs/adv-d20-5e/consts')

describe('#getBlueprint', function () {
    it('should throw no loaded bleuprint error', async function () {
        const r = new Rules()
        expect(() => r.getBlueprint('wpn-clubi')).toThrow(new Error('ERR_NO_BLUEPRINT_LOADED'))
    })
    it('should suggest a better resref name', async function () {
        const r = new Rules()
        await r.init()
        expect(() => r.getBlueprint('wpn-clubi')).toThrow(new Error('ERR_WRONG_RESREF: wpn-club'))
    })
    it('should suggest a better resref name', async function () {
        const r = new Rules()
        await r.init()
        const oClub = r.getBlueprint('wpn-club')
        expect(oClub.itemBaseType).toBe(CONSTS.ITEM_BASE_TYPE_WEAPON)
        expect(oClub.itemSubType).toBe(CONSTS.WEAPON_TYPE_CLUB)
    })
})