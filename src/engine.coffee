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
        @game.load.image('player', 'player.png')
        @game.load.image('toilet', 'toilet.png')
        @game.load.image('tiles', 'tiles.png')
        @game.load.image('forest', 'backgrounds/forest.png')
        @game.load.image('sink', 'backgrounds/sink.png')
        @game.load.image('kitchen', 'backgrounds/kitchen.png')
        #for slug, sprite of @_sprites
        #    @game.load.spritesheet(slug, sprite.image, sprite.frameSize[0], sprite.frameSize[1])
        #for slug, path of @_backgrounds
        #    @game.load.image(slug, path)
        #@game.load.image('dialog', 'images/dialog-box.png')
        #

    create: =>
        @roomCol = 0
        @roomRow = 0

        @cursors = game.input.keyboard.createCursorKeys()
        @game.time.desiredFps = 60
        @game.physics.startSystem(Phaser.Physics.ARCADE)
        @game.physics.arcade.gravity.y = 981

        @background2 = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink')

        @tilemap = @game.add.tilemap(null, TILE_SIZE, TILE_SIZE, 40, 22)
        @tilemap.addTilesetImage('tiles')
        @layer = @tilemap.create('level', 40, 22, TILE_SIZE, TILE_SIZE)
        @tilemap.setCollisionByExclusion([0])
        @loadMap()

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink')
        @background.blendMode = PIXI.blendModes.OVERLAY

        @player = @game.add.sprite(400, 200, 'player')

        @game.physics.enable(@player, Phaser.Physics.ARCADE)
        @player.body.bounce.y = 0.2
        #@player.body.setSize(32, 64, 0, 0)

        #@fontStyle =
        #    font: "26px Monospace"
        #    fill: "#D7D7D7"
        #    boundsAlignH: 'center'
        #    fontWeight: 'bold'
        #    boundsAlignV: 'middle'
        #
    loadMap: ->
        level = levels["#{@roomCol}x#{@roomRow}"]
        for rowData, row in level.tiles.trim().split('\n')
            if row == 0 or row == 23 then continue
            for tileStr, col in rowData.split('')
                if col == 0 or col == 41 then continue
                if tileStr == ' '
                    tile = null
                else
                    tile = parseInt(tileStr)

                @tilemap.putTile(tile, col - 1, row - 1)

    update: =>
        if @player.x < 0
            @player.x = SCREEN_WIDTH - @player.body.width
            @roomCol--
            @loadMap()
        if @player.x > SCREEN_WIDTH - @player.body.width
            @player.x = 0
            @roomCol++
            @loadMap()
        if @player.y < 0
            @player.y = SCREEN_HEIGHT - @player.body.height
            @roomRow--
            @loadMap()
        if @player.y > SCREEN_HEIGHT - @player.body.height
            @player.y = 0
            @roomRow++
            @loadMap()

        @game.physics.arcade.collide(@player, @layer)
        @player.body.velocity.x = 0
        if @cursors.left.isDown
            @player.body.velocity.x = -400
        if @cursors.right.isDown
            @player.body.velocity.x = 400
        if @cursors.up.isDown
            @player.body.velocity.y = -400

