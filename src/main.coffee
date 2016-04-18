SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
window.selectedLevel = 'arctic'


class BootState
    preload: ->
        @game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3)
        @game.load.image('healthbar-green', 'healthbar-green.png')

    create: ->
        @game.state.start('preload')


class PreloadState
    preload: ->
        @game.load.onFileComplete.add(@fileComplete)

        barX = 400
        barY = 300
        @progressbarBackground = @game.add.sprite(barX, barY, 'healthbar-background')
        @progressbarBackground.animations.add('glow', [0,0,0,0,0,0,0,0,0,1,2], 10, true)
        @progressbarBackground.animations.play('glow')
        @progressbarGreen = @game.add.sprite(barX + 4, barY + 4, 'healthbar-green')
        @progressbarGreen.scale.x = 0

        @game.load.spritesheet('player1', 'player1.png', 116, 160, 36)
        @game.load.spritesheet('player2', 'player2.png', 180, 316, 21)
        @game.load.image('title', 'title.jpg')
        @game.load.image('how-to-play', 'how-to-play.jpg')
        #@game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3)
        #@game.load.image('healthbar-green', 'healthbar-green.png')

        @game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg'])

        @game.load.image('intro1', 'intro1.png')
        @game.load.image('intro2', 'intro2.png')
        @game.load.image('intro3', 'intro3.png')
        @game.load.image('intro4', 'intro4.png')

        @game.load.spritesheet('rock', 'rock.png', 294, 250, 3)
        @game.load.spritesheet('paper', 'paper.png', 300, 169, 3)
        @game.load.spritesheet('scissors', 'scissors.png', 300, 168, 3)

        @game.load.image('sink', 'backgrounds/sink.png')

        for levelName in ['arctic', 'city', 'forest', 'kitchen', 'stage', 'table']
            @game.load.image(levelName, "backgrounds/#{levelName}.jpg")
            @game.load.image(levelName + '-thumbnail', "backgrounds/#{levelName}-thumbnail.jpg")

    create: ->
        @game.add.audio('bgm').play()
        @game.state.start('intro')

    fileComplete: (progress, cacheKey, success, totalLoaded, totalFiles) =>
        @progressbarGreen.scale.x = progress


class IntroState
    showScene: (which, text) ->
        if @background? then @background.destroy()
        if @text? then @text.destroy()
        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'intro' + which)
        @text = @game.add.text(30, 500, text, {
            fill: 'white'
            font: '60px bold monospace'
        })

    create: ->
        @background = null
        @text = null
        @current = 1
        @showScene(@current)

        @switchTime = @game.time.now + 5000
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

    update: ->
        if @game.time.now >= @switchTime
            @current++
            if @current >= 5
                @game.state.start('title')
            else
                @switchTime = @game.time.now + 5000
                @showScene(@current, '')


        if @spacebar.justDown
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
            @game.state.start('how-to-play')


class HowToPlayState
    create: ->
        @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'how-to-play')
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

    update: ->
        if @spacebar.justDown
            @game.state.start('levelselect')


class LevelSelectState
    create: ->
        @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink')
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

        @directions = @game.add.text 0, 80, 'Choose with arrows, space to start',
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
        sprite.animations.add('paper', animations.paper, 10, true)
        sprite.animations.add('scissors', animations.scissors, 10, true)
        sprite.animations.add('rock', animations.rock, 10, true)
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
            spacebar: Phaser.KeyCode.SPACEBAR

            p1_paper: Phaser.KeyCode.ONE
            p1_rock: Phaser.KeyCode.TWO
            p1_scissors: Phaser.KeyCode.THREE

            p2_paper: Phaser.KeyCode.LEFT
            p2_rock: Phaser.KeyCode.DOWN
            p2_scissors: Phaser.KeyCode.RIGHT

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
            paper: [31, 24]
            scissors: [11,12,14]
            rock: [20]
            hit: [21,22]
            die: [21,22]
            transform: [16,17,18,19]
        @player1.sprite.scale.x = -3
        @player1.sprite.scale.y = 3

        @player2 = @makePlayer SCREEN_WIDTH/2 + 100, SCREEN_HEIGHT/2 + 40, SCREEN_WIDTH/2 + 40, 40, 'player2',
            pose: [3,4,11]
            idle: [15,16,17]
            paper: [7,6,7]
            scissors: [3,4,5]
            rock: [0,1,2]
            hit: [9,10,11]
            die: [9,10,11]
            transform: [12,5,14,13]
        @player2.sprite.scale.x = 1.7
        @player2.sprite.scale.y = 1.7

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
            @player2.sprite.animations.play('transform').onComplete.add =>
                final = @game.add.sprite(@player2.sprite.x + 150, @player2.sprite.y - 250, @player2.attack)
                final.scale.setTo(-2, 2)
                final.animations.add('transform', [0,1,2], 2, false).onComplete.add =>
                    @doFinished()
                final.animations.play('transform')
                @player2.sprite.destroy()
        else if @player2.health <= 0
            @player2.sprite.animations.play('die')
            @player1.sprite.animations.play('transform').onComplete.add =>
                final = @game.add.sprite(@player1.sprite.x - 150, @player1.sprite.y - 200, @player1.attack)
                final.scale.setTo(2, 2)
                final.animations.add('transform', [0,1,2], 2, false).onComplete.add =>
                    @doFinished()
                final.animations.play('transform')
                @player1.sprite.destroy()
        @combatState = 'over'

    doFinished: =>
        @combatState = 'finished'

    update: ->
        @player1.healthbarGreen.scale.x = @player1.health / 100
        @player2.healthbarGreen.scale.x = @player2.health / 100

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

            if @keys.p1_paper.isDown or @keys.p1_rock.isDown or @keys.p1_scissors.isDown
                if @keys.p1_paper.isDown
                    @player1.attack = 'paper'
                if @keys.p1_rock.isDown
                    @player1.attack = 'rock'
                if @keys.p1_scissors.isDown
                    @player1.attack = 'scissors'
            else
                @player1.attack = 'idle'
            if @player1.attack != @player1.sprite.animations.currentAnim.name
                @player1.sprite.animations.play(@player1.attack)

            if @keys.p2_paper.isDown or @keys.p2_rock.isDown or @keys.p2_scissors.isDown
                if @keys.p2_paper.isDown
                    @player2.attack = 'paper'
                if @keys.p2_rock.isDown
                    @player2.attack = 'rock'
                if @keys.p2_scissors.isDown
                    @player2.attack = 'scissors'
            else
                @player2.attack = 'idle'
            if @player2.attack != @player2.sprite.animations.currentAnim.name
                @player2.sprite.animations.play(@player2.attack)

            if @player1.attack != @player2.attack
                if @player1.attack == 'paper' and @player2.attack == 'scissors'
                    @player2.health -= 2
                if @player1.attack == 'scissors' and @player2.attack == 'rock'
                    @player2.health -= 2
                if @player1.attack == 'rock' and @player2.attack == 'paper'
                    @player2.health -= 2
                if @player2.attack == 'idle'
                    @player2.health -= 1

            if @player2.attack != @player1.attack
                if @player2.attack == 'paper' and @player1.attack == 'scissors'
                    @player1.health -= 2
                if @player2.attack == 'scissors' and @player1.attack == 'rock'
                    @player1.health -= 2
                if @player2.attack == 'rock' and @player1.attack == 'paper'
                    @player1.health -= 2
                if @player1.attack == 'idle'
                    @player1.health -= 1

        #else if @combatState == 'over'
        #    null
        else if @combatState == 'finished'
            if @keys.spacebar.justDown
                @game.state.start('levelselect')


class WinLoseState
    create: ->


game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, 'game')
game.state.add('boot', BootState)
game.state.add('preload', PreloadState)
game.state.add('intro', IntroState)
game.state.add('title', TitleState)
game.state.add('how-to-play', HowToPlayState)
game.state.add('levelselect', LevelSelectState)
game.state.add('game', GameState)
game.state.add('winlose', WinLoseState)

game.state.start('boot')
