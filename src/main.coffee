SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720


class BootState
    create: ->
        @game.state.start('preload')


class PreloadState
    preload: ->
        @game.load.spritesheet('player1', 'player.png', 116, 160, 36)
        @game.load.image('title', 'title.png')
        @game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3)
        @game.load.image('healthbar-green', 'healthbar-green.png')

        @game.load.spritesheet('rock', 'rock.png', 294, 250, 3)
        @game.load.spritesheet('paper', 'paper.png', 300, 169, 3)
        @game.load.spritesheet('scissors', 'scissors.png', 300, 168, 3)

        for levelName in ['arctic', 'city', 'forest', 'kitchen', 'stage', 'table']
            @game.load.image(levelName, "backgrounds/#{levelName}.png")
            @game.load.image(levelName + '-thumbnail', "backgrounds/#{levelName}-thumbnail.png")

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
            @game.state.start('levelselect')

window.selectedLevel = 'arctic'


class LevelSelectState
    create: ->
        @game.stage.backgroundColor = '#FFaaaa'
        @levels = [
            ['arctic', 'city', 'forest']
            ['kitchen', 'stage', 'table']
        ]
        @stageSprites = (
            for row in [0...2]
                for col in [0...3]
                    x = SCREEN_WIDTH/2 - 400 + col * 300
                    y = 225 + row * 250
                    sprite = @game.add.sprite(x + 100, y + 100, @levels[row][col] + '-thumbnail')
                    sprite.anchor.setTo(0.5, 0.5)
                    @game.add.text x+10, y+150, @levels[row][col].toUpperCase(),
                        fill: 'white'
                        stroke: 'black'
                        strokeThickness: 6
                        font: '30px bold monospace'
                    sprite
        )
        @currentCol = 0
        @currentRow = 0

        @title = @game.add.text 0, 0, 'SELECT STAGE',
            fill: 'white'
            stroke: 'black'
            strokeThickness: 12
            boundsAlignH: 'center'
            boundsAlignV: 'middle'
            font: '100px bold monospace'
        @title.setTextBounds(0, 0, SCREEN_WIDTH, 120)

        @directions = @game.add.text 0, 80, 'Choose with arrows, space to select',
            fill: 'white'
            stroke: 'black'
            strokeThickness: 6
            boundsAlignH: 'center'
            boundsAlignV: 'middle'
            font: '48px bold monospace'
        @directions.setTextBounds(0, 0, SCREEN_WIDTH, 120)

        @keys = @game.input.keyboard.addKeys
            spacebar: Phaser.KeyCode.SPACEBAR
            up: Phaser.KeyCode.UP
            down: Phaser.KeyCode.DOWN
            left: Phaser.KeyCode.LEFT
            right: Phaser.KeyCode.RIGHT

        @highlight()

    highlight: ->
        for rowData, row in @stageSprites
            for sprite, col in rowData
                if not (col == @currentCol and row == @currentRow)
                    sprite.tint = 0x666666
                    sprite.scale.x = 1
                    sprite.scale.y = 1
                else
                    sprite.tint = 0xffffff
                    sprite.scale.x = 1.1
                    sprite.scale.y = 1.1
                    window.selectedLevel = @levels[row][col]


    update: ->
        if @keys.spacebar.justDown
            @game.state.start('game')

        if @keys.left.justDown
            @currentCol--
            if @currentCol < 0 then @currentCol = 0
            @highlight()
        if @keys.right.justDown
            @currentCol++
            if @currentCol > 2 then @currentCol = 2
            @highlight()

        if @keys.up.justDown
            @currentRow--
            if @currentRow < 0 then @currentRow = 0
            @highlight()
        if @keys.down.justDown
            @currentRow++
            if @currentRow > 1 then @currentRow = 1
            @highlight()


class GameState
    makePlayer: (x, y, healthbarX, healthbarY, spriteKey, animations) ->
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
        healthbarBackground = @game.add.sprite(healthbarX, healthbarY, 'healthbar-background')
        healthbarBackground.animations.add('glow', [0,0,0,0,0,0,0,0,0,1,2], 10, true)
        healthbarBackground.animations.play('glow')
        healthbarGreen = @game.add.sprite(healthbarX + 4, healthbarY + 4, 'healthbar-green')

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

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, selectedLevel)

        @player1 = @makePlayer SCREEN_WIDTH/2 - 100, SCREEN_HEIGHT/2 + 40, 40, 40, 'player1',
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

        @player2 = @makePlayer SCREEN_WIDTH/2 + 100, SCREEN_HEIGHT/2 + 40, SCREEN_WIDTH/2 + 40, 40, 'player1',
            pose: [31,32,33]
            idle: [6,7,9]
            punch: [31]
            knee: [13]
            kick: [20]
            hit: [20,21,22]
            die: [10,10,11]
            transform: [16,17,18,19]
        @player2.sprite.scale.x = 3
        @player2.sprite.scale.y = 3

        @doCountdown()

    doCountdown: ->
        @combatState = 'countdown'
        @startTime = @game.time.now + 100 #5000
        @countdownDisplay = @game.add.text 1, 0, '',
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
        if @player1.health <= 0
            @player1.sprite.animations.play('die')
            @player2.sprite.animations.play('transform')
        else if @player2.health <= 0
            @player2.sprite.animations.play('die')
            @player1.sprite.animations.play('transform')
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

            console.log(@player1.health, @player2.health)
            if @player1.health <= 0 or @player2.health <= 0
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
            if @player1.attack != @player1.sprite.animations.currentAnim.name
                @player1.sprite.animations.play(@player1.attack)

            if @keys.p2_punch.isDown or @keys.p2_kick.isDown or @keys.p2_knee.isDown
                if @keys.p2_punch.isDown
                    @player2.attack = 'punch'
                if @keys.p2_kick.isDown
                    @player2.attack = 'kick'
                if @keys.p2_knee.isDown
                    @player2.attack = 'knee'
            else
                @player2.attack = 'idle'
            if @player2.attack != @player2.sprite.animations.currentAnim.name
                @player2.sprite.animations.play(@player2.attack)

            if @player1.attack != @player2.attack
                if @player1.attack == 'punch' and @player2.attack == 'knee'
                    @player2.health -= 2
                if @player1.attack == 'knee' and @player2.attack == 'kick'
                    @player2.health -= 2
                if @player1.attack == 'kick' and @player2.attack == 'punch'
                    @player2.health -= 2
                if @player2.attack == 'idle'
                    @player2.health -= 1

            if @player2.attack != @player1.attack
                if @player2.attack == 'punch' and @player1.attack == 'knee'
                    @player1.health -= 2
                if @player2.attack == 'knee' and @player1.attack == 'kick'
                    @player1.health -= 2
                if @player2.attack == 'kick' and @player1.attack == 'punch'
                    @player1.health -= 2
                if @player1.attack == 'idle'
                    @player1.health -= 1

            @player1.healthbarGreen.scale.x = @player1.health / 100
            @player2.healthbarGreen.scale.x = @player2.health / 100

        else if @combatState == 'over'
            null


class WinLoseState
    create: ->


game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, 'game')
game.state.add('boot', BootState)
game.state.add('preload', PreloadState)
game.state.add('title', TitleState)
game.state.add('levelselect', LevelSelectState)
game.state.add('game', GameState)
game.state.add('winlose', WinLoseState)

game.state.start('boot')
