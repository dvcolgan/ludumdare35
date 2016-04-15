types = require('src/types')


module.exports = types.checkClass class Engine
    constructor: (@elementId) ->
        @game = new Phaser.Game(
            SCREEN_WIDTH, SCREEN_HEIGHT
            Phaser.AUTO, @elementId
            {preload: @preload, create: @create, update: @update}
        )

    doCommand: (command) ->
        switch command
            when COMMANDS.INSERT
                @enterMode(MODES.INSERT)
            when COMMANDS.INSERT_AFTER
                @cursor.right()
                @enterMode(MODES.INSERT)
            when COMMANDS.INSERT_SUBSTITUTE
                @deleteAtCursor()
                @enterMode(MODES.INSERT)
            when COMMANDS.INSERT_OPEN
                @cursor.down()
                @openRowAboveCursor()
                @enterMode(MODES.INSERT)
            when COMMANDS.INSERT_OPEN_ABOVE
                @openRowAboveCursor()
                @enterMode(MODES.INSERT)

            when COMMANDS.CHANGE_REST_OF_LINE
                @deleteAtCursor() for i in [0..COLS-@cursor.col]
                @enterMode(MODES.INSERT)
            when COMMANDS.DELETE_REST_OF_LINE
                @deleteAtCursor() for i in [0..COLS-@cursor.col]
            when COMMANDS.CHANGE_LINE
                @removeRowAtCursor()
                @enterMode(MODES.INSERT)
            when COMMANDS.DELETE_LINE
                @removeRowAtCursor()

            when COMMANDS.ESCAPE
                @enterMode(MODES.COMMAND)
                @cursor.left()
            when COMMANDS.BACKWARD_CHARACTER
                @cursor.left()
            when COMMANDS.PREV_LINE
                @cursor.down()
            when COMMANDS.NEXT_LINE
                @cursor.up()
            when COMMANDS.FORWARD_CHARACTER
                @cursor.right()

            when COMMANDS.BEGINNING_OF_LINE
                @cursor.to(0, @cursor.row)
            when COMMANDS.END_OF_LINE
                @cursor.to(COLS-1, @cursor.row)

            when COMMANDS.FORWARD_WORD
                @cursor.right(5)
            when COMMANDS.BACKWARD_WORD
                @cursor.left(5)
            when COMMANDS.FORWARD_END_WORD
                @cursor.right(5)
            when COMMANDS.DELETE_CHARACTER
                @deleteAtCursor()

            when COMMANDS.DELETE_BACKWARD_CHARACTER
                @cursor.left()
                @deleteAtCursor()

        #if @currentMode == MODES.COMMAND
        #    if not @screen.get(@cursor.col, @cursor.row)?
        #        while @col > 0
        #            @col--
        #            if @buffer[@row][@col] != ''
        #                break

    preload: =>
        @game.load.image('letters', 'font-transparent.png')
        #for slug, sprite of @_sprites
        #    @game.load.spritesheet(slug, sprite.image, sprite.frameSize[0], sprite.frameSize[1])
        #for slug, path of @_backgrounds
        #    @game.load.image(slug, path)
        #@game.load.image('dialog', 'images/dialog-box.png')

    create: =>
        #@statusbar = @game.add.graphics(0, SCREEN_HEIGHT - TILE_HEIGHT * 2)
        #@statusbar.beginFill(0xD0D0D0)
        #@statusbar.drawRect(0, 0, SCREEN_WIDTH, TILE_HEIGHT)

        @game.stage.backgroundColor = '#121212'

        @currentCommand = null
        @currentCommandNextRepeat = 0
        @currentMode = MODES.COMMAND
        #@fontStyle =
        #    font: "26px Monospace"
        #    fill: "#D7D7D7"
        #    boundsAlignH: 'center'
        #    fontWeight: 'bold'
        #    boundsAlignV: 'middle'

        @game.input.keyboard.onDownCallback = (e) =>
            if not (e.shiftKey and e.ctrlKey and (e.keyCode == 82 or e.keyCode == 74))
                e.preventDefault()

            character = KEYCODES[e.keyCode]?[if e.shiftKey then 1 else 0]
            if not character? then return

            modifier = if e.ctrlKey then 'C-' else ''
            binding = modifier + character

            if @currentMode == MODES.COMMAND
                command = COMMAND_MODE_BINDINGS[binding]
                if command?
                    @doCommand(command)
                    return

            if @currentMode == MODES.INSERT
                command = INSERT_MODE_BINDINGS[binding]
                if command?
                    @doCommand(command)
                    return
                if character == 'space' then character = ' '

                if character == 'backspace'
                    @deleteAtCursor()
                else
                    @insertAtCursor(character)

    update: =>
