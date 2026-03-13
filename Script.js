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
            console.log("Game ended from parent");
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

    el.dataset.colorCls = colorObj.cls;

    var handleTap = (tapX, tapY) => {

        this.blinkCount = 0;

        if (!this.targetColor) {
            console.error("No target color defined!");
            return;
        }

        var tappedColor = el.dataset.colorCls;
        var targetColor = this.targetColor.cls;

        console.log("Tapped:", tappedColor, " | Target:", targetColor);

        if (tappedColor === targetColor) {

            soundBlue.currentTime = 0;
            soundBlue.play();

            // Accuracy-based scoring
            var rect = el.getBoundingClientRect();
            var centerX = rect.left + rect.width / 2;
            var centerY = rect.top + rect.height / 2;
            var radius = rect.width / 2;

            var dist = Math.sqrt(
                (tapX - centerX) * (tapX - centerX) +
                (tapY - centerY) * (tapY - centerY)
            );

            var ratio = Math.min(dist / radius, 1); // 0 = perfect center, 1 = edge

            var points;
            if (ratio <= 0.3) {
                points = 3; // Perfect center tap
            } else if (ratio <= 0.65) {
                points = 2; // Good tap
            } else {
                points = 1; // Edge tap
            }

            gameEngine.score += points;
            gameEngine.updateUI(points, ratio);
            gameEngine.showScorePopup(tapX, tapY, points);

            this.resetBoard();

        } else {

            soundRed.currentTime = 0;
            soundRed.play();

            gameEngine.wrongTap(tapX, tapY);

            if (this.autoMoveTimer) {
                clearTimeout(this.autoMoveTimer);
                this.autoMoveTimer = null;
            }

            this.startAutoMove();

        }

    };

    el.addEventListener('click', function(e) {
        handleTap(e.clientX, e.clientY);
    });

    el.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        handleTap(touch.clientX, touch.clientY);
    }, { passive: false });

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


// ⭐ UPDATED RANDOMIZE FUNCTION (PREVENT BALL OVERLAP)
randomize: function(el) {

    var pad = 70;
    var minDist = 90;
    var maxAttempts = 60;

    var attempts = 0;
    var x, y, overlaps;

    do {

        x = toolsBox.gnrtRndmNum(pad, gameSpace.offsetWidth  - pad);
        y = toolsBox.gnrtRndmNum(pad, gameSpace.offsetHeight - pad);

        overlaps = false;

        gameSpace.querySelectorAll('.tap-ball').forEach(function(other) {

            if (other !== el) {

                var ox = parseInt(other.style.left) || 0;
                var oy = parseInt(other.style.top) || 0;

                var dist = Math.sqrt(
                    (x - ox) * (x - ox) +
                    (y - oy) * (y - oy)
                );

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

    updateUI: function(pointsEarned, accuracyRatio) {

        var accuracy = accuracyRatio !== undefined
            ? Math.round((1 - accuracyRatio) * 100)
            : 100;

        console.log("Score:", this.score, "| +Points:", pointsEarned, "| Accuracy:", accuracy + "%");

        window.parent.postMessage({
            type: "scoreUpdate",
            payload: {
                score: this.score,
                pointsEarned: pointsEarned || 0,
                accuracy: accuracy
            }
        }, "*");

    },

    start: function() {

        window.parent.postMessage({
            type: "readyGame"
        }, "*");

    },

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

    },

    showScorePopup: function(x, y, points) {

        var popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = '+' + points;

        if (points === 3) {
            popup.dataset.grade = 'perfect';
        } else if (points === 2) {
            popup.dataset.grade = 'good';
        } else {
            popup.dataset.grade = 'ok';
        }

        popup.style.left = x + 'px';
        popup.style.top  = y + 'px';

        document.body.appendChild(popup);

        setTimeout(function() { popup.classList.add('score-popup-fly'); }, 10);
        setTimeout(function() {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
        }, 900);

    }

};


// Event Listeners
toolsBox.onClick(newGameBtn, () => gameEngine.start());
toolsBox.onClick(pmRstrtLvlBtn, () => toolsBox.showPage(pageGameMenu));
toolsBox.onClick(pmCntnuGmBtn, () => toolsBox.showPage(pagePlayArea));


// Initialize
toolsBox.showPage(pageGameMenu);


// Prevent scroll while playing
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });


// Reposition circles on resize
window.addEventListener('resize', function() {

    if (pagePlayArea.style.display === 'block') {

        gameSpace.querySelectorAll('.tap-ball').forEach(function(c) {
            circlesEngine.randomize(c);
        });

    }

});