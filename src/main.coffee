SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720


"""
3 moves
punch
kick
uppercut

kick beats punch
punch beats uppercut
uppercut beats kick

4 hits to ded someone

hold the button to hold it out
"""


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
        @sprite.animations.add('forward', animations.forward, 10, true)
        @sprite.animations.add('attack', animations.attack, 10, false).onComplete.add(@nextAction)
        @sprite.animations.add('hit', animations.hit, 10, false).onComplete.add(@nextAction)
        @sprite.animations.add('die', animations.die, 10, false).onComplete.add(@nextAction)

        @movementTween = null
        @health = 10
        @hearts = []
        for i in [0...10]
            heart = @game.add.sprite(48 + i * 64, 48, 'heart')
            @hearts.push(heart)
            @game.groups.ui.add(heart)

        @endTime = null
        @targetX = null

        @sprite.update = =>
            if @currentEvent?
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
            switch @currentEvent.type
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
                    @sprite.scale.x = Math.abs(@sprite.scale.x)
                    @sprite.animations.play('forward')
                when EVENTS.MOVE_RIGHT
                    @targetX = @sprite.body.x + @currentEvent[1]
                    @sprite.body.velocity.x = 400
                    @sprite.scale.x = -Math.abs(@sprite.scale.x)
                    @sprite.animations.play('forward')
        else
            if @repeatFn?
                @repeatFn()
                @nextAction()
            else
                @currentEvent = null


class Game
    constructor: (@elementId) ->
        @game = new Phaser.Game(
            SCREEN_WIDTH, SCREEN_HEIGHT
            Phaser.AUTO, @elementId
            {preload: @preload, create: @create, update: @update}
        )

    doCommand: (command) ->

    preload: =>
        @game.load.spritesheet('player1', 'player.png', 116, 160, 36)
        @game.load.image('heart', 'heart.png')
        @game.load.image('kitchen', 'backgrounds/kitchen.png')
        @game.load.image('sink', 'backgrounds/sink.png')
        @game.load.image('forest', 'backgrounds/forest.png')
        @game.load.spritesheet('spoonman', 'bosses/spoonmanbig.png', 273, 192, 12)

    create: =>
        @keys = @game.input.keyboard.addKeys
            confirm: Phaser.KeyCode.SPACEBAR

            p1_punch: Phaser.KeyCode.ONE
            p1_kick: Phaser.KeyCode.TWO
            p1_uppercut: Phaser.KeyCode.THREE

            p2_punch: Phaser.KeyCode.LEFT
            p2_kick: Phaser.KeyCode.DOWN
            p2_uppercut: Phaser.KeyCode.RIGHT

        @game.time.desiredFps = 60

        @game.groups = {}
        @game.groups.background = @game.add.group()
        @game.groups.actors = @game.add.group()
        @game.groups.player = @game.add.group()
        @game.groups.ui = @game.add.group()

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'forest')

        @player1 = @game.add.sprite(SCREEN_WIDTH/2 + 100, 100, 'player1')
        @player1.animations.add('pose', [31,32,33], 10, true)
        @player1.animations.add('idle', [6,7,9], 10, true)
        @player1.animations.add('forward', [11,12,13,14,15], 10, true)
        @player1.animations.add('punch', [23,24,25,26], 10, true)
        @player1.animations.add('kick', [23,24,25,26], 10, true)
        @player1.animations.add('uppercut', [23,24,25,26], 10, true)
        @player1.animations.add('hit', [20,21,22], 10, true)
        @player1.animations.add('die', [10,10,11], 10, true)
        @player1.scale.x = -3
        @player1.scale.y = 3
        @player1.attack = 'idle'
        @player1.animations.play('idle')
        @player1Health = 50
        @player1HealthDisplay = @game.add.text(20, 20, '||||||||||||||||||||||||||||||||||||||||||||||||||')

        @player2 = @game.add.sprite(SCREEN_WIDTH/2 - 50, 100, 'player1')
        @player2.animations.add('pose', [31,32,33], 10, true)
        @player2.animations.add('idle', [6,7,9], 10, true)
        @player2.animations.add('forward', [11,12,13,14,15], 10, true)
        @player2.animations.add('punch', [23,24,25,26], 10, true)
        @player2.animations.add('kick', [23,24,25,26], 10, true)
        @player2.animations.add('uppercut', [23,24,25,26], 10, true)
        @player2.animations.add('hit', [20,21,22], 10, true)
        @player2.animations.add('die', [10,10,11], 10, true)
        @player2.scale.x = 3
        @player2.scale.y = 3
        @player2.attack = 'idle'
        @player2Health = 50
        @player2HealthDisplay = @game.add.text(SCREEN_WIDTH/2 + 40, 20, '||||||||||||||||||||||||||||||||||||||||||||||||||')

    update: =>
        if @keys.p1_punch.isDown or @keys.p1_kick.isDown or @keys.p1_uppercut.isDown
            if @keys.p1_punch.isDown
                @player1.attack = 'punch'
            if @keys.p1_kick.isDown
                @player1.attack = 'kick'
            if @keys.p1_uppercut.isDown
                @player1.attack = 'uppercut'
        else
            @player1.attack = 'idle'
        if @player1.attack != @player1.animations.currentAnim.name
            @player1.animations.play(@player1.attack)

        if @keys.p2_punch.isDown or @keys.p2_kick.isDown or @keys.p2_uppercut.isDown
            if @keys.p2_punch.isDown
                @player2.attack = 'punch'
            if @keys.p2_kick.isDown
                @player2.attack = 'kick'
            if @keys.p2_uppercut.isDown
                @player2.attack = 'uppercut'
        else
            @player2.attack = 'idle'
        if @player2.attack != @player2.animations.currentAnim.name
            @player2.animations.play(@player2.attack)

        if @player1.attack != @player2.attack
            if @player1.attack == 'punch' and @player2.attack == 'uppercut'
                @player2Health -= 2
            if @player1.attack == 'uppercut' and @player2.attack == 'kick'
                @player2Health -= 2
            if @player1.attack == 'kick' and @player2.attack == 'punch'
                @player2Health -= 2
            if @player2.attack == 'idle'
                @player2Health -= 1

        if @player2.attack != @player1.attack
            if @player2.attack == 'punch' and @player1.attack == 'uppercut'
                @player1Health -= 2
            if @player2.attack == 'uppercut' and @player1.attack == 'kick'
                @player1Health -= 2
            if @player2.attack == 'kick' and @player1.attack == 'punch'
                @player1Health -= 2
            if @player1.attack == 'idle'
                @player1Health -= 1

        @player1HealthDisplay.text = ('|').repeat(@player1Health)
        @player2HealthDisplay.text = ('|').repeat(@player2Health)

window.game = new Game('game')


#@fontStyle =
#    font: "26px Monospace"
#    fill: "#D7D7D7"
#    boundsAlignH: 'center'
#    fontWeight: 'bold'
#    boundsAlignV: 'middle'
#

#if @layer then @layer.destroy()
#@tilemap = @game.add.tilemap(key, TILE_SIZE, TILE_SIZE)
#@tilemap.addTilesetImage('tiles')
#@tilemap.setCollisionByExclusion([0])
#@layer = @tilemap.createLayer(0)
#@layer.resizeWorld()
#@game.groups.background.add(@layer)

#level.run?(@)

#@layer.blendMode = PIXI.blendModes.MULTIPLY
