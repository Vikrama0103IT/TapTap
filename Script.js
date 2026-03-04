// Pages
var pagePlayArea = document.querySelector('#pagePlayArea');
var pageGameMenu = document.querySelector('#pageGameMenu');
var pagePauseMenu = document.querySelector('#pagePauseMenu');

// UI Elements
var gmStatsScore = document.querySelector('#gmStatsScore');
var gameSpace = document.querySelector('#gameSpace');
var lvlPausedScore = document.querySelector('#lvlPausedScore');

// Buttons
var newGameBtn = document.querySelector('#newGameBtn');
var pmRstrtLvlBtn = document.querySelector('#pmRstrtLvlBtn');
var pmCntnuGmBtn = document.querySelector('#pmCntnuGmBtn');

// Sounds
var soundBlue = new Audio('sounds/mp3/touchBlue.mp3');
var soundRed  = new Audio('sounds/mp3/touchRed.mp3');

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
    create: function(isGood) {
        var el = document.createElement('div');
        // good-circle / evil-circle classes keep the blink animations active
        el.className = isGood
            ? 'tpbl-circle c-blue good-circle'
            : 'tpbl-circle c-red evil-circle';

        toolsBox.onClick(el, () => {
            if (isGood) {
                soundBlue.currentTime = 0;
                soundBlue.play();
                gameEngine.score++;
                gameEngine.updateUI();
                this.resetBoard();
            } else {
                soundRed.currentTime = 0;
                soundRed.play();
                gameEngine.wrongTap();
            }
        });

        gameSpace.appendChild(el);
        this.randomize(el);
    },
    randomize: function(el) {
        var pad = 70;
        var x = toolsBox.gnrtRndmNum(pad, gameSpace.offsetWidth  - pad);
        var y = toolsBox.gnrtRndmNum(pad, gameSpace.offsetHeight - pad);
        el.style.left = x + 'px';
        el.style.top  = y + 'px';
    },
    resetBoard: function() {
        gameSpace.innerHTML = '';
        this.create(true);
        for (var i = 0; i < 4; i++) this.create(false);
    }
};

var gameEngine = {
    score: 0,
    updateUI: function() {
        gmStatsScore.innerHTML = this.score;
        lvlPausedScore.innerHTML = this.score;
    },
    start: function() {
        this.score = 0;
        this.updateUI();
        toolsBox.showPage(pagePlayArea);
        circlesEngine.resetBoard();
    },
    wrongTap: function() {
        var popup = document.querySelector('#wrongPopup');
        popup.classList.remove('show-wrong');
        void popup.offsetWidth; // force reflow so animation restarts cleanly
        popup.classList.add('show-wrong');
        circlesEngine.resetBoard();
    }
};

// Event Listeners
toolsBox.onClick(newGameBtn,    () => gameEngine.start());
toolsBox.onClick(pmRstrtLvlBtn, () => toolsBox.showPage(pageGameMenu));
toolsBox.onClick(pmCntnuGmBtn,  () => toolsBox.showPage(pagePlayArea));

// Initialize — show home screen
toolsBox.showPage(pageGameMenu);

// Prevent scroll/pan while playing
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Reposition circles on orientation change so nothing is cut off
window.addEventListener('resize', function() {
    if (pagePlayArea.style.display === 'block') {
        document.querySelectorAll('.good-circle, .evil-circle').forEach(function(c) {
            circlesEngine.randomize(c);
        });
    }
});
