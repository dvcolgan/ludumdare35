levelGroups =
    hub: require('src/levels/hub')
    spoonman: require('src/levels/spoonman')

levels = {}
for group, levelData of levelGroups
    for key, level of levelData
        if key of levels
            throw new Error("Duplicate key in levels: #{key}")
        levels[key] = level

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 704
TILE_SIZE = 32


EVENTS = {
    'POSE'
    'IDLE'
    'MOVE_LEFT'
    'MOVE_RIGHT'
    'ATTACK'
    'HIT'
    'DIE'
}

class Actor
    constructor: (@game, startX, startY, key, hp, animations) ->
        @eventQueue = []

        @sprite = @game.add.sprite(startX, startY, key)
        @game.physics.arcade.enable(@sprite)
        @sprite.body.bounce.set(0.7)
        @sprite.body.drag.set(40)
        @sprite.anchor.x = 0.5

        @sprite.body.fixedRotation = true
        @sprite.body.collideWorldBounds = false
        @game.groups.actors.add(@sprite)

        @hp = hp

        @sprite.animations.add('pose', animations.pose, 10, false).onComplete.add(@nextAction)
        @sprite.animations.add('idle', animations.idle, 5, true)
        @sprite.animations.add('forward', animations.forward, 20, true)
        @sprite.animations.add('attack', animations.attack, 20, false).onComplete.add(@nextAction)
        @sprite.animations.add('hit', animations.hit, 10, false).onComplete.add(@nextAction)
        @sprite.animations.add('die', animations.die, 10, false).onComplete.add(@nextAction)

        @health = 10
        @hearts = []
        for i in [0...10]
            heart = @game.add.sprite(48 + i * 64, 48, 'heart')
            @hearts.push(heart)
            @game.groups.ui.add(heart)

        @endTime = null
        @targetX = null

        @sprite.update = =>
            switch @currentEvent[0]
                when EVENTS.IDLE
                    if @game.time.now >= @endTime
                        @endTime = null
                        @nextAction()
                when EVENTS.MOVE_LEFT
                    if @sprite.body.x <= @targetX
                        @sprite.body.x = @targetX
                        @targetX = null
                        @sprite.body.velocity.x = 0
                        @nextAction()
                when EVENTS.MOVE_RIGHT
                    if @sprite.body.x >= @targetX
                        @sprite.body.x = @targetX
                        @targetX = null
                        @sprite.body.velocity.x = 0
                        @nextAction()

    nextAction: =>
        if @eventQueue.length > 0
            @currentEvent = @eventQueue.shift()
            switch @currentEvent[0]
                when EVENTS.POSE
                    @sprite.animations.play('pose')
                when EVENTS.IDLE
                    @sprite.animations.play('idle')
                    @endTime = @game.time.now + @currentEvent[1]
                when EVENTS.ATTACK
                    @sprite.animations.play('attack')
                when EVENTS.HIT
                    @health -= @currentEvent[1]
                    for heart, i in @hearts
                        heart.visible = i < @health
                    @sprite.animations.play('hit')
                when EVENTS.DIE
                    @sprite.animations.play('die')
                when EVENTS.MOVE_LEFT
                    @targetX = @sprite.body.x - @currentEvent[1]
                    @sprite.body.velocity.x = -400
                    @sprite.scale.x = 1
                    @sprite.animations.play('forward')
                when EVENTS.MOVE_RIGHT
                    @targetX = @sprite.body.x + @currentEvent[1]
                    @sprite.body.velocity.x = 400
                    @sprite.scale.x = -1
                    @sprite.animations.play('forward')
        else
            if @repeatFn?
                @repeatFn()
                @nextAction()
            else
                @currentEvent = null

    repeat: (@repeatFn) ->

    pose: ->
        @eventQueue.push([EVENTS.POSE])

    idle: (seconds) ->
        @eventQueue.push([EVENTS.IDLE, seconds])

    attack: ->
        @eventQueue.push([EVENTS.ATTACK])

    hit: (damage) ->
        @eventQueue.unshift([EVENTS.HIT, damage])

    die: ->
        @eventQueue.push([EVENTS.DIE])

    moveLeft: (dist) ->
        @eventQueue.push([EVENTS.MOVE_LEFT, dist])

    moveRight: (dist) ->
        @eventQueue.push([EVENTS.MOVE_RIGHT, dist])


    """
    chase: ->
        @sprite.body.velocity.x = 100 * Math.abs(@sprite.body.x - @game.player.sprite.body.x)

    stop: ->
        @sprite.body.velocity.x = 0
        @sprite.body.velocity.y = 0

    randomBounce: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = Math.random() * 800 - 400

    bounceLeft: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = -400

    bounceRight: ->
        @sprite.body.velocity.y = -800
        @sprite.body.velocity.x = 400
    """
        


class Game
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
        @game.load.spritesheet('spoonman', 'bosses/spoonmanbig.png', 273, 192, 12)
        @game.load.spritesheet('toilet', 'toilet.png', 130, 284, 2)
        @game.load.image('tiles', 'tile.png')

        for key, level of levels
            level.run = level.run?.bind(@)
            mapData = (for rowData, row in level.tiles.trim().split('\n')
                if row == 0 or row == 23 then continue
                (for tileStr, col in rowData.split('')
                    if col == 0 or col == 41 then continue
                    if tileStr == ' '
                        tile = 0
                    else
                        tile = 1
                    tile
                ).join(',')
            ).join('\n')
            @game.load.tilemap(key, null, mapData)

    create: =>

        @roomCol = 3
        @roomRow = -2

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

        #@player = new Player(@game, 600, 400)

        @loadMap()

        @currentBoss = null

        #@player.body.setSize(32, 64, 0, 0)

        #@fontStyle =
        #    font: "26px Monospace"
        #    fill: "#D7D7D7"
        #    boundsAlignH: 'center'
        #    fontWeight: 'bold'
        #    boundsAlignV: 'middle'
        #
    loadMap: ->
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

        level.run?(@)

        @layer.blendMode = PIXI.blendModes.MULTIPLY
    
    spawnActor: (x, y, key, options) ->
        actor = new Actor(@game, x, y, key, options.hp, options.animations)
        actor.repeat(options.pattern.bind(actor))
        actor.nextAction()

    update: =>
        for sprite in @game.groups.actors.children
            @game.physics.arcade.collide(sprite, @layer)
        return
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
            if @keys._4.justDown
                @currentBoss.chase()

        #total = Math.abs(@currentBoss.sprite.body.velocity.x) + Math.abs(@currentBoss.sprite.body.velocity.y)
        #console.log(total)
        #if total < 100
        #    @currentBoss.randomBounce()


window.game = new Game('game')
