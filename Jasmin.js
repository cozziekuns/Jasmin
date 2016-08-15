//=============================================================================
// Jasmin.js
//=============================================================================

var Jasmin = Jasmin || {};

//=============================================================================
// ** WorldMapGenerator
//=============================================================================

function WorldMapGenerator() {
    throw new Error('This is a static class.');
}

WorldMapGenerator.generate = function(dim, maxHeight, discrete) {
    maxHeight = maxHeight || 1;
    discrete = discrete || false;

    this._dim = dim;
    this._variance = 1;
    this._dampening = 0.65;

    this._initNoiseArray();
    this._divide(this._dim - 1);
    this._cropNoiseArray();

    this._normalise(maxHeight, discrete);
    return this._noiseArray;
};

WorldMapGenerator._initNoiseArray = function() {
    this._noiseArray = [];
    for (var y = 0; y < this._dim; y++) {
        this._noiseArray[y] = [];
        for (var x = 0; x < this._dim; x++) {
            this._noiseArray[y][x] = 0;
        }
    }
    var midDim = (this._dim - 1) / 2;
    this._noiseArray[midDim][midDim] = Math.random() * 0.35 + 0.65;
};

WorldMapGenerator._divide = function(size) {
    var x, y = 0;
    var start = true;
    while (size / 2 >= 1) {
        for (y = size / 2; y < this._dim - 1; y += size) {
            if (start) {
                break;
            }
            for (x = size / 2; x < this._dim - 1; x += size) {
                this._visitSquare(x, y, size / 2);
            }
        }

        start = false;

        for (y = 0; y < this._dim; y += size / 2) {
            for (x = (y + size / 2) % size; x < this._dim; x += size) {
                this._visitDiamond(x, y, size / 2);
            }
        }
        this._variance *= this._dampening;
        size /= 2;
    }
};

WorldMapGenerator._visitSquare = function(x, y, size) {
    if (x == 0 || x == this._dim - 1 || y == 0 || y == this._dim - 1) {
        this._noiseArray[y][x] /= 2;
    }

    var sum = 0;
    var randomFactor = this._variance * (Math.random() - 0.5);
    sum += this._noiseArray[y - size][x - size];
    sum += this._noiseArray[y - size][x + size];
    sum += this._noiseArray[y + size][x - size];
    sum += this._noiseArray[y + size][x + size];
    this._noiseArray[y][x] = Math.max(Math.min(sum / 4 + randomFactor, 1), 0);
};

WorldMapGenerator._visitDiamond = function(x, y, size) {
    if (x == 0 || x == this._dim - 1 || y == 0 || y == this._dim - 1) {
        return;
    }

    var sum = 0;
    var randomFactor = this._variance * (Math.random() - 0.5);
    sum += this._noiseArray[y][(x - size + this._dim - 1) % (this._dim - 1)];
    sum += this._noiseArray[y][(x + size) % (this._dim - 1)];
    sum += this._noiseArray[(y - size + this._dim - 1) % (this._dim - 1)][x];
    sum += this._noiseArray[(y + size) % (this._dim - 1)][x];
    this._noiseArray[y][x] = Math.max(Math.min(sum / 4 + randomFactor, 1), 0);
};

WorldMapGenerator._normalise = function(maxHeight, discrete) {
    if (maxHeight == 1) {
        return;
    }
    for (var j = 0; j < this._noiseArray.length; j++) {
        for (var i = 0; i < this._noiseArray.length; i++) {
            this._noiseArray[j][i] *= maxHeight;

            if (!discrete) {
                continue;
            }

            this._noiseArray[j][i] = Math.floor(this._noiseArray[j][i])
        }
    }
};

WorldMapGenerator._cropNoiseArray = function() {
    this._noiseArray = this._noiseArray.slice(1, -1);
    for (var i = 0; i < this._noiseArray.length; i++) {
        this._noiseArray[i] = this._noiseArray[i].slice(1, -1);
    }
};

WorldMapGenerator.getTileFromHeight = function(height, peak) {
    peak = peak || false;
    if (height < 2) {
        return 1;
    } else if (height < 4) {
        return 2;
    } else if (height < 5) {
        return (peak ? 3 : 4);
    } else if (height < 10) {
        return (peak ? 5 : 4);
    } else if (height < 14) {
        return 6;
    } else {
        return (peak ? 7 : 6);
    }
};

//=============================================================================
// ** Tilemap_Isometric
//=============================================================================

function Tilemap_Isometric() {
    this.initialize.apply(this, arguments);
}

Tilemap_Isometric.prototype = Object.create(PIXI.Container.prototype);
Tilemap_Isometric.prototype.constructor = Tilemap_Isometric;

Tilemap_Isometric.prototype.initialize = function() {
    PIXI.Container.call(this);
    this._initPublicMembers();
    this._initPrivateMembers();
    this._createTileSprites();
};

Tilemap_Isometric.prototype._initPublicMembers = function() {
    this.origin = new Point();
};

Tilemap_Isometric.prototype._initPrivateMembers = function() {
    this._tileSprites = [];
};

Tilemap_Isometric.prototype.update = function() {
    this._updateChildren();
    this._updateOrigin();
};

Tilemap_Isometric.prototype._createTileSprites = function() {
    for (var i = 0; i < $gameIsometricMap.tiles.length; i++) {
        var tileSprite = new Sprite_IsometricTile($gameIsometricMap.tiles[i]);
        this._tileSprites.push(tileSprite);
        this.addChild(tileSprite);
    }
};

Tilemap_Isometric.prototype._updateChildren = function() {
    for (var i = 0; i < this.children.length; i++) {
        child = this.children[i];
        if (child.update) {
            child.update();
        }
    }
};

Tilemap_Isometric.prototype._updateOrigin = function() {
    for (var i = 0; i < this.children.length; i++) {
        child = this.children[i];
        child.x += this.origin.x;
        child.y += this.origin.y;
    }
};

//=============================================================================
// ** DataManager
//=============================================================================

Jasmin.DataManager_createGameObjects = DataManager.createGameObjects;
DataManager.createGameObjects = function() {
    Jasmin.DataManager_createGameObjects.call(this);
    $gameIsometricMap = new Game_IsometricMap();
};

DataManager.isIsometricMapLoaded = function() {
    this.checkError();
    return !!$dataIsometricMap;
};

DataManager.loadIsometricMapData = function(mapId) {
    if (mapId > 0) {
        var filename = 'IsometrcMap%1.json'.format(mapId.padZero(3));
        this.loadDataFile('$dataIsometricMap', filename);
    } else {
        this.makeSampleIsometricMap();
    };
};

DataManager.makeSampleIsometricMap = function() {
    var dim = Math.pow(2, 6) + 1;
    var heightmap = WorldMapGenerator.generate(dim, 16, true);

    $dataIsometricMap = {};
    $dataIsometricMap.data = [];
    $dataIsometricMap.width = heightmap[0].length;
    $dataIsometricMap.height = heightmap.length;

    for (var x = 0; x < $dataIsometricMap.width; x++) {
        $dataIsometricMap.data[x] = [];
        for (var y = 0; y < $dataIsometricMap.height; y++) {
            $dataIsometricMap.data[x][y] = [];
            for (var z = 0; z <= heightmap[y][x]; z++) {
                var isPeak = (z == heightmap[y][x]);
                var tileId = WorldMapGenerator.getTileFromHeight(z, isPeak);
                $dataIsometricMap.data[x][y][z] = tileId;
            }
        }
    }

};

//=============================================================================
// ** Game_IsometricEntity
//=============================================================================

function Game_IsometricEntity() {
    this.initialize.apply(this, arguments);
}

Game_IsometricEntity.unitWidth = 16;
Game_IsometricEntity.unitHeight = 16;

Object.defineProperties(Game_IsometricEntity.prototype, {
    screenX: {
        get: function() {
            var baseX = (this._x - this._y);
            return Math.floor(baseX * Game_IsometricEntity.unitWidth / 2);
        },
    },
    screenY: {
        get: function() {
            var baseY = ((this._x + this._y) / 2 - this._z);
            return Math.floor(baseY * Game_IsometricEntity.unitHeight / 2);
        },
    },
});

Game_IsometricEntity.prototype.initialize = function(x, y, z) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._xSize = 0;
    this._ySize = 0;
    this._zSize = 0;
    this.screenZ = 0;
    this.front = [];
    this.behind = [];
    this.visited = false;
};

//=============================================================================
// ** Game_IsometricTile
//=============================================================================

function Game_IsometricTile() {
    this.initialize.apply(this, arguments);
}

Game_IsometricTile.prototype = Object.create(Game_IsometricEntity.prototype);
Game_IsometricTile.prototype.constructor = Game_IsometricTile;

Object.defineProperties(Game_IsometricTile.prototype, {
    tileId: {
        get: function() { return this._tileId; },
        set: function(value) { this._tileId = value; },
    },
});

Game_IsometricTile.prototype.initialize = function(tileId, x, y, z) {
    Game_IsometricEntity.prototype.initialize.call(this, x, y, z);
    this._tileId = tileId;
    this._xSize = 1;
    this._ySize = 1;
    this._zSize = 1;
};

//=============================================================================
// ** Game_IsometricMap
//=============================================================================

function Game_IsometricMap() {
  this.initialize.apply(this, arguments);
}

Object.defineProperties(Game_IsometricMap.prototype, {
    tiles: { get: function() { return this._tiles; } },
    entities: { get: function() { return this._entityGraph.entities; } },
    displayX: { get: function() { return this._displayX; } },
    displayY: { get: function() { return this._displayY; } },
    parallaxName: { get: function() { return this._parallaxName; } },
});

Game_IsometricMap.prototype.initialize = function() {
    this._mapId = 0;
    this._tiles = [];
    this._displayX = 0;
    this._displayY = 0;
    this._parallaxName = 'BlueSky';
};

Game_IsometricMap.prototype.setup = function(mapId) {
    if (!$dataIsometricMap) {
        throw new Error('The map data is not available');
    }
    this._mapId = mapId;
    this._createTiles();
    this._center();
};

Game_IsometricMap.prototype._createTiles = function() {
    this._tiles = [];
    for (var x = 0; x < $dataIsometricMap.width; x++) {
        for (var y = 0; y < $dataIsometricMap.height; y++) {
            for (var z = 0; z < this.tall(x, y); z++) {
                var tileId = $dataIsometricMap.data[x][y][z];
                var isoTile = new Game_IsometricTile(tileId, x, y, z);
                this._tiles.push(isoTile);
            }
        }
    }
    this._removeInvisibleTiles();
};

Game_IsometricMap.prototype._removeInvisibleTiles = function() {
    for (i = 0; i < this._tiles.length - 1; i++) {
        for (j = i + 1; j < this._tiles.length; j++) {
            if (this._tiles[i].screenX == this._tiles[j].screenX &&
                    this._tiles[i].screenY == this._tiles[j].screenY) {
                this._tiles[i] = null;
                break;
            }
        }
    }

    for (i = this._tiles.length - 1; i >= 0; i--) {
        if (this._tiles[i] === null) {
            this._tiles.splice(i, 1);
        }
    }
}

Game_IsometricMap.prototype._center = function() {
    this._displayX = (Graphics.boxWidth - Game_IsometricEntity.unitWidth) / 2;
    this._displayY = (Graphics.boxHeight - this.screenHeight()) / 2;
};

Game_IsometricMap.prototype.tall = function(x, y) {
    return $dataIsometricMap.data[x][y].length;
};

Game_IsometricMap.prototype.screenHeight = function() {
    var minY = 0;
    var maxY = 0;
    for (var i = 0; i < this._tiles.length; i++) {
        minY = Math.min(this._tiles[i].screenY, minY);
        maxY = Math.max(this._tiles[i].screenY, maxY);
    }
    return maxY + Game_IsometricEntity.unitHeight;
};

//=============================================================================
// ** Sprite_IsometricTile
//=============================================================================

function Sprite_IsometricTile() {
    this.initialize.apply(this, arguments);
}

Sprite_IsometricTile.prototype = Object.create(Sprite_Base.prototype);
Sprite_IsometricTile.prototype.constructor = Sprite_IsometricTile;

Sprite_IsometricTile.prototype.initialize = function(tile) {
    Sprite_Base.prototype.initialize.call(this);
    this._tile = tile;
};

Sprite_IsometricTile.prototype.update = function() {
    Sprite_Base.prototype.update.call(this);
    this.updateBitmap();
    this.updatePosition();
};

Sprite_IsometricTile.prototype.updateBitmap = function() {
    if (this.isImageChanged()) {
        this.bitmap = ImageManager.loadTileset('Iso_Block');
        this.setFrame(this._tile.tileId * 16, 0, 16, 16);
        this._tileId = this._tile.tileId;
    }
};

Sprite_IsometricTile.prototype.isImageChanged = function() {
    return (this._tileId !== this._tile.tileId);
};

Sprite_IsometricTile.prototype.updatePosition = function() {
    this.x = this._tile.screenX;
    this.y = this._tile.screenY;
    this.z = this._tile.screenZ;
};

//=============================================================================
// ** Spriteset_IsometricMap
//=============================================================================

function Spriteset_IsometricMap() {
  this.initialize.apply(this, arguments);
}

Spriteset_IsometricMap.prototype = Object.create(Spriteset_Base.prototype);
Spriteset_IsometricMap.prototype.constructor = Spriteset_IsometricMap;

Spriteset_IsometricMap.prototype.createLowerLayer = function() {
  Spriteset_Base.prototype.createLowerLayer.call(this);
  this.createParallax();
  this.createTilemap();
};

Spriteset_IsometricMap.prototype.update = function() {
    Spriteset_Base.prototype.update.call(this);
    this.updateParallax();
    this.updateTilemap();
};

Spriteset_IsometricMap.prototype.createParallax = function() {
    this._parallax = new TilingSprite();
    this._parallax.move(0, 0, Graphics.width, Graphics.height);
    this._baseSprite.addChild(this._parallax);
};

Spriteset_IsometricMap.prototype.createTilemap = function() {
    this._tilemap = new Tilemap_Isometric();
    this._baseSprite.addChild(this._tilemap);
};

Spriteset_IsometricMap.prototype.updateParallax = function() {
    if (this._parallaxName !== $gameIsometricMap.parallaxName) {
        this._parallaxName = $gameIsometricMap.parallaxName;
        this._parallax.bitmap = ImageManager.loadParallax(this._parallaxName);
    }
};

Spriteset_IsometricMap.prototype.updateTilemap = function() {
    this._tilemap.origin.x = Math.floor($gameIsometricMap.displayX);
    this._tilemap.origin.y = Math.floor($gameIsometricMap.displayY);
    this._tilemap.update();
};

//=============================================================================
// ** Scene_Boot
//=============================================================================

Scene_Boot.prototype.start = function() {
    Scene_Base.prototype.start.call(this);
    DataManager.setupNewGame();
    SceneManager.goto(Scene_IsometricMap);
    this.updateDocumentTitle();
};

Scene_Boot.prototype.loadSystemWindowImage = function() {};

Scene_Boot.loadSystemImages = function() {};

//=============================================================================
// ** Scene_IsometricMap
//=============================================================================

function Scene_IsometricMap() {
    this.initialize.apply(this, arguments);
}

Scene_IsometricMap.prototype = Object.create(Scene_Base.prototype);
Scene_IsometricMap.prototype.constructor = Scene_IsometricMap;

Scene_IsometricMap.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._mapId = 0;
    this._mapLoaded = false;
};

Scene_IsometricMap.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    DataManager.loadIsometricMapData(this._mapId);
};

Scene_IsometricMap.prototype.isReady = function() {
    if (!this._mapLoaded && DataManager.isIsometricMapLoaded()) {
        this.onMapLoaded();
        this._mapLoaded = true;
    }
    return this._mapLoaded && Scene_Base.prototype.isReady.call(this);
};

Scene_IsometricMap.prototype.onMapLoaded = function() {
    $gameIsometricMap.setup(this._mapId);
    this.createDisplayObjects();
};

Scene_IsometricMap.prototype.createDisplayObjects = function() {
    this.createSpriteset();
};

Scene_IsometricMap.prototype.createSpriteset = function() {
    this._spriteset = new Spriteset_IsometricMap();
    this.addChild(this._spriteset);
};
