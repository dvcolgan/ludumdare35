SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720


"""
3 moves
punch
kick
knee

kick beats punch
punch beats knee
knee beats kick

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


class BootState
    create: ->
        @game.state.start('preload')


class PreloadState
    preload: ->
        @game.load.spritesheet('player1', 'player.png', 116, 160, 36)
        @game.load.image('heart', 'heart.png')
        @game.load.image('kitchen', 'backgrounds/kitchen.png')
        @game.load.image('sink', 'backgrounds/sink.png')
        @game.load.image('forest', 'backgrounds/forest.png')
        @game.load.image('title', 'backgrounds/title.png')
        @game.load.image('healthbar-background', 'healthbar-background.png')
        @game.load.image('healthbar-green', 'healthbar-green.png')
        @game.load.spritesheet('spoonman', 'bosses/spoonmanbig.png', 273, 192, 12)

    create: ->
        @game.state.start('title')


class TitleState
    create: ->
        @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'title')
        @startText = @game.add.text(30, 500, 'DEPRESS\nSPACEBAR', {
            fill: 'white'
            font: '60px bold monospace'
        })
        @flipperTime = @game.time.now + 700
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

    update: ->
        if @game.time.now >= @flipperTime
            @startText.visible = not @startText.visible
            if @startText.visible
                @flipperTime = @game.time.now + 700
            else
                @flipperTime = @game.time.now + 200

        if @spacebar.justDown
            @game.state.start('game')


class GameState
    makePlayer: (x, y, spriteKey, animations) ->
        sprite = @game.add.sprite(x, y, spriteKey)
        sprite.animations.add('pose', animations.pose, 10, true)
        sprite.animations.add('idle', animations.idle, 5, true)
        sprite.animations.add('punch', animations.punch, 10, true)
        sprite.animations.add('knee', animations.knee, 10, true)
        sprite.animations.add('kick', animations.kick, 10, true)
        sprite.animations.add('hit', animations.hit, 10, false)
        sprite.animations.add('die', animations.die, 10, false)
        sprite.animations.add('transform', animations.transform, 10, false)
        sprite.anchor.setTo(0.5, 0.5)
        attack = 'idle'
        sprite.animations.play('idle')

        health = 100
        healthbarBackground = @game.add.sprite(20, 20, 'healthbar-background')
        healthbarGreen = @game.add.sprite(24, 24, 'healthbar-green')

        {sprite, attack, health, healthbarBackground, healthbarGreen}

    create: ->
        @keys = @game.input.keyboard.addKeys
            confirm: Phaser.KeyCode.SPACEBAR

            p1_punch: Phaser.KeyCode.ONE
            p1_kick: Phaser.KeyCode.TWO
            p1_knee: Phaser.KeyCode.THREE

            p2_punch: Phaser.KeyCode.LEFT
            p2_kick: Phaser.KeyCode.DOWN
            p2_knee: Phaser.KeyCode.RIGHT

        @game.time.desiredFps = 60

        @game.groups = {}
        @game.groups.background = @game.add.group()
        @game.groups.actors = @game.add.group()
        @game.groups.player = @game.add.group()
        @game.groups.ui = @game.add.group()

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'forest')

        @player1 = @makePlayer SCREEN_WIDTH/2 - 100, SCREEN_HEIGHT/2, 'player1',
            pose: [31,32,33]
            idle: [6,7,9]
            punch: [31]
            knee: [13]
            kick: [20]
            hit: [20,21,22]
            die: [10,10,11]
            transform: [16,17,18,19]
        @player1.sprite.scale.x = -3
        @player1.sprite.scale.y = 3

        @player2 = @makePlayer SCREEN_WIDTH/2 + 100, SCREEN_HEIGHT/2, 'player1',
            pose: [31,32,33]
            idle: [6,7,9]
            punch: [31]
            knee: [13]
            kick: [20]
            hit: [20,21,22]
            die: [10,10,11]
            transform: [16,17,18,19]

        @doCountdown()

    doCountdown: ->
        @combatState = 'countdown'
        @startTime = @game.time.now + 5000
        @countdownDisplay = @game.add.text 0, 0, '',
            fill: 'white'
            stroke: 'black'
            strokeThickness: 12
            boundsAlignH: 'center'
            boundsAlignV: 'middle'
            font: '300px bold monospace'
        @countdownDisplay.setTextBounds(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    doStartRound: ->
        @countdownDisplay.destroy()
        @combatState = 'during'

    doEndRound: ->
        if @player1Health <= 0
            @player1.animations.play('die')
            @player2.animations.play('transform')
        else if @player2Health <= 0
            @player2.animations.play('die')
            @player1.animations.play('transform')
        @combatState = 'over'

    update: ->
        if @combatState == 'countdown'
            remaining = Math.floor((@startTime - @game.time.now) / 1000)
            display = remaining - 1
            if display == 0 then display = 'FIGHT!'
            @countdownDisplay.text = display.toString()

            if remaining <= 0
                @doStartRound()
                return

        else if @combatState == 'during'

            if @player1Health <= 0 or @player2Health <= 0
                @doEndRound()
                return

            if @keys.p1_punch.isDown or @keys.p1_kick.isDown or @keys.p1_knee.isDown
                if @keys.p1_punch.isDown
                    @player1.attack = 'punch'
                if @keys.p1_kick.isDown
                    @player1.attack = 'kick'
                if @keys.p1_knee.isDown
                    @player1.attack = 'knee'
            else
                @player1.attack = 'idle'
            if @player1.attack != @player1.animations.currentAnim.name
                @player1.animations.play(@player1.attack)

            if @keys.p2_punch.isDown or @keys.p2_kick.isDown or @keys.p2_knee.isDown
                if @keys.p2_punch.isDown
                    @player2.attack = 'punch'
                if @keys.p2_kick.isDown
                    @player2.attack = 'kick'
                if @keys.p2_knee.isDown
                    @player2.attack = 'knee'
            else
                @player2.attack = 'idle'
            if @player2.attack != @player2.animations.currentAnim.name
                @player2.animations.play(@player2.attack)

            if @player1.attack != @player2.attack
                if @player1.attack == 'punch' and @player2.attack == 'knee'
                    @player2Health -= 2
                if @player1.attack == 'knee' and @player2.attack == 'kick'
                    @player2Health -= 2
                if @player1.attack == 'kick' and @player2.attack == 'punch'
                    @player2Health -= 2
                if @player2.attack == 'idle'
                    @player2Health -= 1

            if @player2.attack != @player1.attack
                if @player2.attack == 'punch' and @player1.attack == 'knee'
                    @player1Health -= 2
                if @player2.attack == 'knee' and @player1.attack == 'kick'
                    @player1Health -= 2
                if @player2.attack == 'kick' and @player1.attack == 'punch'
                    @player1Health -= 2
                if @player1.attack == 'idle'
                    @player1Health -= 1

            @player1HealthbarGreen.scale.x = @player1Health / 100
            @player2HealthbarGreen.scale.x = @player2Health / 100

        else if @combatState == 'over'
            null


class WinLoseState
    create: ->


game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, 'game')
game.state.add('boot', BootState)
game.state.add('preload', PreloadState)
game.state.add('title', TitleState)
game.state.add('game', GameState)
game.state.add('winlose', WinLoseState)

game.state.start('boot')


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
