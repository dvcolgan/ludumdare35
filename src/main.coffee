SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
MAX_HEALTH = 1000
window.selectedLevel = 'arctic'
window.player2 = false


class BootState
    preload: ->
        @game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3)
        @game.load.image('healthbar-green', 'healthbar-green.png')

    create: ->
        @game.state.start('preload')


class PreloadState
    preload: ->
        @game.load.onFileComplete.add(@fileComplete)
        @game.stage.backgroundColor = '#cccccc'

        barX = SCREEN_WIDTH/2 - 560/2
        barY = SCREEN_HEIGHT/2 - 50/2
        @progressbarBackground = @game.add.sprite(barX, barY, 'healthbar-background')
        @progressbarBackground.animations.add('glow', [0,0,0,0,0,0,0,0,0,1,2], 10, true)
        @progressbarBackground.animations.play('glow')
        @progressbarGreen = @game.add.sprite(barX + 4, barY + 4, 'healthbar-green')
        @progressbarGreen.scale.x = 0

        @game.load.spritesheet('player1', 'player1.png', 116, 160, 36)
        @game.load.spritesheet('player2', 'player2.png', 180, 316, 21)
        @game.load.image('title', 'title.jpg')
        @game.load.image('how-to-play', 'how-to-play.jpg')
        @game.load.image('how-to-play-ai', 'how-to-play-ai.jpg')
        #@game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3)
        #@game.load.image('healthbar-green', 'healthbar-green.png')

        @game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg'])

        @game.load.audio('select-a-stage', ['audio/select-a-stage.mp3', 'audio/select-a-stage.ogg'])
        @game.load.audio('fight', ['audio/fight.mp3', 'audio/fight.ogg'])
        @game.load.audio('mortal-ro-sham-bo', ['audio/mortal-ro-sham-bo.mp3', 'audio/mortal-ro-sham-bo.ogg'])

        @game.load.audio('rock-wins', ['audio/rock-wins.mp3', 'audio/rock-wins.ogg'])
        @game.load.audio('paper-wins', ['audio/paper-wins.mp3', 'audio/paper-wins.ogg'])
        @game.load.audio('scissors-wins', ['audio/scissors-wins.mp3', 'audio/scissors-wins.ogg'])

        @game.load.image('intro1', 'intro1.png')
        @game.load.image('intro2', 'intro1.png')
        @game.load.image('intro3', 'intro2.png')
        @game.load.image('intro4', 'intro3.png')
        @game.load.image('intro5', 'intro4.png')

        @game.load.audio('intro-talk1', ['audio/intro-talk1.mp3', 'audio/intro-talk1.mp3'])
        @game.load.audio('intro-talk2', ['audio/intro-talk2.mp3', 'audio/intro-talk2.mp3'])
        @game.load.audio('intro-talk3', ['audio/intro-talk3.mp3', 'audio/intro-talk3.mp3'])
        @game.load.audio('intro-talk4', ['audio/intro-talk4.mp3', 'audio/intro-talk4.mp3'])
        @game.load.audio('intro-talk5', ['audio/intro-talk5.mp3', 'audio/intro-talk5.mp3'])

        @game.load.spritesheet('rock', 'rock.png', 294, 250, 3)
        @game.load.spritesheet('paper', 'paper.png', 300, 169, 3)
        @game.load.spritesheet('scissors', 'scissors.png', 300, 168, 3)

        @game.load.image('sink', 'backgrounds/sink.png')

        for levelName in ['arctic', 'city', 'forest', 'kitchen', 'stage', 'table']
            @game.load.image(levelName, "backgrounds/#{levelName}.jpg")
            @game.load.image(levelName + '-thumbnail', "backgrounds/#{levelName}-thumbnail.jpg")

    create: ->
        @game.add.audio('bgm').play('', 0, 0.7, true)
        @game.state.start('intro')

    fileComplete: (progress, cacheKey, success, totalLoaded, totalFiles) =>
        @progressbarGreen.scale.x = progress / 100


class IntroState
    showScene: (which) ->
        if @background? then @background.destroy()
        if @text? then @text.destroy()
        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'intro' + which)
        @game.add.audio('intro-talk' + which).play()
        @text = @game.add.text(30, 30, @texts[which-1], {
            fill: 'white'
            stroke: 'black'
            strokeThickness: 6
            font: '80px bold monospace'
        })

    create: ->
        @durations = [
            2500
            2500
            2500
            2500
            3500
        ]
        @texts = [
            'One slice left...'
            'I only had one. It\'s mine!'
            'Yours was half the pie!'
            'Only one way to settle this...'
            'RO SHAM BO!!!'
        ]
        @background = null
        @text = null
        @current = 1
        @showScene(@current)

        @switchTime = @game.time.now + @durations[0]
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

    update: ->
        if @game.time.now >= @switchTime
            @current++
            if @current >= 6
                @game.state.start('title')
            else
                @switchTime = @game.time.now + @durations[@current-1]
                @showScene(@current, '')


        if @spacebar.justDown
            @game.state.start('title')


class TitleState
    create: ->
        @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'title')
        @startText = @game.add.text(30, 400, 'DEPRESS\nSPACEBAR\nTO FIGHT\nTHE COMPUTER', {
            fill: 'white'
            stroke: 'black'
            strokeThickness: 6
            font: '60px bold monospace'
        })
        @startText2 = @game.add.text(980, 320, 'DEPRESS\nENTER\nTO FIGHT\nA FRIEND\nHOTSEAT', {
            fill: 'white'
            stroke: 'black'
            strokeThickness: 6
            font: '60px bold monospace'
        })
        @flipperTime = @game.time.now + 700
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)
        @enter = @game.input.keyboard.addKey(Phaser.KeyCode.ENTER)
        @game.add.audio('mortal-ro-sham-bo').play()

    update: ->
        if @game.time.now >= @flipperTime
            @startText.visible = not @startText.visible
            @startText2.visible = not @startText2.visible
            if @startText.visible
                @flipperTime = @game.time.now + 700
            else
                @flipperTime = @game.time.now + 200

        if @spacebar.justDown
            window.player2 = false
            @game.state.start('how-to-play')

        if @enter.justDown
            window.player2 = true
            @game.state.start('how-to-play')


class HowToPlayState
    create: ->
        @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (if window.player2 then 'how-to-play' else 'how-to-play-ai'))
        @spacebar = @game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

    update: ->
        if @spacebar.justDown
            @game.state.start('levelselect')


class LevelSelectState
    create: ->
        @game.add.audio('select-a-stage').play()
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
        sprite.animations.add('pose', animations.pose, 5, true)
        sprite.animations.add('idle', animations.idle, 5, true)
        sprite.animations.add('paper', animations.paper, 5, true)
        sprite.animations.add('scissors', animations.scissors, 5, true)
        sprite.animations.add('rock', animations.rock, 5, true)
        sprite.animations.add('hit', animations.hit, 10, false)
        sprite.animations.add('die', animations.die, 10, false)
        sprite.animations.add('transform', animations.transform, 10, false)
        sprite.anchor.setTo(0.5, 0.5)
        attack = 'idle'
        sprite.animations.play('pose')

        health = MAX_HEALTH
        healthbarBackground = @game.add.sprite(healthbarX, healthbarY, 'healthbar-background')
        healthbarBackground.animations.add('glow', [0,0,0,0,0,0,0,0,0,1,2], 10, true)
        healthbarBackground.animations.play('glow')
        healthbarGreen = @game.add.sprite(healthbarX + 4, healthbarY + 4, 'healthbar-green')

        {sprite, attack, health, healthbarBackground, healthbarGreen}

    create: ->
        @keys = @game.input.keyboard.addKeys
            spacebar: Phaser.KeyCode.SPACEBAR

            p1_rock: Phaser.KeyCode.ONE
            p1_paper: Phaser.KeyCode.TWO
            p1_scissors: Phaser.KeyCode.THREE

            p2_rock: Phaser.KeyCode.LEFT
            p2_paper: Phaser.KeyCode.DOWN
            p2_scissors: Phaser.KeyCode.RIGHT

        @game.time.desiredFps = 60

        @game.groups = {}
        @game.groups.background = @game.add.group()
        @game.groups.actors = @game.add.group()
        @game.groups.player = @game.add.group()
        @game.groups.ui = @game.add.group()

        @background = @game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, selectedLevel)

        @player1 = @makePlayer SCREEN_WIDTH/2 - 200, SCREEN_HEIGHT/2 + 40, 40, 40, 'player1',
            pose: [31,32,33]
            idle: [6,7,9]
            paper: [31, 24]
            scissors: [11,12,14]
            rock: [20]
            hit: [21,22]
            die: [21,22]
            transform: [16,17,18,19,18,19,18,19,18]
        @player1.sprite.scale.x = -3
        @player1.sprite.scale.y = 3

        @player2 = @makePlayer SCREEN_WIDTH/2 + 200, SCREEN_HEIGHT/2 + 40, SCREEN_WIDTH/2 + 40, 40, 'player2',
            pose: [3,4]
            idle: [15,16,17]
            paper: [7,6,7]
            scissors: [3,4,5]
            rock: [0,1,2]
            hit: [9,10,11]
            die: [9,10,11]
            transform: [12,5,14,13,5,13,5,13,5]
        @player2.sprite.scale.x = 1.7
        @player2.sprite.scale.y = 1.7

        @p1hud = @makeHud(@player1.sprite.x + 100, @player1.sprite.y - 50, false)
        @p2hud = @makeHud(@player2.sprite.x - 100, @player2.sprite.y - 50, true)

        @doCountdown()

    makeHud: (x, y, flip) ->
        console.log(x, y)
        rock = @game.add.sprite(x, y, 'rock')
        rock.animations.add('run', [0,1,2], 3, true)
        rock.animations.play('run')
        rock.anchor.set(0.5)
        rock.scale.x = 0.4 * (if flip then -1 else 1)
        rock.scale.y = 0.4
        paper = @game.add.sprite(x, y, 'paper')
        paper.animations.add('run', [0,1,2], 3, true)
        paper.animations.play('run')
        paper.anchor.set(0.5)
        paper.scale.x = 0.4 * (if flip then -1 else 1)
        paper.scale.y = 0.4
        scissors = @game.add.sprite(x, y, 'scissors')
        scissors.animations.add('run', [0,1,2], 3, true)
        scissors.animations.play('run')
        scissors.anchor.set(0.5)
        scissors.scale.x = 0.4 * (if flip then -1 else 1)
        scissors.scale.y = 0.4
        {rock, paper, scissors, idle: {visible: true}}

    doCountdown: ->
        @combatState = 'countdown'
        @startTime = @game.time.now + 5000
        @countdownDisplay = @game.add.text 1, 0, '',
            fill: 'white'
            stroke: 'black'
            strokeThickness: 12
            boundsAlignH: 'center'
            boundsAlignV: 'middle'
            font: '300px bold monospace'
        @countdownDisplay.setTextBounds(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    doStartRound: ->
        @player1.sprite.animations.play('idle')
        @player2.sprite.animations.play('idle')
        @countdownDisplay.destroy()
        @combatState = 'during'
        @nextAIAttack = null

    doEndRound: ->
        @player1.healthbarGreen.scale.x = @player1.health / MAX_HEALTH
        @player2.healthbarGreen.scale.x = @player2.health / MAX_HEALTH
        if @player1.health <= 0
            @player1.sprite.animations.play('die')
            @player2.sprite.animations.play('transform').onComplete.add =>
                @game.add.audio(@player2.attack + '-wins').play()
                final = @game.add.sprite(@player2.sprite.x, @player2.sprite.y, @player2.attack)
                final.anchor.setTo(0.5)
                final.scale.setTo(-2, 2)
                final.animations.add('transform', [0,1,2], 2, true)
                tween = @game.add.tween(final).to(x: @player1.sprite.x)
                tween.onComplete.add =>
                    @doFinished()
                tween.start()
                final.animations.play('transform')
                @player2.sprite.destroy()
        else if @player2.health <= 0
            @player2.sprite.animations.play('die')
            @player1.sprite.animations.play('transform').onComplete.add =>
                @game.add.audio(@player1.attack + '-wins').play()
                final = @game.add.sprite(@player1.sprite.x, @player1.sprite.y, @player1.attack)
                final.anchor.setTo(0.5)
                final.scale.setTo(2, 2)
                final.animations.add('transform', [0,1,2], 2, true)
                tween = @game.add.tween(final).to(x: @player2.sprite.x)
                tween.onComplete.add =>
                    @doFinished()
                tween.start()
                final.animations.play('transform')
                @player1.sprite.destroy()
        @combatState = 'over'
        @finalText = @game.add.text 0, 0, 'HIT SPACE TO PLAY AGAIN',
            fill: 'white'
            stroke: 'black'
            strokeThickness: 12
            boundsAlignH: 'center'
            boundsAlignV: 'middle'
            font: '90px bold monospace'
        @finalText.setTextBounds(0, SCREEN_HEIGHT - 120, SCREEN_WIDTH, 120)

    doFinished: =>
        @combatState = 'finished'

    updateHuds: ->
        if @combatState == 'during'
            if not @p1hud[@player1.attack].visible
                @p1hud.rock.visible = @player1.attack == 'rock'
                @p1hud.paper.visible = @player1.attack == 'paper'
                @p1hud.scissors.visible = @player1.attack == 'scissors'
                @p1hud.idle.visible = @player1.attack == 'idle'
            if not @p2hud[@player2.attack].visible
                @p2hud.rock.visible = @player2.attack == 'rock'
                @p2hud.paper.visible = @player2.attack == 'paper'
                @p2hud.scissors.visible = @player2.attack == 'scissors'
                @p2hud.idle.visible = @player2.attack == 'idle'
        else
            @p1hud.rock.visible = false
            @p1hud.paper.visible = false
            @p1hud.scissors.visible = false
            @p1hud.idle.visible = false
            @p2hud.rock.visible = false
            @p2hud.paper.visible = false
            @p2hud.scissors.visible = false
            @p2hud.idle.visible = false

    update: ->
        @player1.healthbarGreen.scale.x = @player1.health / MAX_HEALTH
        @player2.healthbarGreen.scale.x = @player2.health / MAX_HEALTH

        if @combatState == 'countdown'
            remaining = Math.floor((@startTime - @game.time.now) / 1000)
            display = remaining - 1
            if display == 0
                display = 'FIGHT!'
                if @countdownDisplay.text == '1'
                    @game.add.audio('fight').play()
            @countdownDisplay.text = display.toString()

            if remaining <= 0
                @doStartRound()
                return

        else if @combatState == 'during'

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

            if window.player2
                if @keys.p2_paper.isDown or @keys.p2_rock.isDown or @keys.p2_scissors.isDown
                    if @keys.p2_paper.isDown
                        @player2.attack = 'paper'
                    if @keys.p2_rock.isDown
                        @player2.attack = 'rock'
                    if @keys.p2_scissors.isDown
                        @player2.attack = 'scissors'
                else
                    @player2.attack = 'idle'
            else
                if @nextAIAttack?
                    if @game.time.now > @nextAIAttack
                        @player2.attack = ['rock', 'paper', 'scissors', 'idle'][Math.floor(Math.random() * 4)]
                        @nextAIAttack = @game.time.now + (Math.random() * 1000) + 500
                        if @player2.attack == 'idle'
                            @nextAIAttack = @game.time.now + (Math.random() * 800)
                else
                    @player2.attack = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)]
                    @nextAIAttack = @game.time.now + (Math.random() * 1000) + 500

            if @player2.attack != @player2.sprite.animations.currentAnim.name
                @player2.sprite.animations.play(@player2.attack)


            if @player1.attack != @player2.attack
                if @player1.attack == 'rock' and @player2.attack == 'scissors'
                    @player2.health -= 2
                if @player1.attack == 'paper' and @player2.attack == 'rock'
                    @player2.health -= 2
                if @player1.attack == 'scissors' and @player2.attack == 'paper'
                    @player2.health -= 2
                if @player2.attack == 'idle'
                    @player2.health -= 1

            if @player2.attack != @player1.attack
                if @player2.attack == 'rock' and @player1.attack == 'scissors'
                    @player1.health -= 2
                if @player2.attack == 'paper' and @player1.attack == 'rock'
                    @player1.health -= 2
                if @player2.attack == 'scissors' and @player1.attack == 'paper'
                    @player1.health -= 2
                if @player1.attack == 'idle'
                    @player1.health -= 1

        else if @combatState == 'finished'
            if @keys.spacebar.justDown
                @game.state.start('levelselect')

        @updateHuds()


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
