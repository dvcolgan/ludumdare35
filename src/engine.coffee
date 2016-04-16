types = require('src/types')
levels = require('src/levels')

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 704
TILE_SIZE = 32


class Player
    constructor: (@game, startX, startY) ->
        @sprite = @game.add.sprite(startX, startY, 'player')
        @game.physics.arcade.enable(@sprite)
        @sprite.body.fixedRotation = true
        @sprite.body.collideWorldBounds = false
        @game.groups.actors.add(@sprite)

        @health = 10
        @hearts = []
        for i in [0...10]
            heart = @game.add.sprite(48 + i * 64, 48, 'heart')
            @hearts.push(heart)
            @game.groups.ui.add(heart)

    hurt: ->
        @health--
        for heart, i in @hearts
            heart.visible = i < @health


class Boss
    constructor: (@game, startX, startY, key) ->
        @sprite = @game.add.sprite(startX, startY, key)
        @game.physics.arcade.enable(@sprite)
        @sprite.body.bounce.set(0.7)
        @sprite.body.drag.set(40)

    randomBounce: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = Math.random() * 800 - 400

    bounceLeft: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = -400

    bounceRight: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = 400
        


module.exports = types.checkClass class Engine
    constructor: (@elementId) ->
        @game = new Phaser.Game(
            SCREEN_WIDTH, SCREEN_HEIGHT
            Phaser.AUTO, @elementId
            {preload: @preload, create: @create, update: @update}
        )

    doCommand: (command) ->

    preload: =>
        for key, level of levels
            @game.load.image(level.background, "backgrounds/#{level.background}.png")
        @game.load.image('player', 'player.png')
        @game.load.image('heart', 'heart.png')
        @game.load.spritesheet('toilet', 'toilet.png', 130, 284, 2)
        @game.load.image('tiles', 'tiles.png')
        @parseLevels()

    parseLevels: ->
        for key, level of levels
            level.callback = level.callback?.bind(@)
            mapData = (for rowData, row in level.tiles.trim().split('\n')
                if row == 0 or row == 23 then continue
                (for tileStr, col in rowData.split('')
                    if col == 0 or col == 41 then continue
                    if tileStr == ' '
                        tile = '0'
                    else
                        tile = parseInt(tileStr)
                    tile
                ).join(',')
            ).join('\n')
            @game.load.tilemap(key, null, mapData)

    create: =>

        @roomCol = 1
        @roomRow = 0

        @keys = @game.input.keyboard.addKeys
            comma: Phaser.KeyCode.COMMA
            o: Phaser.KeyCode.O
            a: Phaser.KeyCode.A
            e: Phaser.KeyCode.E
            w: Phaser.KeyCode.W
            s: Phaser.KeyCode.S
            d: Phaser.KeyCode.D
            space: Phaser.KeyCode.SPACEBAR
            prevWeapon: Phaser.KeyCode.LEFT
            nextWeapon: Phaser.KeyCode.RIGHT
            _1: Phaser.KeyCode.ONE
            _2: Phaser.KeyCode.TWO
            _3: Phaser.KeyCode.THREE
            _4: Phaser.KeyCode.FOUR
            _5: Phaser.KeyCode.FIVE
            _6: Phaser.KeyCode.SIX
            _7: Phaser.KeyCode.SEVEN
            _8: Phaser.KeyCode.EIGHT
            _9: Phaser.KeyCode.NINE

        @game.time.desiredFps = 60
        @game.physics.startSystem(Phaser.Physics.ARCADE)
        @game.physics.arcade.gravity.y = 981

        @game.groups = {}
        @game.groups.background = @game.add.group()
        @game.groups.actors = @game.add.group()
        @game.groups.ui = @game.add.group()

        @player = new Player(@game, 600, 400)

        @loadMap()

        @currentBoss = new Boss(@game, 400, 300, 'toilet')

        #@player.body.setSize(32, 64, 0, 0)

        #@fontStyle =
        #    font: "26px Monospace"
        #    fill: "#D7D7D7"
        #    boundsAlignH: 'center'
        #    fontWeight: 'bold'
        #    boundsAlignV: 'middle'
        #
    loadMap: =>
        key = "#{@roomCol}x#{@roomRow}"
        level = levels[key]

        if @background then @background.destroy()
        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, level.background)
        @game.groups.background.add(@background)

        if @layer then @layer.destroy()
        @tilemap = @game.add.tilemap(key, TILE_SIZE, TILE_SIZE)
        @tilemap.addTilesetImage('tiles')
        @tilemap.setCollisionByExclusion([0])
        @layer = @tilemap.createLayer(0)
        @layer.resizeWorld()
        @game.groups.background.add(@layer)

        level.callback?(@)

        #if @background2 then @background2.destroy()
        #@background2 = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, level.background)
        #@background2.blendMode = PIXI.blendModes.OVERLAY
    
    spawnActor: (x, y) ->

    update: =>
        @game.physics.arcade.collide(@player.sprite, @layer)
        if @currentBoss?
            @game.physics.arcade.collide(@currentBoss.sprite, @layer)

        if @player.sprite.x < 0
            if levels["#{@roomCol-1}x#{@roomRow}"]?
                @player.sprite.x = SCREEN_WIDTH - @player.sprite.width - 2
                @roomCol--
                @loadMap()
        else if @player.sprite.x > SCREEN_WIDTH - @player.sprite.width
            if levels["#{@roomCol+1}x#{@roomRow}"]?
                @player.sprite.x = 2
                @roomCol++
                @loadMap()
        else if @player.sprite.y < 0
            if levels["#{@roomCol}x#{@roomRow-1}"]?
                @player.sprite.y = SCREEN_HEIGHT - @player.sprite.height - 2
                @roomRow--
                @loadMap()
        else if @player.sprite.y > SCREEN_HEIGHT - @player.sprite.height
            if levels["#{@roomCol}x#{@roomRow+1}"]?
                @player.sprite.y = 2
                @roomRow++
                @loadMap()

        @player.sprite.body.velocity.x = 0
        if @player.sprite.body.velocity.y > 400 then @player.sprite.body.velocity.y = 600

        if @keys.a.isDown
            @player.sprite.body.velocity.x = -400
        if @keys.e.isDown or @keys.d.isDown
            @player.sprite.body.velocity.x = 400
        if @keys.comma.isDown or @keys.w.isDown
            @player.sprite.body.velocity.y = -600

        if @keys.space.justDown
            @player.hurt()

        if @currentBoss?
            if @keys._1.justDown
                @currentBoss.randomBounce()
            if @keys._2.justDown
                @currentBoss.bounceLeft()
            if @keys._3.justDown
                @currentBoss.bounceRight()
        total = Math.abs(@currentBoss.sprite.body.velocity.x) + Math.abs(@currentBoss.sprite.body.velocity.y)
        console.log(total)
        if total < 100
            @currentBoss.randomBounce()

