module.exports =
    '2x-1':
        run: ->
        background: 'forest'
        tiles: """
+----------------------------------------+
|11111111111111            11111111111111|
|1                         11111111111111|
|1                         111111111    1|
|1                     11111111         1|
|111111111                              1|
|111111111                              1|
|1    11111111                          1|
|1      111111                          1|
|1                                      1|
|1                     11111111         1|
|1                     11111111         1|
|1                   1111               1|
|1                   1111               1|
|1                                      1|
|1                                      1|
|1        11111111                      1|
|1        11111111                      1|
|1                       11111111       1|
|1                       11111111       1|
|1                                      1|
|1                                      1|
|11111111111111            11111111111111|
+----------------------------------------+
        """

    '2x-2':
        run: ->
        background: 'forest'
        tiles: """
+----------------------------------------+
|1111111111111111111111111111111111111111|
|1                                       |
|1                                       |
|1                                       |
|1                                       |
|1     1111111111                        |
|1     1111111111                        |
|1                             1111111111|
|1                             11       1|
|1                              11      1|
|1                               11     1|
|1                                1111111|
|1                                      1|
|1               1111111                1|
|1               1111111                1|
|1                                      1|
|1                                1111111|
|1                                1111111|
|1                                      1|
|111111111                              1|
|111111111                              1|
|11111111111111            11111111111111|
+----------------------------------------+
        """

    '3x-2':
        run: ->
            @spawnActor 800, 400, 'spoonman',
                hp: 4
                animations:
                    pose: [1,1,2,2,4,4,4,4,4,4]
                    idle: [0,1,2]
                    forward: [8,9]
                    attack: [2,4,5,5,6,6,6,7]
                    hit: [10,10,10,11,11,11]
                    die: [10,10,11]

                pattern: ->
                    @attack()
                    @idle(2000)
                    @moveLeft(400)
                    @pose()
                    @attack()
                    @idle(2000)
                    @moveRight(400)
                    @pose()

            #@spawnEnemy 'manhole', 300, 200,
            #    hp: 3
            #    forward: [1,2]
            #    idle: [1,2]
            #    hit: [1,2]
            
        background: 'forest'
        tiles: """
+----------------------------------------+
|1111111111111111111111111111111111111111|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|                                       1|
|                                       1|
|                                       1|
|                                       1|
|                                       1|
|                                       1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1                                      1|
|1111111111111111111111111111111111111111|
+----------------------------------------+
        """

