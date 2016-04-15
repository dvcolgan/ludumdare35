types = require('src/types')


SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 704
TILE_SIZE = 32

level1 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,4,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,4,4,4,4,4,0]
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,4,4,4,4,4,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,4,4,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,4,4,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,4,4,0,0,0]
    [0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,4,4,0,0,0]
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]


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

    makePlayer: ->
        @player = @game.add.sprite(0, 0, 'player')

    create: =>
        @cursors = game.input.keyboard.createCursorKeys()
        @game.time.desiredFps = 60
        @game.physics.startSystem(Phaser.Physics.ARCADE)
        @game.physics.arcade.gravity.y = 981

        @background2 = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink')

        @tilemap = @game.add.tilemap(null, TILE_SIZE, TILE_SIZE, 40, 22)
        @tilemap.addTilesetImage('tiles')
        @layer = @tilemap.create('level', 40, 22, TILE_SIZE, TILE_SIZE)
        @tilemap.setCollisionByExclusion([0])
        @loadMap(level1)

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink')
        @background.blendMode = PIXI.blendModes.OVERLAY

        @makePlayer()

        @game.physics.enable(@player, Phaser.Physics.ARCADE)
        @player.body.bounce.y = 0.2
        @player.body.collideWorldBounds = true
        @player.body.setSize(32, 64, 0, 0)

        #@fontStyle =
        #    font: "26px Monospace"
        #    fill: "#D7D7D7"
        #    boundsAlignH: 'center'
        #    fontWeight: 'bold'
        #    boundsAlignV: 'middle'
        #
    loadMap: (tiles) ->
        for rowData, row in tiles
            for tile, col in rowData
                @tilemap.putTile(tile, col, row)

    update: =>
        @game.physics.arcade.collide(@player, @layer)
        @player.body.velocity.x = 0
        if @cursors.left.isDown
            @player.body.velocity.x = -400
        if @cursors.right.isDown
            @player.body.velocity.x = 400
        if @cursors.up.isDown
            @player.body.velocity.y = -400
