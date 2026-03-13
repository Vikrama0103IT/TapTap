// Pages
var pagePlayArea = document.querySelector('#pagePlayArea');
var pageGameMenu = document.querySelector('#pageGameMenu');
var pagePauseMenu = document.querySelector('#pagePauseMenu');

// UI Elements
var gameSpace = document.querySelector('#gameSpace');

// Buttons
var newGameBtn = document.querySelector('#newGameBtn');
var pmRstrtLvlBtn = document.querySelector('#pmRstrtLvlBtn');
var pmCntnuGmBtn = document.querySelector('#pmCntnuGmBtn');

// Sounds
var soundBlue = new Audio('sounds/mp3/success.mp3');
var soundRed  = new Audio('sounds/mp3/wronganswer.mp3');
soundRed.volume = 0.3;

// All available colors
var colors = [
    { cls: 'c-blue',   name: 'BLUE',   hex: '#58D1FF' },
    { cls: 'c-red',    name: 'RED',    hex: '#FA4760' },
    { cls: 'c-green',  name: 'GREEN',  hex: '#4CDE7A' },
    { cls: 'c-yellow', name: 'YELLOW', hex: '#FFE033' },
    { cls: 'c-orange', name: 'ORANGE', hex: '#FF8C33' },
    { cls: 'c-purple', name: 'PURPLE', hex: '#B94FFF' },
];

// --- MULTIPLAYER INTEGRATION ---
window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "parent-event") {
        var command = event.data.payload.command;

        if (command === "startGame") {
            gameEngine.initiateActualGame(); 
        }
        else if (command === "endGame") {
            // Logic for endGame if needed
        }
    }
});
// ------------------------------

var toolsBox = {
    gnrtRndmNum: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    showPage: function(page) {
        [pagePlayArea, pageGameMenu, pagePauseMenu].forEach(p => p.style.display = 'none');
        page.style.display = 'block';
    },
    onClick: function(el, fn) {
        el.addEventListener('click', fn);
        el.addEventListener('touchstart', function(e) {
            e.preventDefault();
            fn();
        }, { passive: false });
    }
};

var circlesEngine = {
    autoMoveTimer: null,
    instructionTimer: null,
    targetColor: null,
    blinkCount: 0,

    showInstruction: function(colorObj, callback) {
        var toast  = document.getElementById('colorToast');
        var ball   = document.getElementById('ciColorBall');
        var nameEl = document.getElementById('ciColorName');

        if (this.instructionTimer) {
            clearTimeout(this.instructionTimer);
            this.instructionTimer = null;
        }

        ball.className = 'toast-ball ' + colorObj.cls;
        nameEl.textContent = colorObj.name;
        nameEl.style.color = colorObj.hex;

        toast.classList.remove('toast-show');
        void toast.offsetWidth;
        toast.classList.add('toast-show');

        this.instructionTimer = setTimeout(function() {
            toast.classList.remove('toast-show');
            if (callback) callback();
        }, 1700);
    },

create: function(colorObj) {
    var el = document.createElement('div');
    el.className = 'tpbl-circle tap-ball ' + colorObj.cls;
    
    // Explicitly set the dataset so the comparison has data to work with
    el.dataset.colorCls = colorObj.cls;

    toolsBox.onClick(el, () => {
        // 1. Reset the move timer immediately on tap
        this.blinkCount = 0;

        // 2. Safety Check: Ensure targetColor exists
        if (!this.targetColor) {
            console.error("No target color defined!");
            return;
        }

        // 3. The Logic Check
        var tappedColor = el.dataset.colorCls;
        var targetColor = this.targetColor.cls;

        console.log("Tapped:", tappedColor, " | Target:", targetColor);

        if (tappedColor === targetColor) {
            console.log("%c CORRECT TAP! ", "background: #2ecc71; color: white");
            
            soundBlue.currentTime = 0;
            soundBlue.play();
            
            // Increment and trigger UI update
            gameEngine.score++;
            gameEngine.updateUI();
            
            // Clear current board and start next round
            this.resetBoard();
        } else {
            console.log("%c WRONG TAP! ", "background: #e74c3c; color: white");
            
            soundRed.currentTime = 0;
            soundRed.play();
            
            var cx = parseInt(el.style.left) + el.offsetWidth / 2;
            var cy = parseInt(el.style.top) + el.offsetHeight / 2;
            gameEngine.wrongTap(cx, cy);
            
            // Restart the movement timer for the wrong tap
            if (this.autoMoveTimer) {
                clearTimeout(this.autoMoveTimer);
                this.autoMoveTimer = null;
            }
            this.startAutoMove();
        }
    });

    gameSpace.appendChild(el);
    this.randomize(el);
},

    startAutoMove: function() {
        if (this.autoMoveTimer) clearTimeout(this.autoMoveTimer);
        this.autoMoveTimer = setTimeout(() => {
            var allCircles = gameSpace.querySelectorAll('.tap-ball');
            allCircles.forEach(el => {
                el.style.transition = 'opacity 0.3s';
                el.style.opacity = '0';
            });
            setTimeout(() => {
                allCircles.forEach(el => {
                    if (el.parentNode) {
                        this.randomize(el);
                        el.style.opacity = '1';
                    }
                });

                this.blinkCount++;

                if (this.blinkCount >= 3) {
                    this.blinkCount = 0;
                    var newIdx;
                    do {
                        newIdx = toolsBox.gnrtRndmNum(0, colors.length - 1);
                    } while (colors[newIdx].cls === this.targetColor.cls);
                    this.targetColor = colors[newIdx];

                    var self = this;
                    this.showInstruction(this.targetColor, function() {
                        self.startAutoMove();
                    });
                } else {
                    this.startAutoMove();
                }
            }, 300);
        }, 1000);
    },

    randomize: function(el) {
        var pad = 70;
        var minDist = 75;
        var maxAttempts = 60;
        var attempts = 0;
        var x, y, overlaps;

        do {
            x = toolsBox.gnrtRndmNum(pad, gameSpace.offsetWidth  - pad);
            y = toolsBox.gnrtRndmNum(pad, gameSpace.offsetHeight - pad);
            overlaps = false;

            gameSpace.querySelectorAll('.tap-ball').forEach(function(other) {
                if (other !== el) {
                    var ox = parseInt(other.style.left);
                    var oy = parseInt(other.style.top);
                    var dist = Math.sqrt((x - ox) * (x - ox) + (y - oy) * (y - oy));
                    if (dist < minDist) overlaps = true;
                }
            });

            attempts++;
        } while (overlaps && attempts < maxAttempts);

        el.style.left = x + 'px';
        el.style.top  = y + 'px';
    },

    resetBoard: function() {
        if (this.autoMoveTimer) {
            clearTimeout(this.autoMoveTimer);
            this.autoMoveTimer = null;
        }
        this.blinkCount = 0;
        gameSpace.innerHTML = '';

        var targetIdx = toolsBox.gnrtRndmNum(0, colors.length - 1);
        this.targetColor = colors[targetIdx];

        var otherColors = colors.filter((_, i) => i !== targetIdx);
        var ballColorList = [this.targetColor].concat(otherColors);
        ballColorList.sort(() => Math.random() - 0.5);

        var self = this;
        ballColorList.forEach(function(c) { self.create(c); });

        this.showInstruction(this.targetColor, function() {
            self.startAutoMove();
        });
    }
};

var gameEngine = {
    score: 0,
    updateUI: function() {
        // This will print the score to your browser's inspect tool
        console.log("Current Score: " + this.score); 
        
        // If you eventually add a <div> with id="scoreDisplay", 
        // you can uncomment the line below:
        // document.querySelector('#scoreDisplay').textContent = this.score;
    },
    // ... rest of your code
    // Triggers the ready signal to parent
    start: function() {
        window.parent.postMessage({ type: "readyGame" }, "*");
    },
    // Triggered by parent to actually start the gameplay
    initiateActualGame: function() {
        this.score = 0;
        this.updateUI();
        toolsBox.showPage(pagePlayArea);
        circlesEngine.resetBoard();
    },
    wrongTap: function(x, y) {
        var popup = document.querySelector('#wrongPopup');
        popup.style.left = x + 'px';
        popup.style.top  = y + 'px';
        popup.classList.remove('show-wrong');
        void popup.offsetWidth;
        popup.classList.add('show-wrong');
    }
};

// Event Listeners
toolsBox.onClick(newGameBtn,     () => gameEngine.start());
toolsBox.onClick(pmRstrtLvlBtn, () => toolsBox.showPage(pageGameMenu));
toolsBox.onClick(pmCntnuGmBtn,   () => toolsBox.showPage(pagePlayArea));

// Initialize — show home screen
toolsBox.showPage(pageGameMenu);

// Prevent scroll/pan while playing
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Reposition circles on orientation change
window.addEventListener('resize', function() {
    if (pagePlayArea.style.display === 'block') {
        gameSpace.querySelectorAll('.tap-ball').forEach(function(c) {
            circlesEngine.randomize(c);
        });
    }
});