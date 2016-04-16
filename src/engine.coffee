types = require('src/types')
levels = require('src/levels')

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 704
TILE_SIZE = 32



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
        @game.load.spritesheet('toilet', 'toilet.png', 130, 284, 2)
        @game.load.image('tiles', 'tiles.png')
        @parseLevels()

    parseLevels: ->
        for key, level of levels
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

        @game.time.desiredFps = 60
        @game.physics.startSystem(Phaser.Physics.ARCADE)
        @game.physics.arcade.gravity.y = 981

        @backgroundGroup = @game.add.group()

        @player = @game.add.sprite(600, 400, 'player')
        @game.physics.arcade.enable(@player)
        @player.body.fixedRotation = true
        @player.body.collideWorldBounds = false


        @loadMap()

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
        @backgroundGroup.add(@background)

        if @layer then @layer.destroy()
        @tilemap = @game.add.tilemap(key, TILE_SIZE, TILE_SIZE)
        @tilemap.addTilesetImage('tiles')
        @tilemap.setCollisionByExclusion([0])
        @layer = @tilemap.createLayer(0)
        @layer.resizeWorld()

        level.callback?(@)

        #if @background2 then @background2.destroy()
        #@background2 = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, level.background)
        #@background2.blendMode = PIXI.blendModes.OVERLAY
    
    spawnActor: (x, y) ->
        @actor = @game.add.sprite(x, y, 'toilet')
        @actor.animations.add('open', [2, 1, 1, 1, 0])
        @actor.animations.add('closed', [0, 1, 2, 2, 2, 1, 2])
        @actor.animations.play('open')
        @game.physics.arcade.enable(@actor)
        @actor.body.bounce.set(1.0)
        @actor.update = =>
            if @actor.body.velocity.y > 0 and @actor.animations.currentAnim.name == 'closed'
                @actor.animations.play('open')
            else if @actor.body.velocity.y < 0 and @actor.animations.currentAnim.name == 'open'
                @actor.animations.play('closed')
        return @actor

    update: =>
        @game.physics.arcade.collide(@player, @actor)
        @game.physics.arcade.collide(@player, @layer)
        @game.physics.arcade.collide(@actor, @layer)

        if @player.x < 0
            if levels["#{@roomCol-1}x#{@roomRow}"]?
                @player.x = SCREEN_WIDTH - @player.width - 2
                @roomCol--
                @loadMap()
        else if @player.x > SCREEN_WIDTH - @player.width
            if levels["#{@roomCol+1}x#{@roomRow}"]?
                @player.x = 2
                @roomCol++
                @loadMap()
        else if @player.y < 0
            if levels["#{@roomCol}x#{@roomRow-1}"]?
                @player.y = SCREEN_HEIGHT - @player.height - 2
                @roomRow--
                @loadMap()
        else if @player.y > SCREEN_HEIGHT - @player.height
            if levels["#{@roomCol}x#{@roomRow+1}"]?
                @player.y = 2
                @roomRow++
                @loadMap()

        @player.body.velocity.x = 0
        if @player.body.velocity.y > 400 then @player.body.velocity.y = 600

        if @keys.a.isDown
            @player.body.velocity.x = -400
        if @keys.e.isDown or @keys.d.isDown
            @player.body.velocity.x = 400
        if @keys.comma.isDown or @keys.w.isDown
            @player.body.velocity.y = -600

